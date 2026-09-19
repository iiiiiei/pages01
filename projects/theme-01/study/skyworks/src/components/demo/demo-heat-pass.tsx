"use client";

import { useFBO } from "@react-three/drei";
import { createPortal, useThree } from "@react-three/fiber";
import { useSpring } from "motion/react";
import { type RefObject, useImperativeHandle, useMemo, useRef } from "react";
import { clamp as clampMath } from "three/src/math/MathUtils.js";
import { clamp, dot, float, length, max, mix, oneMinus, pow, smoothstep, texture, uniform, uniformTexture, uv, vec2, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, Texture, Vector2, type WebGPURenderer } from "three/webgpu";
import type { RootStateWebGPU } from "@/types";
import { useCreateSceneAndCamera } from "@/components/utils/use-create-scene-and-camera";
import { interactionState } from "./interaction";

/* 持久热场（solace thermal-pixel-ink 核心）：注入 → 四邻扩散 → 缓慢冷却。
   R 通道 = 热量；指针移动注入墨，按住加大半径与强度。 */
export type HeatPassRenderHandle = (args: { state: RootStateWebGPU; hold: number }) => Texture | null;

export function HeatPass({ renderHandle }: { renderHandle: RefObject<HeatPassRenderHandle | null> }) {
  const size = useThree((state) => state.size);
  const { scene, portalOptions, camera } = useCreateSceneAndCamera({
    type: "orthographic",
    left: -1, right: 1, top: 1, bottom: -1, near: 0.001, far: 10,
    basePosition: [0, 0, 1],
  });

  const springConfig = useMemo(() => ({ stiffness: 120, damping: 24, mass: 0.6 }), []);
  const mouseX = useSpring(0.5, springConfig);
  const mouseY = useSpring(0.5, springConfig);
  const mouseVelocity = useSpring(0, springConfig);

  const emptyTexture = useRef(new Texture());
  const previousTextureUniform = useRef(uniformTexture(emptyTexture.current));
  const mousePositionUniform = useRef(uniform(new Vector2(0.5, 0.5)));
  const previousMousePositionUniform = useRef(uniform(new Vector2(0.5, 0.5)));
  const velocityUniform = useRef(uniform(0));
  const holdUniform = useRef(uniform(0));
  const aspectUniform = useRef(uniform(new Vector2(1, 1)));
  const deltaUniform = useRef(uniform(1 / 60));

  const mousePosition = useRef(new Vector2(0.5, 0.5));
  const previousMousePosition = useRef(new Vector2(0.5, 0.5));
  const lastTime = useRef(0);

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.toneMapped = false;
    mat.colorNode = (() => {
      const aspectUv = uv().mul(aspectUniform.current);
      const currentMouse = mousePositionUniform.current.mul(aspectUniform.current);
      const previousMouse = previousMousePositionUniform.current.mul(aspectUniform.current);
      const segment = currentMouse.sub(previousMouse);
      const segmentLengthSquared = max(dot(segment, segment), 0.000001);
      const segmentProgress = clamp(dot(aspectUv.sub(previousMouse), segment).div(segmentLengthSquared), 0, 1);
      const mouseDistance = length(aspectUv.sub(previousMouse.add(segment.mul(segmentProgress))));
      const pointerDistance = length(aspectUv.sub(currentMouse));

      const hold = holdUniform.current;
      // 胶囊注入：移动注墨，按住加大半径与强度
      const lineMask = oneMinus(smoothstep(hold.mul(0.02).add(0.010), hold.mul(0.02).add(0.026), mouseDistance));
      const pointMask = oneMinus(smoothstep(0.0, hold.mul(0.02).add(0.02), pointerDistance)).mul(hold);
      const injection = max(lineMask, pointMask).mul(hold.mul(0.75).add(0.55)).mul(velocityUniform.current);

      const prevAt = (ox: any, oy: any) =>
        texture(previousTextureUniform.current, vec2(uv().x.add(ox), oneMinus(uv().y.add(oy)))).r;
      const prevHeat = prevAt(0, 0);
      const px = float(1).div(512);
      const blurred = prevAt(px, 0)
        .add(prevAt(px.mul(-1), 0))
        .add(prevAt(0, px))
        .add(prevAt(0, px.mul(-1)))
        .mul(0.25);
      // 扩散 0.09 · 冷却 0.845/秒（约 4 秒半衰）→ 墨迹长留
      const heat = max(mix(prevHeat, blurred, 0.09).mul(pow(float(0.845), deltaUniform.current)), injection);

      return vec4(clamp(heat, 0, 1), 0, 0, 1);
    })();
    return mat;
  }, []);

  const fbo1 = useFBO();
  const fbo2 = useFBO();
  const ping = useRef(true);
  const hasRendered = useRef(false);

  useImperativeHandle(renderHandle, () => ({ state, hold }) => {
    ping.current = !ping.current;
    const gl = state.gl as WebGPURenderer;
    const elapsedTime = state.clock.getElapsedTime();
    const delta = lastTime.current === 0 ? 1 / 60 : Math.min(elapsedTime - lastTime.current, 1 / 30);
    lastTime.current = elapsedTime;

    previousTextureUniform.current.value = hasRendered.current ? (ping.current ? fbo2.texture : fbo1.texture) : emptyTexture.current;

    previousMousePosition.current.copy(mousePosition.current);
    mousePosition.current.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    mouseX.set(mousePosition.current.x);
    mouseY.set(mousePosition.current.y);
    mousePosition.current.set(mouseX.get(), mouseY.get());
    const dx = (mousePosition.current.x - previousMousePosition.current.x) * (size.width / size.height);
    const dy = mousePosition.current.y - previousMousePosition.current.y;
    const v = Math.hypot(dx, dy) / Math.max(delta, 1 / 120);
    mouseVelocity.set(clampMath(v, 0, 1) * 1.4);

    previousMousePositionUniform.current.value.copy(previousMousePosition.current);
    mousePositionUniform.current.value.copy(mousePosition.current);
    velocityUniform.current.value = mouseVelocity.get();
    holdUniform.current.value = hold;
    aspectUniform.current.value.set(size.width / size.height, 1);
    deltaUniform.current.value = delta;

    gl.setRenderTarget(ping.current ? fbo1 : fbo2);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    hasRendered.current = true;
    return ping.current ? fbo1.texture : fbo2.texture;
  });

  void interactionState; // 交互信号由 demo-app 汇入 state.pointer / hold 参数
  return createPortal(
    <mesh position={[0, 0, 0]} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>,
    scene,
    portalOptions,
  );
}
