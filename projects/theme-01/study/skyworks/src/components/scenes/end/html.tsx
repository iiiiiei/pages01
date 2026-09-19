import { useMotionValue } from "motion/react";
import { type RefObject, useImperativeHandle } from "react";
import { clamp, mapLinear, smootherstep } from "three/src/math/MathUtils.js";
import { BodyHtml } from "@/components/body-html";
import { HtmlSectionTransition } from "@/components/html-section-transition";

export type EndSceneHTMLUpdateHandle = (args: { progress: number }) => void;

export function EndSceneHTML({ updateHandle }: { updateHandle: RefObject<EndSceneHTMLUpdateHandle | null> }) {
  const revealProgress = useMotionValue(0);
  const exitProgress = useMotionValue(0);

  useImperativeHandle(updateHandle, () => ({ progress }) => {
    revealProgress.set(smootherstep(clamp(mapLinear(progress, 0.1, 0.35, 0, 1), 0, 1), 0, 1));
  });

  return null;
}
