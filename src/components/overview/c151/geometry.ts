import { C151 } from "@/components/overview/c151/dimensions";
import { BufferGeometry, ExtrudeGeometry, Shape } from "three";

function bodyCrossSection(): Shape {
  const hw = C151.width / 2;
  const bottom = C151.bodyBottom;
  const sideTop = C151.sideTop;
  const peak = C151.roofPeak;
  const r = 0.15;
  const shape = new Shape();

  shape.moveTo(-hw + r, bottom);
  shape.lineTo(hw - r, bottom);
  shape.quadraticCurveTo(hw, bottom, hw, bottom + r);
  shape.lineTo(hw, sideTop);
  shape.quadraticCurveTo(hw * 0.42, peak + 0.06, 0, peak);
  shape.quadraticCurveTo(-hw * 0.42, peak + 0.06, -hw, sideTop);
  shape.lineTo(-hw, bottom + r);
  shape.quadraticCurveTo(-hw, bottom, -hw + r, bottom);
  return shape;
}

function roundCabFront(geometry: BufferGeometry): void {
  const half = C151.length / 2;
  const cabStart = -half;
  const cabLen = C151.cabLength;
  const hw = C151.width / 2;
  const position = geometry.getAttribute("position");

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const along = x - cabStart;
    if (along >= cabLen || along < -0.2) {
      continue;
    }

    const t = 1 - Math.max(along, 0) / cabLen;
    const ease = t * t * (3 - 2 * t);
    const zr = Math.min(1, Math.abs(z) / hw);
    const yr = Math.max(0, (y - 2.15) / 1.4);
    position.setX(index, x - ease * (0.22 + 0.42 * zr * zr + 0.2 * yr * yr));
    position.setZ(index, z * (1 - 0.16 * ease * ease));
    if (y > C151.sideTop - 0.2) {
      position.setY(index, y - ease * 0.08);
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function createC151BodyGeometry(): BufferGeometry {
  const shape = bodyCrossSection();
  const geometry = new ExtrudeGeometry(shape, {
    depth: C151.length,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 8,
    steps: 2,
    curveSegments: 24,
  });

  geometry.translate(0, 0, -C151.length / 2);
  geometry.rotateY(Math.PI / 2);
  roundCabFront(geometry);
  geometry.computeBoundingBox();
  return geometry;
}

export interface DoorBay {
  center: number;
  left: number;
  right: number;
}

export interface WindowPane {
  x: number;
  width: number;
}

/**
 * C151 DT saloon: cab-end pane, four 1.45 m doorways, and a two-pane
 * window bay after every door through to the gangway.
 */
export function saloonLayout(): { doors: DoorBay[]; windows: WindowPane[]; bayWidth: number } {
  const half = C151.length / 2;
  const cabEnd = -half + C151.cabLength;
  const gangwayStart = half - 0.52;
  const preBay = 1.36;
  const firstLeft = cabEnd + preBay;
  const doorW = C151.doorWidth;
  const remaining = gangwayStart - firstLeft - C151.doorsPerSide * doorW;
  const bayWidth = remaining / C151.doorsPerSide;

  const doors = [0, 1, 2, 3].map((index) => {
    const left = firstLeft + index * (doorW + bayWidth);
    return { left, center: left + doorW / 2, right: left + doorW };
  });

  const prePane = 0.94;
  const windows = [
    { x: cabEnd + 0.24 + prePane / 2, width: prePane },
    ...doors.flatMap((door) => {
      const inset = 0.32;
      const pillar = 0.1;
      const usable = bayWidth - inset * 2;
      const paneW = (usable - pillar) / 2;
      const leftPane = door.right + inset + paneW / 2;
      const rightPane = leftPane + paneW + pillar;
      return [
        { x: leftPane, width: paneW },
        { x: rightPane, width: paneW },
      ];
    }),
  ];

  return { doors, windows, bayWidth };
}
