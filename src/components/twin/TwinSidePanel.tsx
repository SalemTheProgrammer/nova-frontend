import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatutMachine } from "@/lib/types"
import type { TwinLineProfile } from "./lineProfiles"
import type { StationId, TwinEngine } from "./simulation"

const STATUT_STYLE: Record<StatutMachine, string> = {
  MARCHE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PAUSE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ARRET: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PANNE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MAINTENANCE: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
}

export function TwinSidePanel({
  station,
  engine,
  profile,
  onClose,
}: {
  station: StationId
  engine: TwinEngine
  profile: TwinLineProfile
  onClose: () => void
}) {
  const current = engine.stations[station]
  const total = current.bonne + current.rebut
  const rejectRate = total > 0 ? ((current.rebut / total) * 100).toFixed(1) : "0.0"

  return (
    <div className="pointer-events-auto w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/60 bg-background/90 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">{profile.stationNames[station]}</h3>
          <p className="text-xs text-muted-foreground">
            {current.machineCode ? <>Machine MES : <span className="font-mono">{current.machineCode}</span></> : "Étape sans machine MES dédiée"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la fiche" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <span className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", STATUT_STYLE[current.statut])}>
        {current.statut}
      </span>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{profile.stationDescriptions[station]}</p>

      {station === "trieuse" && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-xs text-muted-foreground">Dernière mesure</span>
          <span className="font-mono text-sm font-semibold">{engine.lastWeight.toFixed(1)} g</span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric value={current.bonne} label="Bonnes" className="text-emerald-600" />
        <Metric value={current.rebut} label="Rejets" className="text-red-500" />
        <Metric value={`${rejectRate}%`} label="Taux rejet" />
      </div>

      <div className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2", engine.mesDriven ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-muted/60")}>
        <span className={cn("size-2 rounded-full", engine.mesDriven ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
        <span className="text-xs font-medium text-muted-foreground">
          {engine.mesDriven ? "Synchronisé au MES" : "Simulation locale de secours"}
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Demandez à Nova d'analyser la performance, le risque de panne ou l'impact d'une bascule de ligne.
      </p>
    </div>
  )
}

function Metric({ value, label, className }: { value: number | string; label: string; className?: string }) {
  return (
    <div className="rounded-lg bg-muted/70 p-2">
      <p className={cn("text-lg font-bold", className)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
