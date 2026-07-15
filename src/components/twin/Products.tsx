import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { ProductVisual } from "./lineProfiles"
import type { TwinEngine } from "./simulation"
import { M } from "./materials"

const MAX_INSTANCES = 48

/**
 * A single pair of instanced meshes renders every moving unit. The geometry
 * changes with the selected article, while positions keep coming from the MES
 * mirror. This keeps draw calls stable when switching between production lines.
 */
export function Products({ engine, visual }: { engine: TwinEngine; visual: ProductVisual }) {
  const inputRef = useRef<THREE.InstancedMesh>(null)
  const outputRef = useRef<THREE.InstancedMesh>(null)
  const geometries = useMemo(() => buildProductGeometries(visual), [visual])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const primary = useMemo(() => new THREE.Color(productColor(visual)), [visual])
  const finished = useMemo(() => new THREE.Color("#dbeafe"), [])

  useEffect(() => () => {
    geometries.input.dispose()
    geometries.output.dispose()
  }, [geometries])

  useFrame((_, dt) => {
    engine.tick(dt)
    const input = inputRef.current
    const output = outputRef.current
    if (!input || !output) return

    let inputCount = 0
    let outputCount = 0
    for (const product of engine.products) {
      dummy.position.set(product.x, product.y, product.z)
      if (product.mode === "falling") {
        dummy.rotation.set(product.rot * 0.7, product.rot, product.rot * 0.35)
      } else {
        const tilt = product.mode === "binned" ? ((((product.id * 37) % 11) / 11) - 0.5) * 0.45 : 0
        dummy.rotation.set(0, product.rot, tilt)
      }
      dummy.updateMatrix()

      if (product.kind === "blister") {
        if (inputCount >= MAX_INSTANCES) continue
        input.setMatrixAt(inputCount, dummy.matrix)
        input.setColorAt(inputCount, primary)
        inputCount++
      } else {
        if (outputCount >= MAX_INSTANCES) continue
        output.setMatrixAt(outputCount, dummy.matrix)
        output.setColorAt(outputCount, product.labeled ? finished : primary)
        outputCount++
      }
    }

    input.count = inputCount
    output.count = outputCount
    input.instanceMatrix.needsUpdate = true
    output.instanceMatrix.needsUpdate = true
    if (input.instanceColor) input.instanceColor.needsUpdate = true
    if (output.instanceColor) output.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={inputRef} args={[geometries.input, M.blister, MAX_INSTANCES]} castShadow frustumCulled={false} />
      <instancedMesh ref={outputRef} args={[geometries.output, M.boxWhite, MAX_INSTANCES]} castShadow frustumCulled={false} />
    </group>
  )
}

function productColor(visual: ProductVisual): string {
  return {
    blister: "#dfe4ea",
    tablet: "#f8fafc",
    bottle: "#bfdbfe",
    sachet: "#ddd6fe",
    tube: "#c7d2fe",
    powder: "#fde68a",
  }[visual]
}

function buildProductGeometries(visual: ProductVisual): { input: THREE.BufferGeometry; output: THREE.BufferGeometry } {
  switch (visual) {
    case "blister":
      return { input: buildBlisterGeometry(), output: new THREE.BoxGeometry(0.4, 0.24, 0.28) }
    case "tablet":
      return {
        input: new THREE.CylinderGeometry(0.12, 0.12, 0.07, 12),
        output: new THREE.BoxGeometry(0.34, 0.2, 0.24),
      }
    case "bottle":
      return {
        input: new THREE.CylinderGeometry(0.1, 0.12, 0.24, 12),
        output: new THREE.CylinderGeometry(0.1, 0.12, 0.24, 12),
      }
    case "sachet":
      return {
        input: new THREE.BoxGeometry(0.3, 0.07, 0.3),
        output: new THREE.BoxGeometry(0.34, 0.08, 0.32),
      }
    case "tube": {
      const input = new THREE.CylinderGeometry(0.075, 0.09, 0.38, 12)
      input.rotateZ(Math.PI / 2)
      const output = input.clone()
      return { input, output }
    }
    case "powder":
      return {
        input: new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12),
        output: new THREE.BoxGeometry(0.32, 0.1, 0.3),
      }
  }
}

function buildBlisterGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.5, 0.04, 0.32)]
  const alveole = new THREE.SphereGeometry(0.028, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)
  alveole.scale(1, 0.85, 1)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const part = alveole.clone()
      part.translate(-0.19 + (0.38 * i) / 5, 0.02, -0.105 + (0.21 * j) / 3)
      parts.push(part)
    }
  }
  alveole.dispose()
  const merged = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  return merged ?? new THREE.BoxGeometry(0.5, 0.05, 0.32)
}
