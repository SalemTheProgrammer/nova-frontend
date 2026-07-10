import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { M, screenMaterial } from "../materials"
import { BoxMesh, CylMesh, type V3 } from "./prims"

export type HmiDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

/**
 * Écran vivant : plan dont la texture canvas est redessinée ~4 fois/s par le
 * callback `draw` — utilisé pour les pupitres HMI et l'afficheur de pesée.
 */
export function LiveScreen({
  w,
  h,
  position,
  rotation,
  draw,
  px = 256,
}: {
  w: number
  h: number
  position: V3
  rotation?: V3
  draw: HmiDraw
  px?: number
}) {
  const { mat, canvas, tex } = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = px
    canvas.height = Math.round((px * h) / w)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { mat: screenMaterial(tex), canvas, tex }
  }, [w, h, px])

  const last = useRef(0)
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.25) return
    last.current = clock.elapsedTime
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    draw(ctx, canvas.width, canvas.height)
    tex.needsUpdate = true
  })

  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  )
}

/** Bouton d'arrêt d'urgence : collerette jaune + champignon rouge. */
export function EStop({ position, rotation }: { position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <CylMesh radius={0.038} h={0.012} p={[0, 0, 0]} r={[Math.PI / 2, 0, 0]} m={M.yellow} seg={16} />
      <CylMesh radius={0.022} h={0.03} p={[0, 0, 0.018]} r={[Math.PI / 2, 0, 0]} m={M.redBtn} seg={16} />
    </group>
  )
}

/**
 * Pupitre opérateur sur bras articulé — écran tactile vivant, boutons physiques
 * et arrêt d'urgence, comme les pupitres bleus de l'image.
 * `position` est le point d'ancrage du mât (au sol ou sur le carter).
 */
export function HmiPanel({
  position,
  rotationY = 0,
  draw,
  poleH = 1.35,
}: {
  position: V3
  rotationY?: number
  draw: HmiDraw
  poleH?: number
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Mât + bras */}
      <CylMesh radius={0.026} h={poleH} p={[0, poleH / 2, 0]} m={M.steelDark} seg={12} />
      <BoxMesh s={[0.05, 0.05, 0.16]} p={[0, poleH, 0.08]} m={M.steelDark} />

      {/* Boîtier du pupitre */}
      <group position={[0, poleH, 0.19]} rotation={[-0.12, 0, 0]}>
        <BoxMesh s={[0.34, 0.46, 0.07]} p={[0, 0, 0]} m={M.inoxSatin} />
        <BoxMesh s={[0.3, 0.24, 0.012]} p={[0, 0.08, 0.038]} m={M.bezel} />
        <LiveScreen w={0.27} h={0.2} position={[0, 0.08, 0.046]} draw={draw} />
        {/* Boutons physiques */}
        <CylMesh radius={0.016} h={0.018} p={[-0.09, -0.12, 0.042]} r={[Math.PI / 2, 0, 0]} m={M.greenBtn} seg={12} />
        <CylMesh radius={0.016} h={0.018} p={[-0.03, -0.12, 0.042]} r={[Math.PI / 2, 0, 0]} m={M.plasticDark} seg={12} />
        <EStop position={[0.09, -0.12, 0.04]} />
      </group>
    </group>
  )
}
