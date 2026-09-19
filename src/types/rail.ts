export type RailPrediction = "Normal" | "Side I" | "Side II";

export interface RailSpectrumPoint {
  frequency: number;
  amplitude: number;
}

export interface RailSpectrogramCell {
  time: number;
  frequency: number;
  intensity: number;
}

export interface AxleSignalSummary {
  car: number;
  position: number;
  side: "Side I" | "Side II";
  spectrum?: RailSpectrumPoint[];
  spectrogram?: RailSpectrogramCell[];
}

export interface RailStatusCounts {
  normal: number;
  sideI: number;
  sideII: number;
}

export interface RailFilePrediction {
  fileId: string;
  prediction: RailPrediction;
}

export interface RailResult {
  type: "rail";
  prediction: RailPrediction;
  files?: RailFilePrediction[];
  /**
   * Optional counts of classified windows/files per official class.
   * Do not treat these as severity scores.
   */
  statusCounts?: RailStatusCounts;
  classScores?: {
    normal?: number;
    sideI?: number;
    sideII?: number;
  };
  axleSignals?: AxleSignalSummary[];
  /**
   * Optional evaluation image retrieved from the backend, typically a PNG.
   * The app displays this file and does not interpret pixel values.
   */
  confusionMatrix?: {
    imageUrl: string;
    title?: string;
  };
}
