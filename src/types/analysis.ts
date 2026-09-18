import { ACVResult } from "@/types/acv";
import { DoorResult } from "@/types/door";
import { RailResult } from "@/types/rail";
import { SHMResult } from "@/types/shm";

export type SubsystemType = "acv" | "door" | "rail" | "shm";

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

export type AnalysisResult = ACVResult | DoorResult | RailResult | SHMResult;

interface AnalysisRecordBase {
  id: string;
  filename: string;
  createdAt: string;
  status: AnalysisStatus;
  error?: string;
}

export type AnalysisRecord =
  | (AnalysisRecordBase & { subsystem: "acv"; result?: ACVResult })
  | (AnalysisRecordBase & { subsystem: "door"; result?: DoorResult })
  | (AnalysisRecordBase & { subsystem: "rail"; result?: RailResult })
  | (AnalysisRecordBase & { subsystem: "shm"; result?: SHMResult });

export interface CreateAnalysisResponse {
  id: string;
  status: Extract<AnalysisStatus, "queued" | "processing">;
}

export interface HealthResponse {
  status: "ok";
}

export function isACVResult(result: AnalysisResult): result is ACVResult {
  return result.type === "acv";
}

export function isDoorResult(result: AnalysisResult): result is DoorResult {
  return result.type === "door";
}

export function isRailResult(result: AnalysisResult): result is RailResult {
  return result.type === "rail";
}

export function isSHMResult(result: AnalysisResult): result is SHMResult {
  return result.type === "shm";
}
