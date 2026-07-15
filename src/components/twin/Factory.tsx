import { useMemo } from "react"
import * as THREE from "three"
import { ROW_DEPTH } from "./simulation"
import { BoxMesh } from "./machines/prims"

function material(params: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(params)
}

const FLOOR = material({ color: "#dfe5ec", roughness: 0.86, metalness: 0.04 })
const OUTER_FLOOR = material({ color: "#cbd4df", roughness: 0.96 })
const LINE_PAD = material({ color: "#f5f7fa", roughness: 0.72, metalness: 0.02 })
const CENTER_STRIPE = material({ color: "#b9c7d8", roughness: 0.75 })
const WALKWAY = material({ color: "#8db8a1", roughness: 0.82 })
const WALKWAY_MARK = material({ color: "#f8fafc", roughness: 0.6 })

/**
 * Open factory floor. The old perimeter walls, glass box, columns and yellow
 * rectangular borders made the scene feel boxed in and hid the rear rows.
 * Soft floor zones preserve spatial orientation without enclosing the model.
 */
export function Factory({ lineCount }: { lineCount: number }) {
  const depth = Math.max(0, lineCount - 1) * ROW_DEPTH
  const centerZ = depth / 2
  const floorDepth = depth + 14
  const rows = useMemo(() => Array.from({ length: lineCount }, (_, i) => i * ROW_DEPTH), [lineCount])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, centerZ]} material={OUTER_FLOOR} receiveShadow>
        <planeGeometry args={[100, floorDepth + 40]} />
      </mesh>
      <mesh position={[-0.8, 0, centerZ]} material={FLOOR} receiveShadow>
        <boxGeometry args={[34, 0.08, floorDepth]} />
      </mesh>

      {rows.map((z) => (
        <group key={z}>
          <BoxMesh s={[26, 0.018, 5.25]} p={[-0.4, 0.052, z]} m={LINE_PAD} noShadow />
          <BoxMesh s={[24, 0.012, 0.045]} p={[-0.4, 0.066, z]} m={CENTER_STRIPE} noShadow />
        </group>
      ))}

      <BoxMesh s={[1.35, 0.016, floorDepth - 1]} p={[14.1, 0.055, centerZ]} m={WALKWAY} noShadow />
      <BoxMesh s={[0.05, 0.019, floorDepth - 1]} p={[13.38, 0.065, centerZ]} m={WALKWAY_MARK} noShadow />
      <BoxMesh s={[0.05, 0.019, floorDepth - 1]} p={[14.82, 0.065, centerZ]} m={WALKWAY_MARK} noShadow />
    </group>
  )
}
