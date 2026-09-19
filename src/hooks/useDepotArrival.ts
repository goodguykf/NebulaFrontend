import { DEPOT } from "@/constants/depot";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

const QUESTION = DEPOT.question;
const LAST_STEP = DEPOT.timeline.length - 1;

function prefersReducedMotionSync(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useDepotArrival() {
  const reducedLaunch = prefersReducedMotionSync();
  const [step, setStep] = useState(reducedLaunch ? LAST_STEP : 0);
  const [showBubble, setShowBubble] = useState(reducedLaunch);
  const [answered, setAnswered] = useState(reducedLaunch);
  const [typed, setTyped] = useState(reducedLaunch ? QUESTION : "");
  const [finished, setFinished] = useState(reducedLaunch);

  const finish = useCallback(() => {
    setStep(LAST_STEP);
    setTyped(QUESTION);
    setShowBubble(true);
    setAnswered(true);
    setFinished(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled && enabled) {
        finish();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [finish]);

  useEffect(() => {
    if (finished) {
      return;
    }

    const timers = DEPOT.timeline
      .map((stage, index) => {
        if (index === 0) {
          return undefined;
        }
        return setTimeout(() => setStep(index), stage.atMs);
      })
      .filter((timer): timer is ReturnType<typeof setTimeout> => timer != null);

    const readyAt = DEPOT.timeline[2]?.atMs ?? 3600;
    const resultsAt = DEPOT.timeline[3]?.atMs ?? 5200;
    timers.push(setTimeout(() => setShowBubble(true), readyAt + 300));
    timers.push(
      setTimeout(() => {
        setTyped(QUESTION);
        setAnswered(true);
        setFinished(true);
      }, resultsAt + 400),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [finished]);

  useEffect(() => {
    if (!showBubble || finished) {
      return;
    }

    let index = 0;
    setTyped("");
    const id = setInterval(() => {
      index += 1;
      setTyped(QUESTION.slice(0, index));
      if (index >= QUESTION.length) {
        clearInterval(id);
      }
    }, 38);

    return () => {
      clearInterval(id);
    };
  }, [finished, showBubble]);

  return {
    step,
    showBubble,
    answered,
    typed,
    finished,
    skip: finish,
    caption: DEPOT.timeline[step] ?? DEPOT.timeline[0],
  };
}
