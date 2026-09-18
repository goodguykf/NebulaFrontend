import { RailPrediction, RailResult, RailStatusCounts } from "@/types/rail";

export const RAIL_STATUS_ORDER: RailPrediction[] = ["Normal", "Side I", "Side II"];

export interface RailStatusCountRow {
  status: RailPrediction;
  count: number;
}

function countFor(status: RailPrediction, counts: RailStatusCounts): number {
  switch (status) {
    case "Normal":
      return counts.normal;
    case "Side I":
      return counts.sideI;
    case "Side II":
      return counts.sideII;
  }
}

export function getRailStatusCounts(result: RailResult): RailStatusCountRow[] | undefined {
  const counts = result.statusCounts;
  if (!counts) {
    return undefined;
  }

  return RAIL_STATUS_ORDER.map((status) => ({
    status,
    count: countFor(status, counts),
  }));
}

export function getRailStatusTotal(rows: RailStatusCountRow[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export function getLeadingRailStatus(result: RailResult): RailPrediction {
  return result.prediction;
}
