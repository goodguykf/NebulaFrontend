import { SimpleLineChart, LineSeries } from "@/components/charts/SimpleLineChart";
import { radii, MIN_TOUCH_SIZE, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ACVResult } from "@/types/acv";
import { fleetAverageSeries, seriesForMetric } from "@/utils/acv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ACVTelemetryChartProps {
  result: ACVResult;
  metric?: string;
  selectedCarId?: string;
  compareCarIds: string[];
  showFleetAverage: boolean;
  onToggleCar: (carId: string) => void;
  onToggleFleetAverage: () => void;
}

function toSeries(
  id: string,
  label: string,
  points: { timestamp: string; value: number }[],
): LineSeries {
  return {
    id,
    label,
    points: points.map((point, index) => ({
      x: Number.isFinite(Date.parse(point.timestamp)) ? Date.parse(point.timestamp) : index,
      y: point.value,
    })),
  };
}

export function ACVTelemetryChart({
  result,
  metric,
  selectedCarId,
  compareCarIds,
  showFleetAverage,
  onToggleCar,
  onToggleFleetAverage,
}: ACVTelemetryChartProps) {
  const { colors } = useAppTheme();

  const series = useMemo(() => {
    if (!metric) {
      return [];
    }
    const lines: LineSeries[] = [];
    for (const carId of compareCarIds) {
      const match = seriesForMetric(result.telemetry, metric, carId);
      if (match) {
        lines.push(toSeries(carId, `Car ${carId}`, match.points));
      }
    }
    if (showFleetAverage) {
      const fleet = fleetAverageSeries(result.telemetry, metric);
      if (fleet) {
        lines.push(toSeries("fleet", "Fleet average", fleet.points));
      }
    }
    return lines;
  }, [compareCarIds, metric, result.telemetry, showFleetAverage]);

  const unit = result.telemetry?.find((item) => item.metric === metric)?.unit;

  return (
    <View style={styles.wrap}>
      <Text style={[typography.label, { color: colors.textMuted }]}>Selected cars</Text>
      <View style={styles.toggles}>
        {selectedCarId ? (
          <Pressable
            onPress={() => onToggleCar(selectedCarId)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: compareCarIds.includes(selectedCarId) }}
            accessibilityLabel={`Car ${selectedCarId}`}
            style={[
              styles.toggle,
              {
                borderColor: colors.border,
                backgroundColor: compareCarIds.includes(selectedCarId)
                  ? colors.surfaceElevated
                  : colors.surface,
              },
            ]}
          >
            <Text style={[typography.label, { color: colors.text }]}>
              {compareCarIds.includes(selectedCarId) ? "☑" : "☐"} Car {selectedCarId}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onToggleFleetAverage}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showFleetAverage }}
          accessibilityLabel="Fleet average"
          style={[
            styles.toggle,
            {
              borderColor: colors.border,
              backgroundColor: showFleetAverage ? colors.surfaceElevated : colors.surface,
            },
          ]}
        >
          <Text style={[typography.label, { color: colors.text }]}>
            {showFleetAverage ? "☑" : "☐"} Fleet average
          </Text>
        </Pressable>
      </View>
      <SimpleLineChart
        series={series}
        yLabel={unit ?? metric}
        xLabel="Time"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  toggles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  toggle: {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
  },
});
