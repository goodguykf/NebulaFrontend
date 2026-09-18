import { getAnalysisImageSource } from "@/api/images";
import { Card } from "@/components/common/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";

interface RailConfusionMatrixProps {
  imageUrl: string;
  title?: string;
}

export function RailConfusionMatrix({ imageUrl, title }: RailConfusionMatrixProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const source = useMemo(() => getAnalysisImageSource(imageUrl), [imageUrl]);
  const isRemote = typeof source === "object" && source !== null && "uri" in source;
  const [loading, setLoading] = useState(isRemote);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imageWidth = Math.min(width - 72, 720);

  const retry = () => {
    setFailed(false);
    setLoading(isRemote);
    setRetryKey((current) => current + 1);
  };

  return (
    <Card>
      {title ? (
        <Text style={[typography.label, styles.title, { color: colors.text }]}>{title}</Text>
      ) : (
        <Text style={[typography.label, styles.title, { color: colors.text }]}>
          Confusion matrix
        </Text>
      )}
      <Text style={[typography.caption, styles.caption, { color: colors.textMuted }]}>
        Retrieved from the analysis API. Pixel values are not re-interpreted on the device.
      </Text>

      {failed ? (
        <ErrorState
          title="Image unavailable"
          message="We couldn't load the confusion matrix from the API."
          onRetry={retry}
        />
      ) : (
        <View style={styles.frame}>
          {loading ? <LoadingState message="Loading confusion matrix…" /> : null}
          <Image
            key={retryKey}
            source={source}
            accessibilityLabel={title ?? "Confusion matrix from the rail model evaluation API"}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            style={[
              styles.image,
              { width: imageWidth, opacity: loading ? 0 : 1 },
            ]}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xs,
  },
  caption: {
    marginBottom: spacing.md,
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  image: {
    height: 320,
    maxWidth: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
});
