import { ACVResult } from "@/types/acv";
import { DoorPrediction, DoorResult, DoorSegment } from "@/types/door";
import { RailPrediction, RailResult } from "@/types/rail";
import { SHMResult } from "@/types/shm";
import { parseACVRanking } from "@/utils/acv";

export function parseCsvTable(text: string): { header: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const header = (lines[0] ?? "").split(",");
  const rows = lines.slice(1).map((line) => line.split(","));
  return { header, rows };
}

export function parseDepotClock(value: string): string {
  const parts = value.split("-").map((part) => Number(part));
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const hour = parts[3];
  const minute = parts[4];
  const second = parts[5];
  const millisecond = parts[6];
  if (
    parts.length !== 7 ||
    year == null ||
    month == null ||
    day == null ||
    hour == null ||
    minute == null ||
    second == null ||
    millisecond == null ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return value;
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond)).toISOString();
}

function isDoorPrediction(value: string): value is DoorPrediction {
  return value === "Normal" || value === "Abnormal resistance";
}

function isRailPrediction(value: string): value is RailPrediction {
  return value === "Normal" || value === "Side I" || value === "Side II";
}

export function parseACVPredictionsCsv(text: string): { filename: string; result: ACVResult } {
  const { rows } = parseCsvTable(text);
  const [filename, ranking] = rows[0] ?? [];
  if (!filename || !ranking) {
    throw new Error("ACV predictions file has no ranking row.");
  }
  return {
    filename,
    result: {
      type: "acv",
      ranking,
      rankedCars: parseACVRanking(ranking),
      availableMetrics: [],
    },
  };
}

export function parseDoorPredictionsCsv(text: string): DoorResult {
  const { rows } = parseCsvTable(text);
  const segments: DoorSegment[] = rows.map((row, index) => {
    const [startTime, endTime, prediction, confidence] = row;
    if (!startTime || !endTime || !prediction || !isDoorPrediction(prediction)) {
      throw new Error(`Door predictions row ${index + 1} is not a published cycle.`);
    }
    return {
      id: `seg_${String(index + 1).padStart(3, "0")}`,
      startTime: parseDepotClock(startTime),
      endTime: parseDepotClock(endTime),
      prediction,
      confidence: confidence != null && confidence !== "" ? Number(confidence) : undefined,
    };
  });
  const abnormalSegments = segments.filter(
    (segment) => segment.prediction === "Abnormal resistance",
  ).length;
  return {
    type: "door",
    totalSegments: segments.length,
    normalSegments: segments.length - abnormalSegments,
    abnormalSegments,
    segments,
  };
}

export function parseRailPredictionsCsv(text: string): RailResult {
  const { rows } = parseCsvTable(text);
  const files = rows.map((row, index) => {
    const [fileId, prediction] = row;
    if (!fileId || !prediction || !isRailPrediction(prediction)) {
      throw new Error(`Rail predictions row ${index + 1} is not a published class.`);
    }
    return { fileId, prediction };
  });
  const statusCounts = {
    normal: files.filter((file) => file.prediction === "Normal").length,
    sideI: files.filter((file) => file.prediction === "Side I").length,
    sideII: files.filter((file) => file.prediction === "Side II").length,
  };
  const leading = (["Normal", "Side I", "Side II"] as const)
    .map((status) => ({
      status,
      count:
        status === "Normal"
          ? statusCounts.normal
          : status === "Side I"
            ? statusCounts.sideI
            : statusCounts.sideII,
    }))
    .sort((a, b) => b.count - a.count)[0];

  return {
    type: "rail",
    prediction: leading?.status ?? "Normal",
    statusCounts,
    files,
  };
}

export function parseSHMPredictionsCsv(text: string): SHMResult {
  const { rows } = parseCsvTable(text);
  return {
    type: "shm",
    files: rows.map((row, index) => {
      const [fileId, prediction] = row;
      const value = Number(prediction);
      if (!fileId || !Number.isFinite(value)) {
        throw new Error(`SHM predictions row ${index + 1} is not a published damage value.`);
      }
      return { fileId, prediction: value };
    }),
  };
}
