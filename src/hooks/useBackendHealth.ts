import { getHealth } from "@/api/analyses";
import { useAppConfig } from "@/context/AppConfigProvider";
import { useCallback, useEffect, useState } from "react";

export type BackendStatus = "checking" | "connected" | "disconnected";

export function useBackendHealth(): {
  status: BackendStatus;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { revision, useMockApi, apiBaseUrl } = useAppConfig();
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("checking");
    try {
      if (!useMockApi && !apiBaseUrl) {
        setStatus("disconnected");
        setError("API URL is not configured.");
        return;
      }
      await getHealth();
      setStatus("connected");
      setError(null);
    } catch (caught) {
      setStatus("disconnected");
      setError(caught instanceof Error ? caught.message : "Backend unreachable.");
    }
  }, [apiBaseUrl, useMockApi]);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  return { status, error, refresh };
}
