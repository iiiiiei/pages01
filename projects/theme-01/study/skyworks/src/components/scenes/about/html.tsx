import { useMotionValue } from "motion/react";
import { type RefObject, useImperativeHandle } from "react";
import { clamp, mapLinear, smootherstep } from "three/src/math/MathUtils.js";
import { BodyHtml } from "@/components/body-html";
import { HtmlSectionTransition } from "@/components/html-section-transition";
import type { RootStateWebGPU } from "@/types";

export type AboutHTMLUpdateHandle = (args: { progress: number; state: RootStateWebGPU }) => void;

export function AboutHTML({ updateHandle }: { updateHandle: RefObject<AboutHTMLUpdateHandle | null> }) {
  const revealProgress = useMotionValue(0);
  const exitProgress = useMotionValue(0);

  useImperativeHandle(updateHandle, () => ({ progress }) => {
    revealProgress.set(smootherstep(clamp(mapLinear(progress, 0.1, 0.5, 0, 1), 0, 1), 0, 1));
    exitProgress.set(smootherstep(clamp(mapLinear(progress, 0.7, 1, 0, 1), 0, 1), 0, 1));
  });

  return null;
}
