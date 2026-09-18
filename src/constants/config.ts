const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function readEnvFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const normalised = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalised)) {
    return true;
  }
  if (FALSE_VALUES.has(normalised)) {
    return false;
  }
  return fallback;
}

function readEnvMockFlag(): boolean {
  return readEnvFlag(process.env.EXPO_PUBLIC_USE_MOCK_API, true);
}

let mockApiOverride: boolean | null = null;

export function isMockApiEnabled(): boolean {
  return mockApiOverride ?? readEnvMockFlag();
}

export function setMockApiEnabled(enabled: boolean): void {
  mockApiOverride = enabled;
}

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
}

export const ANALYSIS_POLL_INTERVAL_MS = 2000;
export const REQUEST_TIMEOUT_MS = 15000;
