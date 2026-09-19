import { getPredictionsCsvUrl } from "@/api/analyses";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppConfig } from "@/context/AppConfigProvider";
import { PREDICTION_CSV } from "@/mocks/predictions/csv";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { AnalysisRecord } from "@/types/analysis";
import * as Linking from "expo-linking";
import { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

interface DownloadPredictionsButtonProps {
  record: AnalysisRecord;
}

function saveFromBrowser(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Downloads `<subsystem>_predictions.csv` in the hackathon submission format. */
export function DownloadPredictionsButton({ record }: DownloadPredictionsButtonProps) {
  const { colors } = useAppTheme();
  const { useMockApi } = useAppConfig();
  const filename = `${record.subsystem}_predictions.csv`;

  const download = useCallback(() => {
    if (useMockApi) {
      if (Platform.OS !== "web") {
        return;
      }
      const blob = new Blob([PREDICTION_CSV[record.subsystem]], { type: "text/csv" });
      const href = URL.createObjectURL(blob);
      saveFromBrowser(href, filename);
      URL.revokeObjectURL(href);
      return;
    }

    const url = getPredictionsCsvUrl(record.id);
    if (Platform.OS === "web") {
      saveFromBrowser(url, filename);
      return;
    }
    void Linking.openURL(url);
  }, [filename, record.id, record.subsystem, useMockApi]);

  if (record.status !== "completed") {
    return null;
  }

  return (
    <Pressable
      onPress={download}
      accessibilityRole="button"
      accessibilityLabel={`Download ${filename}`}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.tint, opacity: pressed ? 0.86 : 1 },
      ]}
    >
      <Text style={[typography.label, { color: colors.background }]}>Download predictions CSV</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
});
