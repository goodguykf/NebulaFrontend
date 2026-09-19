import { PREDICTION_CSV } from "@/mocks/predictions/csv";
import { DoorResult } from "@/types/door";
import { parseDoorPredictionsCsv } from "@/utils/parsePredictions";

export const mockDoorFilename = "door_predictions.csv";
export const mockDoorResult: DoorResult = parseDoorPredictionsCsv(PREDICTION_CSV.door);
