import { AnalysisUploadFile, createAnalysis, getAnalysis } from "@/api/analyses";
import { ANALYSIS_POLL_INTERVAL_MS } from "@/constants/config";
import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { useCallback, useEffect, useRef, useState } from "react";

export type UploadPhase = "idle" | "uploading" | "processing" | "failed";

interface UseAnalysisUploadResult {
  phase: UploadPhase;
  error: string | null;
  elapsedSeconds: number;
  /** Uploads the files, waits for the job to finish, and resolves with the completed record. */
  submit: (subsystem: SubsystemType, files: AnalysisUploadFile[]) => Promise<AnalysisRecord | null>;
  reset: () => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useAnalysisUpload(): UseAnalysisUploadResult {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = useCallback(
    async (subsystem: SubsystemType, files: AnalysisUploadFile[]) => {
      const startedAt = Date.now();
      setError(null);
      setElapsedSeconds(0);
      setPhase("uploading");

      try {
        const created = await createAnalysis(subsystem, files);
        if (mounted.current) {
          setPhase("processing");
        }

        while (mounted.current) {
          const record = await getAnalysis(created.id);
          if (record.status === "completed") {
            if (mounted.current) {
              setPhase("idle");
            }
            return record;
          }
          if (record.status === "failed") {
            throw new Error(record.error ?? "The analysis failed.");
          }
          if (mounted.current) {
            setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
          }
          await wait(ANALYSIS_POLL_INTERVAL_MS);
        }
        return null;
      } catch (caught) {
        if (mounted.current) {
          setError(caught instanceof Error ? caught.message : "Unable to run this analysis.");
          setPhase("failed");
        }
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setElapsedSeconds(0);
  }, []);

  return { phase, error, elapsedSeconds, submit, reset };
}
