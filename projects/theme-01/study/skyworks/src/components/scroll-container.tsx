/** biome-ignore-all lint/style/noNonNullAssertion: "" */
"use client";

/* 原生滚动版：Lenis 依赖连续 rAF 驱动动画，IAB 主线程小憩时滚轮完全失效；
   改为 overflow 容器原生滚动 + scroll 事件直写 scrollPosition store（下游场景链不变） */

import { type ReactNode, useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { scrollPosition } from "./store";
import { pagesConfig } from "./pages-config";
import { pageHeightUnitsToPixels } from "./utils/page-height-units";

export function ScrollContainer({ children }: { children: ReactNode }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updatePageHeight = useEffectEvent(() => {
    const accumulatedPageHeight = pagesConfig.get().reduce((acc, page) => acc + page.length, 0);
    document.documentElement.style.setProperty("--page-height", `${pageHeightUnitsToPixels(accumulatedPageHeight)}px`);
  });

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const onScroll = () => {
      scrollPosition.set(scrollContainer.scrollTop);
    };
    onScroll();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    updatePageHeight();

    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const onResize = () => updatePageHeight();
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [updatePageHeight]);

  return (
    <div
      className="fixed inset-0 w-screen overflow-y-auto overscroll-none z-50 touch-pan-y"
      id="scroll-container"
      tabIndex={-1}
      ref={(ref) => {
        scrollContainerRef.current = ref;
      }}
    >
      {children}
      <div className="h-canvas-svh w-full pointer-events-none flex flex-col"></div>
    </div>
  );
}
