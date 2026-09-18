import { getApiBaseUrl, isMockApiEnabled, setMockApiEnabled } from "@/constants/config";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AppConfigContextValue {
  useMockApi: boolean;
  apiBaseUrl: string;
  revision: number;
  setUseMockApi: (enabled: boolean) => void;
}

const AppConfigContext = createContext<AppConfigContextValue | undefined>(undefined);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [useMockApi, setUseMockApiState] = useState(isMockApiEnabled);
  const [revision, setRevision] = useState(0);

  const setUseMockApi = useCallback((enabled: boolean) => {
    setMockApiEnabled(enabled);
    setUseMockApiState(enabled);
    setRevision((current) => current + 1);
  }, []);

  const value = useMemo<AppConfigContextValue>(
    () => ({
      useMockApi,
      apiBaseUrl: getApiBaseUrl(),
      revision,
      setUseMockApi,
    }),
    [revision, setUseMockApi, useMockApi],
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error("useAppConfig must be used within AppConfigProvider");
  }
  return context;
}
