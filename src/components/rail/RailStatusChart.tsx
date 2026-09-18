import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { ThemeColors } from "@/constants/colors";
import { useAppTheme } from "@/theme/AppThemeProvider";
import { RailPrediction } from "@/types/rail";
import { RailStatusCountRow } from "@/utils/rail";
import { useMemo } from "react";

interface RailStatusChartProps {
  rows: RailStatusCountRow[];
  leadingStatus: RailPrediction;
}

function colorForStatus(status: RailPrediction, colors: ThemeColors): string {
  switch (status) {
    case "Normal":
      return colors.success;
    case "Side I":
      return colors.warning;
    case "Side II":
      return colors.subsystems.rail;
  }
}

export function RailStatusChart({ rows, leadingStatus }: RailStatusChartProps) {
  const { colors } = useAppTheme();

  const data = useMemo(
    () =>
      rows.map((row) => ({
        id: row.status,
        label: row.status,
        value: row.count,
        color: colorForStatus(row.status, colors),
        detail: row.status === leadingStatus ? "Leading status" : undefined,
      })),
    [colors, leadingStatus, rows],
  );

  return (
    <HorizontalBarChart
      data={data}
      emptyMessage="Status counts were not included in this result."
    />
  );
}
