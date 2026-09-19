import { useMotionValue } from "motion/react";
import { type RefObject, useImperativeHandle } from "react";
import { clamp, mapLinear, smootherstep } from "three/src/math/MathUtils.js";
import { BodyHtml } from "@/components/body-html";
import { HtmlSectionTransition } from "@/components/html-section-transition";
import { introAnimationProgress } from "@/components/store";

export type HeroHTMLUpdateHandle = (args: { progress: number }) => void;

export function HeroHTML({ updateHandle }: { updateHandle: RefObject<HeroHTMLUpdateHandle | null> }) {
  const revealProgress = useMotionValue(0);
  const exitProgress = useMotionValue(0);

  useImperativeHandle(updateHandle, () => ({ progress }) => {
    const introAnimationProgressValue = smootherstep(clamp(mapLinear(introAnimationProgress.get(), 0, 0.6, 0, 1), 0, 1), 0, 1);
    revealProgress.set(introAnimationProgressValue);
    exitProgress.set(smootherstep(clamp(mapLinear(progress, 0.16, 0.32, 0, 1), 0, 1), 0, 1));
  });

  return null;
}
