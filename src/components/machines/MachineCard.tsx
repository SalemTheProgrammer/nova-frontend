import { AlertTriangle, CheckCircle2, PauseCircle, PowerOff, Wrench } from "lucide-react"
import type { Machine } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"
import { Gauge } from "@/components/dashboard/Gauge"

const STATUT_INFO: Record<
  Machine["statut"],
  { label: string; icon: typeof CheckCircle2; classes: string }
> = {
  MARCHE: {
    label: "En marche",
    icon: CheckCircle2,
    classes: "border-emerald-500/40 bg-emerald-500/5",
  },
  ARRET: { label: "À l'arrêt", icon: PowerOff, classes: "" },
  PAUSE: { label: "En pause", icon: PauseCircle, classes: "border-amber-500/40 bg-amber-500/5" },
  PANNE: {
    label: "En panne",
    icon: AlertTriangle,
    classes: "border-destructive/40 bg-destructive/5",
  },
  MAINTENANCE: { label: "Maintenance", icon: Wrench, classes: "border-blue-500/40 bg-blue-500/5" },
}

export function MachineCard({ machine, onClick }: { machine: Machine; onClick?: () => void }) {
  const info = STATUT_INFO[machine.statut]
  const Icon = info.icon

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer p-5 transition-colors hover:bg-accent/40 ${info.classes}`}
    >
      <div className="flex items-center gap-4">
        <Icon className="size-9 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">{machine.nom}</h3>
          <p className="text-sm text-muted-foreground">{info.label}</p>
        </div>
        {machine.trs != null && <Gauge value={Number(machine.trs)} label="" size={72} />}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{machine.quantite_bonne} bonnes</span>
        <span>{machine.quantite_rejetee} rejetées</span>
      </div>
    </Card>
  )
}
