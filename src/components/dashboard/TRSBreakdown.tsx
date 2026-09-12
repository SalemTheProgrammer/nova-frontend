import type { TRSRead } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"

function pct(v: string): string {
  return `${(Number(v) * 100).toFixed(1)}%`
}

function minutes(s: string): string {
  return `${(Number(s) / 60).toFixed(1)} min`
}

const TEMPS_ROWS: { key: keyof TRSRead["temps"]; label: string }[] = [
  { key: "tt", label: "TT — Temps Total" },
  { key: "to", label: "TO — Temps d'Ouverture" },
  { key: "tr", label: "TR — Temps Requis" },
  { key: "tf", label: "TF — Temps de Fonctionnement" },
  { key: "tn", label: "TN — Temps Net" },
  { key: "tu", label: "TU — Temps Utile" },
]

const PERTE_LABEL: Record<string, string> = {
  disponibilite: "Disponibilité",
  performance: "Performance",
  qualite: "Qualité",
}

function interpretation(trsValue: number): { texte: string; tone: string } {
  if (trsValue >= 0.7) {
    return { texte: "Bon résultat : la ligne tourne efficacement.", tone: "text-emerald-600 dark:text-emerald-400" }
  }
  if (trsValue >= 0.4) {
    return { texte: "Résultat moyen : des pertes existent, voir le détail ci-dessous.", tone: "text-amber-600 dark:text-amber-400" }
  }
  return { texte: "Résultat faible : une perte importante pénalise la production.", tone: "text-destructive" }
}

export function TRSBreakdown({ trs }: { trs: TRSRead }) {
  const tt = Number(trs.temps.tt) || 1
  const interp = interpretation(Number(trs.trs))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className={`p-4 lg:col-span-2 ${interp.tone}`}>
        <p className="text-sm font-medium">{interp.texte}</p>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Indicateurs (AFNOR NF E60-182)</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold">{pct(trs.trs)}</p>
            <p className="text-xs text-muted-foreground">TRS</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{pct(trs.trg)}</p>
            <p className="text-xs text-muted-foreground">TRG</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{pct(trs.tre)}</p>
            <p className="text-xs text-muted-foreground">TRE</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="font-medium">{pct(trs.tq)}</p>
            <p className="text-xs text-muted-foreground">TQ (qualité)</p>
          </div>
          <div>
            <p className="font-medium">{pct(trs.tp)}</p>
            <p className="text-xs text-muted-foreground">TP (performance)</p>
          </div>
          <div>
            <p className="font-medium">{pct(trs.do)}</p>
            <p className="text-xs text-muted-foreground">DO (disponibilité)</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Production : {trs.quantite_bonne} bonnes / {trs.quantite_rejetee} rebuts
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Modèle de temps</h3>
        <div className="space-y-2.5">
          {TEMPS_ROWS.map((row) => {
            const value = Number(trs.temps[row.key])
            const width = Math.max(2, (value / tt) * 100)
            return (
              <div key={row.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">{minutes(trs.temps[row.key])}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">Pertes</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["disponibilite", "performance", "qualite"] as const).map((key) => {
            const secondsKey = `${key}_s` as keyof TRSRead["pertes"]
            const isPrincipale = trs.pertes.principale === key
            return (
              <div
                key={key}
                className={
                  "rounded-lg border px-3 py-2 text-center" +
                  (isPrincipale ? "border-destructive/50 bg-destructive/5" : "border-border")
                }
              >
                <p className="text-xs text-muted-foreground">{PERTE_LABEL[key]}</p>
                <p className="text-sm font-medium">
                  {minutes(String(trs.pertes[secondsKey]))}
                </p>
                {isPrincipale && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    Perte principale
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
