import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type * as THREE from "three"
import { strike, type TwinEngine } from "../simulation"
import { M } from "../materials"
import { HmiPanel } from "./HmiPanel"
import { StackLight } from "./StackLight"
import { AXE_Z, BoxMesh, CylMesh, Feet } from "./prims"

/**
 * Vignetteuse — l'étiqueteuse de l'image : dérouleur de bobine d'étiquettes,
 * rouleaux de guidage, tête d'application à tampon au-dessus de la bande,
 * ré-enrouleur, pupitre HMI sur mât et colonne lumineuse. Le tampon descend
 * sur chaque boîte au moment de la pose de la vignette.
 */
export function Vignetteuse({
  engine,
  position,
}: {
  engine: TwinEngine
  position: [number, number, number]
}) {
  const tamp = useRef<THREE.Group>(null)
  const unwind = useRef<THREE.Mesh>(null)
  const rewind = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    // Tampon d'application : frappe la boîte à l'instant de la pose puis
    // remonte en douceur. Course 0.16 m : la semelle vient effleurer le
    // dessus de l'étui (y ≈ 1.16) au lieu de le transpercer.
    if (tamp.current) {
      tamp.current.position.y = 1.62 - strike(engine.tampPulse) * 0.16
    }
    if (engine.isRunning("vignetteuse")) {
      const w = dt * engine.speed
      if (unwind.current) unwind.current.rotation.y += w * 1.1
      if (rewind.current) rewind.current.rotation.y += w * 1.8
    }
  })

  return (
    <group position={position}>
      {/* Caisson sous bande */}
      <Feet dx={1.15} dz={0.42} h={0.12} m={M.steelDark} />
      <BoxMesh s={[2.5, 0.52, 0.95]} p={[0, 0.38, 0]} m={M.inox} />

      {/* Mât et platine porte-mécanisme (derrière la bande) */}
      <group position={[-0.2, 0, -0.62]}>
        <BoxMesh s={[0.14, 2.15, 0.2]} p={[0, 1.07, 0]} m={M.inoxSatin} />
        <BoxMesh s={[1.5, 1.15, 0.08]} p={[0.25, 1.95, 0.12]} m={M.inox} />

        {/* Dérouleur : disque + bobine d'étiquettes blanche */}
        <CylMesh radius={0.36} h={0.05} p={[-0.32, 2.18, 0.22]} r={AXE_Z} m={M.inoxSatin} seg={28} />
        <mesh ref={unwind} position={[-0.32, 2.18, 0.28]} rotation={AXE_Z} castShadow material={M.labelRoll}>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 24]} />
        </mesh>
        <CylMesh radius={0.045} h={0.16} p={[-0.32, 2.18, 0.26]} r={AXE_Z} m={M.steelDark} seg={12} />

        {/* Ré-enrouleur (petit disque) */}
        <CylMesh radius={0.2} h={0.05} p={[0.62, 2.28, 0.22]} r={AXE_Z} m={M.inoxSatin} seg={22} />
        <mesh ref={rewind} position={[0.62, 2.28, 0.27]} rotation={AXE_Z} castShadow material={M.plasticDark}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 18]} />
        </mesh>

        {/* Rouleaux de guidage du film d'étiquettes */}
        {[
          [-0.05, 1.95],
          [0.18, 2.05],
          [0.3, 1.78],
          [0.5, 1.95],
          [0.05, 1.62],
        ].map(([x, y]) => (
          <CylMesh key={`${x}${y}`} radius={0.035} h={0.14} p={[x, y, 0.24]} r={AXE_Z} m={M.frame} seg={14} />
        ))}

        {/* Bande d'étiquettes tendue entre dérouleur et tête */}
        <BoxMesh s={[0.55, 0.003, 0.1]} p={[-0.05, 2.06, 0.24]} r={[0, 0, -0.25]} m={M.labelRoll} noShadow />
      </group>

      {/* Tête d'application au-dessus de la bande */}
      <group position={[-0.15, 0, 0]}>
        <BoxMesh s={[0.1, 0.1, 0.75]} p={[0, 1.85, -0.25]} m={M.steelDark} />
        <CylMesh radius={0.05} h={0.42} p={[0, 1.85 - 0.06, 0.05]} m={M.inoxSatin} seg={16} />
        <group ref={tamp} position={[0, 1.62, 0.05]}>
          <CylMesh radius={0.035} h={0.3} p={[0, -0.1, 0]} m={M.steelDark} seg={12} />
          <BoxMesh s={[0.3, 0.05, 0.24]} p={[0, -0.28, 0]} m={M.plasticDark} />
        </group>
      </group>

      {/* Pupitre HMI sur mât (droite) */}
      <HmiPanel
        position={[1.62, 0, 0.55]}
        poleH={1.5}
        rotationY={-0.25}
        draw={(ctx, w, h) => drawVignetteuseHmi(ctx, w, h, engine)}
      />

      {/* Colonne lumineuse sur mât dédié */}
      <group position={[1.32, 0, -0.45]}>
        <CylMesh radius={0.022} h={1.75} p={[0, 0.875, 0]} m={M.steelDark} seg={10} />
        <StackLight position={[0, 1.75, 0]} engine={engine} station="vignetteuse" poleH={0.12} />
      </group>
    </group>
  )
}

function drawVignetteuseHmi(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engine: TwinEngine,
) {
  const st = engine.stations.vignetteuse
  ctx.fillStyle = "#0b1524"
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = "#123157"
  ctx.fillRect(0, 0, w, h * 0.22)
  ctx.fillStyle = "#dbe7ff"
  ctx.font = `700 ${h * 0.13}px "Geist Variable", Arial`
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  // Le code de la machine MES réellement liée : on voit que la 3D pilote M-xx.
  ctx.fillText(st.machineCode ? `VIGNETTEUSE · ${st.machineCode}` : "VIGNETTEUSE", w * 0.05, h * 0.12)

  const couleur =
    st.statut === "MARCHE" ? "#2dee6e"
    : st.statut === "PANNE" ? "#ff4040"
    : "#ffb020"
  ctx.fillStyle = couleur
  ctx.beginPath()
  ctx.arc(w * 0.88, h * 0.115, h * 0.055, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#8fb3e8"
  ctx.font = `600 ${h * 0.11}px "Geist Variable", Arial`
  ctx.fillText(st.statut, w * 0.05, h * 0.38)
  ctx.fillStyle = "#e8f0ff"
  ctx.font = `700 ${h * 0.13}px "Geist Mono Variable", monospace`
  ctx.fillText(`Étiquetées  ${st.bonne}`, w * 0.05, h * 0.6)
  ctx.fillStyle = "#ff9d9d"
  ctx.fillText(`Rejets  ${st.rebut}`, w * 0.05, h * 0.8)
}
