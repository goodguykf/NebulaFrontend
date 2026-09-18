export type DoorPrediction = "Normal" | "Abnormal resistance";

export interface SignalPoint {
  timestamp: string;
  value: number;
}

export interface DoorSegment {
  id: string;
  startTime: string;
  endTime: string;
  prediction: DoorPrediction;
  confidence?: number;
  signals?: {
    current?: SignalPoint[];
    voltage?: SignalPoint[];
    backEmf?: SignalPoint[];
    position?: SignalPoint[];
  };
}

export interface DoorResult {
  type: "door";
  totalSegments: number;
  normalSegments: number;
  abnormalSegments: number;
  segments: DoorSegment[];
}
