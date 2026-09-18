import { getAnalysis } from "@/api/analyses";
import { useAppConfig } from "@/context/AppConfigProvider";
import { AnalysisRecord } from "@/types/analysis";
import { useCallback, useEffect, useState } from "react";

interface UseAnalysisResult {
  record: AnalysisRecord | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAnalysis(analysisId: string | undefined): UseAnalysisResult {
  const { revision } = useAppConfig();
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!analysisId) {
      setRecord(null);
      setError("Missing analysis id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await getAnalysis(analysisId);
      setRecord(next);
      setError(null);
    } catch (caught) {
      setRecord(null);
      setError(caught instanceof Error ? caught.message : "Unable to load this analysis.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  return { record, loading, error, reload: load };
}
