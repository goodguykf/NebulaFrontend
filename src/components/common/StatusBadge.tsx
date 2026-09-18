import { radii, MIN_TOUCH_SIZE, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { AnalysisStatus } from "@/types/analysis";
import { formatAnalysisStatus } from "@/utils/format";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

function toneForStatus(status: AnalysisStatus): BadgeTone {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "processing":
      return "info";
    case "queued":
      return "neutral";
  }
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const { colors } = useAppTheme();
  const palette: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
    success: { bg: `${colors.success}22`, fg: colors.success },
    warning: { bg: `${colors.warning}22`, fg: colors.warning },
    danger: { bg: `${colors.danger}22`, fg: colors.danger },
    info: { bg: `${colors.tint}22`, fg: colors.tint },
  };
  const selected = palette[tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: selected.bg }]}
    >
      <Text style={[typography.caption, { color: selected.fg }]}>{label}</Text>
    </View>
  );
}

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  return <StatusBadge label={formatAnalysisStatus(status)} tone={toneForStatus(status)} />;
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
