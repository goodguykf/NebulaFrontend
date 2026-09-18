import { radii, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={`${title}. ${message}`}>
      <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: colors.textMuted }]}>{message}</Text>
      {onAction && actionLabel ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.button, { backgroundColor: colors.tint }]}
        >
          <Text style={[typography.label, { color: colors.background }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  message: {
    textAlign: "center",
    maxWidth: 360,
  },
  button: {
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
