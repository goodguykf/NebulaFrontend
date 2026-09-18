import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AnalysisListCard } from "@/components/overview/AnalysisListCard";
import { SubsystemOverviewCard } from "@/components/overview/SubsystemOverviewCard";
import { CARD_GRID_GAP, getColumnCount } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { SUBSYSTEM_ORDER } from "@/constants/subsystems";
import { typography } from "@/constants/typography";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useAnalysisNavigation } from "@/hooks/useAnalysisNavigation";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { getLatestCompletedAnalysis, sortByNewest } from "@/utils/analysis";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

export default function OverviewScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const columns = getColumnCount(width);
  const { records, loading, error, reload, refresh, refreshing } = useAnalysisHistory();
  const { openAnalysis, openAnalyze } = useAnalysisNavigation();
  const recent = sortByNewest(records).slice(0, 5);

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.hero}>
        <Text style={[typography.display, { color: colors.text }]}>Rail Intelligence</Text>
        <Text style={[typography.subtitle, { color: colors.textMuted }]}>
          Subsystem Monitoring & Diagnostics
        </Text>
      </View>

      {loading ? <LoadingState message="Loading subsystem status…" /> : null}

      {error ? (
        <ErrorState
          title="Unable to load dashboard"
          message="We couldn't fetch the latest analyses."
          detail={error}
          onRetry={reload}
        />
      ) : null}

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
          <SectionHeader title="What needs attention" />
          <View style={styles.grid}>
            {SUBSYSTEM_ORDER.map((subsystem) => (
              <View
                key={subsystem}
                style={[
                  styles.gridItem,
                  { width: columns === 2 ? "48.5%" : "100%" },
                ]}
              >
                <SubsystemOverviewCard
                  subsystem={subsystem}
                  latest={getLatestCompletedAnalysis(records, subsystem)}
                  onOpenAnalysis={openAnalysis}
                  onAnalyze={openAnalyze}
                />
              </View>
            ))}
          </View>

          <SectionHeader title="Recent analyses" />
          <View style={styles.list}>
            {recent.map((record) => (
              <AnalysisListCard
                key={record.id}
                record={record}
                onPress={openAnalysis}
              />
            ))}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GRID_GAP,
  },
  gridItem: {
    flexGrow: 1,
  },
  list: {
    gap: spacing.sm,
  },
});
