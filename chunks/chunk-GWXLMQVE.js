var o=Object.create;var i=Object.defineProperty;var s=Object.getOwnPropertyDescriptor;var l=Object.getOwnPropertyNames;var m=Object.getPrototypeOf,u=Object.prototype.hasOwnProperty;var b=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(n,t)=>(typeof require<"u"?require:n)[t]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var d=(e,n,t)=>()=>{if(t)throw t[0];try{return e&&(n=e(e=0)),n}catch(a){throw t=[a],a}};var f=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(t){throw n=0,t}},g=(e,n)=>{for(var t in n)i(e,t,{get:n[t],enumerable:!0})},p=(e,n,t,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of l(n))!u.call(e,r)&&r!==t&&i(e,r,{get:()=>n[r],enumerable:!(a=s(n,r))||a.enumerable});return e};var y=(e,n,t)=>(t=e!=null?o(m(e)):{},p(n||!e||!e.__esModule?i(t,"default",{value:e,enumerable:!0}):t,e));var S,h=d(()=>{S=[{path:"satellite.sysml",text:`package Satellite {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::*;
    private import RealFunctions::max;
    private import NumericalFunctions::sum;
    private import Power::SolarPanel;
    private import Energy::Battery;
    private import Propulsion::Thruster;
    private import Control::PowerMode;
    private import SatelliteInterfaces::*;
    private import Geometry::SatelliteBody;

    part def PowerDistribution {
        doc /* # Power distribution

        Routes solar-array and battery power to spacecraft loads while receiving
        payload data for telemetry. Its directed ports define the power-chain view.
        */
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
        doc /* # Payload

        Science payload with a telemetry output and nominal mass and power demand.
        */
        out port dataOut : DataPort;
        attribute mass        : MassValue  = 12 [kg];
        attribute activePower : PowerValue = 80 [W];
    }

    part def Observatory :> SatelliteBody {
        doc /* # Observatory

        Reusable spacecraft definition combining the physical envelope, subsystem
        composition, and exhibited power-mode behavior.
        */
        part panels     [4] : SolarPanel;
        part batteries  [2] : Battery;
        part thrusters  [8] : Thruster;
        part controller     : PowerMode;
        part bus            : PowerDistribution;
        part payload        : Payload;

        exhibit state powerMode : PowerMode;
    }

    part observatory : Observatory {
        doc /* # Mission observatory

        Concrete observatory used by the budgets, connections, and example views.
        */
    }

    // \u2500\u2500 Interconnections (ports, connectors, interface, flow, binding) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    connect observatory.panels.pwrOut     to observatory.bus.panelIn;
    connect observatory.batteries.pwrPort to observatory.bus.batteryIn;
    interface : PowerBus connect observatory.bus.loadOut to observatory.batteries.pwrPort;
    flow of t : Telemetry from observatory.payload.dataOut to observatory.bus.dataIn;
    bind observatory.bus.panelIn.voltage = observatory.bus.busVoltage;

    attribute totalMass : MassValue = sum(observatory.panels.mass)
        + sum(observatory.batteries.mass) + sum(observatory.thrusters.mass)
        + observatory.bus.mass + observatory.payload.mass {
        doc /* # Total dry mass

        Rolls up every subsystem mass, including multiplicities, for the launch
        mass-budget check.
        */
    }

    attribute solarGen : PowerValue = sum(observatory.panels.peakPower);
    attribute houseLoad : PowerValue = observatory.bus.idlePower
        + observatory.payload.activePower;
    attribute powerMargin : PowerValue = solarGen - houseLoad {
        doc /* # Power margin

        Remaining generated power after the nominal bus and payload loads.
        */
    }

    attribute peakDemand : PowerValue = max(solarGen, houseLoad);

    attribute totalEnergy : EnergyValue = sum(observatory.batteries.capacity);
    attribute eclipseTime : TimeValue   = totalEnergy / houseLoad;
    attribute totalUsableEnergy : EnergyValue = sum(observatory.batteries.usableEnergy);
    attribute eclipseReserveTime : TimeValue = totalUsableEnergy / houseLoad {
        doc /* # Eclipse reserve time

        Estimates nominal endurance from usable battery energy and house load.
        */
    }

    attribute totalThrust : ForceValue = sum(observatory.thrusters.thrust);
    attribute totalImpulse : ImpulseValue = sum(observatory.thrusters.totalImpulse);
    attribute maneuverDeltaV : SpeedValue = totalImpulse / totalMass;

    attribute overBudget : Boolean = totalMass > 100 [kg];
    attribute safePower             = if powerMargin > 0 [W] ? 1 else 0;
}
`},{path:"interfaces/Interfaces.sysml",text:`package SatelliteInterfaces {
    private import ISQ::*;
    private import SI::*;

    port def PowerPort {
        doc /* # Power port

        Shared electrical connection point for power-producing, storage, and
        distribution components.
        */
        attribute voltage : ElectricPotentialValue;
    }

    port def DataPort {
        doc /* # Data port

        Connection point for digital spacecraft data.
        */
    }

    item def Telemetry {
        doc /* # Telemetry

        Data item streamed from the payload across telemetry flows.
        */
    }

    // An interface definition pairs two ports as its ends. An end takes no
    // direction keyword: SysML.xtext's OccurrenceUsagePrefix is the alternation
    // \`EndUsagePrefix | BasicUsagePrefix \u2026\`, so \`end\` and a FeatureDirection are
    // mutually exclusive. Every interface end in the OMG corpus is written this
    // way. The in/out/inout demo lives on PowerDistribution's ports instead.
    interface def PowerBus {
        doc /* # Power bus interface

        Pairs a supplying power port with a consuming power port.
        */
        end supply : PowerPort;
        end load   : PowerPort;
    }
}
`},{path:"subsystems/Battery.sysml",text:`package Energy {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::Real;
    private import SatelliteInterfaces::PowerPort;

    part def Battery {
        doc /* # Battery

        Stores spacecraft energy and derives usable energy, peak power, and
        nominal reserve time from its electrical ratings.
        */
        attribute mass       : MassValue              = 8       [kg];
        attribute capacity   : EnergyValue            = 1296000 [J];
        attribute voltage    : ElectricPotentialValue = 28      [V];
        attribute maxCurrent : ElectricCurrentValue   = 46      [A];
        attribute peakPower  : PowerValue = voltage * maxCurrent;
        attribute depthOfDischarge : Real = 0.8;
        attribute nominalLoad : PowerValue = 130 [W];
        attribute usableEnergy : EnergyValue = capacity * depthOfDischarge;
        attribute reserveTime : TimeValue = usableEnergy / nominalLoad;

        port pwrPort : PowerPort;
    }
}
`},{path:"subsystems/SolarPanel.sysml",text:`package Power {
    private import ISQ::*;
    private import SI::*;
    private import ScalarValues::*;
    private import SatelliteInterfaces::PowerPort;
    private import Geometry::PanelWing;

    part def BasePanel {
        doc /* # Base panel

        Reusable base definition for power-generating panels.
        */
        attribute mass : MassValue default 1.0 [kg];
    }

    part def SolarPanel :> BasePanel, PanelWing {
        doc /* # Solar panel

        Combines the reusable panel mass with deployable geometry and derives
        peak output from irradiance, area, and conversion efficiency.
        */
        attribute :>> mass   : MassValue  = 3.5 [kg];
        attribute efficiency : Real       = 0.20;
        attribute solarIrradiance : IrradianceValue = 1000 [W] / (1 [m] * 1 [m]);

        attribute width  : LengthValue = 0.6 [m];
        attribute height : LengthValue = 1.0 [m];
        attribute area   : AreaValue   = width * height;
        attribute peakPower : PowerValue = solarIrradiance * area * efficiency;

        port pwrOut : PowerPort;
    }
}
`},{path:"subsystems/Thruster.sysml",text:`package Propulsion {
    private import ISQ::*;
    private import SI::*;

    part def Thruster {
        doc /* # Cold-gas thruster

        Reaction-control thruster for fine attitude control and reaction-wheel
        desaturation. Each unit carries its share of the cluster propellant and
        derives total impulse from thrust and burn duration.
        */
        attribute mass       : MassValue  = 0.22 [kg];
        attribute thrust     : ForceValue = 0.5  [N];
        attribute isp        : TimeValue  = 220  [s];   // specific impulse
        attribute propellant : MassValue  = 0.05 [kg];  // propellant mass per unit
        attribute burnDuration : TimeValue = 10 [s];
        attribute totalImpulse : ImpulseValue = thrust * burnDuration;
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

    state def PowerMode {
        doc /* # Satellite power modes

        The nominal eclipse cycle is \`nominal \u2192 eclipse \u2192 charging \u2192 nominal\`.
        Faults enter parallel thermal-hold and communications-beacon regions;
        recovery requires \`faultCleared\`.
        */
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

    action def Commission {
        doc /* # Commission

        Runs the one-time post-separation sequence. Detumbling is followed by
        parallel battery charging and Sun acquisition, then a health decision.
        */
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
        doc /* # Publish telemetry

        Publishes the commissioning report through the telemetry interface.
        */
        in report : Telemetry;
    }

    attribute def CommandSignal;
}
`},{path:"requirements/Requirements.sysml",text:`package MissionRequirements {
    private import ISQ::*;
    private import SI::*;

    requirement def MassBudgetRequirement {
        doc /* # Mass budget

        The spacecraft dry mass shall not exceed the launch allocation.
        */

        attribute massActual : MassValue;
        attribute massLimit  : MassValue = 100 [kg];

        require constraint {
            massActual <= massLimit
        }
    }

    requirement def PowerPositiveRequirement {
        doc /* # Positive power margin

        Available generation shall exceed the nominal spacecraft load.
        */

        attribute powerMargin : PowerValue;

        require constraint {
            powerMargin > 0 [W]
        }
    }

    requirement def ImagingDurationRequirement {
        doc /* # Imaging duration

        Each imaging pass shall fit within its ten-minute contact window.
        */

        attribute imagingDuration : TimeValue = 300 [s];
        attribute contactDuration : TimeValue = 600 [s];

        require constraint {
            imagingDuration <= contactDuration
        }
    }

    // Concrete evidence used by the checks below.
    part nominalMission {
        attribute dryMass : MassValue = 88 [kg];
        attribute powerMargin : PowerValue = 240 [W];
        attribute imagingDuration : TimeValue = 300 [s];
    }

    part overweightMission {
        attribute dryMass : MassValue = 108 [kg];
        attribute powerMargin : PowerValue = 240 [W];
    }

    part incompleteMission;

    requirement missionReadiness {
        subject mission;

        requirement massBudget {
            require constraint { mission.dryMass <= 100 [kg] }
        }

        requirement positivePower {
            require constraint { mission.powerMargin > 0 [W] }
        }

        requirement imagingWindow {
            require constraint { mission.imagingDuration <= 600 [s] }
        }
    }

    // All three nested requirements are satisfied, so the parent is satisfied.
    satisfy missionReadiness by nominalMission;

    // The mass child is violated, so the parent is violated.
    satisfy missionReadiness by overweightMission;

    // No evidence values are supplied, so the result is undetermined and the
    // editor reports which values are missing.
    satisfy missionReadiness by incompleteMission;

    requirement launchWeather {
        subject mission;
        assume constraint { false }
        require constraint { mission.windSpeed <= 10 [m/s] }
    }

    // A false assumption makes this requirement not applicable, not satisfied.
    satisfy launchWeather by nominalMission;
}
`},{path:"analysis/CalculationPatterns.sysml",text:`package CalculationPatterns {
    private import ScalarValues::*;
    private import ISQ::*;
    private import SI::*;
    private import RealFunctions::*;
    private import SequenceFunctions::*;
    private import ControlFunctions::*;

    part def BudgetBase {
        doc /* # Reusable mass budget

        Defines an adjusted-mass equation whose \`factor\` may be redefined by a
        specialization. The equation continues to use the redefined value.
        */
        attribute rawMass : MassValue = 10 [kg];
        attribute factor  : Real default 1.0;
        attribute adjustedMass : MassValue = rawMass * factor;
    }
    part def FlightBudget :> BudgetBase {
        doc /* # Flight mass budget

        Specializes the base budget with a flight-specific adjustment factor.
        */
        attribute :>> factor : Real = 1.1;
    }
    part budget : FlightBudget;

    part def SolarArray {
        doc /* # Solar array input

        Provides the generated power consumed by the calculation examples.
        */
        attribute generatedPower : PowerValue = 480 [W];
    }
    part def FlightComputer {
        attribute requiredPower : PowerValue = 50 [W];
    }
    part def SciencePayload {
        attribute requiredPower : PowerValue = 80 [W];
    }
    part def SpacecraftPowerSystem {
        doc /* # Spacecraft power system

        Groups generation and load contributors so calculations can accept a
        model element as a typed input.
        */
        part solarArray : SolarArray;
        part flightComputer : FlightComputer;
        part sciencePayload : SciencePayload;
    }
    part powerSystem : SpacecraftPowerSystem;

    calc def ArrayOutput {
        doc /* # Array output

        Returns the generated power of a supplied \`SolarArray\` model element.
        */
        in array : SolarArray;
        return result : PowerValue = array.generatedPower;
    }
    attribute measuredGeneration : PowerValue = ArrayOutput(powerSystem.solarArray);

    // Collection construction, member navigation, and aggregation establish
    // the load used by both forms of PowerMargin invocation below.
    attribute loadContributions : PowerValue[*] = (
        powerSystem.flightComputer.requiredPower,
        powerSystem.sciencePayload.requiredPower
    );
    attribute totalLoad : PowerValue = sum(loadContributions);

    calc def PowerMargin {
        doc /* # Power margin

        Subtracts aggregate load from available generation. The example invokes
        this calculation as both a typed usage and a direct function call.
        */
        in generation : PowerValue;
        in load : PowerValue;
        attribute reserve : PowerValue = generation - load;
        return result : PowerValue = reserve;
    }
    calc margin : PowerMargin {
        in generation = measuredGeneration;
        in load = totalLoad;
    }
    attribute directMargin : PowerValue = PowerMargin(measuredGeneration, totalLoad);

    part nestedMetrics {
        doc /* # Nested power metrics

        Demonstrates equations that depend on another calculation's result.
        */
        attribute usablePower : PowerValue = margin.result * 0.8;
        attribute doubledPower : PowerValue = usablePower * 2.0;
    }

    constraint def BelowLimit {
        doc /* # Below limit

        Checks that a measured mass does not exceed its allowed limit.
        */
        in value : MassValue;
        in limit : MassValue;
        value <= limit
    }
    constraint massCheck : BelowLimit {
        in value = budget.adjustedMass;
        in limit = maximumAdjustedMass;
    }

    attribute maximumAdjustedMass : MassValue = 15 [kg];
    attribute integrationAllowance : MassValue = 2 [kg];
    attribute computedMass : MassValue;
    assert constraint { computedMass == budget.adjustedMass + integrationAllowance }

    // A binding connector identifies both features with the same value.
    attribute mirroredMass : MassValue;
    bind mirroredMass = computedMass;

    // Concrete standard-library functions and collection operators.
    attribute redundancyFactors : Integer[*] = (2, 3, 4);
    attribute productValue : Integer = product(redundancyFactors);
    attribute squaredCalibration : Real = 81.0;
    attribute rootValue : Real = sqrt(squaredCalibration);
    attribute sampleWindow : Integer[*] = 1 .. 5;
    attribute sampleCount : Integer = sampleWindow->size();
    attribute telemetryChannels : Integer[*] = (1, 2, 3);
    attribute requiredChannel : Integer = 3;
    attribute containsThree : Boolean = telemetryChannels->includes(requiredChannel);
    attribute checksPass : Boolean = allTrue((massCheck.result, containsThree));
}
`},{path:"analysis/Functions.kerml",text:`package DemoFunctions {
    function Affine {
        doc /* # Affine function

        Doubles \`x\`, then applies \`offset\`. The local equation is evaluated
        before the trailing result expression.
        */
        in x;
        in offset;
        feature doubled = x * 2;
        doubled + offset
    }

    feature functionResult = Affine(17, 8);
}
`},{path:"mission/FlightArticle.sysml",text:`package FlightArticles {
    private import Satellite::*;
    private import MissionTimeline::*;

    individual part def Pathfinder :> Observatory {
        doc /* # Pathfinder

        Identifies the mission's specific flight observatory rather than a
        reusable spacecraft class.
        */
    }

    individual part pathfinder : Pathfinder {
        doc /* # Pathfinder flight article

        The deployed article, including its single commissioning timeslice.
        */
        timeslice commissioning [1] : Pathfinder;
    }

    individual part firstGroundContact : ContactWindow {
        doc /* # First ground contact

        The first scheduled contact opportunity for Pathfinder.
        */
    }
}
`},{path:"mission/MissionTimeline.sysml",text:`package MissionTimeline {
    private import ISQ::*;
    private import SI::*;
    private import Time::*;

    item def MissionEvent {
        doc /* # Mission event

        A timestamped event in the mission timeline.
        */
    }

    individual part def ContactWindow {
        doc /* # Contact window

        A ten-minute ground-contact occurrence. Its nested \`imagingPass\`
        timeslice reserves the interval from 120 to 420 seconds after start.
        */
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
    part def SatelliteBody :> SpatialItem {
        doc /* # Satellite body

        Physical spacecraft envelope represented as a one-metre-tall box.
        */
        item :>> shape = new Box(0.8 [m], 0.8 [m], 1.0 [m]);
    }

    part def PanelWing :> SpatialItem {
        doc /* # Panel wing

        Thin deployable wing used as the geometric base for each solar panel.
        */
        item :>> shape = new Box(0.6 [m], 0.03 [m], 1.0 [m]);
    }

    part spacecraftGeometry : SatelliteBody {
        doc /* # Spacecraft geometry

        Body-centered assembly with port and starboard panel wings.
        */
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
        doc /* # Reference-driven stack

        Places a cone and cylinder from one millimetre datum. The cylinder height
        and placement reference the cone, keeping the geometry associative.
        */
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        part cone :> componentParts {
            doc /* ## Inverted cone

            Translates by its own height and rotates 180\xB0 so its apex meets the
            stack origin.
            */
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

        part cylinder :> componentParts {
            doc /* ## Referenced cylinder

            Derives height and placement from the cone, then rotates downward
            toward the cone base.
            */
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

    item def MarkerShape :> Sphere {
        doc /* # Marker shape

        Reusable spherical marker centered on its local origin.
        */
        :>> radius = 15 [mm];
    }

    part assembly : SpatialItem {
        doc /* # Sphere marker assembly

        Centers a spherical body at the datum and places reusable markers along
        the equatorial and polar axes.
        */
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
        doc /* # Pedestal shape

        Reusable cubic base for the stacked geometry.
        */
        :>> length = 100 [mm];
        :>> width = 100 [mm];
        :>> height = 100 [mm];
    }

    part stack : SpatialItem {
        doc /* # Transformed shape stack

        Demonstrates rotation-only and translation-plus-rotation transforms for
        a cube, cylinder, and cone sharing one datum.
        */
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

    part def Vehicle :> SpatialItem {
        doc /* # Vehicle

        Spatial base definition for the frame-placement example.
        */
    }

    part def Chassis :> SpatialItem {
        doc /* # Chassis

        Vehicle body represented by a rectangular metric envelope.
        */
        item :>> shape = new Box(4800 [mm], 1840 [mm], 1350 [mm]);
    }

    part def Wheel :> SpatialItem {
        doc /* # Wheel

        Cylindrical wheel with a separate coordinate frame for placement on the
        vehicle.
        */
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
        doc /* # Four-wheel vehicle

        Places one chassis and four wheels from a shared millimetre datum using
        translation and rotation sequences.
        */
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
        doc /* # Lug bolt

        Cylindrical fastener reused by the wheel pattern.
        */
        item :>> shape : Cylinder {
            :>> radius = 14 [mm];
            :>> height = 40 [mm];
        }
    }

    part wheel : SpatialItem {
        doc /* # Parametric lug pattern

        Distributes a configurable number of lug bolts evenly around a placement
        radius. The constraint derives each bolt frame from its sequence index.
        */
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
`},{path:"structure/GeometryWheelSeparateFrame.sysml",text:`package GeometryWheelSeparateFrame {
    private import TrigFunctions::cos;
    private import TrigFunctions::sin;
    private import TrigFunctions::pi;
    private import ISQ::*;
    private import SI::*;
    private import ShapeItems::*;
    private import SpatialItems::*;
    private import MeasurementReferences::CoordinateFrame;
    private import MeasurementReferences::TranslationRotationSequence;
    private import MeasurementReferences::Translation;
    private import ScalarValues::Natural;
    private import ScalarValues::Real;
    private import ControlFunctions::forAll;

    part def LugBolt :> SpatialItem {
        doc /* # Lug bolt

        Cylindrical fastener reused by the wheel pattern.
        */
        item :>> shape : Cylinder {
            :>> radius = 14 [mm];
            :>> height = 40 [mm];
        }
    }

    part wheel : SpatialItem {
        doc /* # Separate-frame lug pattern

        Distributes lug bolts from \`wcf\`, a frame separate from the wheel's own
        \`coordinateFrame\`. This mirrors the OMG vehicle-coordinate-frame pattern.
        */
        attribute datum :>> coordinateFrame {
            :>> mRefs = (mm, mm, mm);
        }

        attribute <wcf> wheelCoordinateFrame : CoordinateFrame;

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
                    :>> source = wcf;
                    :>> target = boltFrame;
                    :>> elements = new Translation((
                        placementRadius * cos((i - 1) * distributionAngleRadians),
                        placementRadius * sin((i - 1) * distributionAngleRadians),
                        -8
                    )[wcf]);
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
        doc /* # Safety metadata

        Marks hardware as safety-related and records whether it is mandatory.
        */
        attribute isMandatory : Boolean;
    }
    metadata def FlightCritical {
        doc /* # Flight-critical metadata

        Marks hardware whose loss would threaten the mission.
        */
    }

    part def GroundStation {
        doc /* # Ground station

        Receives spacecraft telemetry across the flight-to-ground boundary.
        */
        in port telemetryIn : SatelliteInterfaces::DataPort;
        attribute antennaGain : Real = 42.0;      // dBi
    }

    part def DeployableBoom {
        doc /* # Deployable boom

        Reusable deployable hardware selected by the safety views.
        */
        attribute mass : MassValue = 1.4 [kg];
    }

    part segment {
        doc /* # Ground and deployable segment

        Adds the ground station and annotated deployables used by cross-cutting
        views without extending the flight model itself.
        */
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

    view def InterconnectView {
        doc /* # Interconnection view

        Reusable view type for ports, flows, and connections.
        */
    }

    view def BreakdownView {
        doc /* # Breakdown view

        Reusable view type for containment and filtered model slices.
        */
    }

    view powerChain : InterconnectView {
        doc /* # Observatory power chain

        Shows the observatory's nested subsystems, directed ports, and declared
        power connections in their containing context.
        */
        render asInterconnectionDiagram;
        expose Satellite::observatory;
    }

    view telemetryDownlink : InterconnectView {
        doc /* # Telemetry downlink

        Spans the flight and ground containers to show the end-to-end telemetry
        path.
        */
        render asInterconnectionDiagram;
        expose Satellite::observatory;
        expose segment;
    }

    view massBreakdown : BreakdownView {
        doc /* # Dry-mass breakdown

        Displays the containment structure behind \`Satellite::totalMass\`.
        */
        render asTreeDiagram;
        expose Satellite::observatory::**;
    }

    view propulsionSlice : BreakdownView {
        doc /* # Propulsion slice

        Pairs the reusable thruster definition with its observatory usage while
        excluding unrelated imported elements.
        */
        render asTreeDiagram;
        expose Propulsion::Thruster;
        expose Satellite::observatory::thrusters;
    }

    view safetyCritical : BreakdownView {
        doc /* # Safety-related hardware

        Filters the segment to every element carrying \`@Safety\` metadata.
        */
        render asTreeDiagram;
        expose segment::**;
        filter @Safety;
    }

    view mandatorySafety : BreakdownView {
        doc /* # Mandatory safety hardware

        Narrows the safety view to annotations whose \`isMandatory\` value is true.
        */
        render asTreeDiagram;
        expose segment::**;
        filter @Safety and (as Safety).isMandatory;
    }

    view flightCritical : BreakdownView {
        doc /* # Flight-critical hardware

        Selects every segment element annotated with \`@FlightCritical\`.
        */
        render asTreeDiagram;
        expose segment::**;
        filter @FlightCritical;
    }

    view busContext : BreakdownView {
        doc /* # Bus context

        Shows the observatory bus itself and owns a second view detailing its
        reusable port and interface types.
        */
        render asTreeDiagram;
        expose Satellite::observatory::bus;

        view busPorts : BreakdownView {
            doc /* ## Bus types

            Displays the power port, data port, and power-bus interface types.
            */
            render asTreeDiagram;
            expose SatelliteInterfaces::PowerPort;
            expose SatelliteInterfaces::DataPort;
            expose SatelliteInterfaces::PowerBus;
        }
    }

    view everything : BreakdownView {
        doc /* # Complete satellite model

        Collects the observatory structure and top-level budget attributes while
        deliberately excluding anonymous connections and imported library trees.
        */
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
`}]});export{b as a,f as b,g as c,y as d,h as e,S as f};
