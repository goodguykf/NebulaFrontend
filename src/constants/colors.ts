export const palette = {
  navy950: "#0A1420",
  navy900: "#0E151D",
  navy800: "#151E28",
  navy700: "#1C2733",
  navy600: "#26313D",
  slate200: "#E8EDF2",
  slate400: "#90A1B1",
  slate500: "#8FA3BA",
  white: "#E8EDF2",
  blue: "#4E9BD8",
  teal: "#43B486",
  amber: "#D6A03C",
  orange: "#E0834A",
  red: "#E4645E",
  green: "#43B486",
  purple: "#9578C8",
  depot: "#E8A33C",
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
  depot: string;
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
  border: "#26313D",
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
  depot: palette.depot,
  chartGrid: "rgba(215, 224, 236, 0.08)",
  heatmap: ["#152033", "#1B4B6B", "#2E8BC0", "#D6A03C", "#E4645E"],
  subsystems: {
    acv: palette.teal,
    door: palette.orange,
    rail: palette.blue,
    shm: palette.purple,
  },
};

export const lightColors: ThemeColors = {
  background: "#EEF1F4",
  surface: "#FFFFFF",
  surfaceElevated: "#E6EBF0",
  border: "#D5DCE3",
  text: "#16202B",
  textSecondary: "#16202B",
  textMuted: "#5C6B7A",
  tint: "#2B6CA3",
  tabBar: "#0F1F33",
  tabIconDefault: "#8FA3BA",
  success: "#2E8B60",
  warning: "#B8801C",
  danger: "#C9403A",
  overlay: "rgba(15, 23, 42, 0.45)",
  depot: "#C97A14",
  chartGrid: "rgba(15, 23, 42, 0.08)",
  heatmap: ["#E2E8F0", "#93C5FD", "#3C7FB1", "#B8801C", "#C9403A"],
  subsystems: {
    acv: "#2E8B60",
    door: "#C4632B",
    rail: "#2B6CA3",
    shm: "#7D5BA6",
  },
};
