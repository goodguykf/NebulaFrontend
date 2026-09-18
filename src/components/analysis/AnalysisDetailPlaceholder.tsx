import { BackButton } from "@/components/common/BackButton";
import { Card } from "@/components/common/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { AppHeader } from "@/components/common/AppHeader";
import { AnalysisStatusBadge } from "@/components/common/StatusBadge";
import { SUBSYSTEM_META } from "@/constants/subsystems";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAnalysis } from "@/hooks/useAnalysis";
import { SubsystemType } from "@/types/analysis";
import { formatAnalysisSummary, formatTimestamp } from "@/utils/format";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

interface AnalysisDetailPlaceholderProps {
  analysisId?: string;
  expectedSubsystem: SubsystemType;
}

export function AnalysisDetailPlaceholder({
  analysisId,
  expectedSubsystem,
}: AnalysisDetailPlaceholderProps) {
  const { colors } = useAppTheme();
  const { record, loading, error, reload } = useAnalysis(analysisId);
  const meta = SUBSYSTEM_META[expectedSubsystem];

  return (
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      header={<AppHeader title={meta.title} left={<BackButton />} />}
    >
      {loading ? <LoadingState message="Loading analysis…" /> : null}

      {error ? (
        <ErrorState
          title="Unable to open analysis"
          message="We couldn't load this result."
          detail={error}
          onRetry={reload}
        />
      ) : null}

      {!loading && !error && record ? (
        <View style={styles.stack}>
          {record.subsystem !== expectedSubsystem ? (
            <ErrorState
              title="Unexpected subsystem"
              message={`This record belongs to ${SUBSYSTEM_META[record.subsystem].shortLabel}, not ${meta.shortLabel}.`}
            />
          ) : null}

          <Card>
            <View style={styles.metaRow}>
              <Text style={[typography.label, { color: colors.textMuted }]}>File</Text>
              <AnalysisStatusBadge status={record.status} />
            </View>
            <Text style={[typography.heading, { color: colors.text }]}>{record.filename}</Text>
            <Text style={[typography.caption, styles.timestamp, { color: colors.textMuted }]}>
              {formatTimestamp(record.createdAt)}
            </Text>
          </Card>

          <Card>
            <Text style={[typography.label, { color: colors.textMuted }]}>Summary</Text>
            <Text style={[typography.title, styles.summary, { color: colors.text }]}>
              {formatAnalysisSummary(record)}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Detailed visualisation for {meta.shortLabel} will be added in the next implementation
              phase.
            </Text>
          </Card>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  timestamp: {
    marginTop: spacing.xs,
  },
  summary: {
    marginVertical: spacing.sm,
  },
});
