import { MAX_CONTENT_WIDTH } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: ReactNode;
}

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  edges = ["top", "left", "right"],
  refreshing = false,
  onRefresh,
  header,
}: ScreenContainerProps) {
  const { colors } = useAppTheme();

  const body = (
    <View
      style={[
        styles.content,
        padded ? styles.padded : null,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={edges}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.scrollContent]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    width: "100%",
  },
  content: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
