export const TABLET_BREAKPOINT = 768;
export const MAX_CONTENT_WIDTH = 1080;
export const CARD_GRID_GAP = 12;

export function isTabletWidth(width: number): boolean {
  return width >= TABLET_BREAKPOINT;
}

export function getColumnCount(width: number): 1 | 2 {
  return isTabletWidth(width) ? 2 : 1;
}
