import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { AnalysisListCard } from "@/components/overview/AnalysisListCard";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useAnalysisNavigation } from "@/hooks/useAnalysisNavigation";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { SubsystemType } from "@/types/analysis";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type HistoryFilter = "all" | SubsystemType;

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "acv", label: "ACV" },
  { value: "door", label: "Door" },
  { value: "rail", label: "Rail" },
  { value: "shm", label: "SHM" },
];

export default function HistoryScreen() {
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const { records, loading, error, reload, refresh, refreshing } = useAnalysisHistory();
  const { openAnalysis, openAnalyze } = useAnalysisNavigation();

  const visible = useMemo(
    () => (filter === "all" ? records : records.filter((record) => record.subsystem === filter)),
    [filter, records],
  );

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.hero}>
        <Text style={[typography.display, { color: colors.text }]}>Analysis History</Text>
        <Text style={[typography.subtitle, { color: colors.textMuted }]}>
          Completed, failed, and in-progress jobs
        </Text>
      </View>

      <SegmentedControl
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        accessibilityLabel="Filter analyses by subsystem"
      />

      {loading ? <LoadingState message="Loading history…" /> : null}

      {error ? (
        <ErrorState
          title="Unable to load history"
          message="We couldn't fetch previous analyses."
          detail={error}
          onRetry={reload}
        />
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title="No analyses in this filter."
          message="Upload rail subsystem data to begin."
          actionLabel="Analyze Data"
          onAction={() => openAnalyze(filter === "all" ? undefined : filter)}
        />
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {visible.map((record) => (
            <AnalysisListCard key={record.id} record={record} onPress={openAnalysis} />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
