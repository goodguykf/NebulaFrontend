import { LeadingStatusCard } from "@/components/rail/LeadingStatusCard";
import { RailConfusionMatrix } from "@/components/rail/RailConfusionMatrix";
import { RailStatusChart } from "@/components/rail/RailStatusChart";
import { Card } from "@/components/common/Card";
import { SectionHeader } from "@/components/common/SectionHeader";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { RailResult } from "@/types/rail";
import { getLeadingRailStatus, getRailStatusCounts, getRailStatusTotal } from "@/utils/rail";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface RailAnalysisViewProps {
  result: RailResult;
}

export function RailAnalysisView({ result }: RailAnalysisViewProps) {
  const { colors } = useAppTheme();
  const leadingStatus = getLeadingRailStatus(result);
  const countRows = useMemo(() => getRailStatusCounts(result), [result]);
  const total = countRows ? getRailStatusTotal(countRows) : undefined;
  const leadingCount = countRows?.find((row) => row.status === leadingStatus)?.count;
  const scores = result.classScores;

  return (
    <View style={styles.stack}>
      <LeadingStatusCard
        status={leadingStatus}
        leadingCount={leadingCount}
        totalCount={total}
      />

      <SectionHeader title="Status counts" />
      {countRows ? (
        <Card>
          <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
            Count of classifications in this result. Bar length is proportional to count, not
            severity.
          </Text>
          <RailStatusChart rows={countRows} leadingStatus={leadingStatus} />
        </Card>
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Status counts were not included in this result. The leading class is {leadingStatus}.
        </Text>
      )}

      {result.confusionMatrix?.imageUrl ? (
        <>
          <SectionHeader title="Confusion matrix" />
          <RailConfusionMatrix
            imageUrl={result.confusionMatrix.imageUrl}
            title={result.confusionMatrix.title}
          />
        </>
      ) : null}

      {scores ? (
        <>
          <SectionHeader title="Model details" />
          <Card>
            <Text style={[typography.label, { color: colors.textMuted }]}>Model score</Text>
            <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
              These are model scores, not calibrated probabilities.
            </Text>
            {scores.normal != null ? (
              <Text style={[typography.body, { color: colors.text }]}>Normal {scores.normal}</Text>
            ) : null}
            {scores.sideI != null ? (
              <Text style={[typography.body, { color: colors.text }]}>Side I {scores.sideI}</Text>
            ) : null}
            {scores.sideII != null ? (
              <Text style={[typography.body, { color: colors.text }]}>Side II {scores.sideII}</Text>
            ) : null}
          </Card>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  caption: {
    marginBottom: spacing.md,
  },
});
