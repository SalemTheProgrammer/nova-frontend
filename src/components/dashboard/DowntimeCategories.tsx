import { AlertOctagon, Timer, Wrench } from "lucide-react"
import type { ArretCategorie } from "@/lib/types"

function fmt(s: string): string {
  const total = Math.round(Number(s))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  return `${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`
}

function Panel({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: typeof Wrench
  label: string
  value: string
  sublabel: string
  tone: "amber" | "red" | "blue"
}) {
  const tones = {
    amber: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    red: "border-destructive/30 text-destructive",
    blue: "border-blue-500/30 text-blue-600 dark:text-blue-400",
  }
  return (
    <div className={`flex-1 rounded-lg border px-3 py-2 ${tones[tone]}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  )
}

/** Trois catégories d'arrêt (façon poste de supervision) : planifiés, non planifiés, micro-arrêts. */
export function DowntimeCategories({
  planifies,
  nonPlanifies,
  microArretsNombre,
}: {
  planifies: ArretCategorie
  nonPlanifies: ArretCategorie
  microArretsNombre: number
}) {
  return (
    <div className="flex gap-2">
      <Panel
        icon={Wrench}
        label="Arrêts planifiés"
        value={planifies.nb_actifs > 0 ? `${planifies.nb_actifs} actif(s)` : "Aucun actif"}
        sublabel={fmt(planifies.duree_totale_s)}
        tone="blue"
      />
      <Panel
        icon={AlertOctagon}
        label="Arrêts non planifiés"
        value={nonPlanifies.nb_actifs > 0 ? `${nonPlanifies.nb_actifs} actif(s)` : "Aucun actif"}
        sublabel={fmt(nonPlanifies.duree_totale_s)}
        tone="red"
      />
      <Panel
        icon={Timer}
        label="Micro-arrêts"
        value={String(microArretsNombre)}
        sublabel="sur la fenêtre"
        tone="amber"
      />
    </div>
  )
}
