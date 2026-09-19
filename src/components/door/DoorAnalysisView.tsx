import { Card } from "@/components/common/Card";
import { MetricCard } from "@/components/common/MetricCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { dataType } from "@/constants/fonts";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { DoorResult, DoorSegment } from "@/types/door";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

interface DoorAnalysisViewProps {
  result: DoorResult;
}

function formatCycleClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(11, 23);
}

function formatScore(value: number | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(3);
}

function SegmentRow({ segment }: { segment: DoorSegment }) {
  const { colors } = useAppTheme();
  const abnormal = segment.prediction === "Abnormal resistance";

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: abnormal ? `${colors.danger}10` : "transparent",
        },
      ]}
      accessibilityLabel={`${segment.id}. ${segment.prediction}. ${formatScore(segment.confidence)}`}
    >
      <Text style={[styles.cellId, { color: colors.text }]}>{segment.id}</Text>
      <Text style={[styles.cellTime, { color: colors.textSecondary }]}>
        {formatCycleClock(segment.startTime)}
      </Text>
      <View style={styles.cellPred}>
        <StatusBadge
          label={segment.prediction}
          tone={abnormal ? "danger" : "success"}
        />
      </View>
      <Text style={[styles.cellScore, { color: colors.text }]}>
        {formatScore(segment.confidence)}
      </Text>
    </View>
  );
}

export function DoorAnalysisView({ result }: DoorAnalysisViewProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.stack}>
      <View style={styles.metrics}>
        <MetricCard
          label="Cycles"
          value={String(result.totalSegments)}
          detail="Door cycles found in the stream"
        />
        <MetricCard
          label="Abnormal resistance"
          value={String(result.abnormalSegments)}
          detail={`${result.normalSegments} labelled Normal`}
        />
      </View>

      <SectionHeader title="Detected cycles" />
      <Card padded={false}>
        <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
          One row per door cycle found in the uploaded stream. The score column is the model&apos;s
          confidence in the label shown.
        </Text>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cellId, styles.head, { color: colors.textMuted }]}>Cycle</Text>
          <Text style={[styles.cellTime, styles.head, { color: colors.textMuted }]}>Start</Text>
          <Text style={[styles.cellPred, styles.head, { color: colors.textMuted }]}>Prediction</Text>
          <Text style={[styles.cellScore, styles.head, { color: colors.textMuted }]}>Score</Text>
        </View>
        {result.segments.map((segment) => (
          <SegmentRow key={segment.id} segment={segment} />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  caption: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  head: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
  },
  cellId: dataType({
    width: 72,
    fontSize: 12,
  }),
  cellTime: dataType({
    width: 96,
    fontSize: 12,
  }),
  cellPred: {
    flex: 1,
    minWidth: 120,
  },
  cellScore: dataType({
    width: 56,
    fontSize: 12,
    textAlign: "right",
  }),
});
