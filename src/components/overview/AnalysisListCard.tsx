import { SUBSYSTEM_META } from "@/constants/subsystems";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { AnalysisRecord } from "@/types/analysis";
import { formatAnalysisSummary, formatRelativeTime } from "@/utils/format";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisStatusBadge } from "@/components/common/StatusBadge";
import { Card } from "@/components/common/Card";

interface AnalysisListCardProps {
  record: AnalysisRecord;
  onPress: (record: AnalysisRecord) => void;
}

export function AnalysisListCard({ record, onPress }: AnalysisListCardProps) {
  const { colors } = useAppTheme();
  const meta = SUBSYSTEM_META[record.subsystem];

  return (
    <Card
      onPress={() => onPress(record)}
      accessibilityLabel={`${meta.shortLabel}. ${record.filename}. ${formatAnalysisSummary(record)}. ${formatRelativeTime(record.createdAt)}`}
      accessibilityHint="Opens analysis details"
    >
      <View style={styles.row}>
        <View style={[styles.mark, { backgroundColor: colors.subsystems[record.subsystem] }]} />
        <View style={styles.body}>
          <View style={styles.heading}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>
              {meta.shortLabel}
            </Text>
            <AnalysisStatusBadge status={record.status} />
          </View>
          <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
            {record.filename}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {formatAnalysisSummary(record)}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {formatRelativeTime(record.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  mark: {
    width: 4,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
