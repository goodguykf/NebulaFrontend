import { AnalysisUploadFile } from "@/api/analyses";
import { radii, spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface FileDropZoneProps {
  acceptedExtensions: readonly string[];
  allowsMultipleFiles: boolean;
  disabled?: boolean;
  onFiles: (files: AnalysisUploadFile[]) => void;
}

function toUploadFiles(list: FileList | null | undefined): AnalysisUploadFile[] {
  if (!list) {
    return [];
  }
  return Array.from(list).map((file) => ({
    uri: "",
    name: file.name,
    mimeType: file.type || undefined,
    sizeBytes: file.size,
    file,
  }));
}

/**
 * Drag & drop target plus file browser. Browser-only: the app is delivered as a web
 * build, and native builds would need expo-document-picker, which is not installed.
 */
export function FileDropZone({
  acceptedExtensions,
  allowsMultipleFiles,
  disabled = false,
  onFiles,
}: FileDropZoneProps) {
  const { colors } = useAppTheme();
  const zoneRef = useRef<View>(null);
  const [dragging, setDragging] = useState(false);
  const isWeb = Platform.OS === "web";

  const browse = useCallback(() => {
    if (!isWeb || disabled) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = allowsMultipleFiles;
    input.accept = acceptedExtensions.join(",");
    input.onchange = () => onFiles(toUploadFiles(input.files));
    input.click();
  }, [acceptedExtensions, allowsMultipleFiles, disabled, isWeb, onFiles]);

  useEffect(() => {
    if (!isWeb) {
      return undefined;
    }
    const node = zoneRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) {
      return undefined;
    }

    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (!disabled) {
        setDragging(true);
      }
    };
    const onDragLeave = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (!disabled) {
        onFiles(toUploadFiles(event.dataTransfer?.files));
      }
    };

    node.addEventListener("dragenter", onDragOver);
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("dragenter", onDragOver);
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("dragleave", onDragLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, [disabled, isWeb, onFiles]);

  if (!isWeb) {
    return (
      <View style={[styles.zone, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[typography.body, styles.centered, { color: colors.textSecondary }]}>
          File upload is available in the web app.
        </Text>
      </View>
    );
  }

  const accepted = acceptedExtensions.map((item) => item.toUpperCase()).join(", ");

  return (
    <Pressable
      ref={zoneRef}
      onPress={browse}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Choose ${accepted} ${allowsMultipleFiles ? "files" : "file"} to upload`}
      style={[
        styles.zone,
        {
          borderColor: dragging ? colors.tint : colors.border,
          backgroundColor: dragging ? colors.surfaceElevated : colors.surface,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[typography.heading, styles.centered, { color: colors.text }]}>
        {allowsMultipleFiles ? "Drag your files here" : "Drag your file here"}
      </Text>
      <Text style={[typography.body, styles.centered, { color: colors.tint }]}>
        or click to browse
      </Text>
      <Text style={[typography.caption, styles.centered, { color: colors.textMuted }]}>
        {accepted}
        {allowsMultipleFiles ? " · one or many files" : " · one file"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
  centered: {
    textAlign: "center",
  },
});
