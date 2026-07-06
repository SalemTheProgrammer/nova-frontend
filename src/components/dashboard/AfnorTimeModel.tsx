import type { TempsModel } from "@/lib/types"

const ROWS: { key: keyof TempsModel; label: string }[] = [
  { key: "tt", label: "TT — Temps Total" },
  { key: "to", label: "TO — Ouverture" },
  { key: "tr", label: "TR — Requis" },
  { key: "tf", label: "TF — Fonctionnement" },
  { key: "tn", label: "TN — Net" },
  { key: "tu", label: "TU — Utile" },
]

function fmt(s: string): string {
  const v = Number(s)
  if (v >= 3600) return `${(v / 3600).toFixed(1)} h`
  return `${(v / 60).toFixed(1)} min`
}

/** Modèle de temps emboîtés AFNOR NF E60-182 (TT ⊇ TO ⊇ TR ⊇ TF ⊇ TN ⊇ TU), version compacte. */
export function AfnorTimeModel({ temps }: { temps: TempsModel }) {
  const tt = Number(temps.tt) || 1
  return (
    <div className="space-y-2">
      {ROWS.map((row) => {
        const value = Number(temps[row.key])
        const width = Math.max(2, (value / tt) * 100)
        return (
          <div key={row.key}>
            <div className="mb-0.5 flex items-center justify-between text-[11px]">
              <span className="text-foreground/80">{row.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{fmt(temps[row.key])}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
