import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { getLatestCompletedAnalysis } from "@/utils/analysis";
import { formatSubsystemPath } from "@/utils/format";
import { Href, useRouter } from "expo-router";
import { useCallback } from "react";

export function useAnalysisNavigation() {
  const router = useRouter();

  const openAnalysis = useCallback(
    (record: AnalysisRecord) => {
      router.push(formatSubsystemPath(record.subsystem, record.id) as Href);
    },
    [router],
  );

  const openAnalyze = useCallback(
    (subsystem?: AnalysisRecord["subsystem"]) => {
      if (subsystem) {
        router.push({ pathname: "/analyze", params: { subsystem } });
        return;
      }
      router.push("/analyze");
    },
    [router],
  );

  const openSubsystemDashboard = useCallback(
    (subsystem: SubsystemType, records: AnalysisRecord[]) => {
      const latest = getLatestCompletedAnalysis(records, subsystem);
      if (latest) {
        router.push(formatSubsystemPath(subsystem, latest.id) as Href);
        return;
      }
      router.push({ pathname: "/analyze", params: { subsystem } });
    },
    [router],
  );

  return { openAnalysis, openAnalyze, openSubsystemDashboard };
}
