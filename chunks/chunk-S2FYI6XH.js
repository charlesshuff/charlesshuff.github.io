var s=Object.create;var i=Object.defineProperty;var o=Object.getOwnPropertyDescriptor;var l=Object.getOwnPropertyNames;var u=Object.getPrototypeOf,p=Object.prototype.hasOwnProperty;var g=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var c=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(a){throw n=[a],a}};var b=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var d=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of l(t))!p.call(e,r)&&r!==n&&i(e,r,{get:()=>t[r],enumerable:!(a=o(t,r))||a.enumerable});return e};var f=(e,t,n)=>(n=e!=null?s(u(e)):{},d(t||!e||!e.__esModule?i(n,"default",{value:e,enumerable:!0}):n,e));var P,h=c(()=>{P=[{path:"satellite.sysml",text:`package Satellite {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::*;
    private import RealFunctions::max;
    private import Power::SolarPanel;
    private import Energy::Battery;
    private import Propulsion::Thruster;
    private import Control::PowerMode;
    private import Interfaces::*;

    // Central power-distribution unit that ties the subsystems together; its
    // ports drive the interconnection view.
    part def PowerDistribution {
        in port panelIn   : PowerPort;
        // The battery charges and discharges through the same port, so its
        // honest direction is \`inout\` \u2014 the third of the three keywords.
        inout port batteryIn : PowerPort;
        out port loadOut   : PowerPort;
        in port dataIn    : DataPort;
        attribute mass       : MassValue              = 45 [kg];
        attribute idlePower  : PowerValue             = 50 [W];
        attribute busVoltage : ElectricPotentialValue = 28 [V];
    }

    part def Payload {
        out port dataOut : DataPort;
        attribute mass        : MassValue  = 12 [kg];
        attribute activePower : PowerValue = 80 [W];
    }

    // \u2500\u2500 Subsystem composition with multiplicities \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    part panels     [4] : SolarPanel;
    part batteries  [2] : Battery;
    part thrusters  [8] : Thruster;
    part controller     : PowerMode;
    part bus            : PowerDistribution;
    part payload        : Payload;

    // \u2500\u2500 Interconnections (ports, connectors, interface, flow, binding) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    connect panels.pwrOut     to bus.panelIn;
    connect batteries.pwrPort to bus.batteryIn;
    interface : PowerBus connect bus.loadOut to batteries.pwrPort;
    flow of t : Telemetry from payload.dataOut to bus.dataIn;
    bind bus.panelIn.voltage = bus.busVoltage;

    // \u2500\u2500 Mass budget \u2014 multiplicity rollup (kg) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // panels [4] \xD7 3.5 kg + batteries [2] \xD7 8 kg + thrusters [8] \xD7 0.22 kg \u2026
    attribute totalMass : MassValue = panels.mass + batteries.mass
        + thrusters.mass + bus.mass + payload.mass;

    // \u2500\u2500 Power budget (W) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute solarGen    : PowerValue = panels.peakPower;                     // 4 \xD7 120 W = 480 W
    attribute houseLoad   : PowerValue = bus.idlePower + payload.activePower;  // 130 W
    attribute powerMargin : PowerValue = solarGen - houseLoad;                 // 350 W surplus

    // max() aggregation: the dominant power figure (generation vs. load)
    attribute peakDemand : PowerValue = max(solarGen, houseLoad);             // 480 W

    // \u2500\u2500 Energy and eclipse endurance \u2014 unit arithmetic: J / W = s \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute totalEnergy : EnergyValue = batteries.capacity;       // 2 \xD7 1 296 000 J
    attribute eclipseTime : TimeValue   = totalEnergy / houseLoad;  // \u2248 19 938 s

    // \u2500\u2500 Propulsion budget (N) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute totalThrust : ForceValue = thrusters.thrust;          // 8 \xD7 0.5 N = 4 N

    // \u2500\u2500 Design checks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute overBudget : Boolean = totalMass > 100 [kg];          // false
    attribute safePower             = if powerMargin > 0 [W] ? 1 else 0;   // 1

    comment about totalMass
        /* Dry-mass rollup across every subsystem; checked by MassBudgetRequirement. */
}
`},{path:"interfaces/Interfaces.sysml",text:`package Interfaces {
    private import ISQ::*;
    private import SI::*;

    // Shared connection points used across the satellite's subsystems.
    port def PowerPort {
        attribute voltage : ElectricPotentialValue;
    }

    port def DataPort;

    // Item streamed across telemetry flows in the interconnection view.
    item def Telemetry;

    // An interface definition pairs two ports as its ends. An end takes no
    // direction keyword: SysML.xtext's OccurrenceUsagePrefix is the alternation
    // \`EndUsagePrefix | BasicUsagePrefix \u2026\`, so \`end\` and a FeatureDirection are
    // mutually exclusive. Every interface end in the OMG corpus is written this
    // way. The in/out/inout demo lives on PowerDistribution's ports instead.
    interface def PowerBus {
        end supply : PowerPort;
        end load   : PowerPort;
    }
}
`},{path:"subsystems/Battery.sysml",text:`package Energy {
    private import ISQ::*;
    private import SI::*;
    private import Interfaces::PowerPort;

    part def Battery {
        attribute mass       : MassValue              = 8       [kg];
        attribute capacity   : EnergyValue            = 1296000 [J];   // 360 W\xB7h = 1 296 000 J
        attribute voltage    : ElectricPotentialValue = 28      [V];
        attribute maxCurrent : ElectricCurrentValue   = 46      [A];
        // Unit arithmetic: V \xD7 A \u2192 W  (electric power)
        attribute peakPower  : PowerValue = voltage * maxCurrent;

        port pwrPort : PowerPort;
    }
}
`},{path:"subsystems/SolarPanel.sysml",text:`package Power {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::*;
    private import Interfaces::PowerPort;

    // Abstract base for power-generating panels.
    part def BasePanel {
        doc /* Abstract base for power-generating panels. */
        attribute mass : MassValue = 1.0 [kg];
    }

    // SolarPanel specialises BasePanel, redefining mass and adding geometry.
    part def SolarPanel :> BasePanel {
        attribute :>> mass   : MassValue  = 3.5 [kg];
        attribute peakPower  : PowerValue = 120 [W];
        attribute efficiency : Real       = 0.28;        // dimensionless

        // Unit arithmetic inside a definition: m \xD7 m \u2192 m\xB2
        attribute width  : LengthValue = 0.6 [m];
        attribute height : LengthValue = 1.0 [m];
        attribute area   : AreaValue   = width * height;

        port pwrOut : PowerPort;
    }
}
`},{path:"subsystems/Thruster.sysml",text:`package Propulsion {
    private import ISQ::*;
    private import SI::*;

    part def Thruster {
        doc /*
         * Cold-gas reaction-control thruster used for fine attitude control and
         * desaturation of the reaction wheels. Each unit delivers a small,
         * highly repeatable impulse bit suitable for sub-degree pointing.
         *
         * The propellant budget assumes a stored-gas (nitrogen) blowdown system
         * shared across the eight-thruster cluster; specific impulse is quoted at
         * the nominal regulated inlet pressure and degrades as the tank blows
         * down toward end-of-life. This long, multi-paragraph note demonstrates
         * that a node's doc compartment caps its height and scrolls rather than
         * growing unbounded.
         */
        attribute mass       : MassValue  = 0.22 [kg];
        attribute thrust     : ForceValue = 0.5  [N];
        attribute isp        : TimeValue  = 220  [s];   // specific impulse
        attribute propellant : MassValue  = 0.05 [kg];  // propellant mass per unit
    }
}
`},{path:"control/PowerMode.sysml",text:`package Control {
    private import ScalarValues::Boolean;

    // Triggers are modelled as attribute (signal) definitions so the \`accept\`
    // clauses in the transitions resolve to real elements.
    attribute def EnterShadow;
    attribute def ExitShadow;
    attribute def BatteryFull;
    attribute def FaultDetected;
    attribute def SystemsNominal;

    // Power-mode state machine for the satellite.
    //
    // Nominal eclipse loop:  nominal \u2192 eclipse \u2192 charging \u2192 nominal
    // Fault branch:          nominal \u2192 safeMode \u2192 nominal (guarded recovery)
    state def PowerMode {
        attribute faultCleared : Boolean = true;

        entry action powerOn;

        state nominal {
            do action hold;
        }
        state eclipse;
        state charging;

        // A parallel state runs its sub-states concurrently.
        state safeMode parallel {
            state thermalHold;
            state commsBeacon;
        }

        transition t_shadow first nominal
            accept EnterShadow
            then eclipse;

        transition t_emerge first eclipse
            accept ExitShadow
            then charging;

        transition t_ready first charging
            accept BatteryFull
            then nominal;

        transition t_fault first nominal
            accept FaultDetected
            then safeMode;

        // Guarded recovery: faultCleared must hold for the transition to fire.
        transition t_recover first safeMode
            accept SystemsNominal
            if faultCleared
            then nominal;
    }
}
`},{path:"behavior/Operations.sysml",text:`package Operations {
    private import Interfaces::Telemetry;

    // Commissioning sequence flown once after separation. The action view
    // renders the steps plus the control nodes \u2014 fork \u2442, join, decision \u25C7,
    // merge \u2014 joined by succession edges.
    action def Commission {
        in  command : CommandSignal;
        out report  : Telemetry;

        action detumble;
        action chargeBatteries;
        action orientToSun;
        action enterNominal;
        action enterSafe;

        first start then detumble;

        // Fork into two concurrent branches, then join before the health check.
        fork deployAll;
        first detumble then deployAll;
        first deployAll then chargeBatteries;
        first deployAll then orientToSun;

        join synced;
        first chargeBatteries then synced;
        first orientToSun then synced;

        // Decision branches to nominal or safe mode, then merges and finishes.
        decide healthy;
        first synced then healthy;
        first healthy then enterNominal;
        first healthy then enterSafe;

        merge resume;
        first enterNominal then resume;
        first enterSafe then resume;
        first resume then done;
    }

    attribute def CommandSignal;
}
`},{path:"requirements/Requirements.sysml",text:`package Requirements {
    private import ISQ::*;
    private import SI::*;

    // A requirement definition with a formal constraint and documentation
    // (rendered with the \xABrequirement\xBB stereotype in the tree view).
    requirement def MassBudgetRequirement {
        doc /* The dry mass shall not exceed the launch allocation. */

        attribute massActual : MassValue;
        attribute massLimit  : MassValue = 100 [kg];

        require constraint {
            massActual <= massLimit
        }
    }

    requirement def PowerPositiveRequirement {
        doc /* The power margin shall remain positive in the nominal mode. */

        attribute powerMargin : PowerValue;

        require constraint {
            powerMargin > 0 [W]
        }
    }
}
`}]});export{g as a,b,f as c,h as d,P as e};
