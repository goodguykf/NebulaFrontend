import { AnalysisUploadFile } from "@/api/analyses";
import { FileDropZone } from "@/components/analyze/FileDropZone";
import { Card } from "@/components/common/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { FileInfoCard } from "@/components/common/FileInfoCard";
import { LoadingState } from "@/components/common/LoadingState";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { CARD_GRID_GAP, getColumnCount } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { SUBSYSTEM_META, SUBSYSTEM_ORDER } from "@/constants/subsystems";
import { typography } from "@/constants/typography";
import { useAnalysisUpload } from "@/hooks/useAnalysisUpload";
import { SubsystemType } from "@/types/analysis";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { formatSubsystemPath } from "@/utils/format";
import { validateFileExtension } from "@/utils/validation";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

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

  const router = useRouter();
  const [files, setFiles] = useState<AnalysisUploadFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const { phase, error, elapsedSeconds, submit, reset } = useAnalysisUpload();
  const busy = phase === "uploading" || phase === "processing";

  useEffect(() => {
    if (isSubsystem(params.subsystem)) {
      setSelected(params.subsystem);
    }
  }, [params.subsystem]);

  const selectSubsystem = useCallback(
    (subsystem: SubsystemType) => {
      if (busy) {
        return;
      }
      setSelected(subsystem);
      setFiles([]);
      setFileError(null);
      reset();
    },
    [busy, reset],
  );

  const addFiles = useCallback(
    (incoming: AnalysisUploadFile[]) => {
      if (!selected || incoming.length === 0) {
        return;
      }
      const rejected = incoming.find((file) => validateFileExtension(selected, file.name));
      if (rejected) {
        setFileError(`${rejected.name}: ${validateFileExtension(selected, rejected.name)}`);
        return;
      }
      setFileError(null);
      reset();
      setFiles((current) =>
        SUBSYSTEM_META[selected].allowsMultipleFiles
          ? [...current, ...incoming]
          : incoming.slice(0, 1),
      );
    },
    [reset, selected],
  );

  const runAnalysis = useCallback(async () => {
    if (!selected || files.length === 0 || busy) {
      return;
    }
    const record = await submit(selected, files);
    if (record) {
      setFiles([]);
      router.push(formatSubsystemPath(record.subsystem, record.id) as Href);
    }
  }, [busy, files, router, selected, submit]);

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
          Select a subsystem, add the data file, and run the analysis.
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
                onPress={() => selectSubsystem(subsystem)}
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
            Files are sent unchanged to the backend and deleted there once the analysis ends.
          </Text>
        </Card>
      ) : null}

      {selectedMeta ? (
        <View style={styles.upload}>
          <SectionHeader title="Add data" />
          <FileDropZone
            acceptedExtensions={selectedMeta.acceptedExtensions}
            allowsMultipleFiles={selectedMeta.allowsMultipleFiles}
            disabled={busy}
            onFiles={addFiles}
          />

          {fileError ? (
            <Text style={[typography.caption, { color: colors.danger }]} accessibilityRole="alert">
              {fileError}
            </Text>
          ) : null}

          {files.map((file, index) => (
            <FileInfoCard
              key={`${file.name}-${index}`}
              filename={file.name}
              sizeBytes={file.sizeBytes}
              onRemove={
                busy ? undefined : () => setFiles((current) => current.filter((_, i) => i !== index))
              }
            />
          ))}

          {busy ? (
            <LoadingState
              message={
                phase === "uploading"
                  ? `Uploading ${files.length === 1 ? "file" : `${files.length} files`}…`
                  : `Analysing… ${elapsedSeconds}s`
              }
            />
          ) : (
            <Pressable
              onPress={runAnalysis}
              disabled={files.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Run analysis"
              accessibilityState={{ disabled: files.length === 0 }}
              style={[
                styles.run,
                { backgroundColor: colors.tint, opacity: files.length === 0 ? 0.45 : 1 },
              ]}
            >
              <Text style={[typography.label, { color: colors.background }]}>
                {files.length > 1 ? `Run analysis on ${files.length} files` : "Run analysis"}
              </Text>
            </Pressable>
          )}

          {phase === "failed" && error ? (
            <ErrorState
              title="Analysis failed"
              message={error}
              onRetry={runAnalysis}
              retryLabel="Try again"
            />
          ) : null}
        </View>
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
  upload: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  run: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
});
