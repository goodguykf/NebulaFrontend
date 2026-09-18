import { radii, MIN_TOUCH_SIZE, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface ACVMetricSelectorProps {
  metrics: string[];
  value?: string;
  onChange: (metric: string) => void;
}

export function ACVMetricSelector({ metrics, value, onChange }: ACVMetricSelectorProps) {
  const { colors } = useAppTheme();

  if (metrics.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={[typography.label, styles.label, { color: colors.textMuted }]}>Metric</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {metrics.map((metric) => {
          const selected = metric === value;
          return (
            <Pressable
              key={metric}
              onPress={() => onChange(metric)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={metric}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.tint : colors.surfaceElevated,
                  borderColor: selected ? colors.tint : colors.border,
                },
              ]}
            >
              <Text style={[typography.label, { color: selected ? colors.background : colors.text }]}>
                {metric}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.xs,
  },
  chip: {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
