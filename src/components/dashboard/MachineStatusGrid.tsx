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
    <Card className="p-5">
      <h3 className="mb-4 text-base font-semibold">Machines</h3>
      {machines.length === 0 ? (
        <EmptyState message="Aucune machine configurée." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {machines.map((m) => {
            const info = STATUT_INFO[m.statut]
            const Icon = info.icon
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${info.classes}`}
              >
                <Icon className="size-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{m.nom}</p>
                  <p className="text-sm opacity-80">{info.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
