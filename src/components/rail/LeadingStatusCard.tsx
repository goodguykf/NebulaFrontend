import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { RailPrediction } from "@/types/rail";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

interface LeadingStatusCardProps {
  status: RailPrediction;
  leadingCount?: number;
  totalCount?: number;
}

function badgeTone(status: RailPrediction): "success" | "warning" {
  return status === "Normal" ? "success" : "warning";
}

export function LeadingStatusCard({ status, leadingCount, totalCount }: LeadingStatusCardProps) {
  const { colors } = useAppTheme();
  const hasCounts = leadingCount != null && totalCount != null && totalCount > 0;
  const color = status === "Normal" ? colors.success : colors.warning;

  return (
    <Card
      accessibilityLabel={
        hasCounts
          ? `Leading status ${status}. ${leadingCount} of ${totalCount} classifications.`
          : `Leading status ${status}`
      }
    >
      <Text style={[typography.label, { color: colors.textMuted }]}>Leading status</Text>
      <Text style={[typography.metric, styles.status, { color }]}>{status}</Text>
      <View style={styles.meta}>
        <StatusBadge label={status} tone={badgeTone(status)} />
        {hasCounts ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {leadingCount} of {totalCount} classifications
          </Text>
        ) : null}
      </View>
      <Text style={[typography.caption, styles.note, { color: colors.textMuted }]}>
        Official classes are Normal, Side I, and Side II. This is not a severity rating.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  status: {
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  note: {
    marginTop: spacing.sm,
  },
});
