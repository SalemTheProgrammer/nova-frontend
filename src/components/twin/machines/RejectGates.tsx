import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type * as THREE from "three"
import { BELT_Y, strike, type TwinEngine } from "../simulation"
import { M } from "../materials"
import { BoxMesh, CylMesh } from "./prims"

/**
 * Mécanismes de rejet animés — les trois « Postes de Rejet » de l'image :
 * trappe basculante (blistéreuse), poussoir pneumatique (vignetteuse).
 * Le soufflage pneumatique (trieuse) est porté par la buse du Checkweigher.
 */

/** Trappe basculante : volet côté bac qui s'ouvre au passage d'un blister non conforme. */
export function TrapGate({ engine, x }: { engine: TwinEngine; x: number }) {
  const flap = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!flap.current) return
    // Ouverture immédiate à l'éjection, fermeture amortie : le volet doit
    // être ouvert pendant que le blister glisse, pas s'ouvrir après son passage.
    flap.current.rotation.x = strike(engine.trapPulse) * 1.15
  })
  return (
    <group position={[x, 0, 0]}>
      {/* Cadre du poste de rejet */}
      <BoxMesh s={[0.6, 0.05, 0.05]} p={[0, BELT_Y + 0.2, -0.38]} m={M.frame} />
      <CylMesh radius={0.018} h={0.32} p={[-0.26, BELT_Y + 0.04, -0.38]} m={M.steelDark} seg={8} />
      <CylMesh radius={0.018} h={0.32} p={[0.26, BELT_Y + 0.04, -0.38]} m={M.steelDark} seg={8} />
      {/* Volet articulé côté bac (charnière au bord avant de la bande) */}
      <group ref={flap} position={[0, BELT_Y + 0.02, 0.36]}>
        <BoxMesh s={[0.56, 0.015, 0.3]} p={[0, 0, 0.15]} m={M.blueLed} noShadow />
      </group>
      {/* Liseré bleu de repérage du poste */}
      <BoxMesh s={[0.62, 0.02, 0.02]} p={[0, BELT_Y + 0.13, 0.37]} m={M.blueLed} noShadow />
    </group>
  )
}

/** Poussoir pneumatique : vérin qui traverse la bande pour éjecter la boîte. */
export function Pusher({ engine, x }: { engine: TwinEngine; x: number }) {
  const rod = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!rod.current) return
    // Coup de vérin : sortie quasi instantanée au moment où la boîte part,
    // puis rétraction amortie — et non l'inverse.
    rod.current.position.z = -0.52 + strike(engine.pushPulse) * 0.55
  })
  return (
    <group position={[x, 0, 0]}>
      {/* Corps du vérin, monté côté opposé au bac */}
      <CylMesh radius={0.024} h={0.6} p={[0, BELT_Y - 0.3, -0.62]} m={M.steelDark} seg={10} />
      <BoxMesh s={[0.34, 0.22, 0.26]} p={[0, BELT_Y + 0.1, -0.68]} m={M.inoxSatin} />
      <BoxMesh s={[0.1, 0.06, 0.1]} p={[0, BELT_Y + 0.24, -0.68]} m={M.plasticDark} />
      {/* Tige + palette */}
      <group ref={rod} position={[0, BELT_Y + 0.1, -0.52]}>
        <CylMesh radius={0.02} h={0.4} p={[0, 0, -0.06]} r={[Math.PI / 2, 0, 0]} m={M.frame} seg={10} />
        <BoxMesh s={[0.34, 0.2, 0.03]} p={[0, 0, 0.15]} m={M.blueLed} noShadow />
      </group>
    </group>
  )
}
