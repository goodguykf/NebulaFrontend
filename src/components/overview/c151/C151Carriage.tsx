import { C151, C151_COLORS } from "@/components/overview/c151/dimensions";
import { createC151BodyGeometry, saloonLayout } from "@/components/overview/c151/geometry";
import { SubsystemType } from "@/types/analysis";
import { useMemo } from "react";
import { DoubleSide } from "three";

interface C151CarriageProps {
  highlighted: SubsystemType | null;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
}

function select(
  event: { stopPropagation: () => void },
  subsystem: SubsystemType,
  onSelect: (subsystem: SubsystemType) => void,
) {
  event.stopPropagation();
  onSelect(subsystem);
}

function emissive(active: boolean, color: string): string {
  return active ? color : "#000000";
}

function sideZ(side: 1 | -1, extra = 0): number {
  return side * (C151.width / 2 + 0.18 + extra);
}

function GlazedPane({
  width,
  height,
  side,
}: {
  width: number;
  height: number;
  side: 1 | -1;
}) {
  const frame = 0.05;
  return (
    <group>
      <mesh>
        <boxGeometry args={[width + frame * 2, height + frame * 2, 0.05]} />
        <meshStandardMaterial color={C151_COLORS.gasket} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0, -side * 0.008]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial color={C151_COLORS.interior} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, side * 0.016]}>
        <boxGeometry args={[width, height, 0.022]} />
        <meshStandardMaterial
          color={C151_COLORS.glass}
          metalness={0.22}
          roughness={0.08}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function TwinLeafDoor({
  centerX,
  side,
  highlighted,
  onHighlight,
  onSelect,
}: {
  centerX: number;
  side: 1 | -1;
  highlighted: boolean;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
}) {
  const doorH = C151.doorHeight;
  const doorW = C151.doorWidth;
  const doorY = C151.floorHeight + doorH / 2 - 0.06;
  const leafW = doorW / 2 - 0.01;
  const stripeLocalY = C151.stripeCenter - doorY;

  return (
    <group
      position={[centerX, doorY, sideZ(side, 0.03)]}
      onPointerOver={() => onHighlight("door")}
      onPointerOut={() => onHighlight(null)}
      onClick={(event) => select(event, "door", onSelect)}
    >
      <mesh position={[0, 0, -side * 0.02]}>
        <boxGeometry args={[doorW + 0.1, doorH + 0.08, 0.04]} />
        <meshStandardMaterial color={C151_COLORS.gasket} roughness={0.65} />
      </mesh>

      {[-1, 1].map((leaf) => {
        const kickH = 0.62;
        const stile = 0.055;
        const topRail = 0.08;
        const glassW = leafW - stile * 2;
        const glassH = doorH - kickH - topRail - 0.06;
        const glassY = -doorH / 2 + kickH + glassH / 2 + 0.02;
        return (
          <group key={`leaf-${leaf}`} position={[(leaf * leafW) / 2 + leaf * 0.006, 0, 0]}>
            <mesh position={[0, -doorH / 2 + kickH / 2, 0]}>
              <boxGeometry args={[leafW, kickH, 0.055]} />
              <meshStandardMaterial
                color={highlighted ? "#E8A07A" : "#B8C2CC"}
                metalness={0.3}
                roughness={0.4}
                emissive={emissive(highlighted, "#F08A5D")}
                emissiveIntensity={highlighted ? 0.18 : 0}
              />
            </mesh>
            <mesh position={[0, doorH / 2 - topRail / 2, 0]}>
              <boxGeometry args={[leafW, topRail, 0.055]} />
              <meshStandardMaterial
                color={highlighted ? "#E8A07A" : "#B8C2CC"}
                metalness={0.3}
                roughness={0.42}
              />
            </mesh>
            {[-1, 1].map((edge) => (
              <mesh key={`stile-${edge}`} position={[(edge * (leafW - stile)) / 2, 0, 0]}>
                <boxGeometry args={[stile, doorH, 0.055]} />
                <meshStandardMaterial
                  color={highlighted ? "#E8A07A" : "#B8C2CC"}
                  metalness={0.3}
                  roughness={0.42}
                />
              </mesh>
            ))}
            <group position={[0, glassY, 0]}>
              <GlazedPane width={glassW} height={glassH} side={side} />
            </group>
            <mesh position={[0, stripeLocalY, side * 0.03]}>
              <boxGeometry args={[leafW + 0.01, C151.stripeHeight, 0.02]} />
              <meshStandardMaterial color={C151_COLORS.stripe} metalness={0.15} roughness={0.45} />
            </mesh>
            <mesh position={[leaf * (leafW / 2 - 0.05), -doorH / 2 + kickH - 0.12, side * 0.032]}>
              <boxGeometry args={[0.035, 0.16, 0.03]} />
              <meshStandardMaterial color={C151_COLORS.gasket} metalness={0.55} roughness={0.3} />
            </mesh>
          </group>
        );
      })}

      <mesh position={[0, 0, side * 0.028]}>
        <boxGeometry args={[0.04, doorH - 0.08, 0.04]} />
        <meshStandardMaterial color={C151_COLORS.gasket} roughness={0.55} />
      </mesh>

      <mesh position={[0, doorH / 2 + 0.07, side * 0.01]}>
        <boxGeometry args={[0.92, 0.1, 0.04]} />
        <meshStandardMaterial color="#2A333E" roughness={0.55} />
      </mesh>
      {[-0.16, 0, 0.16].map((ledX) => (
        <mesh key={`led-${ledX}`} position={[ledX, doorH / 2 + 0.07, side * 0.034]}>
          <boxGeometry args={[0.09, 0.045, 0.02]} />
          <meshStandardMaterial
            color={C151_COLORS.led}
            emissive={C151_COLORS.led}
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function SaloonWindows({
  panes,
  side,
}: {
  panes: { x: number; width: number }[];
  side: 1 | -1;
}) {
  const y = C151.windowSill + C151.windowHeight / 2;
  return (
    <>
      {panes.map((pane) => (
        <group key={`win-${side}-${pane.x}`} position={[pane.x, y, sideZ(side, 0.02)]}>
          <GlazedPane width={pane.width} height={C151.windowHeight} side={side} />
        </group>
      ))}
    </>
  );
}

function CabSideWindows({ side }: { side: 1 | -1 }) {
  const x = -C151.length / 2 + 1.18;
  const y = 2.24;
  return (
    <group position={[x, y, sideZ(side, 0.02)]}>
      <GlazedPane width={C151.cabSideWindowWidth} height={C151.cabSideWindowHeight} side={side} />
    </group>
  );
}

function GangwayEnd({
  highlighted,
  onHighlight,
  onSelect,
}: {
  highlighted: boolean;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
}) {
  const x = C151.length / 2;
  const halfW = C151.width / 2;
  const portalY = C151.floorHeight + 0.97;

  return (
    <group
      onPointerOver={() => onHighlight("shm")}
      onPointerOut={() => onHighlight(null)}
      onClick={(event) => select(event, "shm", onSelect)}
    >
      <mesh position={[x + 0.05, (C151.bodyBottom + C151.sideTop) / 2, 0]}>
        <boxGeometry args={[0.12, C151.sideTop - C151.bodyBottom + 0.06, C151.width - 0.06]} />
        <meshStandardMaterial
          color={highlighted ? "#8B7CFF" : C151_COLORS.aluminium}
          metalness={0.42}
          roughness={0.38}
          emissive={emissive(highlighted, "#8B7CFF")}
          emissiveIntensity={highlighted ? 0.18 : 0}
        />
      </mesh>
      <mesh position={[x + 0.04, C151.sideTop + 0.2, 0]}>
        <boxGeometry args={[0.14, 0.42, 2.35]} />
        <meshStandardMaterial color={C151_COLORS.roof} metalness={0.25} roughness={0.45} />
      </mesh>
      <mesh position={[x + 0.06, C151.roofPeak - 0.08, 0]}>
        <boxGeometry args={[0.1, 0.22, 1.15]} />
        <meshStandardMaterial color={C151_COLORS.aluminiumDark} metalness={0.35} roughness={0.4} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <mesh
          key={`end-stripe-${side}`}
          position={[x + 0.08, C151.stripeCenter, side * (halfW - 0.28)]}
        >
          <boxGeometry args={[0.06, C151.stripeHeight, 0.55]} />
          <meshStandardMaterial color={C151_COLORS.stripe} metalness={0.15} roughness={0.45} />
        </mesh>
      ))}

      <mesh position={[x + 0.07, portalY, 0]}>
        <boxGeometry args={[0.1, 2.08, 1.38]} />
        <meshStandardMaterial color={C151_COLORS.gasket} roughness={0.7} />
      </mesh>
      <mesh position={[x + 0.14, portalY, 0]}>
        <boxGeometry args={[0.16, 1.72, 0.98]} />
        <meshStandardMaterial color="#10151C" roughness={1} />
      </mesh>

      {Array.from({ length: 7 }, (_, index) => (
        <mesh
          key={`bellows-${index}`}
          position={[x + 0.16 + index * 0.07, portalY, 0]}
        >
          <boxGeometry
            args={[0.055, 1.96 - (index % 2) * 0.04, 1.2 + (index % 2 === 0 ? 0.1 : -0.06)]}
          />
          <meshStandardMaterial color={C151_COLORS.gangway} roughness={0.88} metalness={0.08} />
        </mesh>
      ))}

      <mesh position={[x + 0.38, C151.floorHeight + 0.03, 0]}>
        <boxGeometry args={[0.58, 0.07, 1.08]} />
        <meshStandardMaterial color="#3A424C" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[x + 0.34, portalY + 1.02, 0]}>
        <boxGeometry args={[0.52, 0.09, 1.28]} />
        <meshStandardMaterial color={C151_COLORS.gasket} roughness={0.6} />
      </mesh>

      {([-1.05, 1.05] as const).map((z) => (
        <mesh key={`marker-${z}`} position={[x + 0.12, 1.22, z]}>
          <sphereGeometry args={[0.075, 16, 12]} />
          <meshStandardMaterial
            color={C151_COLORS.taillight}
            emissive={C151_COLORS.taillight}
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}

      <mesh position={[x + 0.14, C151.bodyBottom - 0.06, 0]}>
        <boxGeometry args={[0.18, 0.22, 2.45]} />
        <meshStandardMaterial
          color={highlighted ? "#8B7CFF" : C151_COLORS.skirt}
          metalness={0.45}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[x + 0.4, C151.couplerHeight, 0]}>
        <boxGeometry args={[0.58, 0.22, 0.42]} />
        <meshStandardMaterial color={C151_COLORS.gasket} metalness={0.62} roughness={0.32} />
      </mesh>
      <mesh position={[x + 0.72, C151.couplerHeight, 0]}>
        <boxGeometry args={[0.16, 0.3, 0.36]} />
        <meshStandardMaterial color="#4A525C" metalness={0.7} roughness={0.28} />
      </mesh>
      {([-0.32, 0.32] as const).map((z) => (
        <mesh
          key={`jumper-${z}`}
          position={[x + 0.38, 0.52, z]}
          rotation={[0, 0, 0.55]}
        >
          <cylinderGeometry args={[0.032, 0.032, 0.48, 10]} />
          <meshStandardMaterial color="#1C1C1C" roughness={0.7} />
        </mesh>
      ))}
      {([-0.55, 0.55] as const).map((z) => (
        <mesh key={`ebox-${z}`} position={[x + 0.16, 0.72, z]}>
          <boxGeometry args={[0.14, 0.22, 0.2]} />
          <meshStandardMaterial color={C151_COLORS.aluminiumDark} metalness={0.4} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

export function C151Carriage({ highlighted, onHighlight, onSelect }: C151CarriageProps) {
  const body = useMemo(() => createC151BodyGeometry(), []);
  const layout = useMemo(() => saloonLayout(), []);
  const bogieX = C151.bogieSpread / 2;
  const stripeStart = -C151.length / 2 + C151.cabLength + 0.12;
  const stripeEnd = C151.length / 2 - 0.06;
  const stripeLen = stripeEnd - stripeStart;
  const stripeX = (stripeStart + stripeEnd) / 2;

  return (
    <group>
      <mesh
        geometry={body}
        castShadow
        receiveShadow
        onPointerOver={() => onHighlight("shm")}
        onPointerOut={() => onHighlight(null)}
        onClick={(event) => select(event, "shm", onSelect)}
      >
        <meshStandardMaterial
          color={C151_COLORS.aluminium}
          metalness={0.42}
          roughness={0.38}
          envMapIntensity={0.9}
        />
      </mesh>

      <mesh position={[stripeX, C151.stripeCenter, sideZ(1)]}>
        <boxGeometry args={[stripeLen, C151.stripeHeight, 0.04]} />
        <meshStandardMaterial color={C151_COLORS.stripe} metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[stripeX, C151.stripeCenter, sideZ(-1)]}>
        <boxGeometry args={[stripeLen, C151.stripeHeight, 0.04]} />
        <meshStandardMaterial color={C151_COLORS.stripe} metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[-(C151.length / 2) + 0.12, C151.stripeCenter, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[C151.width - 0.35, C151.stripeHeight, 0.04]} />
        <meshStandardMaterial color={C151_COLORS.stripe} metalness={0.15} roughness={0.45} />
      </mesh>

      <mesh position={[0, C151.bodyBottom + 0.08, 0]}>
        <boxGeometry args={[C151.length - 0.6, 0.18, C151.width - 0.12]} />
        <meshStandardMaterial
          color={highlighted === "shm" ? "#8B7CFF" : C151_COLORS.skirt}
          metalness={0.3}
          roughness={0.5}
          emissive={emissive(highlighted === "shm", "#8B7CFF")}
          emissiveIntensity={highlighted === "shm" ? 0.25 : 0}
        />
      </mesh>

      <group position={[-(C151.length / 2) - 0.05, 2.28, 0]}>
        <mesh>
          <boxGeometry args={[0.06, 0.92, 2.15]} />
          <meshStandardMaterial
            color={C151_COLORS.gasket}
            metalness={0.1}
            roughness={0.65}
          />
        </mesh>
        <mesh position={[0.03, 0.02, -0.56]}>
          <boxGeometry args={[0.04, 0.78, 0.92]} />
          <meshPhysicalMaterial
            color={C151_COLORS.glass}
            metalness={0.1}
            roughness={0.08}
            transmission={0.18}
            transparent
            opacity={0.92}
            thickness={0.04}
          />
        </mesh>
        <mesh position={[0.03, 0.02, 0.56]}>
          <boxGeometry args={[0.04, 0.78, 0.92]} />
          <meshPhysicalMaterial
            color={C151_COLORS.glass}
            metalness={0.1}
            roughness={0.08}
            transmission={0.18}
            transparent
            opacity={0.92}
            thickness={0.04}
          />
        </mesh>
        <mesh position={[0.02, 0.58, 0.72]}>
          <boxGeometry args={[0.05, 0.16, 0.52]} />
          <meshStandardMaterial color="#16382C" />
        </mesh>
      </group>

      <mesh position={[-(C151.length / 2) - 0.08, 1.18, -0.72]}>
        <sphereGeometry args={[0.11, 24, 16]} />
        <meshStandardMaterial color={C151_COLORS.headlight} emissive={C151_COLORS.headlight} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[-(C151.length / 2) - 0.08, 1.18, 0.72]}>
        <sphereGeometry args={[0.09, 24, 16]} />
        <meshStandardMaterial color={C151_COLORS.taillight} emissive={C151_COLORS.taillight} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-(C151.length / 2) - 0.22, C151.couplerHeight, 0]}>
        <boxGeometry args={[0.55, 0.22, 0.42]} />
        <meshStandardMaterial color={C151_COLORS.gasket} metalness={0.6} roughness={0.35} />
      </mesh>

      {layout.doors.map((door) =>
        ([1, -1] as const).map((side) => (
          <TwinLeafDoor
            key={`door-${door.center}-${side}`}
            centerX={door.center}
            side={side}
            highlighted={highlighted === "door"}
            onHighlight={onHighlight}
            onSelect={onSelect}
          />
        )),
      )}

      {([1, -1] as const).map((side) => (
        <group key={`glazing-${side}`}>
          <CabSideWindows side={side} />
          <SaloonWindows panes={layout.windows} side={side} />
        </group>
      ))}

      {[-4.2, 3.4].map((x) => (
        <group key={`hvac-${x}`} position={[x, C151.roofPeak + 0.18, 0]}>
          <mesh
            onPointerOver={() => onHighlight("acv")}
            onPointerOut={() => onHighlight(null)}
            onClick={(event) => select(event, "acv", onSelect)}
          >
            <boxGeometry args={[4.35, 0.52, 1.78]} />
            <meshStandardMaterial
              color={highlighted === "acv" ? "#5FB8B0" : C151_COLORS.hvac}
              metalness={0.35}
              roughness={0.4}
              emissive={emissive(highlighted === "acv", "#2EC4B6")}
              emissiveIntensity={highlighted === "acv" ? 0.22 : 0}
            />
          </mesh>
          {[-0.7, 0.7].map((zx) => (
            <mesh key={`fan-${x}-${zx}`} position={[zx, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
              <meshStandardMaterial color={C151_COLORS.aluminiumDark} metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      <Bogie x={-bogieX} highlighted={highlighted === "shm"} onHighlight={onHighlight} onSelect={onSelect} />
      <Bogie x={bogieX} highlighted={highlighted === "shm"} onHighlight={onHighlight} onSelect={onSelect} />

      <GangwayEnd
        highlighted={highlighted === "shm"}
        onHighlight={onHighlight}
        onSelect={onSelect}
      />
    </group>
  );
}

function Bogie({
  x,
  highlighted,
  onHighlight,
  onSelect,
}: {
  x: number;
  highlighted: boolean;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
}) {
  const radius = C151.wheelDiameter / 2;
  return (
    <group
      position={[x, radius, 0]}
      onPointerOver={() => onHighlight("shm")}
      onPointerOut={() => onHighlight(null)}
      onClick={(event) => select(event, "shm", onSelect)}
    >
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[2.7, 0.28, 2.35]} />
        <meshStandardMaterial
          color={highlighted ? "#8B7CFF" : C151_COLORS.skirt}
          metalness={0.45}
          roughness={0.4}
        />
      </mesh>
      {[-C151.wheelbase / 2, C151.wheelbase / 2].map((axle) =>
        [-1.15, 1.15].map((z) => (
          <group key={`wheel-${x}-${axle}-${z}`} position={[axle, 0, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[radius, radius, 0.18, 32]} />
              <meshStandardMaterial color={C151_COLORS.wheel} metalness={0.55} roughness={0.35} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.2, 16]} />
              <meshStandardMaterial color={C151_COLORS.hub} metalness={0.7} roughness={0.25} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

export function C151Track({
  highlighted,
  onHighlight,
  onSelect,
}: C151CarriageProps) {
  return (
    <group
      onPointerOver={() => onHighlight("rail")}
      onPointerOut={() => onHighlight(null)}
      onClick={(event) => select(event, "rail", onSelect)}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[32, 8]} />
        <meshStandardMaterial
          color={highlighted === "rail" ? "#243044" : C151_COLORS.ballast}
          roughness={0.95}
        />
      </mesh>
      <mesh position={[0, 0.02, 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 0.12]} />
        <meshStandardMaterial color="#E2B93D" />
      </mesh>
      {Array.from({ length: 18 }, (_, index) => (
        <mesh key={`sleeper-${index}`} position={[-C151.length / 2 + 0.8 + index * 1.35, 0.04, 0]}>
          <boxGeometry args={[0.24, 0.1, 2.4]} />
          <meshStandardMaterial
            color={highlighted === "rail" ? "#4C8DFF" : C151_COLORS.sleeper}
            roughness={0.85}
          />
        </mesh>
      ))}
      {[-0.755, 0.755].map((z) => (
        <mesh key={`rail-${z}`} position={[0, 0.12, z]}>
          <boxGeometry args={[C151.length + 3, 0.12, 0.08]} />
          <meshStandardMaterial
            color={highlighted === "rail" ? "#4C8DFF" : C151_COLORS.rail}
            metalness={0.7}
            roughness={0.28}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.18, 1.22]}>
        <boxGeometry args={[C151.length + 2.4, 0.06, 0.1]} />
        <meshStandardMaterial
          color={highlighted === "rail" ? "#E0B84A" : C151_COLORS.thirdRail}
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
