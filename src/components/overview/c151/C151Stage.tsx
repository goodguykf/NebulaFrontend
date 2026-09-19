import { SubsystemType } from "@/types/analysis";
import { StyleSheet, Text, View } from "react-native";

interface C151StageProps {
  highlighted: SubsystemType | null;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
  height: number;
}

export function C151Stage({ height, onSelect }: C151StageProps) {
  return (
    <View style={[styles.stage, { height }]}>
      <Text style={styles.copy}>
        Open the web app to inspect the dimensioned C151 3D model. Use the cards below to open a
        dashboard.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0B1420",
  },
  copy: {
    color: "#9AA8BC",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
