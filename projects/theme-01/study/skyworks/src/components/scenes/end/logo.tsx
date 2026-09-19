import { useFBO } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import { useSpring } from "motion/react";
import { type RefObject, useImperativeHandle, useMemo, useRef } from "react";
import { Color, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Object3D, type Texture } from "three";
import { BoxGeometry } from "three/webgpu";
import { abs, cos, Fn, length, mix, pow, sin, smoothstep, uniform, uv, vec2, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { useCreateSceneAndCamera } from "@/components/utils/use-create-scene-and-camera";
import { usePlaneSize } from "@/components/utils/use-plane-size";
import type { RootStateWebGPU } from "@/types";

export type LogoRenderHandle = (args: { state: RootStateWebGPU }) => Texture | null;

const LOGO_TARGET_Z = -5;
const CAMERA_RADIUS = 10;
const CAMERA_YAW = 0.3;
const CAMERA_PITCH = 0.2;

export function Logo({ renderHandle }: { renderHandle: RefObject<LogoRenderHandle | null> }) {
  const { scene, portalOptions, camera } = useCreateSceneAndCamera({
    pageType: "end",
    type: "perspective",
    basePosition: [0, 0, 5],
  });
  const springConfig = useMemo(() => ({ stiffness: 90, damping: 24, mass: 0.7 }), []);
  const cameraYaw = useSpring(0, springConfig);
  const cameraPitch = useSpring(0, springConfig);

  const { planeWidth, planeHeight } = usePlaneSize({
    planePosition: [0, 0, -10],
    camera,
  });

  const logoMaterial = useMemo(() => {
    const mat = new MeshLambertMaterial();
    mat.color = new Color("white");
    return mat;
  }, []);

  const timeUniform = useRef(uniform(0));
  const backgroundMaterial = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = Fn(() => {
      const centeredUv = uv().sub(vec2(0.5));
      const radialDistance = length(centeredUv);
      const cornerUv = abs(centeredUv).mul(2);
      const cornerIntensity = smoothstep(0.25, 0.95, cornerUv.x.mul(cornerUv.y));
      const rotation = radialDistance.mul(30).sub(timeUniform.current.mul(0.9));
      const rotationSin = sin(rotation);
      const rotationCos = cos(rotation);
      const swirledUv = vec2(
        centeredUv.x.mul(rotationCos).sub(centeredUv.y.mul(rotationSin)),
        centeredUv.x.mul(rotationSin).add(centeredUv.y.mul(rotationCos)),
      );
      const primarySwirl = sin(swirledUv.x.mul(14).add(swirledUv.y.mul(9)).add(radialDistance.mul(5)).add(timeUniform.current.mul(1.2)))
        .mul(0.5)
        .add(0.5);
      const secondarySwirl = sin(swirledUv.x.sub(swirledUv.y).mul(9).sub(timeUniform.current.mul(1.4)))
        .mul(0.5)
        .add(0.5);
      const swirl = smoothstep(0.3, 0.72, mix(primarySwirl, secondarySwirl, 0.28));
      const ribbonCore = pow(primarySwirl, 4);
      const intensity = pow(cornerIntensity, 1.4);
      const color = mix(vec3(0.01, 0.02, 0.07), vec3(0.1, 0.32, 0.75), swirl);
      const hotColor = mix(vec3(0.35, 0.08, 0.75), vec3(0.95, 0.5, 0.2), secondarySwirl);

      return color
        .mul(0.01)
        .add(vec3(0.12, 0.45, 1).mul(ribbonCore).mul(0.1))
        .add(hotColor.mul(intensity).mul(swirl).mul(0.34));
    })();
    return mat;
  }, []);

  /* 体素字标：5×7 像素字模拼装 IIIIIEI（真·像素化，替换 skyworks GLB） */
  const logoScene = useMemo(() => {
    const group = new Group();
    const font: Record<string, Array<[number, number]>> = {
      I: Array.from({ length: 7 }, (_, y) => [2, y] as [number, number]),
      E: [
        ...Array.from({ length: 7 }, (_, y) => [0, y] as [number, number]),
        [1, 0], [2, 0], [3, 0], [4, 0],
        [1, 3], [2, 3], [3, 3],
        [1, 6], [2, 6], [3, 6], [4, 6],
      ],
    };
    const word = "IIIIIEI";
    const cells: Array<[number, number]> = [];
    word.split("").forEach((ch, li) => {
      for (const [cx, cy] of font[ch]) cells.push([li * 6 + cx, cy]);
    });
    const c = 0.35;
    const w = (word.length - 1) * 6 + 5;
    const inst = new InstancedMesh(new BoxGeometry(c, c, c), logoMaterial, cells.length);
    const m = new Matrix4();
    const o = new Object3D();
    cells.forEach(([cx, cy], k) => {
      o.position.set((cx - (w - 1) / 2) * c, (3 - cy) * c, 0);
      o.updateMatrix();
      m.copy(o.matrix);
      inst.setMatrixAt(k, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
    return group;
    }, [logoMaterial]);

  const fbo = useFBO();
  useImperativeHandle(renderHandle, () => ({ state }) => {
    const { gl } = state;
    timeUniform.current.value = state.clock.getElapsedTime();
    cameraYaw.set(state.pointer.x * CAMERA_YAW);
    cameraPitch.set(state.pointer.y * CAMERA_PITCH);

    const yaw = cameraYaw.get();
    const pitch = cameraPitch.get();
    camera.position.set(
      Math.sin(yaw) * CAMERA_RADIUS,
      Math.sin(pitch) * CAMERA_RADIUS,
      LOGO_TARGET_Z + Math.cos(yaw) * Math.cos(pitch) * CAMERA_RADIUS,
    );
    camera.lookAt(0, 0, LOGO_TARGET_Z);

    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    return fbo.texture;
  });

  return createPortal(
    <>
      <mesh position={[0, 0, -10]} material={backgroundMaterial}>
        <planeGeometry args={[planeWidth * 2, planeHeight * 2]} />
      </mesh>
      <group position={[0, 0.5, -5]}>
        <primitive object={logoScene} scale={0.55} rotation={[0, -0.8, 0]} />
      </group>
      <ambientLight intensity={0.5} />
      <directionalLight intensity={3} position={[0, 0, 10]} />
    </>,
    scene,
    portalOptions,
  );
}
