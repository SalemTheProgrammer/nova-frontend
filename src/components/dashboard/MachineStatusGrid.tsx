import { AlertTriangle, CheckCircle2, PauseCircle, PowerOff, Wrench } from "lucide-react"
import type { Machine } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

const STATUT_INFO: Record<
  Machine["statut"],
  { label: string; icon: typeof CheckCircle2; classes: string }
> = {
  MARCHE: {
    label: "En marche",
    icon: CheckCircle2,
    classes: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  ARRET: {
    label: "À l'arrêt",
    icon: PowerOff,
    classes: "border-border bg-muted/40 text-muted-foreground",
  },
  PAUSE: {
    label: "En pause",
    icon: PauseCircle,
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  PANNE: {
    label: "En panne",
    icon: AlertTriangle,
    classes: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  MAINTENANCE: {
    label: "Maintenance",
    icon: Wrench,
    classes: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
}

export function MachineStatusGrid({ machines }: { machines: Machine[] }) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Machines</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {machines.filter((m) => m.statut === "MARCHE").length}/{machines.length} en marche
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {machines.length === 0 ? (
          <EmptyState message="Aucune machine configurée." />
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {machines.map((m) => {
              const info = STATUT_INFO[m.statut]
              const Icon = info.icon
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${info.classes}`}
                >
                  <Icon className="size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{m.nom}</p>
                    <p className="text-xs opacity-80">
                      {info.label}
                      {m.numero_of_actif ? ` · ${m.numero_of_actif}` : ""}
                    </p>
                  </div>
                  {m.trs != null && (
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">
                      {Math.round(Number(m.trs) * 100)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
