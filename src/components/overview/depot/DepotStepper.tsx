import { DEPOT } from "@/constants/depot";
import { bodyType, dataType, displayType } from "@/constants/fonts";
import { TABLET_BREAKPOINT } from "@/constants/layout";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

interface DepotStepperProps {
  step: number;
}

export function DepotStepper({ step }: DepotStepperProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const twoCol = width < TABLET_BREAKPOINT;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        twoCol ? styles.wrapCompact : null,
      ]}
    >
      {DEPOT.timeline.map((stage, index) => {
        const done = index < step;
        const active = index === step;
        return (
          <View key={stage.id} style={[styles.step, twoCol ? styles.stepCompact : null]}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.tint : colors.surface,
                    borderColor: done || active ? colors.tint : colors.border,
                  },
                  active ? { shadowColor: colors.tint, shadowOpacity: 0.35, shadowRadius: 6 } : null,
                ]}
              >
                <Text
                  style={[
                    styles.dotNum,
                    { color: done ? colors.surface : active ? colors.tint : colors.textMuted },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text
                  style={[
                    styles.label,
                    { color: done || active ? colors.text : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {stage.label}
                </Text>
                <Text style={[styles.detail, { color: colors.textMuted }]} numberOfLines={2}>
                  {stage.detail}
                </Text>
              </View>
            </View>
            <View style={[styles.bar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: done ? "100%" : active ? "45%" : "0%",
                    backgroundColor: colors.tint,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    gap: 0,
  },
  wrapCompact: {
    flexWrap: "wrap",
    gap: 18,
    paddingHorizontal: 16,
  },
  step: {
    flex: 1,
    minWidth: 0,
    paddingRight: 16,
    paddingBottom: 10,
  },
  stepCompact: {
    flexBasis: "46%",
    flexGrow: 1,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dotNum: dataType({
    fontSize: 13,
    fontWeight: "600",
  }),
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: displayType({
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  }),
  detail: bodyType({
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  }),
  bar: {
    height: 3,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
});
