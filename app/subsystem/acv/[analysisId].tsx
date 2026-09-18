import { ACVAnalysisView } from "@/components/acv/ACVAnalysisView";
import { AppHeader } from "@/components/common/AppHeader";
import { BackButton } from "@/components/common/BackButton";
import { Card } from "@/components/common/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { AnalysisStatusBadge } from "@/components/common/StatusBadge";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { formatTimestamp } from "@/utils/format";
import { firstParam } from "@/utils/params";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ACVAnalysisScreen() {
  const { colors } = useAppTheme();
  const { analysisId } = useLocalSearchParams<{ analysisId?: string | string[] }>();
  const { record, loading, error, reload } = useAnalysis(firstParam(analysisId));

  return (
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      header={
        <AppHeader
          title="ACV Refrigerant Leakage"
          subtitle={record?.filename}
          left={<BackButton />}
        />
      }
    >
      {loading ? <LoadingState message="Loading ACV analysis…" /> : null}

      {error ? (
        <ErrorState
          title="Unable to open analysis"
          message="We couldn't load this ACV result."
          detail={error}
          onRetry={reload}
        />
      ) : null}

      {!loading && !error && record?.subsystem === "acv" ? (
        <View style={styles.stack}>
          <Card>
            <View style={styles.metaRow}>
              <Text style={[typography.label, { color: colors.textMuted }]}>File</Text>
              <AnalysisStatusBadge status={record.status} />
            </View>
            <Text style={[typography.body, { color: colors.text }]}>{record.filename}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {formatTimestamp(record.createdAt)}
            </Text>
          </Card>

          {record.result ? (
            <ACVAnalysisView result={record.result} />
          ) : (
            <ErrorState
              title="No ranking yet"
              message={
                record.status === "failed"
                  ? record.error ?? "Analysis failed."
                  : "This job has not returned a car ranking."
              }
            />
          )}
        </View>
      ) : null}

      {!loading && !error && record && record.subsystem !== "acv" ? (
        <ErrorState
          title="Unexpected subsystem"
          message="This record is not an ACV analysis."
        />
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
});
