import { TABLET_BREAKPOINT } from "@/constants/layout";

export function getLinearDomain(
  values: number[],
  padding = 0.08,
): { min: number; max: number } {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  let min = values[0] ?? 0;
  let max = values[0] ?? 1;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) {
    const bump = Math.abs(min) * 0.1 || 1;
    return { min: min - bump, max: max + bump };
  }

  const span = max - min;
  return {
    min: min - span * padding,
    max: max + span * padding,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalise(value: number, min: number, max: number): number {
  if (max === min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

export function chartWidthForLayout(containerWidth: number, maxWidth = 720): number {
  return Math.min(containerWidth, maxWidth, 1200);
}

export function shouldUseCompactChart(width: number): boolean {
  return width < TABLET_BREAKPOINT;
}
