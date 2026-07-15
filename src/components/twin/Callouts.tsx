import { Html } from "@react-three/drei"
import type { TwinLineProfile } from "./lineProfiles"
import type { StationId, TwinEngine } from "./simulation"

const STATION_POSITIONS: Record<StationId, [number, number, number]> = {
  blistereuse: [-8.7, 3.35, 0],
  trieuse: [-0.05, 3.15, -0.85],
  vignetteuse: [5.1, 3.15, -0.6],
}

const REJECTS: Array<{ station: StationId; position: [number, number, number] }> = [
  { station: "blistereuse", position: [-4.55, 1.35, 1.05] },
  { station: "trieuse", position: [2.05, 1.35, 1.15] },
  { station: "vignetteuse", position: [7.6, 1.35, 1.2] },
]

export function Callouts({
  visible,
  engine,
  profile,
}: {
  visible: boolean
  engine: TwinEngine
  profile: TwinLineProfile
}) {
  if (!visible) return null
  return (
    <group>
      {Object.entries(STATION_POSITIONS).map(([key, position]) => {
        const station = key as StationId
        return (
          <Callout
            key={station}
            position={position}
            title={profile.stationNames[station]}
            lines={profile.stationLines[station]}
            code={engine.stations[station].machineCode}
            accent={profile.accent}
          />
        )
      })}
      {REJECTS.map(({ station, position }) => (
        <Callout
          key={`reject-${station}`}
          position={position}
          title={`Rejet · ${profile.stationNames[station]}`}
          lines={["Éjection automatique des unités non conformes"]}
          accent={profile.accent}
          small
        />
      ))}
    </group>
  )
}

function Callout({
  position,
  title,
  lines,
  code,
  accent,
  small = false,
}: {
  position: [number, number, number]
  title: string
  lines: string[]
  code?: string | null
  accent: string
  small?: boolean
}) {
  return (
    <Html position={position} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div className="flex w-max max-w-72 flex-col items-center">
        <div className="rounded-lg border border-white/70 bg-white/92 px-3 py-2 shadow-lg backdrop-blur-sm">
          <span
            className={small
              ? "inline-block rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
              : "inline-block rounded-md px-2.5 py-1 text-sm font-bold text-white"}
            style={{ backgroundColor: accent }}
          >
            {title}
            {code ? <span className="ml-1.5 rounded bg-white/20 px-1 font-mono">{code}</span> : null}
          </span>
          {lines.map((line) => (
            <p key={line} className={small ? "mt-1 text-[10px] leading-tight text-slate-600" : "mt-1 text-xs leading-tight text-slate-700"}>
              {line}
            </p>
          ))}
        </div>
        <div className="h-6 w-px opacity-70" style={{ backgroundColor: accent }} />
        <div className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </Html>
  )
}
