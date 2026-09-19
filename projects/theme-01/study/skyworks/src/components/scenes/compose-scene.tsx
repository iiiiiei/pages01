import { useFBO } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import { type RefObject, useImperativeHandle, useMemo, useRef } from "react";
import { Fn, abs, length, max, mix, oneMinus, smoothstep, texture, uniform, uniformTexture, uv, vec2, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial, Texture, Vector2 } from "three/webgpu";
import { interactionState } from "@/components/demo/interaction";
import type { RootStateWebGPU } from "@/types";
import { usePostProcessing } from "../post-processing/use-post-processing";
import { scrollPosition } from "../store";
import { useCreateSceneAndCamera } from "../utils/use-create-scene-and-camera";

const PAGES_COUNT = 3;

export type ComposeSceneRenderHandle = (args: { state: RootStateWebGPU; textures: (Texture | null)[] }) => void;

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
  });

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.toneMapped = false;

    mat.colorNode = Fn(() => {
      // 点击涟漪：扩张环扰动采样坐标 + 亮环（叠加在参考合成链上）
      const p = uv().sub(0.5).mul(vec2(uniforms.current.aspect, 1));
      const cp = uniforms.current.clickPos.sub(0.5).mul(vec2(uniforms.current.aspect, 1));
      const dv = p.sub(cp);
      const ringR = uniforms.current.clickAge.mul(0.8);
      const ring = oneMinus(smoothstep(0.0, 0.06, abs(length(dv).sub(ringR))))
        .mul(oneMinus(smoothstep(0.0, 0.85, uniforms.current.clickAge)));
      const nrm = dv.div(max(length(dv), 0.0001));
      const rippleUv = uv().sub(nrm.mul(ring.mul(0.022)));

      const firstTexture = texture(uniforms.current.textures[0], vec2(rippleUv.x, oneMinus(rippleUv.y)));
      const secondTexture = texture(uniforms.current.textures[1], vec2(rippleUv.x, oneMinus(rippleUv.y)));
      const col = mix(secondTexture, firstTexture, firstTexture.a);
      return col.add(vec3(ring.mul(0.3)));
    })();

    return mat;
  }, []);

  const postProcessingRender = usePostProcessing();
  const fbo = useFBO();
  useImperativeHandle(renderHandle, () => ({ state: { gl, clock }, textures }) => {
    const time = clock.getElapsedTime();
    const u = uniforms.current;

    u.scrollPosition.value = scrollPosition.get();
    u.clickPos.value.set(interactionState.clickX, interactionState.clickY);
    u.clickAge.value = Math.min(10, Math.max(0, (performance.now() - interactionState.clickT) / 1000));
    u.aspect.value = window.innerWidth / Math.max(1, window.innerHeight);

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

  return createPortal(
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>,
    scene,
    portalOptions,
  );
}
