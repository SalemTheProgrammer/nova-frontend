import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import type { Tuile } from "@/lib/tunicotex"

const ETATS = {
  ok: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  alerte: "text-destructive",
  neutre: "text-foreground",
}

const TRAITS = {
  ok: "var(--color-emerald-500)",
  attention: "var(--color-amber-500)",
  alerte: "var(--destructive)",
  neutre: "var(--chart-2)",
}

function MiniCourbe({ valeurs, etat }: { valeurs: number[]; etat: keyof typeof TRAITS }) {
  if (valeurs.length < 2) return null
  return (
    <div className="h-8 w-24 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valeurs.map((v, i) => ({ i, v }))}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={TRAITS[etat]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Tuiles de chiffres clés. Sans `colonnes`, grille fluide (cartes du chat) ;
 * avec `colonnes={4}`, une rangée unique à partir de `md` (écran Atelier).
 */
export function KpiTiles({ tuiles, colonnes }: { tuiles: Tuile[]; colonnes?: 4 }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        colonnes === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {tuiles.map((t) => {
        const etat = t.etat ?? "neutre"
        return (
          <div
            key={t.libelle}
            className={cn(
              "flex min-w-0 items-end justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3",
              t.principale && "max-md:col-span-2",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{t.libelle}</p>
              <p
                className={cn(
                  "mt-0.5 font-semibold tabular-nums",
                  t.principale ? "text-3xl" : "text-2xl",
                  ETATS[etat],
                )}
              >
                {t.valeur ?? "—"}
                {t.unite && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{t.unite}</span>
                )}
              </p>
              {t.note && (
                <p className="truncate text-xs text-muted-foreground" title={t.note}>
                  {t.note}
                </p>
              )}
            </div>
            {t.courbe && <MiniCourbe valeurs={t.courbe} etat={etat} />}
          </div>
        )
      })}
    </div>
  )
}
