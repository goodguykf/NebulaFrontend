import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useAnalysis } from "@/hooks/useAnalysis";
import { firstParam } from "@/utils/params";
import { formatSubsystemPath } from "@/utils/format";
import { Href, Redirect, useLocalSearchParams } from "expo-router";

export default function AnalysisRedirectScreen() {
  const params = useLocalSearchParams<{ analysisId?: string | string[] }>();
  const analysisId = firstParam(params.analysisId);
  const { record, loading, error, reload } = useAnalysis(analysisId);

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState message="Opening analysis…" />
      </ScreenContainer>
    );
  }

  if (error || !record) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Analysis not found"
          message="We couldn't route this analysis to a subsystem screen."
          detail={error ?? undefined}
          onRetry={reload}
        />
      </ScreenContainer>
    );
  }

  return <Redirect href={formatSubsystemPath(record.subsystem, record.id) as Href} />;
}
