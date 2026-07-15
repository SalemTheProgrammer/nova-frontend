import { useEffect, useState, type MutableRefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Html, OrbitControls, useCursor } from "@react-three/drei"
import * as THREE from "three"
import type { ProductVisual, TwinLineProfile } from "./lineProfiles"
import type { TwinCameraState } from "./twinSession"
import { LINE, ROW_DEPTH, type StationId, type TwinEngine } from "./simulation"
import { Blistereuse } from "./machines/Blistereuse"
import { Checkweigher, GuardTunnel } from "./machines/Checkweigher"
import { Vignetteuse } from "./machines/Vignetteuse"
import { Conveyor } from "./machines/Conveyor"
import { RejectBin } from "./machines/RejectBin"
import { TrapGate, Pusher } from "./machines/RejectGates"
import { Products } from "./Products"
import { Callouts } from "./Callouts"
import { Factory } from "./Factory"
import { Worker } from "./Worker"

export interface CameraFlight {
  pos: THREE.Vector3
  target: THREE.Vector3
}

export type FlightRef = MutableRefObject<CameraFlight | null>

/** Une ligne de production affichée dans la vue d'ensemble de l'usine. */
export interface TwinLineScene {
  id: number
  label: string
  engine: TwinEngine
  profile: TwinLineProfile
  productVisual: ProductVisual
}

export { ROW_DEPTH }

const SCENE_BACKGROUND = "#e7edf4"

/** Préréglages caméra relatifs à l'origine locale d'UNE ligne (z=0 = la ligne elle-même). */
export const CAMERA_PRESETS: Record<StationId | "rejets", { pos: [number, number, number]; target: [number, number, number] }> = {
  blistereuse: { pos: [-11.5, 3.4, 6.2], target: [-8.5, 1.4, 0] },
  trieuse: { pos: [-1.8, 3.2, 5.4], target: [0.2, 1.3, -0.3] },
  vignetteuse: { pos: [3.2, 3.4, 5.8], target: [5.2, 1.4, -0.2] },
  rejets: { pos: [1.6, 4.6, 8.8], target: [1.6, 0.6, 0.9] },
}

/** Vol caméra vers un poste d'une ligne précise (rowZ = décalage de la ligne dans la vue d'ensemble). */
export function flightTo(preset: keyof typeof CAMERA_PRESETS, rowZ = 0): CameraFlight {
  const value = CAMERA_PRESETS[preset]
  return {
    pos: new THREE.Vector3(value.pos[0], value.pos[1], value.pos[2] + rowZ),
    target: new THREE.Vector3(value.target[0], value.target[1], value.target[2] + rowZ),
  }
}

/** Vol caméra « ensemble » sur une seule ligne (reprend le cadrage historique, décalé sur sa rangée). */
export function rowFlight(rowZ: number): CameraFlight {
  return {
    pos: new THREE.Vector3(-5.5, 5.4, rowZ + 10.8),
    target: new THREE.Vector3(0.3, 1, rowZ),
  }
}

/** Vol caméra « ensemble » sur l'usine entière : recule et s'élève avec le nombre de lignes. */
export function ensembleFlight(lineCount: number): CameraFlight {
  const depth = Math.max(0, lineCount - 1) * ROW_DEPTH
  const centerZ = depth / 2
  return {
    pos: new THREE.Vector3(-4.5, 12 + depth * 0.58, centerZ + 23),
    target: new THREE.Vector3(-0.2, 0.9, centerZ),
  }
}

const BASE_VFOV_DEG = 42
const BASE_ASPECT = 16 / 9
const FRAME_INTERVAL_MS = 1000 / 30

/**
 * Le jumeau n'a pas besoin de saturer l'écran à 60/120 FPS. Un cadencement à
 * 30 FPS garde les convoyeurs fluides et laisse le Canvas dormir à l'arrêt.
 */
function FrameScheduler({ lines, flightRef }: { lines: TwinLineScene[]; flightRef: FlightRef }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    let animationFrame = 0
    let lastFrameAt = 0
    const versions = new Map(lines.map((line) => [line.id, line.engine.version]))

    const schedule = (now: number) => {
      let versionChanged = false
      for (const line of lines) {
        if (versions.get(line.id) !== line.engine.version) {
          versions.set(line.id, line.engine.version)
          versionChanged = true
        }
      }
      const moving = flightRef.current != null || lines.some((line) => line.engine.needsAnimation())
      if (versionChanged || (moving && now - lastFrameAt >= FRAME_INTERVAL_MS)) {
        lastFrameAt = now
        invalidate()
      }
      animationFrame = window.requestAnimationFrame(schedule)
    }

    animationFrame = window.requestAnimationFrame(schedule)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [flightRef, invalidate, lines])

  return null
}

