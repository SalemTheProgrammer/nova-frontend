import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatutMachine } from "@/lib/types"
import { STATION_NOMS, type StationId, type TwinEngine } from "./simulation"

const STATUT_STYLE: Record<StatutMachine, string> = {
  MARCHE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PAUSE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ARRET: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PANNE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MAINTENANCE: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
}

const DESCRIPTIONS: Record<StationId, string> = {
  blistereuse:
    "Formage, remplissage et scellage des plaquettes. Les blisters non conformes basculent par la trappe vers le bac REJET.",
  trieuse:
    "Contrôle pondéral dynamique de chaque boîte. Les boîtes sous le poids minimum sont éjectées par soufflage pneumatique.",
  vignetteuse:
    "Pose des étiquettes / vignettes. Les boîtes mal étiquetées sont éjectées par le poussoir pneumatique.",
}

/**
 * Fiche du poste sélectionné — LECTURE SEULE : état, compteurs, taux de défauts.
 * Le pilotage (marche/panne/réglages) passe désormais par l'assistant Nova, plus
 * par des boutons.
 */
export function TwinSidePanel({
  station,
  engine,
  onClose,
}: {
  station: StationId
  engine: TwinEngine
  onClose: () => void
}) {
  const st = engine.stations[station]
  const total = st.bonne + st.rebut
  const tauxRebut = total > 0 ? ((st.rebut / total) * 100).toFixed(1) : "0.0"

  return (
    <div className="pointer-events-auto w-72 rounded-2xl border border-border bg-background/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">{STATION_NOMS[station]}</h3>
          {st.machineCode ? (
            <p className="text-xs text-muted-foreground">
              Machine MES : <span className="font-mono">{st.machineCode}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Non liée au MES (simulation locale)</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <span
        className={cn(
          "mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
          STATUT_STYLE[st.statut],
        )}
      >
        {st.statut}
      </span>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{DESCRIPTIONS[station]}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40">
          <p className="text-lg font-bold text-emerald-600">{st.bonne}</p>
          <p className="text-[10px] text-muted-foreground">Bonnes</p>
        </div>
        <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
          <p className="text-lg font-bold text-red-500">{st.rebut}</p>
          <p className="text-[10px] text-muted-foreground">Rejets</p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-lg font-bold">{tauxRebut}%</p>
          <p className="text-[10px] text-muted-foreground">Taux rebut</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">Taux de défauts réglé</span>
        <span className="font-mono text-sm font-semibold">{Math.round(st.defectRate * 100)}%</span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Dites à Nova : « démarre {STATION_NOMS[station].toLowerCase()} », « déclenche une panne
        sur {STATION_NOMS[station].toLowerCase()} » ou « mets 20 % de défauts ».
      </p>
    </div>
  )
}
