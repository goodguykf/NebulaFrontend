export interface ACVCarRank {
  carId: string;
  rank: number;
  score?: number;
}

export interface ACVTelemetrySeries {
  carId: string;
  metric: string;
  unit?: string;
  points: {
    timestamp: string;
    value: number;
  }[];
}

export interface ACVResult {
  type: "acv";
  rankedCars: ACVCarRank[];
  /**
   * Optional raw ranking payload from the model, e.g. "03|01|05|02|04|06|07|08".
   * Rank 1 is the car most likely to contain leakage. This is an order, not a probability.
   */
  ranking?: string;
  availableMetrics: string[];
  telemetry?: ACVTelemetrySeries[];
}
