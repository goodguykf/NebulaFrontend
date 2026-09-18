import { radii, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ThemeColors } from "@/constants/colors";
import { getLinearDomain } from "@/utils/chart";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

export interface LineSeriesPoint {
  x: number;
  y: number;
}

export interface LineSeries {
  id: string;
  label: string;
  points: LineSeriesPoint[];
  color?: string;
}

interface SimpleLineChartProps {
  series: LineSeries[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  loading?: boolean;
}

const SERIES_FALLBACK = ["#4C8DFF", "#2EC4B6", "#F08A5D", "#8B7CFF", "#F0B429"];
const PAD = { top: 16, right: 12, bottom: 36, left: 44 };

function pathFor(points: { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function seriesColor(series: LineSeries, index: number, colors: ThemeColors): string {
  return series.color ?? SERIES_FALLBACK[index % SERIES_FALLBACK.length] ?? colors.tint;
}

export function SimpleLineChart({
  series,
  width,
  height = 220,
  xLabel,
  yLabel,
  loading = false,
}: SimpleLineChartProps) {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, width ?? Math.min(windowWidth - 48, 720));

  const plot = useMemo(() => {
    const innerWidth = chartWidth - PAD.left - PAD.right;
    const innerHeight = height - PAD.top - PAD.bottom;
    const ys = series.flatMap((item) => item.points.map((point) => point.y));
    const xs = series.flatMap((item) => item.points.map((point) => point.x));
    const yDomain = getLinearDomain(ys);
    const xDomain = getLinearDomain(xs, 0);

    const xScale = (value: number) => {
      const span = xDomain.max - xDomain.min || 1;
      return PAD.left + ((value - xDomain.min) / span) * innerWidth;
    };
    const yScale = (value: number) => {
      const span = yDomain.max - yDomain.min || 1;
      return PAD.top + innerHeight - ((value - yDomain.min) / span) * innerHeight;
    };

    return { innerWidth, innerHeight, yDomain, xScale, yScale };
  }, [chartWidth, height, series]);

  if (loading) {
    return (
      <View style={[styles.state, { height }]}>
        <ActivityIndicator color={colors.tint} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>Loading chart…</Text>
      </View>
    );
  }

  const hasPoints = series.some((item) => item.points.length > 0);
  if (!hasPoints) {
    return (
      <View style={[styles.state, { height }]} accessibilityLabel="No telemetry points to chart">
        <Text style={[typography.body, { color: colors.textMuted }]}>No telemetry available.</Text>
      </View>
    );
  }

  const ticks = 4;

  return (
    <View>
      <Svg width={chartWidth} height={height} accessibilityLabel={yLabel ?? "Line chart"}>
        <Rect
          x={PAD.left}
          y={PAD.top}
          width={plot.innerWidth}
          height={plot.innerHeight}
          fill={colors.surfaceElevated}
          rx={8}
        />
        {Array.from({ length: ticks + 1 }, (_, index) => {
          const ratio = index / ticks;
          const y = PAD.top + plot.innerHeight * (1 - ratio);
          const value = plot.yDomain.min + (plot.yDomain.max - plot.yDomain.min) * ratio;
          return (
            <G key={`grid-${index}`}>
              <Line
                x1={PAD.left}
                x2={PAD.left + plot.innerWidth}
                y1={y}
                y2={y}
                stroke={colors.chartGrid}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 8}
                y={y + 4}
                fill={colors.textMuted}
                fontSize={10}
                textAnchor="end"
              >
                {value.toFixed(Math.abs(value) < 10 ? 2 : 0)}
              </SvgText>
            </G>
          );
        })}
        {series.map((item, index) => {
          const mapped = item.points.map((point) => ({
            x: plot.xScale(point.x),
            y: plot.yScale(point.y),
          }));
          if (mapped.length === 0) {
            return null;
          }
          return (
            <Path
              key={item.id}
              d={pathFor(mapped)}
              fill="none"
              stroke={seriesColor(item, index, colors)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {xLabel ? (
          <SvgText
            x={PAD.left + plot.innerWidth / 2}
            y={height - 8}
            fill={colors.textMuted}
            fontSize={11}
            textAnchor="middle"
          >
            {xLabel}
          </SvgText>
        ) : null}
      </Svg>
      {yLabel ? (
        <Text style={[typography.caption, styles.axisLabel, { color: colors.textMuted }]}>
          {yLabel}
        </Text>
      ) : null}
      <View style={styles.legend}>
        {series.map((item, index) => (
          <View key={item.id} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: seriesColor(item, index, colors) }]} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  axisLabel: {
    marginTop: spacing.xxs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
});
