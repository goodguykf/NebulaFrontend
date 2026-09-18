import { SUBSYSTEM_META } from "@/constants/subsystems";
import { CARD_GRID_GAP } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { formatAnalysisSummary } from "@/utils/format";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/common/Card";

interface SubsystemOverviewCardProps {
  subsystem: SubsystemType;
  latest?: AnalysisRecord;
  onOpenAnalysis: (record: AnalysisRecord) => void;
  onAnalyze: (subsystem: SubsystemType) => void;
}

export function SubsystemOverviewCard({
  subsystem,
  latest,
  onOpenAnalysis,
  onAnalyze,
}: SubsystemOverviewCardProps) {
  const { colors } = useAppTheme();
  const meta = SUBSYSTEM_META[subsystem];
  const accent = colors.subsystems[subsystem];
  const hasResult = latest?.status === "completed";

  return (
    <Card
      onPress={() => {
        if (latest && hasResult) {
          onOpenAnalysis(latest);
        } else {
          onAnalyze(subsystem);
        }
      }}
      accessibilityLabel={
        hasResult && latest
          ? `${meta.title}. Latest result: ${formatAnalysisSummary(latest)}`
          : `${meta.title}. No analysis yet`
      }
      accessibilityHint={hasResult ? "Opens the latest analysis" : "Goes to the Analyze screen"}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={[styles.swatch, { backgroundColor: accent }]} />
        <View style={styles.titles}>
          <Text style={[typography.label, { color: accent }]}>{meta.shortLabel}</Text>
          <Text style={[typography.heading, { color: colors.text }]}>{meta.subtitle}</Text>
        </View>
      </View>

      {hasResult && latest ? (
        <View style={styles.result}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Latest result</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {formatAnalysisSummary(latest)}
          </Text>
        </View>
      ) : (
        <View style={styles.result}>
          <Text style={[typography.body, { color: colors.textMuted }]}>No analysis yet</Text>
          <Text style={[typography.label, { color: colors.tint }]}>Analyze Data</Text>
        </View>
      )}
    </Card>
  );
}

export const subsystemCardGap = CARD_GRID_GAP;

const styles = StyleSheet.create({
  card: {
    minHeight: 148,
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  swatch: {
    width: 8,
    height: 36,
    borderRadius: 4,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  result: {
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
});
