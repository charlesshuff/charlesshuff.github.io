var o=Object.create;var i=Object.defineProperty;var s=Object.getOwnPropertyDescriptor;var l=Object.getOwnPropertyNames;var m=Object.getPrototypeOf,p=Object.prototype.hasOwnProperty;var f=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?require:t)[n]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var u=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(a){throw n=[a],a}};var g=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}},b=(e,t)=>{for(var n in t)i(e,n,{get:t[n],enumerable:!0})},d=(e,t,n,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of l(t))!p.call(e,r)&&r!==n&&i(e,r,{get:()=>t[r],enumerable:!(a=s(t,r))||a.enumerable});return e};var w=(e,t,n)=>(n=e!=null?o(m(e)):{},d(t||!e||!e.__esModule?i(n,"default",{value:e,enumerable:!0}):n,e));var S,h=u(()=>{S=[{path:"satellite.sysml",text:`package Satellite {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::*;
    private import RealFunctions::max;
    private import Power::SolarPanel;
    private import Energy::Battery;
    private import Propulsion::Thruster;
    private import Control::PowerMode;
    private import SatelliteInterfaces::*;
    private import Geometry::SatelliteBody;

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

    // The reusable system definition ties logical composition to its physical
    // envelope and owns the behaviors exhibited by every observatory.
    part def Observatory :> SatelliteBody {
        part panels     [4] : SolarPanel;
        part batteries  [2] : Battery;
        part thrusters  [8] : Thruster;
        part controller     : PowerMode;
        part bus            : PowerDistribution;
        part payload        : Payload;

        exhibit state powerMode : PowerMode;
    }

    // \u2500\u2500 Subsystem composition with multiplicities \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    part observatory : Observatory;

    // \u2500\u2500 Interconnections (ports, connectors, interface, flow, binding) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    connect observatory.panels.pwrOut     to observatory.bus.panelIn;
    connect observatory.batteries.pwrPort to observatory.bus.batteryIn;
    interface : PowerBus connect observatory.bus.loadOut to observatory.batteries.pwrPort;
    flow of t : Telemetry from observatory.payload.dataOut to observatory.bus.dataIn;
    bind observatory.bus.panelIn.voltage = observatory.bus.busVoltage;

    // \u2500\u2500 Mass budget \u2014 multiplicity rollup (kg) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // panels [4] \xD7 3.5 kg + batteries [2] \xD7 8 kg + thrusters [8] \xD7 0.22 kg \u2026
    attribute totalMass : MassValue = observatory.panels.mass + observatory.batteries.mass
        + observatory.thrusters.mass + observatory.bus.mass + observatory.payload.mass;

    // \u2500\u2500 Power budget (W) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute solarGen    : PowerValue = observatory.panels.peakPower;                     // 4 \xD7 120 W = 480 W
    attribute houseLoad   : PowerValue = observatory.bus.idlePower + observatory.payload.activePower;  // 130 W
    attribute powerMargin : PowerValue = solarGen - houseLoad;                 // 350 W surplus

    // max() aggregation: the dominant power figure (generation vs. load)
    attribute peakDemand : PowerValue = max(solarGen, houseLoad);             // 480 W

    // \u2500\u2500 Energy and eclipse endurance \u2014 unit arithmetic: J / W = s \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute totalEnergy : EnergyValue = observatory.batteries.capacity;       // 2 \xD7 1 296 000 J
    attribute eclipseTime : TimeValue   = totalEnergy / houseLoad;  // \u2248 19 938 s

    // \u2500\u2500 Propulsion budget (N) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute totalThrust : ForceValue = observatory.thrusters.thrust;          // 8 \xD7 0.5 N = 4 N

    // \u2500\u2500 Design checks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute overBudget : Boolean = totalMass > 100 [kg];          // false
    attribute safePower             = if powerMargin > 0 [W] ? 1 else 0;   // 1

    comment about totalMass
        /* Dry-mass rollup across every subsystem; checked by MassBudgetRequirement. */
}
`},{path:"interfaces/Interfaces.sysml",text:`package SatelliteInterfaces {
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
    private import SatelliteInterfaces::PowerPort;

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
    private import SatelliteInterfaces::PowerPort;
    private import Geometry::PanelWing;

    // Abstract base for power-generating panels.
    part def BasePanel {
        doc /* Abstract base for power-generating panels. */
        attribute mass : MassValue default 1.0 [kg];
    }

    // SolarPanel specialises BasePanel, redefining mass and adding geometry.
    part def SolarPanel :> BasePanel, PanelWing {
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
    private import SatelliteInterfaces::Telemetry;

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

        // Typed subactions demonstrate action performance as well as bare
        // action usages.
        perform action publishReport : PublishTelemetry;

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
        first resume then publishReport;
        first publishReport then done;
    }

    action def PublishTelemetry {
        in report : Telemetry;
    }

    attribute def CommandSignal;
}
`},{path:"requirements/Requirements.sysml",text:`package MissionRequirements {
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

    requirement def ImagingDurationRequirement {
        doc /* Each imaging pass shall fit within the ten-minute contact window. */

        attribute imagingDuration : TimeValue = 300 [s];
        attribute contactDuration : TimeValue = 600 [s];

        require constraint {
            imagingDuration <= contactDuration
        }
    }
}
`},{path:"analysis/CalculationPatterns.sysml",text:`package CalculationPatterns {
    private import ScalarValues::*;
    private import RealFunctions::*;
    private import SequenceFunctions::*;
    private import ControlFunctions::*;

    // \u2500\u2500 Inherited equations and redefinition \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \`adjustedMass\` is inherited as an equation, so it is recalculated using
    // FlightBudget's redefined factor: 10 * 1.1 = 11.
    part def BudgetBase {
        attribute rawMass : Real = 10.0;
        attribute factor  : Real default 1.0;
        attribute adjustedMass : Real = rawMass * factor;
    }
    part def FlightBudget :> BudgetBase {
        attribute :>> factor : Real = 1.1;
    }
    part budget : FlightBudget;

    // \u2500\u2500 Typed calculation usage and direct invocation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    calc def PowerMargin {
        in generation : Real;
        in load : Real;
        attribute reserve : Real = generation - load;
        return result : Real = reserve;
    }
    calc margin : PowerMargin {
        in generation = 480.0;
        in load = 130.0;
    }
    attribute directMargin : Real = PowerMargin(600.0, 250.0);

    // \u2500\u2500 Nested equations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    part nestedMetrics {
        attribute usablePower : Real = margin.result * 0.8;
        attribute doubledPower : Real = usablePower * 2.0;
    }

    // \u2500\u2500 Constraint predicate and asserted derivation equation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    constraint def BelowLimit {
        in value : Real;
        in limit : Real;
        value <= limit
    }
    constraint massCheck : BelowLimit {
        in value = budget.adjustedMass;
        in limit = 15.0;
    }

    attribute computedMass : Real;
    assert constraint { computedMass == budget.adjustedMass + 2.0 }

    // A binding connector identifies both features with the same value.
    attribute mirroredMass : Real;
    bind mirroredMass = computedMass;

    // \u2500\u2500 Concrete standard-library functions and collection operators \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    attribute productValue : Integer = product((2, 3, 4));
    attribute rootValue : Real = sqrt(81.0);
    attribute sampleCount : Integer = (1 .. 5)->size();
    attribute containsThree : Boolean = (1, 2, 3)->includes(3);
    attribute checksPass : Boolean = allTrue((massCheck.result, containsThree));
}
`},{path:"analysis/Functions.kerml",text:`package DemoFunctions {
    // KerML Functions are directly invokable. Local feature equations are
    // evaluated before the trailing result expression.
    function Affine {
        in x;
        in offset;
        feature doubled = x * 2;
        doubled + offset
    }

    feature functionResult = Affine(17, 8); // 42
}
`},{path:"mission/FlightArticle.sysml",text:`package FlightArticles {
    private import Satellite::*;
    private import MissionTimeline::*;

    // Individual definitions identify one specific flight article and one
    // specific contact opportunity, rather than a reusable class of either.
    individual part def Pathfinder :> Observatory;

    individual part pathfinder : Pathfinder {
        timeslice commissioning [1] : Pathfinder;
    }

    individual part firstGroundContact : ContactWindow;
}
`},{path:"mission/MissionTimeline.sysml",text:`package MissionTimeline {
    private import ISQ::*;
    private import SI::*;
    private import Time::*;

    item def MissionEvent;

    // An occurrence has a lifetime bounded by its inherited start and done
    // snapshots. A nested timeslice captures a meaningful interval within it.
    individual part def ContactWindow {
        attribute startTime = TimeOf(start);
        attribute elapsed :> duration;

        timeslice :>> portionOfLife {
            snapshot :>> start {
                :>> elapsed = 0 [s];
            }
            snapshot :>> done {
                :>> elapsed = 600 [s];
            }
        }

        timeslice imagingPass {
            snapshot :>> start {
                :>> elapsed = 120 [s];
            }
            snapshot :>> done {
                :>> elapsed = 420 [s];
            }
        }

        event occurrence acquisitionOfSignal = start;
        event occurrence lossOfSignal = done;
    }
}
`},{path:"structure/Geometry.sysml",text:`package Geometry {
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;

    // Physical items specialize SpatialItem, following the OMG geometry
    // examples. Their shapes make the satellite dimensions explicit instead of
    // leaving geometry as unrelated scalar attributes.
    part def SatelliteBody :> SpatialItem {
        item :>> shape = new Box(0.8 [m], 0.8 [m], 1.0 [m]);
    }

    part def PanelWing :> SpatialItem {
        item :>> shape = new Box(0.6 [m], 0.03 [m], 1.0 [m]);
    }

    part spacecraftGeometry : SatelliteBody {
        part portWing  : PanelWing :> componentParts;
        part starboardWing : PanelWing :> componentParts;
    }
}
`},{path:"structure/GeometryReferences.sysml",text:`package GeometryReferences {
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;
    private import MeasurementReferences::Rotation;

    part stack : SpatialItem {
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        // The cone's canonical frame is at its base. Moving that frame up by
        // its height and turning it over puts the apex at the universal origin.
        part cone :> componentParts {
            item :>> shape : RightCircularCone {
                :>> radius = 40 [mm];
                :>> height = 70 [mm];
            }
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((0, 0, shape.height)[datum]),
                        new Rotation((1, 0, 0)[datum], 180 ['\xB0'])
                    );
                }
            }
        }

        // This height and placement both use inter-part feature references.
        // Its frame is at the far end; rotating about X makes the cylinder
        // extend down to the cone's base.
        part cylinder :> componentParts {
            item :>> shape : RightCircularCylinder {
                :>> radius = 35 [mm];
                :>> height = cone.shape.height + 10 [mm];
            }
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((0, 0, cone.shape.height + shape.height)[datum]),
                        new Rotation((1, 0, 0)[datum], 180 ['\xB0'])
                    );
                }
            }
        }
    }
}
`},{path:"structure/GeometrySphere.sysml",text:`package GeometrySphere {
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;

    // A Sphere is centred on its own origin, so a body placed at the datum
    // straddles the origin while the two orbiting markers are offset by their
    // translations alone.
    item def MarkerShape :> Sphere {
        :>> radius = 15 [mm];
    }

    part assembly : SpatialItem {
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        part body :> componentParts {
            item :>> shape : Sphere {
                :>> radius = 60 [mm];
            }
        }

        part equatorMarker :> componentParts {
            item :>> shape : MarkerShape;
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = new Translation((90, 0, 0)[datum]);
                }
            }
        }

        part poleMarker :> componentParts {
            item :>> shape : MarkerShape;
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = new Translation((0, 0, 90)[datum]);
                }
            }
        }
    }
}
`},{path:"structure/GeometryStack.sysml",text:`package GeometryStack {
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;
    private import MeasurementReferences::Rotation;

    item def PedestalShape :> Box {
        :>> length = 100 [mm];
        :>> width = 100 [mm];
        :>> height = 100 [mm];
    }

    part stack : SpatialItem {
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        part cube :> componentParts {
            item :>> shape : PedestalShape;
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = new Rotation((0, 0, 1)[datum], 15 ['\xB0']);
                }
            }
        }

        part cylinder :> componentParts {
            item :>> shape : RightCircularCylinder {
                :>> radius = 35 [mm];
                :>> height = 80 [mm];
            }
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((50, 50, 100)[datum]),
                        new Rotation((1, 0, 0)[datum], 12 ['\xB0'])
                    );
                }
            }
        }

        part cone :> componentParts {
            item :>> shape : RightCircularCone {
                :>> radius = 40 [mm];
                :>> height = 70 [mm];
            }
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((50, 50, 180)[datum]),
                        new Rotation((0, 1, 0)[datum], -10 ['\xB0'])
                    );
                }
            }
        }
    }
}
`},{path:"structure/GeometryVehicleFrames.sysml",text:`package GeometryVehicleFrames {
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::CoordinateFrame;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;
    private import MeasurementReferences::Rotation;
    private import Collections::Array;
    private import ScalarValues::Real;

    part def Vehicle :> SpatialItem;

    part def Chassis :> SpatialItem {
        item :>> shape = new Box(4800 [mm], 1840 [mm], 1350 [mm]);
    }

    part def Wheel :> SpatialItem {
        item :>> shape : Cylinder {
            // Apply mm to the complete numeric calculation. Multiplying or
            // adding a unitless intermediate directly to a LengthValue would
            // be dimensionally invalid.
            :>> radius = (22 / 2 * 25.4 + 110) [mm];
            :>> height = 220 [mm];
        }
        attribute wheelCoordinateFrame : CoordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }
    }

    part vehicle : Vehicle {
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        part chassis : Chassis[1] :> componentParts {
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = new Translation((
                        -(shape as Box).length / 2,
                        -(shape as Box).width / 2,
                        0
                    )[datum]);
                }
            }
        }

        private attribute plusXAxis : Array {
            :>> dimensions = 3;
            :>> elements : Real[3] = (1, 0, 0);
        }
        private attribute frontWheelXShift : Real = 1670;
        private attribute rearWheelXShift : Real = -1820;
        private attribute wheelYShift : Real = 720;

        part leftFrontWheel : Wheel[1] :> componentParts {
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((frontWheelXShift, wheelYShift, 80)[datum]),
                        new Rotation(plusXAxis[datum], -90 ['\xB0'])
                    );
                }
            }
        }

        part rightFrontWheel : Wheel[1] :> componentParts {
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((frontWheelXShift, -wheelYShift, 80)[datum]),
                        new Rotation((1, 0, 0)[datum], 90 ['\xB0'])
                    );
                }
            }
        }

        part leftRearWheel : Wheel[1] :> componentParts {
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((rearWheelXShift, wheelYShift, 80)[datum]),
                        new Rotation((1, 0, 0)[datum], 90 ['\xB0'])
                    );
                }
            }
        }

        part rightRearWheel : Wheel[1] :> componentParts {
            attribute :>> coordinateFrame {
                :>> transformation : TranslationRotationSequence {
                    :>> source = datum;
                    :>> elements = (
                        new Translation((rearWheelXShift, -wheelYShift, 80)[datum]),
                        new Rotation((-1, 0, 0)[datum], 90 ['\xB0'])
                    );
                }
            }
        }
    }
}
`},{path:"structure/GeometryWheelPattern.sysml",text:`package GeometryWheelPattern {
    private import TrigFunctions::cos;
    private import TrigFunctions::sin;
    private import TrigFunctions::pi;
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;
    private import ScalarValues::Natural;
    private import ScalarValues::Real;
    private import ControlFunctions::forAll;

    part def LugBolt :> SpatialItem {
        item :>> shape : Cylinder {
            :>> radius = 14 [mm];
            :>> height = 40 [mm];
        }
    }

    part wheel : SpatialItem {
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        attribute numberOfBolts : Natural = 5;
        attribute placementRadius :>> radius = 60 [mm];
        private attribute distributionAngleDegrees : Real = 360 / numberOfBolts;
        attribute distributionAngle :>> planeAngle = distributionAngleDegrees ['\xB0'];
        private attribute distributionAngleRadians : Real =
            distributionAngle.num * (pi / 180);

        part lugBolts : LugBolt[1..numberOfBolts] :> subSpatialParts;

        assert constraint {
            (1..numberOfBolts)->forAll {
                in i : Natural;
                private attribute boltFrame = lugBolts#(i).coordinateFrame;
                private attribute placement : TranslationRotationSequence {
                    :>> source = datum;
                    :>> target = boltFrame;
                    :>> elements = new Translation((
                        placementRadius * cos((i - 1) * distributionAngleRadians),
                        placementRadius * sin((i - 1) * distributionAngleRadians),
                        -8
                    )[datum]);
                }
                boltFrame.transformation == placement
            }
        }
    }
}
`},{path:"views/SatelliteViews.sysml",text:`package SatelliteViews {
    // \`Views::*\` supplies the two renderings a view may declare \u2014
    // \`asTreeDiagram\` and \`asInterconnectionDiagram\`. A view that declares no
    // rendering at all lets the viewer infer one from its first exposed
    // element, which \`busContext\` below exercises deliberately.
    private import Views::*;
    private import ScalarValues::*;
    private import ISQ::*;
    private import SI::*;

    // \u2500\u2500 Cross-cutting concerns \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \`filter\` matches an element's OWNED annotations only. SysML.ecore derives
    // \`Element::ownedAnnotation\` as
    //
    //     ownedRelationship->selectByKind(Annotation)->
    //         select(a | a.annotatedElement = self)
    //
    // and a view's condition check reads
    // \`element.ownedAnnotation.annotatingElement\`. An \`about\`-form annotation
    // is owned by the annotating metadata usage rather than by its target, so
    // it is invisible to a filter \u2014 the annotation has to be written inside the
    // element it marks.
    metadata def Safety {
        attribute isMandatory : Boolean;
    }
    metadata def FlightCritical;

    // \u2500\u2500 Ground and deployable hardware \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // The flight model stops at the spacecraft boundary and carries no
    // cross-cutting annotations, so the downlink and safety views need parts of
    // their own to select over. These extend the satellite rather than
    // duplicating it: a ground segment, and the deployables whose release is the
    // mission's single-point-of-failure step.
    part def GroundStation {
        in port telemetryIn : SatelliteInterfaces::DataPort;
        attribute antennaGain : Real = 42.0;      // dBi
    }

    part def DeployableBoom {
        attribute mass : MassValue = 1.4 [kg];
    }

    part segment {
        part groundStation : GroundStation;

        part solarBoom : DeployableBoom {
            @Safety { isMandatory = true; }
            @FlightCritical;
        }
        part antennaBoom : DeployableBoom {
            @Safety { isMandatory = true; }
        }
        part sunSensor {
            @Safety { isMandatory = false; }
        }
        part starTracker {
            @FlightCritical;
        }
        part testPort;
    }

    // \u2500\u2500 Reusable view definitions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    view def InterconnectView {
    }

    view def BreakdownView {
    }

    // \u2500\u2500 1. Observatory interconnect \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // An interconnection diagram is composed from a CONTAINING part: it draws
    // that part's nested usages together with the ports and connectors between
    // them. Exposing the leaf usages instead (\`observatory::panels\` and
    // friends) hands the renderer parts with no enclosing context to connect
    // them in, and it draws nothing \u2014 so the whole observatory is exposed and
    // the power chain reads off the connectors declared in \`satellite.sysml\`.
    view powerChain : InterconnectView {
        render asInterconnectionDiagram;
        expose Satellite::observatory;
    }

    // \u2500\u2500 2. Telemetry downlink, spacecraft through ground \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Two containers in one diagram, which is what makes this view span the
    // flight/ground boundary no single source file covers.
    view telemetryDownlink : InterconnectView {
        render asInterconnectionDiagram;
        expose Satellite::observatory;
        expose segment;
    }

    // \u2500\u2500 3. Dry-mass contributors \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // The observatory as a containment breakdown \u2014 the structure behind
    // \`Satellite::totalMass\`.
    view massBreakdown : BreakdownView {
        render asTreeDiagram;
        expose Satellite::observatory::**;
    }

    // \u2500\u2500 4. Propulsion subsystem in isolation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \`::**\` on a PART walks that part's tree, but on a PACKAGE it also walks
    // what the package imports \u2014 for any package importing the standard
    // library that is thousands of elements, not a subsystem slice. Name the
    // definition and the usage instead.
    view propulsionSlice : BreakdownView {
        render asTreeDiagram;
        expose Propulsion::Thruster;
        expose Satellite::observatory::thrusters;
    }

    // \u2500\u2500 5. Safety-critical cross-section \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // The one selection \`expose\` cannot express on its own: a predicate over
    // every exposed element rather than a subtree of them.
    view safetyCritical : BreakdownView {
        render asTreeDiagram;
        expose segment::**;
        filter @Safety;
    }

    // \u2500\u2500 6. Mandatory-safety subset \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Filters compose: annotation presence AND an attribute of the annotation.
    // \`sunSensor\` carries \`@Safety\` with \`isMandatory = false\`, so it drops out
    // here while remaining in \`safetyCritical\`.
    view mandatorySafety : BreakdownView {
        render asTreeDiagram;
        expose segment::**;
        filter @Safety and (as Safety).isMandatory;
    }

    // \u2500\u2500 7. Flight-critical hardware \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    view flightCritical : BreakdownView {
        render asTreeDiagram;
        expose segment::**;
        filter @FlightCritical;
    }

    // \u2500\u2500 8. Bus context, with a nested detail view \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // A view may own another view. The nested view names its own rendering and
    // its own exposed set, so the two are drawn independently and each gets its
    // own entry in the panel.
    // \`bus\` is exposed BARE, not as \`bus::**\`: the star form selects an
    // element's descendants, while the bare form includes the exposed element
    // itself, which is what puts the bus on the diagram.
    //
    // This view is why the local \`render\` above matters. \`bus\` is a leaf part
    // whose only members are ports, so mode inference falls back to Mixed for
    // it (inference can never select Interconnection \u2014 see the note above
    // \`InterconnectView\`). Tree draws an empty containment box for a
    // ports-only part; Mixed draws nothing at all. Naming the tree rendering
    // here is what makes it draw.
    view busContext : BreakdownView {
        render asTreeDiagram;
        expose Satellite::observatory::bus;

        view busPorts : BreakdownView {
            render asTreeDiagram;
            expose SatelliteInterfaces::PowerPort;
            expose SatelliteInterfaces::DataPort;
            expose SatelliteInterfaces::PowerBus;
        }
    }

    // \u2500\u2500 9. Everything, satellite-only \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \`expose Satellite::*\` looks like the obvious way to draw "all of
    // Satellite," but a package-level wildcard also reaches the package's
    // ANONYMOUS members \u2014 the \`connect\`, \`bind\`, \`flow\`, and \`interface\`
    // statements in satellite.sysml carry no name of their own, so nothing
    // about them stands out in the \`expose\` line, yet the wildcard still
    // picks them up. Drawing them pulls in enough of their surrounding
    // closure to swell this view past 3,000 elements, confirmed against the
    // Pilot reference implementation (which renders the same \`Satellite::*\`
    // view at essentially the same size \u2014 this is not an engine bug, it is
    // what a package wildcard means). Naming each member instead avoids the
    // anonymous ones entirely, the same fix \`propulsionSlice\` above applies
    // to \`::**\` on a package, extended here to bare \`::*\`.
    view everything : BreakdownView {
        render asTreeDiagram;
        expose Satellite::observatory::**;
        expose Satellite::PowerDistribution;
        expose Satellite::Payload;
        expose Satellite::totalMass;
        expose Satellite::solarGen;
        expose Satellite::houseLoad;
        expose Satellite::powerMargin;
        expose Satellite::peakDemand;
        expose Satellite::totalEnergy;
        expose Satellite::eclipseTime;
        expose Satellite::totalThrust;
        expose Satellite::overBudget;
        expose Satellite::safePower;
    }
}
`}]});export{f as a,g as b,b as c,w as d,h as e,S as f};
