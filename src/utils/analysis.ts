import { AnalysisRecord, SubsystemType } from "@/types/analysis";

export function sortByNewest(records: AnalysisRecord[]): AnalysisRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getLatestCompletedAnalysis(
  records: AnalysisRecord[],
  subsystem: SubsystemType,
): AnalysisRecord | undefined {
  return sortByNewest(records).find(
    (record) => record.subsystem === subsystem && record.status === "completed",
  );
}
