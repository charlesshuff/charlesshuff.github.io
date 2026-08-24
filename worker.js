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
 *   { type: "smlml-substrate-error", message }
 *                                     the standard-library substrate could not
 *                                     be fetched or installed; the worker is
 *                                     still usable but type diagnostics are
 *                                     suppressed server-side
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
  install_stdlib_substrate,
  lsp_handle_message,
  wasm_init,
} from "./wasm-pkg/smlml_wasm.js";

/**
 * Fetch the standard-library substrate and install it into the WASM module.
 *
 * The substrate is the element-level table `smlml-validate` type-checks
 * against. It used to be `include_bytes!`d into the `.wasm`, but it is 9.6 MB
 * of already-DEFLATE'd bytes that gzip cannot touch, so it was 74% of the
 * download and blew the size budget. The wasm build now emits it as a sibling
 * asset instead and this hands the bytes to the SAME installer the native
 * build uses (`lib_substrate::install_compressed`).
 *
 * This runs before `smlml-ready` is posted, and therefore before any LSP
 * message is dispatched: the server never sees a document while the substrate
 * is missing, so there is no window in which the 947-finding "every library
 * type is unknown" flood could be published. The Rust side suppresses
 * type-dependent findings while no substrate is installed as a second line of
 * defence for the failure path below.
 *
 * Throws on any failure — fetch, HTTP status, or a blob the installer rejects
 * — so the caller can surface it. A missing substrate is never allowed to pass
 * silently: wrong diagnostics are worse than no diagnostics.
 *
 * `install_stdlib_substrate` answers a tri-state string. Only "rejected" is a
 * failure: "already" means a substrate is in place (a re-initialised worker
 * installing a second time), which is a no-op and must NOT raise the substrate
 * error banner over a session whose diagnostics are working.
 */
async function installSubstrate() {
  const url = new URL("./wasm-pkg/stdlib_substrate.deflate", import.meta.url);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url.pathname}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const status = install_stdlib_substrate(bytes);
  if (status === "rejected") {
    throw new Error(`the standard-library substrate blob was rejected (${bytes.length} bytes)`);
  }
  return { bytes: bytes.length, status };
}

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
      post({ type: "smlml-log", tag: "WASM", msg: "fetch wasm-pkg/stdlib_substrate.deflate" });
      try {
        const { bytes, status } = await installSubstrate();
        const t3 = performance.now();
        post({
          type: "smlml-log",
          tag: "WASM",
          msg:
            status === "already"
              ? `standard-library substrate already installed (${(t3 - t2).toFixed(0)} ms)`
              : `standard-library substrate installed (${bytes.toLocaleString()} bytes, ${(t3 - t2).toFixed(0)} ms)`,
        });
      } catch (err) {
        // Deliberately NOT fatal: the editor still parses, resolves, formats
        // and renders without the substrate, and the server suppresses exactly
        // the findings that would be wrong without it. But it is loud — the
        // control message drives an error line in the Log panel — because a
        // silently substrate-less session looks identical to a healthy one
        // until someone trusts a missing diagnostic.
        post({ type: "smlml-substrate-error", message: String(err) });
      }
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
