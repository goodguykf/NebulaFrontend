import { SUBSYSTEM_META } from "@/constants/subsystems";
import { SubsystemType } from "@/types/analysis";

export function getFileExtension(filename: string): string {
  const match = filename.trim().toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateFileExtension(
  subsystem: SubsystemType,
  filename: string,
): string | null {
  const extension = getFileExtension(filename);
  const accepted = SUBSYSTEM_META[subsystem].acceptedExtensions;
  if (accepted.some((item) => item === extension)) {
    return null;
  }

  const expected = accepted.map((item) => item.replace(".", "").toUpperCase()).join(" or ");
  return `This subsystem expects an ${expected} file.`;
}
