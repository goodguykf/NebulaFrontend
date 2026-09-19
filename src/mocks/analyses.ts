import { mockACVFilename, mockACVResult } from "@/mocks/acv";
import { mockDoorFilename, mockDoorResult } from "@/mocks/door";
import { mockRailFilename, mockRailResult } from "@/mocks/rail";
import { mockSHMFilename, mockSHMResult } from "@/mocks/shm";
import { AnalysisRecord, CreateAnalysisResponse, SubsystemType } from "@/types/analysis";

const now = Date.now();

function minutesAgo(minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

const store: AnalysisRecord[] = [
  {
    id: "analysis_acv_001",
    subsystem: "acv",
    filename: mockACVFilename,
    createdAt: minutesAgo(2),
    status: "completed",
    result: mockACVResult,
  },
  {
    id: "analysis_door_001",
    subsystem: "door",
    filename: mockDoorFilename,
    createdAt: minutesAgo(15),
    status: "completed",
    result: mockDoorResult,
  },
  {
    id: "analysis_rail_001",
    subsystem: "rail",
    filename: mockRailFilename,
    createdAt: minutesAgo(23),
    status: "completed",
    result: mockRailResult,
  },
  {
    id: "analysis_shm_001",
    subsystem: "shm",
    filename: mockSHMFilename,
    createdAt: minutesAgo(61),
    status: "completed",
    result: mockSHMResult,
  },
];

async function delay(ms = 280): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function mockGetAnalyses(options?: {
  subsystem?: SubsystemType;
  limit?: number;
}): Promise<AnalysisRecord[]> {
  await delay();
  let records = [...store];
  if (options?.subsystem) {
    records = records.filter((record) => record.subsystem === options.subsystem);
  }
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (options?.limit) {
    records = records.slice(0, options.limit);
  }
  return records;
}

export async function mockGetAnalysis(id: string): Promise<AnalysisRecord> {
  await delay();
  const record = store.find((item) => item.id === id);
  if (!record) {
    throw new Error(`Analysis ${id} was not found.`);
  }
  return record;
}

function queuedRecord(
  id: string,
  subsystem: SubsystemType,
  filename: string,
): AnalysisRecord {
  const base = {
    id,
    filename,
    createdAt: new Date().toISOString(),
    status: "queued" as const,
  };

  switch (subsystem) {
    case "acv":
      return { ...base, subsystem: "acv" };
    case "door":
      return { ...base, subsystem: "door" };
    case "rail":
      return { ...base, subsystem: "rail" };
    case "shm":
      return { ...base, subsystem: "shm" };
  }
}

export async function mockCreateAnalysis(
  subsystem: SubsystemType,
  filenames: string[],
): Promise<CreateAnalysisResponse> {
  await delay(400);
  const filename = filenames[0] ?? `${subsystem}_upload`;
  const id = `analysis_${subsystem}_${Date.now()}`;
  store.unshift(queuedRecord(id, subsystem, filename));
  return { id, status: "queued" };
}

export async function mockGetHealth(): Promise<{ status: "ok" }> {
  await delay(120);
  return { status: "ok" };
}
