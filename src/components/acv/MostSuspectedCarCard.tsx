import { Card } from "@/components/common/Card";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ACVCarRank } from "@/types/acv";
import { formatFaultLikelihood, formatRankLabel } from "@/utils/acv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { StyleSheet, Text, View } from "react-native";

interface MostSuspectedCarCardProps {
  car?: ACVCarRank;
  totalCars: number;
}

export function MostSuspectedCarCard({ car, totalCars }: MostSuspectedCarCardProps) {
  const { colors } = useAppTheme();

  if (!car) {
    return (
      <Card>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          No car ranking was returned for this analysis.
        </Text>
      </Card>
    );
  }

  return (
    <Card
      accessibilityLabel={`Most suspected car ${car.carId}. ${formatRankLabel(car.rank)}. ${formatFaultLikelihood(car.rank, totalCars)}`}
    >
      <Text style={[typography.label, { color: colors.textMuted }]}>Most suspected car</Text>
      <Text style={[typography.metric, styles.car, { color: colors.text }]}>Car {car.carId}</Text>
      <View style={styles.meta}>
        <Text style={[typography.heading, { color: colors.danger }]}>
          {formatRankLabel(car.rank)}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {formatFaultLikelihood(car.rank, totalCars)}
        </Text>
      </View>
      {car.score != null ? (
        <Text style={[typography.caption, styles.score, { color: colors.textMuted }]}>
          Anomaly score: {car.score.toFixed(2)}
        </Text>
      ) : (
        <Text style={[typography.caption, styles.score, { color: colors.textMuted }]}>
          Ranking is the model output. No probability or confidence value was provided.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  car: {
    marginTop: spacing.xs,
  },
  meta: {
    marginTop: spacing.sm,
    gap: spacing.xxs,
  },
  score: {
    marginTop: spacing.sm,
  },
});
