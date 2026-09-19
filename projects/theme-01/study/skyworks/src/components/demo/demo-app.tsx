"use client";

import { useEffect } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { Renderer } from "@/components/renderer";
import { ScrollContainer } from "@/components/scroll-container";
import { interactionState } from "./interaction";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* 参考站原版骨架（ScrollContainer + Renderer 三段场景链 + Loading），
   仅做两处微调：无文字；注入自动驾驶与点击涟漪交互。 */
export function DemoApp() {
  useEffect(() => {
    const el = document.getElementById("scroll-container");
    if (!el) return;
    let lastMove = performance.now();

    const onMove = (e: PointerEvent) => {
      if (e.isTrusted) lastMove = performance.now();
    };
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      interactionState.clickX = clamp01(e.clientX / innerWidth);
      interactionState.clickY = clamp01(1 - e.clientY / innerHeight);
      interactionState.clickT = performance.now();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("click", onClick, { passive: true });

    /* 自动驾驶：闲置后指针沿利萨茹漫游——权重场、视差、logo 跟随全程保持活性 */
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      if (now - lastMove > 1400) {
        const t = now / 1000;
        el.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: (0.5 + 0.34 * Math.sin(t * 0.5)) * innerWidth,
            clientY: (0.5 + 0.28 * Math.sin(t * 0.83 + 1.7)) * innerHeight,
          }),
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <>
      <ScrollContainer>
        <Renderer />
      </ScrollContainer>
      <LoadingScreen />
    </>
  );
}
