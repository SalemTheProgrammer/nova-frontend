import { AlertTriangle, CheckCircle2, PauseCircle, PowerOff, Wrench } from "lucide-react"
import type { Machine } from "@/lib/types"
import { Card, Disclosure } from "@/components/dashboard/primitives"
import { Gauge } from "@/components/dashboard/Gauge"

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

export function LiveDeviceState({ machine }: { machine: Machine | null }) {
  if (!machine) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Choisissez une machine ci-dessus pour voir son état.
      </Card>
    )
  }

  const info = STATUT_INFO[machine.statut]
  const Icon = info.icon

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
        <div
          className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-6 py-5 ${info.classes}`}
        >
          <Icon className="size-12" />
          <p className="text-xl font-semibold">{info.label}</p>
          <p className="text-sm opacity-80">{machine.nom}</p>
        </div>

        {machine.trs != null && <Gauge value={Number(machine.trs)} label="Performance" size={140} />}

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {machine.quantite_bonne}
            </p>
            <p className="text-xs text-muted-foreground">Unités bonnes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{machine.quantite_rejetee}</p>
            <p className="text-xs text-muted-foreground">Unités rejetées</p>
          </div>
        </div>
      </div>

      {machine.downtime_actif && (
        <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive">
          Arrêt en cours : {machine.downtime_actif.cause.replace(/_/g, " ").toLowerCase()}
          {machine.downtime_actif.operator_comment && ` — ${machine.downtime_actif.operator_comment}`}
        </div>
      )}

      <div className="mt-5">
        <Disclosure label="Voir les détails techniques">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">OF actif</p>
              <p className="font-mono text-xs">{machine.numero_of_actif ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cycle</p>
              <p>{machine.temps_cycle_actuel_s ?? machine.temps_cycle_cible_s ?? "—"} s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qualité (TQ)</p>
              <p>{machine.tq != null ? `${(Number(machine.tq) * 100).toFixed(0)}%` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponibilité (DO)</p>
              <p>{machine.do != null ? `${(Number(machine.do) * 100).toFixed(0)}%` : "—"}</p>
            </div>
          </div>
        </Disclosure>
      </div>
    </Card>
  )
}
