import {
  AxleSignalSummary,
  RailResult,
  RailSpectrogramCell,
  RailSpectrumPoint,
} from "@/types/rail";

function sideForPosition(position: number): "Side I" | "Side II" {
  return position % 2 === 1 ? "Side I" : "Side II";
}

function spectrum(seed: number, emphasise = false): RailSpectrumPoint[] {
  return Array.from({ length: 40 }, (_, index) => {
    const frequency = 20 + index * 12.5;
    const envelope = Math.exp(-index / 18);
    const peak = emphasise && index > 8 && index < 14 ? 1.8 : 0.35;
    const amplitude = (0.18 + envelope * peak + Math.sin(index + seed) * 0.05) * (emphasise ? 1.4 : 1);
    return {
      frequency: Number(frequency.toFixed(1)),
      amplitude: Number(Math.max(0, amplitude).toFixed(4)),
    };
  });
}

function spectrogram(seed: number, emphasise = false): RailSpectrogramCell[] {
  const cells: RailSpectrogramCell[] = [];
  for (let t = 0; t < 18; t += 1) {
    for (let f = 0; f < 16; f += 1) {
      const ridge = emphasise && f >= 4 && f <= 7 ? 0.55 : 0.12;
      const intensity = ridge + 0.18 * Math.abs(Math.sin((t + f + seed) / 3));
      cells.push({
        time: t * 0.08,
        frequency: 40 + f * 30,
        intensity: Number(intensity.toFixed(4)),
      });
    }
  }
  return cells;
}

function axle(car: number, position: number, withSignals: boolean): AxleSignalSummary {
  const side = sideForPosition(position);
  const emphasise = side === "Side I";
  return {
    car,
    position,
    side,
    spectrum: withSignals ? spectrum(car * 10 + position, emphasise) : undefined,
    spectrogram: withSignals ? spectrogram(car * 10 + position, emphasise) : undefined,
  };
}

export const mockRailResult: RailResult = {
  type: "rail",
  prediction: "Side I",
  statusCounts: {
    normal: 5,
    sideI: 12,
    sideII: 3,
  },
  classScores: {
    normal: 0.12,
    sideI: 0.79,
    sideII: 0.09,
  },
  axleSignals: [
    axle(1, 1, true),
    axle(1, 2, true),
    axle(1, 3, true),
    axle(3, 1, true),
    axle(3, 8, false),
    axle(8, 7, true),
  ],
  confusionMatrix: {
    imageUrl: "/api/v1/analyses/analysis_rail_001/artifacts/confusion-matrix.png",
    title: "CNN BiLSTM — rows: actual, columns: predicted",
  },
};
