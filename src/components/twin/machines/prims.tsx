import type * as THREE from "three"

/**
 * Primitives compactes pour assembler les machines : chaque carter est une
 * composition de boîtes et de cylindres partageant les matériaux de `materials.ts`.
 */

export type V3 = [number, number, number]

export function BoxMesh({
  s,
  p,
  r,
  m,
  noShadow = false,
}: {
  /** Dimensions [x, y, z]. */
  s: V3
  /** Position du centre. */
  p?: V3
  /** Rotation euler. */
  r?: V3
  m: THREE.Material
  noShadow?: boolean
}) {
  return (
    <mesh
      position={p}
      rotation={r}
      material={m}
      castShadow={false}
      receiveShadow={!noShadow}
    >
      <boxGeometry args={s} />
    </mesh>
  )
}

export function CylMesh({
  radius,
  radiusTop,
  h,
  p,
  r,
  m,
  seg = 24,
  noShadow = false,
}: {
  radius: number
  radiusTop?: number
  h: number
  p?: V3
  /** Rotation euler — par défaut l'axe du cylindre est vertical (Y). */
  r?: V3
  m: THREE.Material
  seg?: number
  noShadow?: boolean
}) {
  return (
    <mesh
      position={p}
      rotation={r}
      material={m}
      castShadow={false}
      receiveShadow={!noShadow}
    >
      <cylinderGeometry args={[radiusTop ?? radius, radius, h, seg]} />
    </mesh>
  )
}

/** Rotation pour orienter un cylindre le long de l'axe Z (rouleaux, bobines). */
export const AXE_Z: V3 = [Math.PI / 2, 0, 0]
/** Rotation pour orienter un cylindre le long de l'axe X. */
export const AXE_X: V3 = [0, 0, Math.PI / 2]

/** Quatre pieds réglables (vérins inox) sous un carter. */
export function Feet({
  dx,
  dz,
  h,
  m,
  y = 0,
}: {
  dx: number
  dz: number
  h: number
  m: THREE.Material
  y?: number
}) {
  const coins: V3[] = [
    [-dx, y + h / 2, -dz],
    [dx, y + h / 2, -dz],
    [-dx, y + h / 2, dz],
    [dx, y + h / 2, dz],
  ]
  return (
    <group>
      {coins.map((p, i) => (
        <group key={i}>
          <CylMesh radius={0.032} h={h} p={p} m={m} seg={12} />
          <CylMesh radius={0.06} h={0.025} p={[p[0], y + 0.0125, p[2]]} m={m} seg={12} />
        </group>
      ))}
    </group>
  )
}
