export interface SHMFileResult {
  fileId: string;
  prediction: number;
  recordedAt?: string;
}

export interface SHMResult {
  type: "shm";
  files: SHMFileResult[];
}
