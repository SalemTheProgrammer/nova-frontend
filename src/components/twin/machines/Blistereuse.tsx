import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { TwinEngine } from "../simulation"
import { GLASS, M, textTexture } from "../materials"
import { HmiPanel } from "./HmiPanel"
import { StackLight } from "./StackLight"
import { AXE_Z, BoxMesh, CylMesh, Feet } from "./prims"

/**
 * Blistéreuse « PHARMA TECH » — le grand carter inox à portes vitrées de l'image :
 * formage, remplissage, scellage visibles derrière le verre, dérouleur de film
 * aluminium à gauche, capot supérieur avec marquage, pupitre HMI et colonne
 * lumineuse. Les presses montent et descendent tant que la machine est en MARCHE,
 * les bobines tournent au rythme de la ligne.
 */
export function Blistereuse({
  engine,
  position,
}: {
  engine: TwinEngine
  position: [number, number, number]
}) {
  const brandMat = useMemo(() => {
    const tex = textTexture("PHARMA TECH", { w: 1024, h: 128, size: 68, color: "#274a92", weight: "800" })
    return new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, metalness: 0.1 })
  }, [])

  const presses = useRef<Array<THREE.Group | null>>([])
  const bigRoll = useRef<THREE.Mesh>(null)
  const smallRoll = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    // Presses de formage/remplissage/scellage : mouvement alterné en MARCHE.
    // `pressPhase` avance de 2π par cycle machine — une course par blister produit.
    for (let i = 0; i < 3; i++) {
      const g = presses.current[i]
      if (g) g.position.y = 1.62 - Math.max(0, Math.sin(engine.pressPhase + i * 1.4)) * 0.14
    }
    if (engine.isRunning("blistereuse")) {
      const w = dt * engine.speed
      if (bigRoll.current) bigRoll.current.rotation.y += w * 0.7
      if (smallRoll.current) smallRoll.current.rotation.y += w * 1.4
    }
  })

  // Encombrement local : carter de x -2.55 à +2.55, sortie produits à +2.55.
  return (
    <group position={position}>
      {/* Pieds + socle */}
      <Feet dx={2.3} dz={0.62} h={0.14} m={M.steelDark} />
      <BoxMesh s={[5.1, 0.5, 1.5]} p={[0, 0.39, 0]} m={M.inoxDoor} />
      {/* Portes inférieures + poignées */}
      <BoxMesh s={[2.35, 0.42, 0.03]} p={[-1.22, 0.39, 0.755]} m={M.inoxDoor} />
      <BoxMesh s={[2.35, 0.42, 0.03]} p={[1.22, 0.39, 0.755]} m={M.inoxDoor} />
      <BoxMesh s={[0.03, 0.16, 0.03]} p={[-0.12, 0.39, 0.785]} m={M.steelDark} />
      <BoxMesh s={[0.03, 0.16, 0.03]} p={[0.12, 0.39, 0.785]} m={M.steelDark} />

      {/* Plan de travail */}
      <BoxMesh s={[5.15, 0.1, 1.58]} p={[0, 0.69, 0]} m={M.inox} />

      {/* Corps supérieur : montants + fond + côtés */}
      <BoxMesh s={[5.1, 1.55, 0.06]} p={[0, 1.52, -0.72]} m={M.inox} />
      <BoxMesh s={[0.08, 1.55, 1.5]} p={[-2.51, 1.52, 0]} m={M.inox} />
      <BoxMesh s={[0.08, 1.55, 1.5]} p={[2.51, 1.52, 0]} m={M.inox} />
      {[-2.45, -0.02, 2.45].map((x) => (
        <BoxMesh key={x} s={[0.07, 1.55, 0.07]} p={[x, 1.52, 0.72]} m={M.frame} />
      ))}
      {/* Traverses haut/bas de la façade vitrée */}
      <BoxMesh s={[5.0, 0.07, 0.07]} p={[0, 0.78, 0.72]} m={M.frame} />
      <BoxMesh s={[5.0, 0.07, 0.07]} p={[0, 2.26, 0.72]} m={M.frame} />

      {/* Portes vitrées (2 vantaux) + poignées verticales */}
      <mesh position={[-1.24, 1.52, 0.72]} material={GLASS}>
        <boxGeometry args={[2.36, 1.4, 0.02]} />
      </mesh>
      <mesh position={[1.24, 1.52, 0.72]} material={GLASS}>
        <boxGeometry args={[2.36, 1.4, 0.02]} />
      </mesh>
      <CylMesh radius={0.014} h={0.5} p={[-0.18, 1.5, 0.78]} m={M.steelDark} seg={10} />
      <CylMesh radius={0.014} h={0.5} p={[0.18, 1.5, 0.78]} m={M.steelDark} seg={10} />
      {/* Vitres latérales */}
      <mesh position={[-2.51, 1.52, 0.38]} material={GLASS}>
        <boxGeometry args={[0.02, 1.3, 0.6]} />
      </mesh>
      <mesh position={[2.51, 1.52, 0.38]} material={GLASS}>
        <boxGeometry args={[0.02, 1.3, 0.6]} />
      </mesh>

      {/* Capot supérieur + marquage PHARMA TECH */}
      <BoxMesh s={[5.3, 0.44, 1.66]} p={[0, 2.52, 0]} m={M.alu} />
      <BoxMesh s={[5.3, 0.05, 1.7]} p={[0, 2.32, 0]} m={M.frame} />
      <mesh position={[-1.55, 2.52, 0.842]} material={brandMat}>
        <planeGeometry args={[1.7, 0.21]} />
      </mesh>
      {/* Logo rond côté droit du capot */}
      <CylMesh radius={0.09} h={0.012} p={[2.05, 2.52, 0.84]} r={[Math.PI / 2, 0, 0]} m={M.frame} seg={20} />

      {/* Intérieur : lit machine + 3 postes de presse (formage, remplissage, scellage) */}
      <BoxMesh s={[4.7, 0.08, 0.7]} p={[0, 1.06, 0]} m={M.inoxSatin} />
      {[-1.5, -0.1, 1.3].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Colonnes de guidage */}
          {[-0.22, 0.22].map((ox) =>
            [-0.2, 0.2].map((oz) => (
              <CylMesh key={`${ox}${oz}`} radius={0.024} h={0.95} p={[ox, 1.58, oz]} m={M.frame} seg={12} />
            )),
          )}
          {/* Traverse fixe haute */}
          <BoxMesh s={[0.6, 0.14, 0.55]} p={[0, 2.12, 0]} m={M.inoxSatin} />
          {/* Coulisseau animé (presse) */}
          <group ref={(g) => { presses.current[i] = g }} position={[0, 1.62, 0]}>
            <BoxMesh s={[0.52, 0.16, 0.48]} p={[0, 0, 0]} m={M.steelDark} />
            <BoxMesh s={[0.44, 0.1, 0.4]} p={[0, -0.13, 0]} m={M.frame} />
          </group>
          {/* Matrice inférieure */}
          <BoxMesh s={[0.5, 0.1, 0.46]} p={[0, 1.15, 0]} m={M.steelDark} />
        </group>
      ))}
      {/* Lueur bleue intérieure comme sur l'image */}
      <pointLight position={[0, 1.7, 0.2]} color="#3f86ff" intensity={2.2} distance={3.4} decay={2} />
      <BoxMesh s={[4.6, 0.02, 0.03]} p={[0, 1.11, 0.4]} m={M.blueLed} noShadow />

      {/* Dérouleur de film aluminium (gauche) */}
      <group position={[-2.86, 0, 0]}>
        <BoxMesh s={[0.1, 1.9, 0.16]} p={[0, 1.1, -0.25]} m={M.inoxSatin} />
        <BoxMesh s={[0.34, 0.08, 0.16]} p={[-0.1, 1.98, -0.25]} m={M.steelDark} />
        {/* Grande bobine de film */}
        <mesh ref={bigRoll} position={[-0.24, 1.98, -0.25]} rotation={AXE_Z} castShadow receiveShadow material={M.foil}>
          <cylinderGeometry args={[0.42, 0.42, 0.42, 28]} />
        </mesh>
        <CylMesh radius={0.05} h={0.56} p={[-0.24, 1.98, -0.25]} r={AXE_Z} m={M.steelDark} seg={12} />
        {/* Bobine basse (film imprimé) */}
        <mesh ref={smallRoll} position={[-0.18, 1.05, -0.25]} rotation={AXE_Z} castShadow receiveShadow material={M.foil}>
          <cylinderGeometry args={[0.26, 0.26, 0.34, 24]} />
        </mesh>
        {/* Rouleaux danseurs */}
        <CylMesh radius={0.045} h={0.4} p={[0.14, 1.62, -0.25]} r={AXE_Z} m={M.steelDark} seg={14} />
        <CylMesh radius={0.045} h={0.4} p={[0.1, 1.32, -0.25]} r={AXE_Z} m={M.steelDark} seg={14} />
        {/* Nappe de film tendue vers la machine */}
        <BoxMesh s={[0.5, 0.004, 0.38]} p={[0.05, 1.82, -0.25]} r={[0, 0, -0.5]} m={M.foil} noShadow />
        <BoxMesh s={[0.32, 0.004, 0.38]} p={[0.32, 1.6, -0.25]} r={[0, 0, -0.18]} m={M.foil} noShadow />
      </group>

      {/* Pupitre HMI (avant gauche) */}
      <HmiPanel
        position={[-2.15, 0.74, 0.95]}
        poleH={0.72}
        rotationY={0.12}
        draw={(ctx, w, h) => drawBlisterHmi(ctx, w, h, engine)}
      />

      {/* Colonne lumineuse (haut gauche) */}
      <StackLight position={[-2.3, 2.74, 0.55]} engine={engine} station="blistereuse" />
    </group>
  )
}

function drawBlisterHmi(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  engine: TwinEngine,
) {
  const st = engine.stations.blistereuse
  ctx.fillStyle = "#0b1524"
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = "#123157"
  ctx.fillRect(0, 0, w, h * 0.22)
  ctx.fillStyle = "#dbe7ff"
  ctx.font = `700 ${h * 0.14}px "Geist Variable", Arial`
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  // Le code de la machine MES réellement liée : on voit que la 3D pilote M-xx.
  ctx.fillText(st.machineCode ? `BLISTÉREUSE · ${st.machineCode}` : "BLISTÉREUSE", w * 0.05, h * 0.12)

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
  ctx.fillText(`Bonnes  ${st.bonne}`, w * 0.05, h * 0.6)
  ctx.fillStyle = "#ff9d9d"
  ctx.fillText(`Rejets  ${st.rebut}`, w * 0.05, h * 0.8)
}
