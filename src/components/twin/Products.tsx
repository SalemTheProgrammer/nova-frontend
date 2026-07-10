import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { TwinEngine } from "./simulation"
import { M } from "./materials"

const MAX_INSTANCES = 96

/**
 * Rendu instancié des produits en circulation : plaquettes blister argentées
 * (plaque + grille d'alvéoles bombées) et étuis carton blancs. Les positions
 * sont lues directement dans le moteur à chaque frame — aucun re-render React.
 */
export function Products({ engine }: { engine: TwinEngine }) {
  const blisterRef = useRef<THREE.InstancedMesh>(null)
  const boxRef = useRef<THREE.InstancedMesh>(null)

  const blisterGeom = useMemo(() => buildBlisterGeometry(), [])
  const boxGeom = useMemo(() => new THREE.BoxGeometry(0.4, 0.24, 0.28), [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const blanc = useMemo(() => new THREE.Color("#f7f9fc"), [])
  const etiquete = useMemo(() => new THREE.Color("#dfe9fb"), [])

  /** Inclinaison de repos propre à chaque produit (stable d'une frame à l'autre). */
  const tiltFor = (id: number) => (((id * 37) % 11) / 11 - 0.5) * 0.45

  useFrame((_, dt) => {
    // Un seul tick moteur par frame, avant la mise à jour des instances.
    engine.tick(dt)

    const blisters = blisterRef.current
    const boxes = boxRef.current
    if (!blisters || !boxes) return

    let bi = 0
    let xi = 0
    for (const p of engine.products) {
      dummy.position.set(p.x, p.y, p.z)
      if (p.mode === "falling") {
        // Culbute autour des axes horizontaux : un produit éjecté bascule,
        // il ne tourne pas à plat comme une toupie.
        dummy.rotation.set(p.rot * 0.7, p.rot, p.rot * 0.35)
      } else {
        dummy.rotation.set(0, p.rot, p.mode === "binned" ? tiltFor(p.id) : 0)
      }
      dummy.updateMatrix()
      if (p.kind === "blister") {
        if (bi < MAX_INSTANCES) blisters.setMatrixAt(bi++, dummy.matrix)
      } else if (xi < MAX_INSTANCES) {
        boxes.setMatrixAt(xi, dummy.matrix)
        boxes.setColorAt(xi, p.labeled ? etiquete : blanc)
        xi++
      }
    }
    blisters.count = bi
    boxes.count = xi
    blisters.instanceMatrix.needsUpdate = true
    boxes.instanceMatrix.needsUpdate = true
    if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh
        ref={blisterRef}
        args={[blisterGeom, M.blister, MAX_INSTANCES]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={boxRef}
        args={[boxGeom, M.boxWhite, MAX_INSTANCES]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </group>
  )
}

/** Plaquette blister : plaque argentée + grille 6×4 d'alvéoles bombées, fusionnées. */
function buildBlisterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  parts.push(new THREE.BoxGeometry(0.5, 0.04, 0.32))

  const alveole = new THREE.SphereGeometry(0.028, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
  alveole.scale(1, 0.85, 1)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const x = -0.19 + (0.38 * i) / 5
      const z = -0.105 + (0.21 * j) / 3
      const a = alveole.clone()
      a.translate(x, 0.02, z)
      parts.push(a)
    }
  }
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged ?? new THREE.BoxGeometry(0.5, 0.05, 0.32)
}
