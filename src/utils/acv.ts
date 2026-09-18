import { ACVCarRank, ACVResult, ACVTelemetrySeries } from "@/types/acv";
import { AnalysisRecord } from "@/types/analysis";

export const MOCK_ACV_RANKING = "03|01|05|02|04|06|07|08";

export function parseACVRanking(value: string): ACVCarRank[] {
  const carIds = value
    .split(/[|,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return carIds.map((carId, index) => ({
    carId,
    rank: index + 1,
  }));
}

export function sortCarsByRank(cars: ACVCarRank[]): ACVCarRank[] {
  return [...cars].sort((a, b) => a.rank - b.rank);
}

export function sortCarsById(cars: ACVCarRank[]): ACVCarRank[] {
  return [...cars].sort((a, b) => a.carId.localeCompare(b.carId, undefined, { numeric: true }));
}

export function getTopRankedCar(cars: ACVCarRank[]): ACVCarRank | undefined {
  return sortCarsByRank(cars)[0];
}

function ordinal(rank: number): string {
  const remainder = rank % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${rank}th`;
  }
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export function formatFaultLikelihood(rank: number, total: number): string {
  if (rank === 1) {
    return "Most likely faulty";
  }
  if (rank === total && total > 1) {
    return "Least likely faulty";
  }
  return `${ordinal(rank)} most likely`;
}

export function formatRankLabel(rank: number): string {
  return `Rank ${rank}`;
}

export function normaliseACVResult(result: ACVResult): ACVResult {
  if (result.rankedCars.length > 0) {
    return result;
  }
  if (result.ranking) {
    return {
      ...result,
      rankedCars: parseACVRanking(result.ranking),
    };
  }
  return result;
}

export function normaliseAnalysisRecord(record: AnalysisRecord): AnalysisRecord {
  if (record.subsystem !== "acv" || !record.result) {
    return record;
  }
  return {
    ...record,
    result: normaliseACVResult(record.result),
  };
}

export function seriesForMetric(
  telemetry: ACVTelemetrySeries[] | undefined,
  metric: string,
  carId: string,
): ACVTelemetrySeries | undefined {
  return telemetry?.find((series) => series.metric === metric && series.carId === carId);
}

export function fleetAverageSeries(
  telemetry: ACVTelemetrySeries[] | undefined,
  metric: string,
): ACVTelemetrySeries | undefined {
  const matching = telemetry?.filter((series) => series.metric === metric) ?? [];
  const first = matching[0];
  if (!first || matching.length === 0) {
    return undefined;
  }

  const length = first.points.length;
  const points = first.points.map((point, index) => {
    let sum = 0;
    let count = 0;
    for (const series of matching) {
      const sample = series.points[index];
      if (sample) {
        sum += sample.value;
        count += 1;
      }
    }
    return {
      timestamp: point.timestamp,
      value: count === 0 ? 0 : Number((sum / count).toFixed(3)),
    };
  });

  return {
    carId: "fleet",
    metric,
    unit: first.unit,
    points: points.slice(0, length),
  };
}
