import { C151Stage } from "@/components/overview/c151/C151Stage";
import { DepotHealthStrip } from "@/components/overview/depot/DepotHealthStrip";
import { DepotStageChrome } from "@/components/overview/depot/DepotStageChrome";
import { DepotStepper } from "@/components/overview/depot/DepotStepper";
import { DEPOT_RAIL_WIDTH, DEPOT_STAGE_RATIO } from "@/constants/depot";
import { TABLET_BREAKPOINT } from "@/constants/layout";
import { useDepotArrival } from "@/hooks/useDepotArrival";
import { AnalysisRecord, SubsystemType } from "@/types/analysis";
import { Component, type ReactNode, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";

interface InteractiveTrainProps {
  records: AnalysisRecord[];
  onOpenSubsystem: (subsystem: SubsystemType) => void;
}

class StageBoundary extends Component<{ height: number; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={[styles.stageFallback, { height: this.props.height }]}>
          <Text style={styles.stageFallbackText}>
            3D view could not load. Use the cards below to open a dashboard.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function InteractiveTrain({ records, onOpenSubsystem }: InteractiveTrainProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [highlighted, setHighlighted] = useState<SubsystemType | null>(null);
  const arrival = useDepotArrival();
  const railInset = Platform.OS === "web" && windowWidth >= TABLET_BREAKPOINT ? DEPOT_RAIL_WIDTH : 0;
  const stageWidth = Math.max(windowWidth - railInset, 280);
  const trainHeight = Math.max(300, Math.min(560, stageWidth * DEPOT_STAGE_RATIO));

  return (
    <View style={styles.wrap}>
      <View style={[styles.stageWrap, { height: trainHeight }]}>
        {typeof C151Stage === "function" ? (
          <StageBoundary height={trainHeight}>
            <C151Stage
              height={trainHeight}
              highlighted={highlighted}
              onHighlight={setHighlighted}
              onSelect={onOpenSubsystem}
            />
          </StageBoundary>
        ) : (
          <View style={[styles.stageFallback, { height: trainHeight }]}>
            <Text style={styles.stageFallbackText}>
              3D view could not load. Use the cards below to open a dashboard.
            </Text>
          </View>
        )}
        <View style={styles.chrome}>
        <DepotStageChrome
          records={records}
          highlighted={highlighted}
          showBubble={arrival.showBubble}
          answered={arrival.answered}
          typed={arrival.typed}
          captionLabel={arrival.caption.label}
          captionDetail={arrival.caption.detail}
          finished={arrival.finished}
          onSkip={arrival.skip}
          onSelect={onOpenSubsystem}
          onHighlight={setHighlighted}
        />
        </View>
      </View>

      <DepotHealthStrip
        records={records}
        highlighted={highlighted}
        onHighlight={setHighlighted}
        onSelect={onOpenSubsystem}
      />
      <DepotStepper step={arrival.step} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  stageWrap: {
    width: "100%",
    backgroundColor: "#0B1420",
    overflow: "hidden",
    position: "relative",
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    pointerEvents: "box-none",
  },
  stageFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0B1420",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  stageFallbackText: {
    color: "#9AA8BC",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
