import { MIN_TOUCH_SIZE } from "@/constants/spacing";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.button}
    >
      <Text
        style={[styles.label, { color: colors.tint }]}
        numberOfLines={1}
      >
        {`< ${label}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    flexShrink: 0,
  },
});
