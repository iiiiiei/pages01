import { Environment } from "@react-three/drei";
import { type RefObject, useImperativeHandle, useMemo, useRef } from "react";
import { type BufferGeometry, type InstancedMesh, Matrix4, Object3D, Vector3 } from "three";
import { BoxGeometry, MeshLambertMaterial } from "three/webgpu";

export type AirplanesUpdateHandle = (args: { progress: number }) => void;

const PLANE_COUNT = 20;
const PLANE_DIAGONAL_WIDTH = 100;
const PLANE_ANGLE_SPAN = Math.PI * 0.35;
const PLANE_PROGRESS_SPEED = 0.6;
const PLANE_PATH_ANGLE_VARIANCE = Math.PI * 0.5;
const PLANE_PATH_X_SPREAD = 18;
const PLANE_SURFACE_OFFSET = 2.5;

/* 像素鸽：方块拼装（forward=+z），双翼绕 z 轴扇动——替换原 airplane.glb，航线系统照旧 */
type DovePart = {
  geometry: BufferGeometry;
  material: MeshLambertMaterial;
  sourceMatrix: Matrix4;
  flapSign: number; // 0=固定件
};

export function Airplanes({ radius, updateHandle }: { radius: number; updateHandle: RefObject<AirplanesUpdateHandle | null> }) {
  const instanceMeshRefs = useRef<Array<InstancedMesh | null>>([]);
  const matrix = useMemo(() => new Matrix4(), []);
  const flapMatrix = useMemo(() => new Matrix4(), []);
  const localMatrix = useMemo(() => new Matrix4(), []);
  const direction = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);

  const doveMaterial = useMemo(() => {
    const mat = new MeshLambertMaterial();
    mat.color.set("#efe8d8"); // 米白鸽
    return mat;
  }, []);

  const doveParts = useMemo<DovePart[]>(() => {
    const part = (w: number, h: number, d: number, x: number, y: number, z: number, flap = 0): DovePart => {
      const geometry = new BoxGeometry(w, h, d);
      const m = new Object3D();
      m.position.set(x, y, z);
      m.updateMatrix();
      return { geometry, material: doveMaterial, sourceMatrix: m.matrix.clone(), flapSign: flap };
    };
    return [
      part(1.0, 0.9, 2.3, 0, 0, 0),               // 身体
      part(0.8, 0.8, 0.8, 0, 0.25, 1.4),          // 头
      part(0.25, 0.25, 0.5, 0, 0.2, 2.0),         // 喙
      part(0.7, 0.55, 1.0, 0, 0.1, -1.6),         // 尾
      part(1.1, 0.14, 2.4, 1.3, 0.45, -0.1, 1),   // 左翼
      part(1.1, 0.14, 2.4, -1.3, 0.45, -0.1, -1), // 右翼
    ];
  }, [doveMaterial]);

  const planes = useMemo(() => {
    return Array.from({ length: PLANE_COUNT }, (_, i) => {
      const direction = 1;
      const directionIndex = Math.floor(i / 2);
      const directionCount = Math.ceil(PLANE_COUNT / 2);
      const lane = directionIndex / directionCount;
      const pathIndex = (directionIndex * 3) % directionCount;
      const pathLane = ((pathIndex + 0.5) / directionCount) % 1;
      const phase = (lane + 0.5) % 1;
      const plane = new Object3D();

      plane.rotation.set(0, 0, 0);
      plane.scale.setScalar(2);
      plane.userData.offset = phase;
      plane.userData.speed = 0.75 + lane * 0.5;
      plane.userData.direction = direction;
      plane.userData.pathX = (pathLane - 0.5) * PLANE_PATH_X_SPREAD;
      plane.userData.pathAngle = (pathLane - 0.5) * PLANE_PATH_ANGLE_VARIANCE;
      plane.updateMatrix();

      return plane;
    });
  }, []);
  const planeRefs = useRef(planes);

  useImperativeHandle(updateHandle, () => ({ progress }) => {
    const t = performance.now() / 1000;
    planeRefs.current.forEach((plane, planeIndex) => {
      const travel = (progress * PLANE_PROGRESS_SPEED * plane.userData.speed + plane.userData.offset) % 1;

      const centeredTravel = travel - 0.5;
      const x = centeredTravel * PLANE_DIAGONAL_WIDTH * plane.userData.direction + plane.userData.pathX;
      const angle = centeredTravel * PLANE_ANGLE_SPAN + plane.userData.pathAngle - 0.6;
      const planeRadius = radius + PLANE_SURFACE_OFFSET;
      const diagonalAngle = PLANE_ANGLE_SPAN * planeRadius;

      plane.position.set(x, Math.sin(angle) * planeRadius, Math.cos(angle) * planeRadius);
      direction
        .set(PLANE_DIAGONAL_WIDTH * plane.userData.direction, Math.cos(angle) * diagonalAngle, -Math.sin(angle) * diagonalAngle)
        .normalize();
      target.copy(plane.position).add(direction);
      plane.up.set(0, Math.sin(angle), Math.cos(angle));
      plane.lookAt(target);
      plane.updateMatrix();

      const flap = Math.sin(t * 9 + planeIndex * 1.7) * 0.75; // 扇翅
      doveParts.forEach(({ sourceMatrix, flapSign }, meshIndex) => {
        const mesh = instanceMeshRefs.current[meshIndex];

        if (!mesh) {
          return;
        }

        if (flapSign !== 0) {
          flapMatrix.makeRotationZ(flap * flapSign);
          localMatrix.multiplyMatrices(sourceMatrix, flapMatrix);
          matrix.multiplyMatrices(plane.matrix, localMatrix);
        } else {
          matrix.multiplyMatrices(plane.matrix, sourceMatrix);
        }
        mesh.setMatrixAt(planeIndex, matrix);
      });
    });

    doveParts.forEach((_, meshIndex) => {
      const mesh = instanceMeshRefs.current[meshIndex];
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {doveParts.map(({ geometry, material }, i) => (
        <instancedMesh
          key={i}
          ref={(mesh) => {
            instanceMeshRefs.current[i] = mesh;
          }}
          frustumCulled={false}
          args={[geometry, material, planeRefs.current.length]}
        />
      ))}
      <Environment preset="sunset" />
    </group>
  );
}
