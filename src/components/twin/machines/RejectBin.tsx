import * as THREE from "three"
import { M, textTexture } from "../materials"
import { BoxMesh, CylMesh } from "./prims"

/**
 * Bac « REJET » inox à fond bleu lumineux, fidèle aux trois postes de rejet
 * de l'image : parois inox, marquage REJET sur la face avant, lueur bleue
 * intérieure et goulotte inclinée côté ligne.
 */

/** Marquage identique sur les neuf bacs de l'usine : une seule texture. */
const LABEL_MAT = new THREE.MeshStandardMaterial({
  map: textTexture("REJET", { w: 512, h: 160, size: 86, color: "#4a5058", weight: "800" }),
  transparent: true,
  metalness: 0.4,
  roughness: 0.4,
  polygonOffset: true,
  polygonOffsetFactor: -1,
})

export function RejectBin({
  position,
  chuteFromY = 0,
  rotationY = 0,
}: {
  position: [number, number, number]
  /** Hauteur (monde) du bord de bande d'où tombe le produit — 0 = pas de goulotte. */
  chuteFromY?: number
  rotationY?: number
}) {
  const W = 0.94 // largeur (x)
  const D = 0.78 // profondeur (z)
  const H = 0.6 // hauteur des parois
  const T = 0.03 // épaisseur
  const baseY = 0.14

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Parois */}
      <BoxMesh s={[W, H, T]} p={[0, baseY + H / 2, D / 2]} m={M.inox} />
      <BoxMesh s={[W, H, T]} p={[0, baseY + H / 2, -D / 2]} m={M.inox} />
      <BoxMesh s={[T, H, D]} p={[-W / 2, baseY + H / 2, 0]} m={M.inox} />
      <BoxMesh s={[T, H, D]} p={[W / 2, baseY + H / 2, 0]} m={M.inox} />
      {/* Rebord supérieur */}
      <BoxMesh s={[W + 0.05, 0.035, T + 0.03]} p={[0, baseY + H + 0.017, D / 2]} m={M.inoxSatin} />
      <BoxMesh s={[W + 0.05, 0.035, T + 0.03]} p={[0, baseY + H + 0.017, -D / 2]} m={M.inoxSatin} />
      <BoxMesh s={[T + 0.03, 0.035, D + 0.05]} p={[-W / 2, baseY + H + 0.017, 0]} m={M.inoxSatin} />
      <BoxMesh s={[T + 0.03, 0.035, D + 0.05]} p={[W / 2, baseY + H + 0.017, 0]} m={M.inoxSatin} />

      {/* Fond bleu lumineux */}
      <BoxMesh s={[W - T * 2, 0.03, D - T * 2]} p={[0, baseY + 0.06, 0]} m={M.binInner} noShadow />
      <pointLight position={[0, baseY + 0.4, 0]} color="#2f7dff" intensity={1.6} distance={1.6} decay={2} />

      {/* Marquage REJET (face avant) */}
      <mesh position={[0, baseY + H * 0.52, D / 2 + T / 2 + 0.002]} material={LABEL_MAT}>
        <planeGeometry args={[0.62, 0.19]} />
      </mesh>

      {/* Piètement */}
      <CylMesh radius={0.028} h={baseY} p={[-W / 2 + 0.08, baseY / 2, -D / 2 + 0.08]} m={M.steelDark} seg={10} />
      <CylMesh radius={0.028} h={baseY} p={[W / 2 - 0.08, baseY / 2, -D / 2 + 0.08]} m={M.steelDark} seg={10} />
      <CylMesh radius={0.028} h={baseY} p={[-W / 2 + 0.08, baseY / 2, D / 2 - 0.08]} m={M.steelDark} seg={10} />
      <CylMesh radius={0.028} h={baseY} p={[W / 2 - 0.08, baseY / 2, D / 2 - 0.08]} m={M.steelDark} seg={10} />

      {/* Goulotte inclinée depuis la ligne */}
      {chuteFromY > 0 && (
        <BoxMesh
          s={[0.5, 0.02, 0.75]}
          p={[0, (chuteFromY + baseY + H) / 2 - 0.08, -D / 2 - 0.28]}
          r={[Math.PI / 4.2, 0, 0]}
          m={M.inoxSatin}
        />
      )}
    </group>
  )
}
