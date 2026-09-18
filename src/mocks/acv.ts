import { ACVResult, ACVTelemetrySeries } from "@/types/acv";
import { MOCK_ACV_RANKING, parseACVRanking } from "@/utils/acv";

const CAR_IDS = ["01", "02", "03", "04", "05", "06", "07", "08"] as const;
const METRICS = [
  { name: "ACV Running Mode", unit: undefined, bases: [1, 1, 2, 1, 1, 1, 1, 1] },
  { name: "Refrigerant Pressure", unit: "kPa", bases: [118, 121, 96, 119, 108, 122, 120, 121] },
  { name: "Compressor Current", unit: "A", bases: [8.1, 8.0, 11.4, 8.2, 9.6, 7.9, 8.0, 8.1] },
] as const;

const START = Date.parse("2026-09-18T08:00:00.000Z");
const RANK_WEIGHT: Record<string, number> = {
  "03": 1,
  "01": 0.55,
  "05": 0.35,
};

function seriesFor(carId: string, carIndex: number, metricIndex: number): ACVTelemetrySeries {
  const metric = METRICS[metricIndex];
  if (!metric) {
    throw new Error("Unknown ACV metric");
  }

  const leakBoost = RANK_WEIGHT[carId] ?? 0;
  const points = Array.from({ length: 48 }, (_, sample) => {
    const wave = Math.sin(sample / 6 + carIndex) * (0.8 + leakBoost);
    const value = (metric.bases[carIndex] ?? 0) + wave;
    return {
      timestamp: new Date(START + sample * 60_000).toISOString(),
      value: Number(value.toFixed(3)),
    };
  });

  return {
    carId,
    metric: metric.name,
    unit: metric.unit,
    points,
  };
}

export const mockACVResult: ACVResult = {
  type: "acv",
  ranking: MOCK_ACV_RANKING,
  rankedCars: parseACVRanking(MOCK_ACV_RANKING),
  availableMetrics: METRICS.map((metric) => metric.name),
  telemetry: CAR_IDS.flatMap((carId, carIndex) =>
    METRICS.map((_, metricIndex) => seriesFor(carId, carIndex, metricIndex)),
  ),
};
