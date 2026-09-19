"use client";

import { useMotionValueEvent } from "motion/react";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { ScrollContainer } from "@/components/scroll-container";
import { pageLoaded, pageLoadProgress, scrollPosition } from "@/components/store";
import { ThermalPixelShader, type PaletteName } from "@/components/thermal/thermal-pixel-shader";

/* 主体 = thermal-pixel-ink 官方源码（原样，未经修改）；
   套 skyworks 的滚动交互：滚动容器 + 滚动进度驱动官方参数。 */
const SEGMENT_PALETTES: PaletteName[] = ["wild", "ultraviolet", "ember"];

export function DemoApp() {
  const [segment, setSegment] = useState(0);
  const [bandShift, setBandShift] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  /* skyworks 滚动进度 → 官方参数：
     三段换色板（翻页感）、翻段清屏（resetKey 重建热场）、段内带位微移 */
  useMotionValueEvent(scrollPosition, "change", (scroll) => {
    const el = document.getElementById("scroll-container");
    if (!el) return;
    const limit = Math.max(1, el.scrollHeight - el.clientHeight);
    const p = Math.min(1, Math.max(0, scroll / limit));
    const seg = Math.min(2, Math.floor(p * 3));
    setSegment((prev) => {
      if (prev !== seg) setResetKey((k) => k + 1);
      return seg;
    });
    const local = p * 3 - seg;
    const shift = Math.round(local * 0.12 * 50) / 50; // 量化到 0.02，减少重渲染
    setBandShift((prev) => (prev === shift ? prev : shift));
  });

  /* Loading：场景链退役后自行放行 */
  useEffect(() => {
    const t = setTimeout(() => {
      pageLoadProgress.set(1);
      if (!pageLoaded.get()) pageLoaded.set(true);
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  /* 自动驾驶：闲置后指针漫游注热 + 周期按住脉冲（官方 pressBoost 语义） */
  useEffect(() => {
    let lastMove = performance.now();
    const stage = () => document.querySelector<HTMLElement>("#thermal-stage canvas");
    const onMove = (e: PointerEvent) => {
      if (e.isTrusted) lastMove = performance.now();
    };
    addEventListener("pointermove", onMove, { passive: true });
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const canvas = stage();
      if (canvas && now - lastMove > 1400) {
        const t = now / 1000;
        canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: (0.5 + 0.34 * Math.sin(t * 0.5)) * innerWidth,
            clientY: (0.5 + 0.28 * Math.sin(t * 0.83 + 1.7)) * innerHeight,
            pointerId: 99,
            isPrimary: true,
          }),
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <>
      <ScrollContainer>
        {/* sticky 画布在滚动层内：滚轮自动滚容器，指针直达画布（官方交互原样） */}
        <div id="thermal-stage" className="sticky top-0 z-10 h-screen w-screen">
          <ThermalPixelShader
            className="block h-full w-full"
            palette={SEGMENT_PALETTES[segment]}
            bandShift={bandShift}
            resetKey={resetKey}
          />
        </div>
      </ScrollContainer>
      <LoadingScreen />
    </>
  );
}
