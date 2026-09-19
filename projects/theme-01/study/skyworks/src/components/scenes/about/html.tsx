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

  return (
    <BodyHtml>
      <HtmlSectionTransition
        revealProgress={revealProgress}
        exitProgress={exitProgress}
        className="mx-auto flex h-screen w-full max-w-7xl flex-col items-center justify-center px-6 py-10 sm:px-10 lg:p-32"
      >
        <h1 className="max-w-5xl text-center font-roboto text-5xl leading-[0.95] font-extrabold text-black sm:text-6xl md:text-8xl lg:text-9xl lg:leading-tight">
          让数字叙事{" "}
          <span className="bg-linear-to-r from-sky-600 via-purple-400 to-blue-400 bg-clip-text text-transparent font-story-script letter-spacing">
            更俏皮、更有力。
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-center text-base leading-7 text-black sm:text-lg md:text-xl lg:mt-10">
          浏览器是最普惠的展厅：不必安装，点开即达。iiiiiei
          把每一寸滚动、每一粒噪点都当作创作材料——认真做事，认真玩耍。
        </p>
      </HtmlSectionTransition>
    </BodyHtml>
  );
}
