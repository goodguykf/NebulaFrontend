import { SubsystemType } from "@/types/analysis";

export interface SubsystemMeta {
  type: SubsystemType;
  shortLabel: string;
  title: string;
  subtitle: string;
  acceptedExtensions: readonly string[];
  allowsMultipleFiles: boolean;
  description: string;
}

export const SUBSYSTEM_META: Record<SubsystemType, SubsystemMeta> = {
  acv: {
    type: "acv",
    shortLabel: "ACV",
    title: "ACV Refrigerant Leakage",
    subtitle: "Refrigerant Leakage",
    acceptedExtensions: [".xlsx"],
    allowsMultipleFiles: false,
    description: "Upload ACV telemetry containing train-car sensor measurements.",
  },
  door: {
    type: "door",
    shortLabel: "Door",
    title: "Door System",
    subtitle: "Abnormal Resistance",
    acceptedExtensions: [".csv"],
    allowsMultipleFiles: false,
    description: "Upload a continuous door-controller sensor stream.",
  },
  rail: {
    type: "rail",
    shortLabel: "Rail",
    title: "Rail Corrugation",
    subtitle: "Corrugation Detection",
    acceptedExtensions: [".csv"],
    allowsMultipleFiles: true,
    description: "Upload axle-box vibration recordings.",
  },
  shm: {
    type: "shm",
    shortLabel: "SHM",
    title: "Structural Health",
    subtitle: "Fatigue Damage",
    acceptedExtensions: [".csv"],
    allowsMultipleFiles: true,
    description: "Upload dynamic-stress recordings.",
  },
};

export const SUBSYSTEM_ORDER: SubsystemType[] = ["acv", "door", "rail", "shm"];
