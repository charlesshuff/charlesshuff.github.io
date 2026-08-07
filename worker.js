/**
 * smlml LSP web worker (ES module worker).
 *
 * Mirrors editors/smlml-vscode/src/browser-worker.ts, but self-initializes the
 * WASM module by importing the wasm-pack `--target web` ESM glue directly.  This
 * file is copied verbatim into dist/ (NOT bundled by esbuild) so that the glue's
 * `import.meta.url` resolves the sibling `wasm-pkg/smlml_wasm_bg.wasm` at runtime
 * — no explicit byte handshake needed (unlike the VS Code host, which must hand
 * the bytes in because a worker-side fetch cannot resolve vscode-file:// URIs).
 *
 * Control protocol (worker → main):
 *   { type: "smlml-log", tag, msg }   lifecycle breadcrumbs for the Log panel
 *   { type: "smlml-ready" }           init succeeded
 *   { type: "smlml-error", message }  init failed
 *   { type: "smlml-snippet-hover-result", id, markdown }
 * Any other worker → main message is a raw JSON-RPC LSP message.
 *
 * main → worker:
 *   { type: "smlml-init" }            trigger WASM init
 *   { type: "smlml-snippet-hover", id, src, lang, offset }
 *   <JSON-RPC message>               processed via lsp_handle_message
 *
 * `smlml-snippet-hover` answers "what does this bit of syntax mean?" for a
 * standalone snippet, so the diagram legend can show the same documentation
 * the editor shows when you hover the corresponding keyword. It is NOT a
 * second source for that documentation: `hover_at_offset` runs the same
 * `analysis.hover_at_byte` lookup `textDocument/hover` does — it is that same
 * engine reached without an open document, which a legend row has no way to
 * supply. It is a control message rather than an LSP request because it
 * deliberately touches no workspace state: nothing is opened, nothing is
 * resolved against the user's files, and no diagnostics are published.
 */

import init, {
  hover_at_offset,
  lsp_handle_message,
  wasm_init,
} from "./wasm-pkg/smlml_wasm.js";

let ready = false;
let initPromise = null;

function post(msg) {
  globalThis.postMessage(msg);
}

async function ensureWasm() {
  if (ready) return;
  if (!initPromise) {
    initPromise = (async () => {
      const t0 = performance.now();
      post({ type: "smlml-log", tag: "WASM", msg: "fetch wasm-pkg/smlml_wasm_bg.wasm" });
      await init(); // fetches the sibling .wasm via import.meta.url
      const t1 = performance.now();
      post({ type: "smlml-log", tag: "WASM", msg: `WebAssembly.instantiate — module ready (${(t1 - t0).toFixed(0)} ms)` });
      wasm_init();
      const t2 = performance.now();
      post({ type: "smlml-log", tag: "WASM", msg: `wasm_init() — panic hook installed (${(t2 - t1).toFixed(0)} ms)` });
      ready = true;
    })();
  }
  return initPromise;
}

globalThis.onmessage = async (ev) => {
  const data = ev.data;

  if (data && data.type === "smlml-init") {
    try {
      await ensureWasm();
      post({ type: "smlml-ready" });
    } catch (err) {
      post({ type: "smlml-error", message: String(err) });
    }
    return;
  }

  if (!ready) {
    try {
      await ensureWasm();
    } catch (err) {
      post({ type: "smlml-error", message: String(err) });
      return;
    }
  }

  if (data && data.type === "smlml-snippet-hover") {
    // Always answers — a null hover, an unparseable snippet and a panic all
    // resolve the caller's pending request with `markdown: null` rather than
    // leaving it hanging forever behind a timeout the caller would have to own.
    let markdown = null;
    try {
      const json = hover_at_offset(data.src, data.lang, data.offset);
      markdown = JSON.parse(json)?.markdown ?? null;
    } catch {
      markdown = null;
    }
    post({ type: "smlml-snippet-hover-result", id: data.id, markdown });
    return;
  }

  let responseJson;
  try {
    responseJson = lsp_handle_message(JSON.stringify(data));
  } catch (err) {
    post({
      jsonrpc: "2.0",
      id: data && data.id !== undefined ? data.id : null,
      error: { code: -32603, message: String(err) },
    });
    return;
  }

  let responses;
  try {
    responses = JSON.parse(responseJson);
  } catch {
    return;
  }
  for (const resp of responses) post(resp);
};
