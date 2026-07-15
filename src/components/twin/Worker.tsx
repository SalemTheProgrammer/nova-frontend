import { useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { LINE, type TwinEngine } from "./simulation"
import { M } from "./materials"
import { BoxMesh } from "./machines/prims"

/**
 * Opérateur logistique de fin de ligne : il attend la sortie des boîtes au bout
 * du dernier convoyeur, en saisit une, la porte jusqu'à la palette et l'empile,
 * puis retourne au poste de prise. Le cycle ne tourne que si toute la ligne est
 * réellement en production et si une boîte a physiquement atteint la sortie.
 * À l'arrêt, l'opérateur reste strictement immobile, même au milieu d'un trajet.
 *
 * Géométrie volontairement low-poly (une douzaine de boîtes + deux sphères) et
 * un seul setState React par boîte déposée (~toutes les 8 s) : le coût par
 * ligne est négligeable.
 */

function std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params)
}

const VEST = std({ color: "#f97316", roughness: 0.6 })
const PANTS = std({ color: "#2b3a50", roughness: 0.75 })
const SKIN = std({ color: "#e8b48f", roughness: 0.6 })
const HELMET = std({ color: "#f5f7fa", roughness: 0.35 })
const WOOD = std({ color: "#b98d5a", roughness: 0.85 })

/** Poste de prise : à côté du bout du convoyeur de sortie. */
const PICKUP = new THREE.Vector3(LINE.endX - 0.25, 0, 0.85)
/** Palette de stockage, sur la zone logistique en bout de ligne. */
const PALLET = new THREE.Vector3(LINE.endX + 2.3, 0, 2.05)
const WALK_SPEED = 1.35
const GRAB_S = 0.8
const PLACE_S = 0.7
/** 2 boîtes par couche × 3 couches, puis la palette « part » (pile remise à zéro). */
const STACK_MAX = 6

type Phase = "toPickup" | "pick" | "toPallet" | "place"

export function Worker({ engine }: { engine: TwinEngine }) {
  const person = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const carryBox = useRef<THREE.Mesh>(null)

  const phase = useRef<Phase>("pick")
  const timer = useRef(0)
  const walkPhase = useRef(0)
  const carrying = useRef(false)
  const pos = useRef(PICKUP.clone())
  const heading = useRef(Math.PI / 2)
  const [stack, setStack] = useState(0)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const p = person.current
    if (!p) return

    if (!engine.isLineWorking()) {
      p.position.set(pos.current.x, 0, pos.current.z)
      if (legL.current) legL.current.rotation.x = 0
      if (legR.current) legR.current.rotation.x = 0
      if (armL.current) armL.current.rotation.x = carrying.current ? -1.15 : 0
      if (armR.current) armR.current.rotation.x = carrying.current ? -1.15 : 0
      if (carryBox.current) carryBox.current.visible = carrying.current
      return
    }

    const target = phase.current === "toPallet" ? PALLET : PICKUP
    let moving = false

    if (phase.current === "toPickup" || phase.current === "toPallet") {
      const dx = target.x - pos.current.x
      const dz = target.z - pos.current.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.06) {
        phase.current = phase.current === "toPallet" ? "place" : "pick"
        timer.current = 0
      } else {
        moving = true
        const step = Math.min(dist, WALK_SPEED * dt)
        pos.current.x += (dx / dist) * step
        pos.current.z += (dz / dist) * step
        heading.current = Math.atan2(dx, dz)
      }
    } else {
      timer.current += dt
      if (phase.current === "pick") {
        // Une prise correspond exactement à une unité arrivée en fin de ligne.
        if (timer.current > GRAB_S && engine.takeCompletedUnit()) {
          if (pos.current.distanceTo(PICKUP) > 0.06) {
            phase.current = "toPickup"
          } else {
            carrying.current = true
            phase.current = "toPallet"
          }
        }
      } else if (timer.current > PLACE_S) {
        carrying.current = false
        setStack((value) => (value >= STACK_MAX ? 1 : value + 1))
        phase.current = "toPickup"
      }
    }

    if (moving) walkPhase.current += dt * 7.5
    const swing = moving ? Math.sin(walkPhase.current) * 0.55 : 0

    p.position.set(pos.current.x, moving ? Math.abs(Math.sin(walkPhase.current)) * 0.03 : 0, pos.current.z)
    // Lissage du cap pour éviter les demi-tours instantanés.
    const delta = ((heading.current - p.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    p.rotation.y += delta * Math.min(1, dt * 10)

    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    const armPose = carrying.current ? -1.15 : 0
    if (armL.current) armL.current.rotation.x = armPose + (carrying.current ? 0 : -swing)
    if (armR.current) armR.current.rotation.x = armPose + (carrying.current ? 0 : swing)
    if (carryBox.current) carryBox.current.visible = carrying.current
  })

  return (
    <group>
      <group ref={person}>
        {/* Jambes (pivot hanche) */}
        <group ref={legL} position={[-0.095, 0.85, 0]}>
          <BoxMesh s={[0.14, 0.78, 0.16]} p={[0, -0.39, 0]} m={PANTS} />
        </group>
        <group ref={legR} position={[0.095, 0.85, 0]}>
          <BoxMesh s={[0.14, 0.78, 0.16]} p={[0, -0.39, 0]} m={PANTS} />
        </group>
        {/* Torse gilet haute visibilité */}
        <BoxMesh s={[0.42, 0.6, 0.24]} p={[0, 1.16, 0]} m={VEST} />
        {/* Bras (pivot épaule) + mains */}
        <group ref={armL} position={[-0.265, 1.42, 0]}>
          <BoxMesh s={[0.11, 0.58, 0.13]} p={[0, -0.26, 0]} m={VEST} />
          <BoxMesh s={[0.09, 0.09, 0.09]} p={[0, -0.57, 0]} m={SKIN} />
        </group>
        <group ref={armR} position={[0.265, 1.42, 0]}>
          <BoxMesh s={[0.11, 0.58, 0.13]} p={[0, -0.26, 0]} m={VEST} />
          <BoxMesh s={[0.09, 0.09, 0.09]} p={[0, -0.57, 0]} m={SKIN} />
        </group>
        {/* Tête + casque */}
        <mesh position={[0, 1.62, 0]} material={SKIN} castShadow>
          <sphereGeometry args={[0.145, 18, 14]} />
        </mesh>
        <mesh position={[0, 1.7, 0]} scale={[1, 0.72, 1]} material={HELMET}>
          <sphereGeometry args={[0.165, 18, 12]} />
        </mesh>
        {/* Boîte portée (visible pendant le trajet vers la palette) */}
        <mesh ref={carryBox} visible={false} position={[0, 1.02, 0.36]} material={M.boxWhite} castShadow>
          <boxGeometry args={[0.36, 0.24, 0.26]} />
        </mesh>
      </group>

      {/* Palette + pile de boîtes déposées */}
      <group position={[PALLET.x, 0, PALLET.z]}>
        <BoxMesh s={[1.2, 0.05, 1.0]} p={[0, 0.12, 0]} m={WOOD} />
        {[-0.5, 0, 0.5].map((x) => (
          <BoxMesh key={x} s={[0.14, 0.1, 1.0]} p={[x, 0.05, 0]} m={WOOD} />
        ))}
        {Array.from({ length: stack }, (_, i) => (
          <BoxMesh
            key={i}
            s={[0.36, 0.24, 0.26]}
            p={[i % 2 === 0 ? -0.24 : 0.24, 0.265 + Math.floor(i / 2) * 0.25, 0]}
            m={M.boxWhite}
          />
        ))}
      </group>
    </group>
  )
}
