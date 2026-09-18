import { ACVMetricSelector } from "@/components/acv/ACVMetricSelector";
import { ACVTelemetryChart } from "@/components/acv/ACVTelemetryChart";
import { CarRanking } from "@/components/acv/CarRanking";
import { MostSuspectedCarCard } from "@/components/acv/MostSuspectedCarCard";
import { TrainCarStrip } from "@/components/acv/TrainCarStrip";
import { Card } from "@/components/common/Card";
import { SectionHeader } from "@/components/common/SectionHeader";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ACVResult } from "@/types/acv";
import { getTopRankedCar } from "@/utils/acv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ACVAnalysisViewProps {
  result: ACVResult;
}

export function ACVAnalysisView({ result }: ACVAnalysisViewProps) {
  const { colors } = useAppTheme();
  const topCar = useMemo(() => getTopRankedCar(result.rankedCars), [result.rankedCars]);
  const metrics = result.availableMetrics;
  const [selectedCarId, setSelectedCarId] = useState(topCar?.carId);
  const [metric, setMetric] = useState(metrics[0]);
  const [compareCarIds, setCompareCarIds] = useState<string[]>(topCar?.carId ? [topCar.carId] : []);
  const [showFleetAverage, setShowFleetAverage] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasTelemetry = Boolean(result.telemetry && result.telemetry.length > 0 && metric);

  useEffect(() => {
    if (!selectedCarId) {
      return;
    }
    setCompareCarIds((current) =>
      current.includes(selectedCarId) ? current : [...current, selectedCarId],
    );
  }, [selectedCarId]);

  const selectCar = (carId: string) => {
    setSelectedCarId(carId);
  };

  const toggleCar = (carId: string) => {
    setCompareCarIds((current) =>
      current.includes(carId) ? current.filter((id) => id !== carId) : [...current, carId],
    );
  };

  return (
    <View style={styles.stack}>
      <MostSuspectedCarCard car={topCar} totalCars={result.rankedCars.length} />

      <SectionHeader title="Train consist" />
      <Card>
        <TrainCarStrip
          cars={result.rankedCars}
          selectedCarId={selectedCarId}
          onSelect={selectCar}
        />
      </Card>

      <SectionHeader title="Car ranking" />
      <CarRanking
        cars={result.rankedCars}
        selectedCarId={selectedCarId}
        onSelect={selectCar}
      />

      {hasTelemetry ? (
        <>
          <SectionHeader title="Telemetry" />
          <Card>
            <ACVMetricSelector metrics={metrics} value={metric} onChange={setMetric} />
            <View style={styles.telemetry}>
              <ACVTelemetryChart
                result={result}
                metric={metric}
                selectedCarId={selectedCarId}
                compareCarIds={compareCarIds}
                showFleetAverage={showFleetAverage}
                onToggleCar={toggleCar}
                onToggleFleetAverage={() => setShowFleetAverage((value) => !value)}
              />
            </View>
          </Card>
        </>
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Ranking is available. Telemetry series were not included in this result.
        </Text>
      )}

      <Pressable
        onPress={() => setDetailsOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsOpen }}
        accessibilityLabel="Raw model details"
        style={styles.accordion}
      >
        <Text style={[typography.label, { color: colors.tint }]}>
          {detailsOpen ? "Hide model details" : "Show model details"}
        </Text>
      </Pressable>
      {detailsOpen ? (
        <Card>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Ranking order: {result.ranking ?? result.rankedCars.map((car) => car.carId).join("|")}
          </Text>
          <Text style={[typography.caption, styles.detail, { color: colors.textMuted }]}>
            Rank 1 is most likely to contain refrigerant leakage. This order is not a calibrated
            probability.
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  telemetry: {
    marginTop: spacing.md,
  },
  accordion: {
    minHeight: 44,
    justifyContent: "center",
  },
  detail: {
    marginTop: spacing.xs,
  },
});
