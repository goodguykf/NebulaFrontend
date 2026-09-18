import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { formatFileSize } from "@/utils/format";
import { getFileExtension } from "@/utils/validation";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/common/Card";

interface FileInfoCardProps {
  filename: string;
  sizeBytes?: number;
  onRemove?: () => void;
}

export function FileInfoCard({ filename, sizeBytes, onRemove }: FileInfoCardProps) {
  const { colors } = useAppTheme();
  const extension = getFileExtension(filename).replace(".", "").toUpperCase() || "FILE";

  return (
    <Card accessibilityLabel={`Selected file ${filename}`}>
      <View style={styles.row}>
        <View style={[styles.ext, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[typography.label, { color: colors.tint }]}>{extension}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
            {filename}
          </Text>
          {sizeBytes != null ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {formatFileSize(sizeBytes)}
            </Text>
          ) : null}
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${filename}`}
            hitSlop={8}
            style={styles.remove}
          >
            <Text style={[typography.label, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ext: {
    minWidth: 52,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  remove: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
});
