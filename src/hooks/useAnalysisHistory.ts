import { getAnalyses, GetAnalysesOptions } from "@/api/analyses";
import { useAppConfig } from "@/context/AppConfigProvider";
import { AnalysisRecord } from "@/types/analysis";
import { useCallback, useEffect, useState } from "react";

interface UseAnalysisHistoryResult {
  records: AnalysisRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useAnalysisHistory(
  options: GetAnalysesOptions = {},
): UseAnalysisHistoryResult {
  const { revision } = useAppConfig();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const next = await getAnalyses(options);
        setRecords(next);
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load analyses.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [options.cursor, options.limit, options.subsystem, revision],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return {
    records,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    reload: () => load(false),
  };
}
