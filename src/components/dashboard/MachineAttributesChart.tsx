import { useState } from "react"
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Données télémétriques réalistes pour le sismographe / oscillographe industriel
function generateAttributeTelemetry() {
  const points = []
  const baseTemp = 42
  const baseVib = 2.1
  const count = 48

  for (let i = 0; i < count; i++) {
    const timeLabel = `${String(Math.floor(i / 2) + 8).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`
    
    // Série Cyan : Température de surface avec oscillations et chutes de repos
    let tempNoise = Math.sin(i * 0.4) * 7 + Math.cos(i * 0.9) * 4
    if (i > 18 && i < 24) tempNoise -= 14
    if (i > 34 && i < 38) tempNoise -= 16
    const skinTemp = Math.max(18, Math.round((baseTemp + tempNoise) * 10) / 10)

    // Série Dorée : Vibrations (mm/s) avec variations crénelées
    let vibNoise = Math.sin(i * 0.7) * 0.8 + ((i * 13) % 7) * 0.15
    if (i % 6 === 0) vibNoise += 1.1
    if (i > 18 && i < 24) vibNoise = 0.3
    if (i > 34 && i < 38) vibNoise = 0.2
    const vibration = Math.max(0.2, Math.round((baseVib + vibNoise) * 100) / 100)

    points.push({
      time: timeLabel,
      temp: skinTemp,
      vibration: vibration,
    })
  }
  return points
}

const TELEMETRY_DATA = generateAttributeTelemetry()

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 font-mono text-xs">
      <div className="font-semibold text-slate-400 text-[10px] mb-1 uppercase">
        Horodatage : {label}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
          <span className="size-1.5 rounded-full bg-sky-500" />
          <span>T° Surface : {payload[0]?.value}°C</span>
        </div>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
          <span className="size-1.5 rounded-full bg-amber-500" />
          <span>Vibrations : {payload[1]?.value} mm/s</span>
        </div>
      </div>
    </div>
  )
}

export function MachineAttributesChart({ className }: { className?: string }) {
  const [filter, setFilter] = useState("Vibrations Globales")
  const [showTemp, setShowTemp] = useState(true)
  const [showVib, setShowVib] = useState(true)

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0 flex-col rounded-xl border border-slate-200/85 bg-white p-2.5 sm:p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:border-zinc-800 dark:bg-zinc-900/90",
        className,
      )}
    >
      {/* En-tête : Titre, Légendes interactives et Filtre */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 shrink-0 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase font-mono dark:text-zinc-400">
            ATTRIBUTS MACHINE
          </span>

          {/* Boutons de bascule de série */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShowTemp((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 transition-opacity cursor-pointer text-[11px]",
                showTemp ? "opacity-100" : "opacity-35 line-through",
              )}
            >
              <span className="h-0.5 w-3.5 rounded-full bg-sky-500" />
              <span className="text-slate-700 dark:text-zinc-300">Température Surface</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVib((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 transition-opacity cursor-pointer text-[11px]",
                showVib ? "opacity-100" : "opacity-35 line-through",
              )}
            >
              <span className="h-0.5 w-3.5 rounded-full bg-amber-500" />
              <span className="text-slate-700 dark:text-zinc-300">Vibrations Globales (mm/s)</span>
            </button>
          </div>
        </div>

        {/* Sélecteur de filtre de vibration */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setFilter((curr) =>
                curr === "Vibrations Globales" ? "Vibrations Crête" : "Vibrations Globales",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <span>{filter}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Zone du graphe oscilloscopique responsive 100vh */}
      <div className="flex-1 min-h-0 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={TELEMETRY_DATA}
            margin={{ top: 8, right: 8, left: -30, bottom: 0 }}
          >
            <defs>
              <linearGradient id="skinTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
                <stop offset="90%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              interval={7}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              domain={[0, 60]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              domain={[0, 5]}
              hide
            />

            <Tooltip content={<CustomChartTooltip />} />

            {/* Courbe de température Cyan avec remplissage gradient */}
            {showTemp && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temp"
                stroke="#0ea5e9"
                strokeWidth={1.8}
                fill="url(#skinTempGrad)"
                dot={false}
                activeDot={{ r: 3.5, stroke: "#0ea5e9", strokeWidth: 2, fill: "#fff" }}
              />
            )}

            {/* Courbe crénelée de vibrations en Or / Jaune */}
            {showVib && (
              <Line
                yAxisId="right"
                type="stepAfter"
                dataKey="vibration"
                stroke="#eab308"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3.5, stroke: "#eab308", strokeWidth: 2, fill: "#fff" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
