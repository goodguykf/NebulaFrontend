import { Card } from "@/components/common/Card";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAppConfig } from "@/context/AppConfigProvider";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { ThemePreference, useAppTheme } from "@/theme/AppThemeProvider";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const { useMockApi, setUseMockApi, apiBaseUrl } = useAppConfig();
  const { status, error, refresh } = useBackendHealth();

  const statusTone =
    status === "connected" ? "success" : status === "checking" ? "info" : "danger";
  const statusLabel =
    status === "connected"
      ? useMockApi
        ? "Connected · Mock API"
        : "Connected"
      : status === "checking"
        ? "Checking"
        : "Disconnected";

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={[typography.display, { color: colors.text }]}>Settings</Text>
        <Text style={[typography.subtitle, { color: colors.textMuted }]}>
          Connection, appearance, and development
        </Text>
      </View>

      <SectionHeader title="API" />
      <Card>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text style={[typography.label, { color: colors.textMuted }]}>Backend status</Text>
            <View style={styles.statusRow}>
              <StatusBadge label={statusLabel} tone={statusTone} />
            </View>
            {error ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>{error}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh backend status"
            style={styles.refresh}
          >
            <Text style={[typography.label, { color: colors.tint }]}>Refresh</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />
        <Text style={[typography.label, { color: colors.textMuted }]}>API URL</Text>
        <Text style={[typography.body, { color: colors.text }]}>
          {apiBaseUrl || "Not configured"}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Read from EXPO_PUBLIC_API_URL. Use a LAN IP for a physical device; localhost is not
          reachable from Expo Go on a phone.
        </Text>
      </Card>

      <SectionHeader title="Appearance" />
      <SegmentedControl
        options={APPEARANCE_OPTIONS}
        value={preference}
        onChange={setPreference}
        accessibilityLabel="Appearance"
      />

      <SectionHeader title="Development" />
      <Card>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text style={[typography.heading, { color: colors.text }]}>Mock API</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {useMockApi
                ? "Enabled. The app uses local visualisation-ready results."
                : "Disabled. Requests go to EXPO_PUBLIC_API_URL."}
            </Text>
          </View>
          <Switch
            value={useMockApi}
            onValueChange={setUseMockApi}
            accessibilityLabel="Mock API"
            trackColor={{ true: colors.tint, false: colors.border }}
          />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.xs,
  },
  refresh: {
    minHeight: 44,
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: spacing.md,
  },
});
