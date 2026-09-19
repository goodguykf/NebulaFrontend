import { C151Carriage, C151Track } from "@/components/overview/c151/C151Carriage";
import { SubsystemType } from "@/types/analysis";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface C151StageProps {
  highlighted: SubsystemType | null;
  onHighlight: (subsystem: SubsystemType | null) => void;
  onSelect: (subsystem: SubsystemType) => void;
  height: number;
}

function CameraOrbit() {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const instance = new OrbitControls(camera, gl.domElement);
    instance.enablePan = false;
    instance.autoRotate = true;
    instance.autoRotateSpeed = 0.35;
    instance.minDistance = 10;
    instance.maxDistance = 36;
    instance.maxPolarAngle = Math.PI / 2.05;
    instance.target.set(0, 1.85, 0);
    instance.update();
    controls.current = instance;
    return () => {
      instance.dispose();
      controls.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    controls.current?.update();
  });

  return null;
}

function StageFallback({ height }: { height: number }) {
  return (
    <View style={[styles.stage, styles.fallback, { height }]}>
      <Text style={styles.fallbackCopy}>
        Open this page on web to inspect the dimensioned C151 3D model. Use the cards below to open a
        dashboard.
      </Text>
    </View>
  );
}

export function C151Stage({ highlighted, onHighlight, onSelect, height }: C151StageProps) {
  if (typeof Canvas !== "function") {
    return <StageFallback height={height} />;
  }

  return (
    <View style={[styles.stage, { height }]}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [10.8, 2.7, 9.2], fov: 34, near: 0.1, far: 160 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        frameloop="always"
        style={styles.canvas}
        onPointerMissed={() => onHighlight(null)}
      >
        <color attach="background" args={["#0B1420"]} />
        <hemisphereLight args={["#d7e4f2", "#1a2433", 0.85]} />
        <directionalLight position={[-12, 16, 8]} intensity={1.45} />
        <directionalLight position={[10, 6, -8]} intensity={0.4} color="#8fb4ff" />
        <C151Track highlighted={highlighted} onHighlight={onHighlight} onSelect={onSelect} />
        <C151Carriage highlighted={highlighted} onHighlight={onHighlight} onSelect={onSelect} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[28, 10]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} />
        </mesh>
        <CameraOrbit />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0B1420",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0B1420",
  },
  fallbackCopy: {
    color: "#9AA8BC",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
