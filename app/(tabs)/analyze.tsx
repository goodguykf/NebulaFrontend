import { Card } from "@/components/common/Card";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CARD_GRID_GAP, getColumnCount } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { SUBSYSTEM_META, SUBSYSTEM_ORDER } from "@/constants/subsystems";
import { typography } from "@/constants/typography";
import { SubsystemType } from "@/types/analysis";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

function isSubsystem(value: string | string[] | undefined): value is SubsystemType {
  return typeof value === "string" && SUBSYSTEM_ORDER.includes(value as SubsystemType);
}

export default function AnalyzeScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const columns = getColumnCount(width);
  const params = useLocalSearchParams<{ subsystem?: string | string[] }>();
  const [selected, setSelected] = useState<SubsystemType | null>(
    isSubsystem(params.subsystem) ? params.subsystem : null,
  );

  useEffect(() => {
    if (isSubsystem(params.subsystem)) {
      setSelected(params.subsystem);
    }
  }, [params.subsystem]);

  const selectedMeta = selected ? SUBSYSTEM_META[selected] : null;
  const accepted = useMemo(
    () => selectedMeta?.acceptedExtensions.map((ext) => ext.toUpperCase()).join(", "),
    [selectedMeta],
  );

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={[typography.display, { color: colors.text }]}>Analyze</Text>
        <Text style={[typography.subtitle, { color: colors.textMuted }]}>
          Select a subsystem, then upload source files in a later step.
        </Text>
      </View>

      <SectionHeader title="Select subsystem" />
      <View style={styles.grid}>
        {SUBSYSTEM_ORDER.map((subsystem) => {
          const meta = SUBSYSTEM_META[subsystem];
          const isSelected = selected === subsystem;
          return (
            <View key={subsystem} style={{ width: columns === 2 ? "48.5%" : "100%" }}>
              <Card
                selected={isSelected}
                onPress={() => setSelected(subsystem)}
                accessibilityLabel={`${meta.shortLabel}. ${meta.description}`}
                accessibilityHint="Selects this subsystem for analysis"
                style={styles.card}
              >
                <Text style={[typography.label, { color: colors.subsystems[subsystem] }]}>
                  {meta.shortLabel}
                </Text>
                <Text style={[typography.heading, { color: colors.text }]}>{meta.title}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {meta.description}
                </Text>
              </Card>
            </View>
          );
        })}
      </View>

      {selectedMeta ? (
        <Card style={styles.requirements}>
          <Text style={[typography.label, { color: colors.textMuted }]}>File requirements</Text>
          <Text style={[typography.heading, styles.reqTitle, { color: colors.text }]}>
            {selectedMeta.title}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {selectedMeta.description}
          </Text>
          <Text style={[typography.caption, styles.accepted, { color: colors.textMuted }]}>
            Accepted: {accepted}
            {selectedMeta.allowsMultipleFiles ? " · one or multiple files" : ""}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            File upload and job polling will be enabled in the next implementation phase. The
            selected file will be sent unchanged to the backend.
          </Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GRID_GAP,
  },
  card: {
    minHeight: 132,
    gap: spacing.xs,
  },
  requirements: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  reqTitle: {
    marginTop: spacing.xxs,
  },
  accepted: {
    marginTop: spacing.sm,
  },
});
