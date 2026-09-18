import { radii, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ACVCarRank } from "@/types/acv";
import { formatFaultLikelihood, formatRankLabel, sortCarsByRank } from "@/utils/acv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CarRankingProps {
  cars: ACVCarRank[];
  selectedCarId?: string;
  onSelect: (carId: string) => void;
}

export function CarRanking({ cars, selectedCarId, onSelect }: CarRankingProps) {
  const { colors } = useAppTheme();
  const ranked = sortCarsByRank(cars);
  const hasScores = ranked.every((car) => typeof car.score === "number");
  const maxScore = hasScores
    ? Math.max(...ranked.map((car) => car.score ?? 0), 0.0001)
    : undefined;

  return (
    <View style={styles.list}>
      {ranked.map((car) => {
        const selected = car.carId === selectedCarId;
        const likelihood = formatFaultLikelihood(car.rank, ranked.length);
        const score = car.score;
        const barWidth =
          hasScores && maxScore && score != null ? `${Math.max(8, (score / maxScore) * 100)}%` : undefined;

        return (
          <Pressable
            key={car.carId}
            onPress={() => onSelect(car.carId)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${formatRankLabel(car.rank)}. Car ${car.carId}. ${likelihood}${score != null ? `. Anomaly score ${score}` : ""}`}
            style={[
              styles.row,
              {
                backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                borderColor: selected ? colors.tint : colors.border,
              },
            ]}
          >
            <Text style={[typography.label, styles.rank, { color: colors.textMuted }]}>
              {car.rank}.
            </Text>
            <View style={styles.body}>
              <View style={styles.heading}>
                <Text style={[typography.body, { color: colors.text }]}>Car {car.carId}</Text>
                <Text style={[typography.caption, { color: car.rank === 1 ? colors.danger : colors.textMuted }]}>
                  {likelihood}
                </Text>
              </View>
              {barWidth && score != null ? (
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth as `${number}%`,
                        backgroundColor: car.rank === 1 ? colors.danger : colors.tint,
                      },
                    ]}
                  />
                </View>
              ) : (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {formatRankLabel(car.rank)} of {ranked.length}
                </Text>
              )}
              {score != null ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Anomaly score {score.toFixed(2)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
    width: "100%",
  },
  row: {
    width: "100%",
    minHeight: 56,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rank: {
    width: 28,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  heading: {
    gap: 2,
  },
  barTrack: {
    height: 6,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  bar: {
    height: 6,
    borderRadius: radii.pill,
  },
});
