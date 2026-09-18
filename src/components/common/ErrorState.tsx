import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/common/Card";

interface ErrorStateProps {
  title?: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  detail,
  onRetry,
  retryLabel = "Retry",
  secondaryActionLabel,
  onSecondaryAction,
}: ErrorStateProps) {
  const { colors } = useAppTheme();

  return (
    <Card accessibilityLabel={`${title}. ${message}`}>
      <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {detail ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{detail}</Text>
      ) : null}
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
            style={[styles.button, { backgroundColor: colors.tint }]}
          >
            <Text style={[typography.label, { color: colors.background }]}>{retryLabel}</Text>
          </Pressable>
        ) : null}
        {onSecondaryAction && secondaryActionLabel ? (
          <Pressable
            onPress={onSecondaryAction}
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
            style={[styles.button, { borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text style={[typography.label, { color: colors.text }]}>{secondaryActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  message: {
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
