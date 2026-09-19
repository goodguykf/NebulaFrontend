import { Card } from "@/components/common/Card";
import { MetricCard } from "@/components/common/MetricCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { dataType } from "@/constants/fonts";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { SHMResult } from "@/types/shm";
import { formatDamage } from "@/utils/format";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

interface SHMAnalysisViewProps {
  result: SHMResult;
}

export function SHMAnalysisView({ result }: SHMAnalysisViewProps) {
  const { colors } = useAppTheme();
  const values = result.files.map((file) => file.prediction).filter((value) => Number.isFinite(value));
  const min = values.length > 0 ? Math.min(...values) : undefined;
  const max = values.length > 0 ? Math.max(...values) : undefined;

  return (
    <View style={styles.stack}>
      <View style={styles.metrics}>
        <MetricCard
          label="Files"
          value={String(result.files.length)}
          detail="Files with a damage prediction"
        />
        {min != null && max != null ? (
          <MetricCard
            label="Damage range"
            value={`${formatDamage(min)}–${formatDamage(max)}`}
            detail="Minimum and maximum predicted damage"
          />
        ) : null}
      </View>

      <SectionHeader title="Predicted damage by file" />
      <Card padded={false}>
        <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
          Each row is one uploaded file and its predicted cumulative fatigue damage. No severity band is applied.
        </Text>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cellFile, styles.head, { color: colors.textMuted }]}>File</Text>
          <Text style={[styles.cellValue, styles.head, { color: colors.textMuted }]}>Prediction</Text>
        </View>
        {result.files.map((file) => (
          <View
            key={file.fileId}
            style={[styles.row, { borderBottomColor: colors.border }]}
            accessibilityLabel={`${file.fileId}. Damage ${formatDamage(file.prediction)}`}
          >
            <Text style={[styles.cellFile, { color: colors.text }]}>{file.fileId}</Text>
            <Text style={[styles.cellValue, { color: colors.text }]}>
              {formatDamage(file.prediction)}
            </Text>
          </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
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
  cellFile: {
    flex: 1,
    fontSize: 14,
  },
  cellValue: dataType({
    width: 120,
    fontSize: 13,
    textAlign: "right",
  }),
});
