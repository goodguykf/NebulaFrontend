import { PREDICTION_CSV } from "@/mocks/predictions/csv";
import { SHMResult } from "@/types/shm";
import { parseSHMPredictionsCsv } from "@/utils/parsePredictions";

export const mockSHMFilename = "shm_predictions.csv";
export const mockSHMResult: SHMResult = parseSHMPredictionsCsv(PREDICTION_CSV.shm);
