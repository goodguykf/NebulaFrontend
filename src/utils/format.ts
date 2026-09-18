import { AnalysisRecord, AnalysisStatus, SubsystemType } from "@/types/analysis";
import { DoorResult } from "@/types/door";
import { SHMResult } from "@/types/shm";

const statusLabels: Record<AnalysisStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function formatAnalysisStatus(status: AnalysisStatus): string {
  return statusLabels[status];
}

export function formatTimestamp(value: string, locale?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(deltaSeconds, "second");
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (absSeconds < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  }
  if (absSeconds < 604800) {
    return formatter.format(Math.round(deltaSeconds / 86400), "day");
  }
  return formatTimestamp(value);
}

export function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "—";
  }

  const seconds = Math.max(0, (end - start) / 1000);
  if (seconds < 10) {
    return `${seconds.toFixed(2)} s`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toFixed(0)}s`;
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(undefined, options).format(value);
}

export function formatDamage(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const abs = Math.abs(value);
  if (abs !== 0 && abs < 0.0001) {
    return value.toExponential(2);
  }

  return value.toFixed(4);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"] as const;
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 10 ? 1 : 2;
  const unit = units[unitIndex] ?? "GB";
  return `${size.toFixed(digits)} ${unit}`;
}

function doorCounts(result: DoorResult): { total: number; abnormal: number } {
  const total = result.totalSegments || result.segments.length;
  const abnormal =
    result.abnormalSegments ||
    result.segments.filter((segment) => segment.prediction === "Abnormal resistance").length;
  return { total, abnormal };
}

function shmHeadline(result: SHMResult, filename: string): string | undefined {
  const match = result.files.find(
    (file) => file.fileId === filename || filename.startsWith(file.fileId),
  );
  const sorted = [...result.files].sort((a, b) => a.fileId.localeCompare(b.fileId));
  const value = match?.prediction ?? sorted[0]?.prediction;
  if (value == null) {
    return undefined;
  }
  return `Damage ${formatDamage(value)}`;
}

export function formatAnalysisSummary(record: AnalysisRecord): string {
  if (record.status === "failed") {
    return record.error ?? "Analysis failed";
  }
  if (record.status !== "completed" || !record.result) {
    return formatAnalysisStatus(record.status);
  }

  switch (record.subsystem) {
    case "acv": {
      const top = [...record.result.rankedCars].sort((a, b) => a.rank - b.rank)[0];
      return top ? `Car ${top.carId} ranked #${top.rank}` : "Ranking complete";
    }
    case "door": {
      const { total, abnormal } = doorCounts(record.result);
      return `${total} cycles · ${abnormal} abnormal`;
    }
    case "rail": {
      const counts = record.result.statusCounts;
      if (!counts) {
        return record.result.prediction;
      }
      const total = counts.normal + counts.sideI + counts.sideII;
      const leadingCount =
        record.result.prediction === "Normal"
          ? counts.normal
          : record.result.prediction === "Side I"
            ? counts.sideI
            : counts.sideII;
      return total > 0
        ? `${record.result.prediction} · ${leadingCount} of ${total}`
        : record.result.prediction;
    }
    case "shm":
      return shmHeadline(record.result, record.filename) ?? "Damage prediction complete";
  }
}

export function formatSubsystemPath(subsystem: SubsystemType, analysisId: string): string {
  return `/subsystem/${subsystem}/${analysisId}`;
}
