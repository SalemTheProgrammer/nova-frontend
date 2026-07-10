import { useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { StationId, TwinEngine } from "../simulation"
import { M } from "../materials"
import { CylMesh } from "./prims"

/**
 * Colonne lumineuse tricolore (rouge / ambre / vert) comme sur chaque machine
 * de l'image. L'état de la station pilote les feux :
 * MARCHE → vert fixe · PAUSE → ambre fixe · PANNE → rouge clignotant ·
 * MAINTENANCE → ambre clignotant · ARRET → tout éteint (ambre en veilleuse).
 */
export function StackLight({
  position,
  engine,
  station,
  scale = 1,
  poleH = 0.32,
}: {
  position: [number, number, number]
  engine: TwinEngine
  station: StationId
  scale?: number
  poleH?: number
}) {
  const mats = useMemo(
    () => ({
      red: new THREE.MeshStandardMaterial({
        color: "#6e1414",
        emissive: "#ff2d2d",
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
      amber: new THREE.MeshStandardMaterial({
        color: "#7a5510",
        emissive: "#ffb020",
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
      green: new THREE.MeshStandardMaterial({
        color: "#0f5c2c",
        emissive: "#2dee6e",
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const statut = engine.stations[station].statut
    const blink = Math.sin(clock.elapsedTime * 7) > 0 ? 1 : 0.06
    mats.red.emissiveIntensity = statut === "PANNE" ? 2.6 * blink : 0.04
    mats.amber.emissiveIntensity =
      statut === "PAUSE" ? 2.0
      : statut === "MAINTENANCE" ? 2.2 * blink
      : statut === "ARRET" ? 0.35
      : 0.04
    mats.green.emissiveIntensity = statut === "MARCHE" ? 2.2 : 0.04
  })

  const r = 0.052 * scale
  const segH = 0.075 * scale
  const base = poleH

  return (
    <group position={position}>
      <CylMesh radius={0.02 * scale} h={poleH} p={[0, poleH / 2, 0]} m={M.steelDark} seg={10} />
      <CylMesh radius={r * 1.08} h={0.03 * scale} p={[0, base + 0.015 * scale, 0]} m={M.plasticDark} seg={16} />
      <mesh position={[0, base + 0.03 * scale + segH / 2, 0]} material={mats.red} castShadow>
        <cylinderGeometry args={[r, r, segH, 16]} />
      </mesh>
      <mesh position={[0, base + 0.03 * scale + segH * 1.5, 0]} material={mats.amber} castShadow>
        <cylinderGeometry args={[r, r, segH, 16]} />
      </mesh>
      <mesh position={[0, base + 0.03 * scale + segH * 2.5, 0]} material={mats.green} castShadow>
        <cylinderGeometry args={[r, r, segH, 16]} />
      </mesh>
      <CylMesh
        radius={r * 1.05}
        h={0.022 * scale}
        p={[0, base + 0.03 * scale + segH * 3 + 0.011 * scale, 0]}
        m={M.plasticDark}
        seg={16}
      />
    </group>
  )
}
