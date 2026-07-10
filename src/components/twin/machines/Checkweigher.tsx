import { useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { TwinEngine } from "../simulation"
import { GLASS, M, textTexture } from "../materials"
import { LiveScreen, EStop } from "./HmiPanel"
import { StackLight } from "./StackLight"
import { BoxMesh, CylMesh, Feet } from "./prims"

/**
 * Trieuse pondérale — la tour « CHECKWEIGHER » de l'image : afficheur de poids
 * vivant (le poids de chaque boîte qui passe s'affiche en temps réel), panneau
 * de boutons, arrêt d'urgence, colonne lumineuse et tunnel de protection
 * transparent au-dessus de la bande aval.
 */
export function Checkweigher({
  engine,
  position,
}: {
  engine: TwinEngine
  position: [number, number, number]
}) {
  const brandMat = useMemo(() => {
    const tex = textTexture("CHECKWEIGHER", { w: 512, h: 64, size: 38, color: "#565e66", weight: "700" })
    return new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, metalness: 0.2 })
  }, [])

  return (
    <group position={position}>
      {/* Caisson sous bande (cellule de pesée) */}
      <Feet dx={0.8} dz={0.42} h={0.12} m={M.steelDark} />
      <BoxMesh s={[1.75, 0.52, 0.95]} p={[0, 0.38, 0]} m={M.inox} />
      <BoxMesh s={[0.5, 0.16, 0.5]} p={[0, 0.7, 0]} m={M.steelDark} />

      {/* Tour de contrôle (derrière la bande) */}
      <group position={[-0.25, 0, -0.88]}>
        <BoxMesh s={[0.78, 1.62, 0.55]} p={[0, 1.03, 0]} m={M.inox} />
        <BoxMesh s={[0.82, 0.06, 0.59]} p={[0, 1.87, 0]} m={M.frame} />

        {/* Marquage constructeur */}
        <mesh position={[0, 1.72, 0.278]} material={brandMat}>
          <planeGeometry args={[0.6, 0.075]} />
        </mesh>

        {/* Afficheur de poids vivant */}
        <BoxMesh s={[0.62, 0.5, 0.03]} p={[0, 1.38, 0.28]} m={M.bezel} />
        <LiveScreen
          w={0.56}
          h={0.42}
          position={[0, 1.38, 0.297]}
          draw={(ctx, w, h) => drawWeightScreen(ctx, w, h, engine)}
          px={320}
        />

        {/* Panneau de commande (boutons + arrêt d'urgence) */}
        <BoxMesh s={[0.58, 0.42, 0.025]} p={[0, 0.86, 0.28]} m={M.plasticDark} />
        <CylMesh radius={0.028} h={0.02} p={[-0.16, 0.94, 0.3]} r={[Math.PI / 2, 0, 0]} m={M.greenBtn} seg={14} />
        <CylMesh radius={0.028} h={0.02} p={[-0.05, 0.94, 0.3]} r={[Math.PI / 2, 0, 0]} m={M.frame} seg={14} />
        <CylMesh radius={0.028} h={0.02} p={[0.06, 0.94, 0.3]} r={[Math.PI / 2, 0, 0]} m={M.frame} seg={14} />
        <EStop position={[0.17, 0.76, 0.295]} />

        {/* Colonne lumineuse au sommet */}
        <StackLight position={[0, 1.9, 0]} engine={engine} station="trieuse" />
      </group>

      {/* Buse de soufflage pneumatique (côté opposé au bac) */}
      <group position={[1.85, 0, -0.48]}>
        <CylMesh radius={0.02} h={0.55} p={[0, 0.66, 0]} m={M.steelDark} seg={10} />
        <BoxMesh s={[0.14, 0.12, 0.18]} p={[0, 0.99, 0.04]} m={M.plasticDark} />
        <CylMesh radius={0.014} h={0.12} p={[0, 0.99, 0.18]} r={[Math.PI / 2, 0, 0]} m={M.frame} seg={10} />
        <BlastFlash engine={engine} />
      </group>
    </group>
  )
}

/** Jet d'air furtif visible au moment de l'éjection pneumatique. */
function BlastFlash({ engine }: { engine: TwinEngine }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cfe6ff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  )
  // Le cône pointe dans le sens du jet (+z) et disparaît en ~0,4 s.
  useFrame(() => {
    mat.opacity = engine.blastPulse * 0.75
  })
  return (
    <mesh position={[0, 0.99, 0.45]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <coneGeometry args={[0.06, 0.55, 12, 1, true]} />
    </mesh>
  )
}

/**
 * Tunnel de protection transparent au-dessus d'un tronçon de bande —
 * le capot acrylique visible après la trieuse sur l'image.
 */
export function GuardTunnel({
  from,
  to,
  width = 0.9,
  height = 0.55,
}: {
  from: number
  to: number
  width?: number
  height?: number
}) {
  const length = to - from
  const cx = (from + to) / 2
  const baseY = 0.98
  return (
    <group>
      {/* Arêtes inox */}
      {[-width / 2, width / 2].map((z) => (
        <group key={z}>
          <BoxMesh s={[length, 0.035, 0.035]} p={[cx, baseY + height, z]} m={M.frame} />
          <BoxMesh s={[0.035, height, 0.035]} p={[from + 0.02, baseY + height / 2, z]} m={M.frame} />
          <BoxMesh s={[0.035, height, 0.035]} p={[to - 0.02, baseY + height / 2, z]} m={M.frame} />
        </group>
      ))}
      {/* Panneaux de verre : dessus, avant, arrière */}
      <mesh position={[cx, baseY + height, 0]} material={GLASS}>
        <boxGeometry args={[length, 0.015, width]} />
      </mesh>
      <mesh position={[cx, baseY + height / 2, width / 2]} material={GLASS}>
        <boxGeometry args={[length, height, 0.015]} />
      </mesh>
      <mesh position={[cx, baseY + height / 2, -width / 2]} material={GLASS}>
        <boxGeometry args={[length, height, 0.015]} />
      </mesh>
    </group>
  )
}

function drawWeightScreen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engine: TwinEngine,
) {
  const poids = engine.lastWeight
  const conforme = poids >= 230
  ctx.fillStyle = "#0a1120"
  ctx.fillRect(0, 0, w, h)

  // Bandeau d'état
  ctx.fillStyle = conforme ? "#123f24" : "#4a1212"
  ctx.fillRect(0, 0, w, h * 0.2)
  ctx.fillStyle = conforme ? "#2dee6e" : "#ff5050"
  ctx.font = `700 ${h * 0.12}px "Geist Variable", Arial`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(conforme ? "CONFORME" : "SOUS POIDS", w / 2, h * 0.1)

  // Poids en gros, flashé au passage d'une boîte
  const flash = 0.75 + engine.weighFlash * 0.25
  ctx.fillStyle = `rgba(120, 255, 170, ${flash})`
  ctx.font = `800 ${h * 0.34}px "Geist Mono Variable", monospace`
  ctx.fillText(`${poids.toFixed(1)} g`, w / 2, h * 0.5)

  // Ligne de consigne
  ctx.fillStyle = "#7f9dc9"
  ctx.font = `600 ${h * 0.1}px "Geist Variable", Arial`
  ctx.fillText("Consigne 237,5 g  ·  Min 230 g", w / 2, h * 0.78)

  const st = engine.stations.trieuse
  ctx.fillStyle = "#c9d8f2"
  ctx.fillText(`OK ${st.bonne}   NOK ${st.rebut}`, w / 2, h * 0.92)
}
