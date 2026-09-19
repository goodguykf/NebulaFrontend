import { PREDICTION_CSV } from "@/mocks/predictions/csv";
import { ACVResult } from "@/types/acv";
import { parseACVPredictionsCsv } from "@/utils/parsePredictions";

const parsed = parseACVPredictionsCsv(PREDICTION_CSV.acv);

export const PUBLISHED_ACV_RANKING = parsed.result.ranking ?? "";
export const mockACVFilename = parsed.filename;
export const mockACVResult: ACVResult = parsed.result;
