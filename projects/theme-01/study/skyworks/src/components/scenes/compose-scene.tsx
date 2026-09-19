import { useFBO } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import { type RefObject, useImperativeHandle, useMemo, useRef } from "react";
import { abs, clamp, dot, floor, length, max, mix, oneMinus, smoothstep, texture, uniform, uniformTexture, uv, vec2, vec3, vec4 } from "three/tsl";
import { MeshBasicNodeMaterial, Texture, Vector2 } from "three/webgpu";
import { HeatPass, type HeatPassRenderHandle } from "@/components/demo/demo-heat-pass";
import { interactionState } from "@/components/demo/interaction";
import type { RootStateWebGPU } from "@/types";
import { usePostProcessing } from "../post-processing/use-post-processing";
import { scrollPosition } from "../store";
import { useCreateSceneAndCamera } from "../utils/use-create-scene-and-camera";

const PAGES_COUNT = 3;
const CELL_PX = 10; // solace：10px 热像元

export type ComposeSceneRenderHandle = (args: { state: RootStateWebGPU; textures: (Texture | null)[] }) => void;

/* 六档量化热感色板（solace 6 stops：靛→紫→品红→橙→琥珀→暖白） */
function palette(tt: any) {
  const c1 = vec3(0.07, 0.06, 0.18);
  const c2 = vec3(0.24, 0.11, 0.43);
  const c3 = vec3(0.63, 0.16, 0.37);
  const c4 = vec3(0.91, 0.45, 0.24);
  const c5 = vec3(0.95, 0.69, 0.2);
  const c6 = vec3(0.99, 0.96, 0.89);
  const s = clamp(tt, 0, 1).mul(5);
  let c = mix(c1, c2, clamp(s, 0, 1));
  c = mix(c, c3, clamp(s.sub(1), 0, 1));
  c = mix(c, c4, clamp(s.sub(2), 0, 1));
  c = mix(c, c5, clamp(s.sub(3), 0, 1));
  c = mix(c, c6, clamp(s.sub(4), 0, 1));
  return c;
}

export function ComposeScene({ renderHandle }: { renderHandle: RefObject<ComposeSceneRenderHandle | null> }) {
  const { scene, portalOptions, camera } = useCreateSceneAndCamera({
    type: "orthographic",
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
    near: 0.1,
    far: 100,
    basePosition: [0, 0, 1],
  });

  const uniforms = useRef({
    textures: Array.from({ length: PAGES_COUNT }, () => uniformTexture(new Texture())),
    scrollPosition: uniform(0),
    clickPos: uniform(new Vector2(0.5, 0.5)),
    clickAge: uniform(10),
    aspect: uniform(1),
    heat: uniformTexture(new Texture()),
    res: uniform(new Vector2(1920, 1080)),
    hold: uniform(0),
    pointer: uniform(new Vector2(0.5, 0.5)),
    time: uniform(0),
  });

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.toneMapped = false;

    /* thermal-pixel-ink 镜头：保留点击涟漪的位移；10px 像素格采样场景 →
       亮度 + 持久热场 → 六档量化色板（画面与指针交互 = solace） */
    mat.colorNode = (() => {
      const u = uniforms.current;
      // —— 点击涟漪（位移场）——
      const p = uv().sub(0.5).mul(vec2(u.aspect, 1));
      const cp = u.clickPos.sub(0.5).mul(vec2(u.aspect, 1));
      const dv = p.sub(cp);
      const ringR = u.clickAge.mul(0.8);
      const ring = oneMinus(smoothstep(0.0, 0.06, abs(length(dv).sub(ringR))))
        .mul(oneMinus(smoothstep(0.0, 0.85, u.clickAge)));
      const nrm = dv.div(max(length(dv), 0.0001));
      const rippleUv = uv().sub(nrm.mul(ring.mul(0.022)));

      // —— 10px 像素格（solace：10px density）——
      const cell = vec2(CELL_PX).div(u.res);
      const pUv = floor(rippleUv.div(cell)).mul(cell).add(cell.mul(0.5));

      const firstTexture = texture(u.textures[0], vec2(pUv.x, oneMinus(pUv.y)));
      const secondTexture = texture(u.textures[1], vec2(pUv.x, oneMinus(pUv.y)));
      const col = mix(secondTexture, firstTexture, firstTexture.a);
      const luma = clamp(dot(col.rgb, vec3(0.299, 0.587, 0.114)), 0, 1);

      // —— 持久热场 + 按住光晕 ——
      const heatNow = texture(u.heat, vec2(uv().x, oneMinus(uv().y))).r;
      const holdDist = length(p.sub(u.pointer.sub(0.5).mul(vec2(u.aspect, 1))));
      const holdGlow = oneMinus(smoothstep(0.0, 0.26, holdDist)).mul(u.hold);

      // —— 热值 → 六档量化 ——
      const t = clamp(luma.mul(1.15).add(heatNow.mul(1.3)).add(holdGlow), 0, 1);
      const band = floor(t.mul(5.999)).div(5.0);
      const ink = palette(band);

      // 暗底 + 环境微热（画面自活）+ 涟漪亮环
      const bg = vec3(0.027, 0.027, 0.059);
      let out = mix(bg, ink, smoothstep(0.02, 0.1, t));
      out = out.add(vec3(ring.mul(0.3)));
      return vec4(out, 1.0);
    })();

    return mat;
  }, []);

  const postProcessingRender = usePostProcessing();
  const fbo = useFBO();
  const heatPassRenderHandle = useRef<HeatPassRenderHandle>(null);
  const holdSmooth = useRef(0);

  useImperativeHandle(renderHandle, () => ({ state, textures }) => {
    const { gl, clock } = state;
    const time = clock.getElapsedTime();
    const u = uniforms.current;

    // 持久热场（指针注入；hold 平滑）
    holdSmooth.current += (interactionState.hold - holdSmooth.current) * 0.16;
    const heatTexture = heatPassRenderHandle.current?.({ state, hold: holdSmooth.current });
    if (heatTexture) u.heat.value = heatTexture;

    u.scrollPosition.value = scrollPosition.get();
    u.clickPos.value.set(interactionState.clickX, interactionState.clickY);
    u.clickAge.value = Math.min(10, Math.max(0, (performance.now() - interactionState.clickT) / 1000));
    u.aspect.value = window.innerWidth / Math.max(1, window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    u.res.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
    u.hold.value = holdSmooth.current;
    u.pointer.value.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    u.time.value = time;

    for (let i = 0; i < PAGES_COUNT; i++) {
      const textureNode = u.textures[i];
      const tex = textures[i];
      if (textureNode && tex) {
        textureNode.value = tex;
      }
    }

    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    postProcessingRender({
      texture: fbo.texture,
      bloomIntensity: 1.5,
      bloomThreshold: 0.1,
      bloomRadius: 0.4,
      bloomSmoothing: 0.2,
      pow: 1.2,
      brightness: 1,
      contrast: 1,
      chromaticAbberationStrength: 1.5,
      noiseIntensity: 1,
      noiseVelocity: 1,
      time,
    });
  });

  return (
    <>
      {createPortal(
        <mesh>
          <planeGeometry args={[2, 2]} />
          <primitive object={material} attach="material" />
        </mesh>,
        scene,
        portalOptions,
      )}
      <HeatPass renderHandle={heatPassRenderHandle} />
    </>
  );
}
