import { AnalysisDetailPlaceholder } from "@/components/analysis/AnalysisDetailPlaceholder";
import { firstParam } from "@/utils/params";
import { useLocalSearchParams } from "expo-router";

export default function DoorAnalysisScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId?: string | string[] }>();
  return <AnalysisDetailPlaceholder analysisId={firstParam(analysisId)} expectedSubsystem="door" />;
}
