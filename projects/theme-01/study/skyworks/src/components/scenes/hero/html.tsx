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

  return (
    <BodyHtml>
      <HtmlSectionTransition
        revealProgress={revealProgress}
        exitProgress={exitProgress}
        className="pointer-events-none fixed inset-0 z-50 mx-auto flex h-screen w-screen max-w-7xl flex-col items-center justify-center px-6 py-10 sm:px-10 lg:p-32"
      >
        <h1 className="max-w-5xl text-center font-roboto text-5xl leading-[0.95] font-extrabold text-black sm:text-6xl md:text-8xl lg:text-9xl lg:leading-tight">
          我坚信生活是{" "}
          <span className="bg-linear-to-r from-sky-600 via-purple-400 to-blue-400 bg-clip-text text-transparent font-story-script letter-spacing">
            艺术的低语。
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-center text-base leading-7 font-medium text-black sm:text-xl md:text-2xl lg:mt-10 lg:text-3xl lg:leading-normal">
          一间一人制的创意开发工作室——专注 WebGL 与生成式视觉。黑白默片是外表，管线与着色器是内里。
        </p>
      </HtmlSectionTransition>
    </BodyHtml>
  );
}
