import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function AppHeader({ title, subtitle, left, right }: AppHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>
        <Text style={[typography.title, styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.caption, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  side: {
    minWidth: 76,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-start",
    flexShrink: 0,
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
  },
});
