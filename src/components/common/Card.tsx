import { radii, spacing } from "@/constants/spacing";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  selected?: boolean;
  padded?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  selected = false,
  padded = true,
}: CardProps) {
  const { colors } = useAppTheme();
  const containerStyle = [
    styles.card,
    padded ? styles.padded : null,
    {
      backgroundColor: colors.surface,
      borderColor: selected ? colors.tint : colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [containerStyle, pressed ? styles.pressed : null]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={containerStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  padded: {
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.86,
  },
});
