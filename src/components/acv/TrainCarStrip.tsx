import { radii, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { ACVCarRank } from "@/types/acv";
import { formatFaultLikelihood, formatRankLabel, sortCarsById } from "@/utils/acv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface TrainCarStripProps {
  cars: ACVCarRank[];
  selectedCarId?: string;
  onSelect: (carId: string) => void;
}

export function TrainCarStrip({ cars, selectedCarId, onSelect }: TrainCarStripProps) {
  const { colors } = useAppTheme();
  const ordered = sortCarsById(cars);
  const total = cars.length;

  return (
    <View>
      <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
        Physical train order. Rank 1 is the car most likely to contain leakage.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ordered.map((car, index) => {
          const selected = car.carId === selectedCarId;
          const topRanked = car.rank === 1;
          const likelihood = formatFaultLikelihood(car.rank, total);
          const fill = topRanked ? `${colors.danger}22` : colors.surfaceElevated;
          const border = selected ? colors.tint : topRanked ? colors.danger : colors.border;
          const labelColor = topRanked ? colors.danger : colors.text;

          return (
            <View key={car.carId} style={styles.unit}>
              <Pressable
                onPress={() => onSelect(car.carId)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Car ${car.carId}, ${formatRankLabel(car.rank)}, ${likelihood}`}
                style={[
                  styles.car,
                  {
                    backgroundColor: fill,
                    borderColor: border,
                    borderWidth: selected || topRanked ? 2 : 1,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: topRanked ? colors.danger : colors.textMuted }]}>
                  {formatRankLabel(car.rank)}
                </Text>
                <Text style={[typography.title, { color: labelColor }]}>{car.carId}</Text>
                <Text
                  style={[typography.caption, styles.likelihood, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {likelihood}
                </Text>
              </Pressable>
              <View style={styles.wheels}>
                <View style={[styles.wheel, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.wheel, { backgroundColor: colors.textMuted }]} />
              </View>
              {index < ordered.length - 1 ? (
                <View style={[styles.coupler, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    marginBottom: spacing.sm,
  },
  row: {
    alignItems: "flex-end",
    paddingBottom: spacing.sm,
    gap: 0,
  },
  unit: {
    width: 84,
    alignItems: "center",
    marginRight: 8,
  },
  car: {
    width: "100%",
    minHeight: 108,
    borderRadius: radii.md,
    padding: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  likelihood: {
    textAlign: "center",
  },
  wheels: {
    marginTop: 4,
    width: "70%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  wheel: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  coupler: {
    position: "absolute",
    right: -12,
    top: 48,
    width: 12,
    height: 4,
    borderRadius: 2,
  },
});
