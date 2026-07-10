import { useState, type MutableRefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  useCursor,
} from "@react-three/drei"
import * as THREE from "three"
import { LINE, type StationId, type TwinEngine } from "./simulation"
import { Blistereuse } from "./machines/Blistereuse"
import { Checkweigher, GuardTunnel } from "./machines/Checkweigher"
import { Vignetteuse } from "./machines/Vignetteuse"
import { Conveyor } from "./machines/Conveyor"
import { RejectBin } from "./machines/RejectBin"
import { TrapGate, Pusher } from "./machines/RejectGates"
import { Products } from "./Products"
import { Callouts } from "./Callouts"

/** Destination de vol de caméra (préréglages / sélection machine). */
export interface CameraFlight {
  pos: THREE.Vector3
  target: THREE.Vector3
}

export type FlightRef = MutableRefObject<CameraFlight | null>

export const CAMERA_PRESETS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  ensemble: { pos: [-5.5, 5.4, 10.8], target: [0.3, 1.0, 0] },
  blistereuse: { pos: [-11.5, 3.4, 6.2], target: [-8.5, 1.4, 0] },
  trieuse: { pos: [-1.8, 3.2, 5.4], target: [0.2, 1.3, -0.3] },
  vignetteuse: { pos: [3.2, 3.4, 5.8], target: [5.2, 1.4, -0.2] },
  rejets: { pos: [1.6, 4.6, 8.8], target: [1.6, 0.6, 0.9] },
}

export function flightTo(preset: keyof typeof CAMERA_PRESETS): CameraFlight {
  const p = CAMERA_PRESETS[preset]
  return { pos: new THREE.Vector3(...p.pos), target: new THREE.Vector3(...p.target) }
}

/** Amène en douceur la caméra vers la destination demandée, puis rend la main. */
function CameraRig({ flightRef }: { flightRef: FlightRef }) {
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    update: () => void
  } | null

  useFrame(({ camera }, dt) => {
    const flight = flightRef.current
    if (!flight || !controls) return
    const k = 1 - Math.exp(-4.5 * dt)
    camera.position.lerp(flight.pos, k)
    controls.target.lerp(flight.target, k)
    controls.update()
    if (camera.position.distanceTo(flight.pos) < 0.04) flightRef.current = null
  })
  return null
}

/** Groupe cliquable : sélection de machine + curseur main au survol. */
function Selectable({
  station,
  onSelect,
  children,
}: {
  station: StationId
  onSelect: (s: StationId) => void
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onSelect(station)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  )
}

/**
 * Scène complète du jumeau : éclairage studio pharma, sol réfléchissant,
 * les trois machines, les convoyeurs, les trois postes de rejet et les
 * produits en circulation.
 */
export function TwinScene({
  engine,
  flightRef,
  labelsOn,
  onSelect,
}: {
  engine: TwinEngine
  flightRef: FlightRef
  labelsOn: boolean
  onSelect: (s: StationId) => void
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: CAMERA_PRESETS.ensemble.pos, fov: 42, near: 0.1, far: 120 }}
      onPointerDown={() => {
        // Toute manipulation manuelle interrompt le vol de caméra en cours.
        flightRef.current = null
      }}
    >
      <color attach="background" args={["#eceff3"]} />
      <fog attach="fog" args={["#eceff3", 34, 70]} />

      {/* Éclairage studio */}
      <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#c8cfd8" />
      <directionalLight
        position={[-9, 15, 10]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={15}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[10, 8, -6]} intensity={0.45} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.6} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 10, 1]} />
        <Lightformer intensity={1.1} position={[0, 4, 10]} scale={[22, 5, 1]} />
        <Lightformer intensity={0.7} position={[-12, 4, 0]} rotation-y={Math.PI / 2} scale={[12, 5, 1]} />
      </Environment>

      {/* Sol poli réfléchissant */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 40]} />
        <MeshReflectorMaterial
          blur={[280, 70]}
          resolution={512}
          mixBlur={0.9}
          mixStrength={2.0}
          roughness={0.8}
          depthScale={0.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#dfe3e8"
          metalness={0.25}
          mirror={0.35}
        />
      </mesh>

      {/* --- La ligne, de gauche à droite comme sur l'image --- */}
      <Selectable station="blistereuse" onSelect={onSelect}>
        <Blistereuse engine={engine} position={[-8.75, 0, 0]} />
      </Selectable>

      <Conveyor from={LINE.conv1.from} to={LINE.conv1.to} engine={engine} station="blistereuse" gapXs={[LINE.trapX]} />
      <TrapGate engine={engine} x={LINE.trapX} />
      <RejectBin position={[LINE.bins[0].x, 0, LINE.bins[0].z]} chuteFromY={0.9} />

      <Selectable station="trieuse" onSelect={onSelect}>
        <Checkweigher engine={engine} position={[0.2, 0, 0]} />
      </Selectable>
      <Conveyor from={LINE.weighBelt.from} to={LINE.weighBelt.to} engine={engine} station="trieuse" width={0.7} />
      <Conveyor from={LINE.conv2.from} to={LINE.conv2.to} engine={engine} station="trieuse" gapXs={[LINE.blastX]} />
      {/* Le tunnel démarre après la buse de soufflage : la boîte éjectée
          partait auparavant à travers la paroi acrylique. */}
      <GuardTunnel from={LINE.blastX + 0.45} to={LINE.conv2.to - 0.1} />
      <RejectBin position={[LINE.bins[1].x, 0, LINE.bins[1].z]} chuteFromY={0.9} />

      <Selectable station="vignetteuse" onSelect={onSelect}>
        <Vignetteuse engine={engine} position={[5.2, 0, 0]} />
      </Selectable>
      <Conveyor from={LINE.labelBelt.from} to={LINE.labelBelt.to} engine={engine} station="vignetteuse" />
      <Conveyor from={LINE.conv3.from} to={LINE.conv3.to} engine={engine} station="vignetteuse" gapXs={[LINE.pushX]} />
      <Pusher engine={engine} x={LINE.pushX} />
      <RejectBin position={[LINE.bins[2].x, 0, LINE.bins[2].z]} chuteFromY={0.9} />

      {/* Produits en circulation + rejets dans les bacs */}
      <Products engine={engine} />

      {/* Annotations façon image de référence */}
      <Callouts visible={labelsOn} />

      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={2.5}
        maxDistance={30}
        target={CAMERA_PRESETS.ensemble.target}
      />
      <CameraRig flightRef={flightRef} />
    </Canvas>
  )
}
