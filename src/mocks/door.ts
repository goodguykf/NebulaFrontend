import { DoorResult, DoorSegment, SignalPoint } from "@/types/door";

const START = Date.parse("2026-09-18T10:00:12.000Z");
const ABNORMAL_INDEXES = new Set([6, 13, 18]);

function makeSignal(
  start: number,
  durationMs: number,
  kind: "current" | "position",
  abnormal: boolean,
): SignalPoint[] {
  const samples = 36;
  return Array.from({ length: samples }, (_, index) => {
    const t = index / (samples - 1);
    const timestamp = new Date(start + t * durationMs).toISOString();
    if (kind === "position") {
      const value = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
      return { timestamp, value: Number((value * 100).toFixed(2)) };
    }

    const base = abnormal ? 12 + Math.sin(t * 14) * 3.4 : 7 + Math.sin(t * 10) * 1.2;
    const spike = abnormal && t > 0.35 && t < 0.55 ? 4.5 : 0;
    return { timestamp, value: Number((base + spike).toFixed(3)) };
  });
}

function makeSegment(index: number): DoorSegment {
  const durationMs = 4200 + ((index * 370) % 2600);
  const gapMs = 1800 + ((index * 210) % 900);
  let cursor = START;
  for (let i = 0; i < index; i += 1) {
    const previousDuration = 4200 + ((i * 370) % 2600);
    const previousGap = 1800 + ((i * 210) % 900);
    cursor += previousDuration + previousGap;
  }

  const abnormal = ABNORMAL_INDEXES.has(index);
  const includeSignals = abnormal || index < 4;

  return {
    id: `cycle_${String(index + 1).padStart(2, "0")}`,
    startTime: new Date(cursor).toISOString(),
    endTime: new Date(cursor + durationMs).toISOString(),
    prediction: abnormal ? "Abnormal resistance" : "Normal",
    signals: includeSignals
      ? {
          current: makeSignal(cursor, durationMs, "current", abnormal),
          position: makeSignal(cursor, durationMs, "position", abnormal),
        }
      : undefined,
  };
}

const segments = Array.from({ length: 20 }, (_, index) => makeSegment(index));
const abnormalSegments = segments.filter(
  (segment) => segment.prediction === "Abnormal resistance",
).length;

export const mockDoorResult: DoorResult = {
  type: "door",
  totalSegments: segments.length,
  normalSegments: segments.length - abnormalSegments,
  abnormalSegments,
  segments,
};
