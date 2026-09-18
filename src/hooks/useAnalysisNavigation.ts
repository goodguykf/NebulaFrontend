import { AnalysisRecord } from "@/types/analysis";
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

  return { openAnalysis, openAnalyze };
}