function ResponsiveFov() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)

  useEffect(() => {
    const aspect = Math.max(0.25, size.width / Math.max(size.height, 1))
    const baseVFov = (BASE_VFOV_DEG * Math.PI) / 180
    const horizontalFov = 2 * Math.atan(Math.tan(baseVFov / 2) * BASE_ASPECT)
    const neededVFov = (2 * Math.atan(Math.tan(horizontalFov / 2) / aspect) * 180) / Math.PI
    camera.fov = Math.max(BASE_VFOV_DEG, Math.min(neededVFov, 96))
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

type ControlsApi = {
  target: THREE.Vector3
  update: () => void
  addEventListener: (event: "end", callback: () => void) => void
  removeEventListener: (event: "end", callback: () => void) => void
}

function CameraMemory({ value, onChange }: { value: TwinCameraState | null; onChange: (next: TwinCameraState) => void }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as unknown as ControlsApi | null

  useEffect(() => {
    if (!controls) return
    if (value) {
      camera.position.fromArray(value.position)
      controls.target.fromArray(value.target)
      controls.update()
    }
    const save = () => onChange({
      position: camera.position.toArray() as TwinCameraState["position"],
      target: controls.target.toArray() as TwinCameraState["target"],
    })
    controls.addEventListener("end", save)
    return () => {
      save()
      controls.removeEventListener("end", save)
    }
  }, [camera, controls, onChange, value])
  return null
}

function CameraRig({ flightRef }: { flightRef: FlightRef }) {
  const controls = useThree((state) => state.controls) as unknown as ControlsApi | null
  useFrame(({ camera }, dt) => {
    const flight = flightRef.current
    if (!flight || !controls) return
    const interpolation = 1 - Math.exp(-4.5 * dt)
    camera.position.lerp(flight.pos, interpolation)
    controls.target.lerp(flight.target, interpolation)
    controls.update()
    if (camera.position.distanceTo(flight.pos) < 0.04) flightRef.current = null
  })
  return null
}

function Selectable({ station, onSelect, children }: { station: StationId; onSelect: (station: StationId) => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  return (
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(station) }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {children}
    </group>
  )
}

/** Étiquette flottante avec le nom de la ligne — toujours visible, indépendamment des annotations. */
function LineLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <Html position={[-13.6, 3.9, 0]} center distanceFactor={11} zIndexRange={[35, 0]} style={{ pointerEvents: "none" }}>
      <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white/92 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
    </Html>
  )
}

/** Une rangée = une ligne de production complète, positionnée sur son offset Z. */
function ProductionLineRow({
  line,
  labelsOn,
  onSelect,
}: {
  line: TwinLineScene
  labelsOn: boolean
  onSelect: (station: StationId) => void
}) {
  const { engine, profile, productVisual } = line
  return (
    <>
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
      <GuardTunnel from={LINE.blastX + 0.45} to={LINE.conv2.to - 0.1} />
      <RejectBin position={[LINE.bins[1].x, 0, LINE.bins[1].z]} chuteFromY={0.9} />

      <Selectable station="vignetteuse" onSelect={onSelect}>
        <Vignetteuse engine={engine} position={[5.2, 0, 0]} />
      </Selectable>
      <Conveyor from={LINE.labelBelt.from} to={LINE.labelBelt.to} engine={engine} station="vignetteuse" />
      <Conveyor from={LINE.conv3.from} to={LINE.conv3.to} engine={engine} station="vignetteuse" gapXs={[LINE.pushX]} />
      <Pusher engine={engine} x={LINE.pushX} />
      <RejectBin position={[LINE.bins[2].x, 0, LINE.bins[2].z]} chuteFromY={0.9} />

      <Products engine={engine} visual={productVisual} />
      <Worker engine={engine} />
      <Callouts visible={labelsOn} engine={engine} profile={profile} />
      <LineLabel label={line.label} accent={profile.accent} />
    </>
  )
}

export function TwinScene({
  lines,
  flightRef,
  labelsOn,
  cameraState,
  onCameraState,
  onSelect,
}: {
  lines: TwinLineScene[]
  flightRef: FlightRef
  labelsOn: boolean
  cameraState: TwinCameraState | null
  onCameraState: (next: TwinCameraState) => void
  onSelect: (lineId: number, station: StationId) => void
}) {
  const initial = ensembleFlight(lines.length)
  const depth = Math.max(0, lines.length - 1) * ROW_DEPTH

  return (
    <Canvas
      className="h-full w-full"
      frameloop="demand"
      shadows
      dpr={[1, 1.5]}
      performance={{ min: 0.6 }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: initial.pos.toArray(), fov: BASE_VFOV_DEG, near: 0.1, far: 180 }}
      onPointerDown={() => { flightRef.current = null }}
    >
      <ResponsiveFov />
      <FrameScheduler lines={lines} flightRef={flightRef} />
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <fog attach="fog" args={[SCENE_BACKGROUND, 62, 150]} />

      <hemisphereLight intensity={1.15} color="#ffffff" groundColor="#93a4b8" />
      <directionalLight
        position={[-9, 16, 10 + depth / 2]}
        intensity={2.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={12 + depth / 2}
        shadow-camera-bottom={-(10 + depth / 2)}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[12, 10, -8]} color="#b9d5ff" intensity={0.55} />
      <directionalLight position={[-4, 6, 18 + depth]} color="#fff2de" intensity={0.35} />

      <Factory lineCount={lines.length} />

      <ContactShadows
        position={[0, 0.075, depth / 2]}
        opacity={0.24}
        scale={48 + depth}
        blur={2.8}
        far={7}
        resolution={512}
        frames={1}
      />

      {lines.map((line, index) => (
        <group key={line.id} position={[0, 0, index * ROW_DEPTH]}>
          <ProductionLineRow
            line={line}
            labelsOn={labelsOn}
            onSelect={(station) => onSelect(line.id, station)}
          />
        </group>
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2 - 0.04}
        minDistance={2.5}
        maxDistance={70}
        target={initial.target}
      />
      <CameraMemory value={cameraState} onChange={onCameraState} />
      <CameraRig flightRef={flightRef} />
    </Canvas>
  )
}
