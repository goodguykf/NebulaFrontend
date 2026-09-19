import { PREDICTION_CSV } from "@/mocks/predictions/csv";
import { RailResult } from "@/types/rail";
import { parseRailPredictionsCsv } from "@/utils/parsePredictions";

export const mockRailFilename = "rail_predictions.csv";
export const mockRailResult: RailResult = parseRailPredictionsCsv(PREDICTION_CSV.rail);
