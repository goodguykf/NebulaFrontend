import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: true }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.title, { color: colors.text }]}>This screen doesn't exist.</Text>
        <Pressable
          onPress={() => router.replace("/")}
          accessibilityRole="button"
          accessibilityLabel="Go to Overview"
          style={styles.link}
        >
          <Text style={[typography.label, { color: colors.tint }]}>Go to Overview</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
  },
});
