export const palette = {
  navy950: "#070B14",
  navy900: "#0B1220",
  navy800: "#121A2B",
  navy700: "#182338",
  navy600: "#223049",
  slate200: "#D7E0EC",
  slate400: "#9AA8BC",
  slate500: "#7B8BA3",
  white: "#F7FAFC",
  blue: "#4C8DFF",
  teal: "#2EC4B6",
  amber: "#F0B429",
  orange: "#F08A5D",
  red: "#E85D4C",
  green: "#3DDC97",
  purple: "#8B7CFF",
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  tint: string;
  tabBar: string;
  tabIconDefault: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  chartGrid: string;
  heatmap: readonly string[];
  subsystems: {
    acv: string;
    door: string;
    rail: string;
    shm: string;
  };
};

export const darkColors: ThemeColors = {
  background: palette.navy900,
  surface: palette.navy800,
  surfaceElevated: palette.navy700,
  border: "rgba(215, 224, 236, 0.12)",
  text: palette.white,
  textSecondary: palette.slate200,
  textMuted: palette.slate400,
  tint: palette.blue,
  tabBar: palette.navy950,
  tabIconDefault: palette.slate500,
  success: palette.green,
  warning: palette.amber,
  danger: palette.red,
  overlay: "rgba(7, 11, 20, 0.72)",
  chartGrid: "rgba(215, 224, 236, 0.08)",
  heatmap: ["#152033", "#1B4B6B", "#2E8BC0", "#F0B429", "#E85D4C"],
  subsystems: {
    acv: palette.teal,
    door: palette.orange,
    rail: palette.blue,
    shm: palette.purple,
  },
};

export const lightColors: ThemeColors = {
  background: "#EEF2F7",
  surface: "#FFFFFF",
  surfaceElevated: "#F7FAFC",
  border: "rgba(18, 26, 43, 0.10)",
  text: "#102033",
  textSecondary: "#334155",
  textMuted: "#64748B",
  tint: "#2F6FED",
  tabBar: "#FFFFFF",
  tabIconDefault: "#94A3B8",
  success: "#0F9F6E",
  warning: "#C4850A",
  danger: "#D64539",
  overlay: "rgba(15, 23, 42, 0.45)",
  chartGrid: "rgba(15, 23, 42, 0.08)",
  heatmap: ["#E2E8F0", "#93C5FD", "#3B82F6", "#F59E0B", "#DC2626"],
  subsystems: {
    acv: "#0F9C9A",
    door: "#D97706",
    rail: "#2F6FED",
    shm: "#6D5EF2",
  },
};
