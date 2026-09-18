import { SymbolView } from "expo-symbols";
import { ColorValue, StyleSheet, Text } from "react-native";

type TabKey = "overview" | "analyze" | "history" | "settings";

const ICONS = {
  overview: { ios: "square.grid.2x2.fill", android: "dashboard", web: "dashboard" },
  analyze: { ios: "waveform.path.ecg", android: "analytics", web: "analytics" },
  history: { ios: "clock", android: "history", web: "history" },
  settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
} as const;

const FALLBACK: Record<TabKey, string> = {
  overview: "▣",
  analyze: "⌁",
  history: "◷",
  settings: "⚙",
};

interface TabBarIconProps {
  name: TabKey;
  color: ColorValue;
}

export function TabBarIcon({ name, color }: TabBarIconProps) {
  return (
    <SymbolView
      name={ICONS[name]}
      tintColor={color}
      size={26}
      style={styles.icon}
      fallback={
        <Text style={[styles.fallback, { color }]} accessibilityElementsHidden>
          {FALLBACK[name]}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 26,
    height: 26,
  },
  fallback: {
    fontSize: 16,
    lineHeight: 26,
  },
});
