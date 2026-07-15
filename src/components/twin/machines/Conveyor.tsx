import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { BELT_SPEED, BELT_Y, type StationId, type TwinEngine } from "../simulation"
import { M, beltTexture } from "./../materials"
import { AXE_Z, BoxMesh, CylMesh } from "./prims"

/**
 * Module de convoyeur paramétrique : châssis inox, bande rayée défilante,
 * rouleaux d'extrémité, pieds réglables et liseré LED bleu comme sur l'image.
 * La bande ne défile que si la station propriétaire du tronçon est en MARCHE.
 */
/** Demi-largeur de la fenêtre ouverte dans les guides à chaque poste de rejet. */
const GAP_DEMI = 0.34

export function Conveyor({
  from,
  to,
  engine,
  station,
  width = 0.62,
  glow = true,
  guardRails = true,
  gapXs = [],
}: {
  from: number
  to: number
  engine: TwinEngine
  station: StationId
  width?: number
  glow?: boolean
  guardRails?: boolean
  /** Abscisses (monde) des postes de rejet : les guides s'y interrompent
   *  pour laisser sortir le produit éjecté au lieu qu'il les traverse. */
  gapXs?: number[]
}) {
  const length = to - from
  const cx = (from + to) / 2

  const beltMat = useMemo(() => {
    const tex = beltTexture(length * 3)
    return new THREE.MeshStandardMaterial({ map: tex, color: "#ffffff", roughness: 0.9, metalness: 0 })
  }, [length])

  useEffect(
    () => () => {
      beltMat.map?.dispose()
      beltMat.dispose()
    },
    [beltMat],
  )

  useFrame((_, dt) => {
    if (engine.isRunning(station) && beltMat.map) {
      // Défilement synchronisé sur la vitesse réelle des produits. L'offset
      // décroît : augmenter l'offset ferait défiler le motif vers -X, à
      // contresens des produits.
      beltMat.map.offset.x -= ((BELT_SPEED * engine.speed * dt) / length) * beltMat.map.repeat.x
    }
  })

  const legXs = useMemo(() => {
    const n = Math.max(2, Math.round(length / 1.8) + 1)
    const xs: number[] = []
    for (let i = 0; i < n; i++) xs.push(from + 0.25 + ((length - 0.5) * i) / (n - 1))
    return xs
  }, [from, length])

  // Tronçons de guides latéraux, interrompus autour des postes de rejet.
  const railSegs = useMemo(() => {
    const a = from + length * 0.03
    const b = to - length * 0.03
    const cuts = gapXs.filter((g) => g > a && g < b).sort((u, v) => u - v)
    const segs: Array<[number, number]> = []
    let cursor = a
    for (const g of cuts) {
      segs.push([cursor, g - GAP_DEMI])
      cursor = g + GAP_DEMI
    }
    segs.push([cursor, b])
    return segs.filter(([s, e]) => e - s > 0.08)
  }, [from, to, length, gapXs])

  const railY = BELT_Y - 0.055
  const legH = BELT_Y - 0.16

  return (
    <group>
      {/* Bande */}
      <mesh position={[cx, BELT_Y - 0.023, 0]} material={beltMat} receiveShadow castShadow>
        <boxGeometry args={[length, 0.046, width]} />
      </mesh>

      {/* Châssis latéral */}
      <BoxMesh s={[length, 0.11, 0.05]} p={[cx, railY, width / 2 + 0.035]} m={M.inoxSatin} />
      <BoxMesh s={[length, 0.11, 0.05]} p={[cx, railY, -width / 2 - 0.035]} m={M.inoxSatin} />

      {/* Rouleaux d'extrémité */}
      <CylMesh radius={0.05} h={width} p={[from + 0.02, BELT_Y - 0.03, 0]} r={AXE_Z} m={M.steelDark} seg={16} />
      <CylMesh radius={0.05} h={width} p={[to - 0.02, BELT_Y - 0.03, 0]} r={AXE_Z} m={M.steelDark} seg={16} />

      {/* Guides latéraux au-dessus de la bande, ouverts aux postes de rejet */}
      {guardRails && (
        <>
          {railSegs.map(([s, e]) => (
            <group key={`r${s}`}>
              <BoxMesh s={[e - s, 0.025, 0.02]} p={[(s + e) / 2, BELT_Y + 0.1, width / 2 - 0.04]} m={M.frame} />
              <BoxMesh s={[e - s, 0.025, 0.02]} p={[(s + e) / 2, BELT_Y + 0.1, -width / 2 + 0.04]} m={M.frame} />
            </group>
          ))}
          {/* Potences des guides (aucune dans les fenêtres de rejet) */}
          {legXs
            .filter((x) => gapXs.every((g) => Math.abs(x - g) > GAP_DEMI))
            .map((x) => (
              <group key={`g${x}`}>
                <CylMesh radius={0.012} h={0.16} p={[x, BELT_Y + 0.03, width / 2 - 0.04]} m={M.steelDark} seg={8} />
                <CylMesh radius={0.012} h={0.16} p={[x, BELT_Y + 0.03, -width / 2 + 0.04]} m={M.steelDark} seg={8} />
              </group>
            ))}
        </>
      )}

      {/* Liseré LED bleu sous le châssis */}
      {glow && (
        <BoxMesh
          s={[length * 0.96, 0.02, 0.025]}
          p={[cx, railY - 0.075, width / 2 + 0.045]}
          m={M.blueLed}
          noShadow
        />
      )}

      {/* Pieds */}
      {legXs.map((x) => (
        <group key={x}>
          <BoxMesh s={[0.055, legH, 0.055]} p={[x, 0.12 + legH / 2, width / 2 - 0.05]} m={M.inoxSatin} />
          <BoxMesh s={[0.055, legH, 0.055]} p={[x, 0.12 + legH / 2, -width / 2 + 0.05]} m={M.inoxSatin} />
          <BoxMesh s={[0.05, 0.05, width - 0.05]} p={[x, 0.3, 0]} m={M.steelDark} />
          <CylMesh radius={0.03} h={0.12} p={[x, 0.06, width / 2 - 0.05]} m={M.steelDark} seg={10} />
          <CylMesh radius={0.03} h={0.12} p={[x, 0.06, -width / 2 + 0.05]} m={M.steelDark} seg={10} />
          <CylMesh radius={0.055} h={0.02} p={[x, 0.01, width / 2 - 0.05]} m={M.steelDark} seg={10} />
          <CylMesh radius={0.055} h={0.02} p={[x, 0.01, -width / 2 + 0.05]} m={M.steelDark} seg={10} />
        </group>
      ))}
    </group>
  )
}
