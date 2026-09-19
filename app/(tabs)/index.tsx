import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { AnalysisListCard } from "@/components/overview/AnalysisListCard";
import { InteractiveTrain } from "@/components/overview/InteractiveTrain";
import { displayType } from "@/constants/fonts";
import { MAX_CONTENT_WIDTH } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useAnalysisNavigation } from "@/hooks/useAnalysisNavigation";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { sortByNewest } from "@/utils/analysis";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function OverviewScreen() {
  const { colors } = useAppTheme();
  const { records, loading, error, reload, refresh, refreshing } = useAnalysisHistory();
  const { openAnalysis, openAnalyze, openSubsystemDashboard } = useAnalysisNavigation();
  const recent = sortByNewest(records).slice(0, 5);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={Platform.OS === "web" ? [] : ["top"]}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.tint} />
        }
      >
        {error ? null : (
          <InteractiveTrain
            records={records}
            onOpenSubsystem={(subsystem) => {
              if (loading) {
                return;
              }
              openSubsystemDashboard(subsystem, records);
            }}
          />
        )}

        <View style={styles.pad}>
          {error ? (
            <ErrorState
              title="Unable to load dashboard"
              message="We couldn't fetch the latest analyses."
              detail={error}
              onRetry={reload}
            />
          ) : null}

          {loading ? <LoadingState message="Loading train status…" /> : null}

          {!loading && !error && records.length === 0 ? (
            <EmptyState
              title="No analyses yet."
              message="Upload rail subsystem data to begin."
              actionLabel="Analyze Data"
              onAction={() => openAnalyze()}
            />
          ) : null}

          {!loading && !error && records.length > 0 ? (
            <>
              <View style={[styles.sectionHead, { borderBottomColor: colors.text }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent analyses</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Newest first, as stored
                </Text>
              </View>
              <View style={styles.list}>
                {recent.map((record) => (
                  <AnalysisListCard key={record.id} record={record} onPress={openAnalysis} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default OverviewScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  scroll: {
    flexGrow: 1,
    width: "100%",
  },
  pad: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHead: {
    paddingBottom: 12,
    marginBottom: spacing.sm,
    borderBottomWidth: 2,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: displayType({
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  }),
  list: {
    gap: spacing.sm,
  },
});
