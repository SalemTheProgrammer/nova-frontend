import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Cpu } from "lucide-react"
import type { Machine } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const STATUS: Record<
  string,
  { label: string; bg: string; text: string; dot: string; border: string; priority: number }
> = {
  PANNE: {
    label: "En panne",
    bg: "bg-red-500/10 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500 animate-ping",
    border: "border-red-500/30",
    priority: 0,
  },
  MAINTENANCE: {
    label: "Maintenance",
    bg: "bg-blue-500/10 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-500/30",
    priority: 1,
  },
  MARCHE: {
    label: "En marche",
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500 animate-pulse",
    border: "border-emerald-500/30",
    priority: 2,
  },
  PAUSE: {
    label: "En pause",
    bg: "bg-amber-500/10 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-500/30",
    priority: 3,
  },
  ARRET: {
    label: "À l'arrêt",
    bg: "bg-muted/40",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    border: "border-border/60",
    priority: 4,
  },
}

const PAGE_SIZE = 4

/** Vue moderne du parc machine en temps réel */
export function ActiveMachinesRow({ machines }: { machines: Machine[] }) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [machines])

  const visibleMachines = [...machines].sort(
    (a, b) => (STATUS[a.statut]?.priority ?? 9) - (STATUS[b.statut]?.priority ?? 9),
  )
  const pageCount = Math.max(1, Math.ceil(visibleMachines.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pagedMachines = visibleMachines.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  const enMarcheCount = machines.filter((m) => m.statut === "MARCHE").length
  const alerteCount = machines.filter((m) => m.statut === "PANNE").length

  return (
    <Card className="flex h-full min-h-0 flex-col p-3.5 shadow-sm border border-border/80 bg-card/80 backdrop-blur-md rounded-2xl justify-between">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 pb-1.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400">
            <Cpu className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Postes & Machines en Direct</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {enMarcheCount}/{machines.length} ACTIVES
              </span>
              {alerteCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                  {alerteCount} EN PANNE
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Télémétrie capteurs et cadences unitaires
            </p>
          </div>
        </div>

        {/* Contrôles de pagination */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            aria-label="Page précédente"
            className="inline-flex size-6 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-3" />
          </button>
          <span className="min-w-7 text-center text-[10px] font-mono text-muted-foreground">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Page suivante"
            className="inline-flex size-6 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Grille de cartes machines */}
      <div className="grid min-h-0 flex-1 grid-cols-2 md:grid-cols-4 gap-2">
        {pagedMachines.map((m) => {
          const st = STATUS[m.statut] ?? STATUS.ARRET
          const machineTrs = m.trs != null ? Math.round(Number(m.trs) * 100) : null
          const cycleTime = m.temps_cycle_actuel_s ? `${Number(m.temps_cycle_actuel_s).toFixed(1)}s` : "—"

          return (
            <div
              key={m.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all",
                "bg-muted/20 hover:bg-muted/40 hover:border-violet-500/30 shadow-xs",
                st.border,
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-mono text-xs font-extrabold text-foreground tracking-tight">
                    {m.code}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                      st.bg,
                      st.text,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", st.dot)} />
                    {st.label}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground truncate" title={m.nom}>
                  {m.nom}
                </p>
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Cycle : {cycleTime}</span>
                  <span className="font-mono font-bold text-foreground">
                    {machineTrs !== null ? `TRS ${machineTrs}%` : "—"}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      (machineTrs ?? 0) >= 74 ? "bg-emerald-500" : (machineTrs ?? 0) > 0 ? "bg-amber-500" : "bg-muted-foreground/30",
                    )}
                    style={{ width: `${Math.min(100, machineTrs ?? 0)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
