import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text } from "react-native";
import { Card } from "@/components/common/Card";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  onPress?: () => void;
}

export function MetricCard({ label, value, detail, onPress }: MetricCardProps) {
  const { colors } = useAppTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={detail ? `${label} ${value}. ${detail}` : `${label} ${value}`}
      style={styles.card}
    >
      <Text style={[typography.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.metric, styles.value, { color: colors.text }]}>{value}</Text>
      {detail ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{detail}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140,
  },
  value: {
    marginTop: spacing.xs,
  },
});
