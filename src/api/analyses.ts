import { apiRequest, apiUpload } from "@/api/client";
import { isMockApiEnabled } from "@/constants/config";
import {
  mockCreateAnalysis,
  mockGetAnalyses,
  mockGetAnalysis,
  mockGetHealth,
} from "@/mocks/analyses";
import {
  AnalysisRecord,
  CreateAnalysisResponse,
  HealthResponse,
  SubsystemType,
} from "@/types/analysis";
import { normaliseAnalysisRecord } from "@/utils/acv";

export interface AnalysisUploadFile {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface GetAnalysesOptions {
  subsystem?: SubsystemType;
  limit?: number;
  cursor?: string;
}

export async function getHealth(): Promise<HealthResponse> {
  if (isMockApiEnabled()) {
    return mockGetHealth();
  }
  return apiRequest<HealthResponse>("/api/v1/health");
}

export async function getAnalyses(options: GetAnalysesOptions = {}): Promise<AnalysisRecord[]> {
  if (isMockApiEnabled()) {
    const records = await mockGetAnalyses(options);
    return records.map(normaliseAnalysisRecord);
  }

  const params = new URLSearchParams();
  if (options.subsystem) params.set("subsystem", options.subsystem);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.cursor) params.set("cursor", options.cursor);
  const query = params.toString();
  const records = await apiRequest<AnalysisRecord[]>(`/api/v1/analyses${query ? `?${query}` : ""}`);
  return records.map(normaliseAnalysisRecord);
}

export async function getAnalysis(id: string): Promise<AnalysisRecord> {
  if (isMockApiEnabled()) {
    return normaliseAnalysisRecord(await mockGetAnalysis(id));
  }
  return normaliseAnalysisRecord(await apiRequest<AnalysisRecord>(`/api/v1/analyses/${id}`));
}

export async function createAnalysis(
  subsystem: SubsystemType,
  files: AnalysisUploadFile[],
): Promise<CreateAnalysisResponse> {
  if (isMockApiEnabled()) {
    return mockCreateAnalysis(
      subsystem,
      files.map((file) => file.name),
    );
  }

  const formData = new FormData();
  formData.append("subsystem", subsystem);
  files.forEach((file) => {
    formData.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);
  });

  return apiUpload<CreateAnalysisResponse>("/api/v1/analyses", formData);
}
