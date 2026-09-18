import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Rect } from "react-native-svg";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  color?: string;
  detail?: string;
}

interface HorizontalBarChartProps {
  data: BarDatum[];
  width?: number;
  barHeight?: number;
  loading?: boolean;
  emptyMessage?: string;
  valueSuffix?: string;
}

export function HorizontalBarChart({
  data,
  width,
  barHeight = 14,
  loading = false,
  emptyMessage = "No values to chart.",
  valueSuffix = "",
}: HorizontalBarChartProps) {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(200, width ?? Math.min(windowWidth - 72, 680));
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.tint} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>Loading chart…</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.state} accessibilityLabel={emptyMessage}>
        <Text style={[typography.body, { color: colors.textMuted }]}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list} accessibilityRole="summary">
      {data.map((item) => {
        const ratio = maxValue === 0 ? 0 : item.value / maxValue;
        const fillWidth = Math.max(item.value > 0 ? 4 : 0, ratio * chartWidth);
        const barColor = item.color ?? colors.tint;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.heading}>
              <Text style={[typography.label, { color: colors.text }]}>{item.label}</Text>
              <Text style={[typography.label, { color: colors.textSecondary }]}>
                {item.value}
                {valueSuffix}
              </Text>
            </View>
            <View
              accessibilityLabel={`${item.label}: ${item.value}${item.detail ? `. ${item.detail}` : ""}`}
            >
              <Svg width={chartWidth} height={barHeight}>
                <Rect
                  x={0}
                  y={0}
                  width={chartWidth}
                  height={barHeight}
                  rx={barHeight / 2}
                  fill={colors.surfaceElevated}
                />
                {fillWidth > 0 ? (
                  <Rect
                    x={0}
                    y={0}
                    width={fillWidth}
                    height={barHeight}
                    rx={barHeight / 2}
                    fill={barColor}
                  />
                ) : null}
              </Svg>
            </View>
            {item.detail ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>{item.detail}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    width: "100%",
  },
  row: {
    gap: spacing.xs,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  state: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
});
