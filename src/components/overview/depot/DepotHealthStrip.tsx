import { bodyType, dataType, displayType } from "@/constants/fonts";
import { MIN_TOUCH_SIZE, spacing } from "@/constants/spacing";
import { SUBSYSTEM_META, SUBSYSTEM_ORDER } from "@/constants/subsystems";
import { TABLET_BREAKPOINT } from "@/constants/layout";
import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { formatAnalysisSummary } from "@/utils/format";
import { getLatestCompletedAnalysis, sortByNewest } from "@/utils/analysis";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";

interface DepotHealthStripProps {
  records: AnalysisRecord[];
  highlighted: SubsystemType | null;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
}

function latestRecord(
  records: AnalysisRecord[],
  subsystem: SubsystemType,
): AnalysisRecord | undefined {
  return (
    getLatestCompletedAnalysis(records, subsystem) ??
    sortByNewest(records).find((record) => record.subsystem === subsystem)
  );
}

export function DepotHealthStrip({
  records,
  highlighted,
  onHighlight,
  onSelect,
}: DepotHealthStripProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < TABLET_BREAKPOINT;
  const completed = SUBSYSTEM_ORDER.filter((subsystem) =>
    Boolean(getLatestCompletedAnalysis(records, subsystem)),
  );
  const coverage = completed.length / SUBSYSTEM_ORDER.length;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          flexDirection: compact ? "column" : "row",
          alignItems: compact ? "stretch" : "center",
        },
      ]}
    >
      <View style={[styles.gauge, compact ? styles.gaugeCompact : null]}>
        <View
          accessibilityElementsHidden
          style={[
            styles.gaugeRing,
            {
              borderColor: coverage === 1 ? colors.tint : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.round(coverage * 100)}%`,
                backgroundColor: colors.tint,
              },
            ]}
          />
        </View>
        <View style={styles.gaugeCopy}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Models on file</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: colors.text }]}>{completed.length}</Text>
            <Text style={[styles.scoreUnit, { color: colors.tint }]}>of {SUBSYSTEM_ORDER.length}</Text>
          </View>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Latest completed analysis per subsystem.
          </Text>
        </View>
      </View>

      <View style={styles.cards}>
        {SUBSYSTEM_ORDER.map((subsystem) => {
          const record = latestRecord(records, subsystem);
          const complete = record?.status === "completed";
          const accent = colors.subsystems[subsystem];
          const focused = highlighted === subsystem;
          return (
            <Pressable
              key={subsystem}
              onPress={() => onSelect(subsystem)}
              onHoverIn={() => onHighlight(subsystem)}
              onHoverOut={() => onHighlight(null)}
              accessibilityRole="button"
              accessibilityLabel={`${SUBSYSTEM_META[subsystem].shortLabel}. ${record ? formatAnalysisSummary(record) : "No analysis yet"}. Opens dashboard`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: focused || pressed ? colors.textMuted : colors.border,
                },
                webPointer,
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardId, { color: colors.text }]}>
                  {SUBSYSTEM_META[subsystem].shortLabel}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {complete ? "Ready" : record ? record.status : "—"}
                </Text>
              </View>
              <View style={[styles.meter, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.meterFill,
                    { width: complete ? "100%" : "0%", backgroundColor: accent },
                  ]}
                />
              </View>
              <Text style={[styles.cardStatus, { color: colors.textMuted }]} numberOfLines={2}>
                {record ? formatAnalysisSummary(record) : "No analysis yet"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const webPointer: ViewStyle = Platform.OS === "web" ? { cursor: "pointer" } : {};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 20,
  },
  gauge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: 250,
    flexShrink: 0,
  },
  gaugeCompact: {
    width: "100%",
    marginBottom: 4,
  },
  gaugeRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 7,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  gaugeFill: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: "100%",
    opacity: 0.22,
  },
  gaugeCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: displayType({
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  }),
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    marginTop: 2,
  },
  score: displayType({
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  }),
  scoreUnit: displayType({
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  }),
  note: bodyType({
    fontSize: 11,
    lineHeight: 14,
    marginTop: 3,
    maxWidth: 280,
  }),
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  card: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 110,
    minHeight: MIN_TOUCH_SIZE,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  cardId: displayType({
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
  }),
  cardMeta: dataType({
    fontSize: 11,
    fontWeight: "500",
  }),
  meter: {
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardStatus: bodyType({
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  }),
});
