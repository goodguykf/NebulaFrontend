import { DEPOT } from "@/constants/depot";
import { bodyType, dataType, displayType } from "@/constants/fonts";
import { MIN_TOUCH_SIZE } from "@/constants/spacing";
import { SUBSYSTEM_META, SUBSYSTEM_ORDER } from "@/constants/subsystems";
import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { formatAnalysisSummary } from "@/utils/format";
import { getLatestCompletedAnalysis, sortByNewest } from "@/utils/analysis";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

interface DepotStageChromeProps {
  records: AnalysisRecord[];
  highlighted: SubsystemType | null;
  showBubble: boolean;
  answered: boolean;
  typed: string;
  captionLabel: string;
  captionDetail: string;
  finished: boolean;
  onSkip: () => void;
  onSelect: (subsystem: SubsystemType) => void;
  onHighlight: (subsystem: SubsystemType | null) => void;
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

function formatClock(now: Date): { time: string; date: string } {
  return {
    time: now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    date: now.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  };
}

export function DepotStageChrome({
  records,
  highlighted,
  showBubble,
  answered,
  typed,
  captionLabel,
  captionDetail,
  finished,
  onSkip,
  onSelect,
  onHighlight,
}: DepotStageChromeProps) {
  const { colors } = useAppTheme();
  const [now, setNow] = useState(() => new Date());
  const clock = formatClock(now);
  const completedCount = SUBSYSTEM_ORDER.filter((subsystem) =>
    getLatestCompletedAnalysis(records, subsystem),
  ).length;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(
    () =>
      SUBSYSTEM_ORDER.map((subsystem) => {
        const record = latestRecord(records, subsystem);
        return {
          subsystem,
          label: SUBSYSTEM_META[subsystem].shortLabel,
          summary: record ? formatAnalysisSummary(record) : "No analysis yet",
        };
      }),
    [records],
  );

  return (
    <>
      <View style={styles.hudTop}>
        <View style={styles.hudCell}>
          <Text style={[styles.hudTime, { color: "#F2F6FA" }]}>{clock.time}</Text>
          <Text style={[styles.hudMuted, { color: "#A9B8C7" }]}>
            {DEPOT.city} · {clock.date}
          </Text>
        </View>
        <View style={[styles.hudCell, styles.hudCellSplit]}>
          <View style={styles.modeRow}>
            <View style={styles.modeDot} />
            <Text style={styles.modeLabel}>Depot Mode</Text>
          </View>
          <Text style={[styles.hudMuted, { color: "#A9B8C7" }]} numberOfLines={1}>
            {finished ? "Inspection in progress" : "Train arriving for servicing"}
          </Text>
        </View>
      </View>

      <View style={styles.hudCap}>
        <Text style={[styles.capLabel, { color: "#F2F6FA" }]}>{captionLabel}</Text>
        <Text style={[styles.capDetail, { color: "#D5DEE7" }]}>{captionDetail}</Text>
      </View>

      {showBubble ? (
        <View
          style={styles.bubble}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${DEPOT.question}. ${answered ? DEPOT.answerLead : ""}`}
        >
          <View style={styles.tail} />
          <Text style={styles.question}>
            {typed}
            {!answered && typed.length < DEPOT.question.length ? (
              <Text style={styles.caret}>|</Text>
            ) : null}
          </Text>
          {answered ? (
            <View style={styles.answers}>
              <Text style={styles.answerLead}>
                {completedCount === 0
                  ? "No completed analyses on file."
                  : `${completedCount} of ${SUBSYSTEM_ORDER.length} models returned.`}
              </Text>
              {rows.map((row) => {
                const accent = colors.subsystems[row.subsystem];
                const focused = highlighted === row.subsystem;
                return (
                  <Pressable
                    key={row.subsystem}
                    onPress={() => onSelect(row.subsystem)}
                    onHoverIn={() => onHighlight(row.subsystem)}
                    onHoverOut={() => onHighlight(null)}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label}. ${row.summary}. Opens dashboard`}
                    style={({ pressed }) => [
                      styles.answerRow,
                      focused || pressed ? { backgroundColor: "rgba(43,108,163,0.08)" } : null,
                      webPointer,
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: accent }]} />
                    <Text style={styles.sysLabel}>{row.label}</Text>
                    <Text style={styles.sysSummary} numberOfLines={2}>
                      {row.summary}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {!finished ? (
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip arrival"
          style={({ pressed }) => [styles.skip, pressed ? styles.skipPressed : null, webPointer]}
        >
          <Text style={styles.skipLabel}>Skip Arrival</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const webPointer: ViewStyle = Platform.OS === "web" ? { cursor: "pointer" } : {};

const styles = StyleSheet.create({
  hudTop: {
    position: "absolute",
    top: 12,
    right: 14,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(10,20,32,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    overflow: "hidden",
    pointerEvents: "none",
  },
  hudCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hudCellSplit: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.14)",
  },
  hudTime: dataType({
    fontSize: 13,
    fontWeight: "500",
  }),
  hudMuted: bodyType({
    fontSize: 11,
    marginTop: 2,
    maxWidth: 168,
  }),
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3ED27F",
  },
  modeLabel: bodyType({
    fontSize: 12,
    fontWeight: "600",
    color: "#7FE0A8",
  }),
  hudCap: {
    position: "absolute",
    left: 14,
    bottom: 16,
    backgroundColor: "rgba(10,20,32,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
    maxWidth: 300,
    pointerEvents: "none",
  },
  capLabel: displayType({
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  }),
  capDetail: bodyType({
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  }),
  bubble: {
    position: "absolute",
    right: 18,
    top: 84,
    width: 280,
    maxWidth: "42%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  question: displayType({
    fontSize: 22,
    fontWeight: "600",
    color: "#16202B",
    lineHeight: 26,
  }),
  caret: {
    color: "#16202B",
    fontWeight: "400",
  },
  tail: {
    position: "absolute",
    right: -8,
    bottom: 28,
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  answers: {
    marginTop: 8,
  },
  answerLead: displayType({
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#5C6B7A",
    marginBottom: 4,
  }),
  answerRow: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "#E6EBF0",
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sysLabel: displayType({
    width: 44,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#16202B",
  }),
  sysSummary: bodyType({
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#16202B",
  }),
  skip: {
    position: "absolute",
    right: 14,
    bottom: 16,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 13,
    borderRadius: 6,
    backgroundColor: "rgba(10,20,32,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  skipPressed: {
    backgroundColor: "rgba(20,34,50,0.92)",
  },
  skipLabel: displayType({
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#F2F6FA",
  }),
});
