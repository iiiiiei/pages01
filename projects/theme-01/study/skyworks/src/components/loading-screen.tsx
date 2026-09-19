"use client";

import { AnimatePresence, animate, motion, useMotionValueEvent } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { introAnimationCompleted, introAnimationProgress, pageLoaded, pageLoadProgress } from "./store";

export function LoadingScreen() {
  const [showOverlay, setShowOverlay] = useState(true);
  const [unmountRoot, setUnmountRoot] = useState(false);

  useMotionValueEvent(pageLoaded, "change", (loaded) => {
    if (loaded) {
      setShowOverlay(false);
      animate(introAnimationProgress, 1, {
        duration: 1.6,
        ease: "easeOut",
        onComplete: () => introAnimationCompleted.set(true),
      });
    }
  });

  useEffect(() => {
    if (pageLoaded.get()) setShowOverlay(false);
  }, []);

  if (unmountRoot) return null;

  return (
    <AnimatePresence onExitComplete={() => setUnmountRoot(true)}>
      {showOverlay && (
        <motion.div
          className="fixed inset-0 z-1000 flex h-screen w-screen items-center justify-center bg-black pointer-events-none flex-col gap-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <Image src="/logo.svg" alt="logo" width={250} height={100} className="w-[150px] lg:w-[250px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
