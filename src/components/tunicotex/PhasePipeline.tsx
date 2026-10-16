import { useState } from "react"
import type { PhasePipelineItem, TaillesPipeline } from "@/lib/tunicotex"

/** `pct` du backend est toujours une fraction 0-1 (1.2 = 120 %). */
const enPourcent = (fraction: number): number => fraction * 100
const largeurBarre = (fraction: number): number => Math.max(0, Math.min(100, enPourcent(fraction)))

/** Avancement par phase d'un OF, avec le détail par taille en option. */
export function PhasePipeline({
  phases,
  tailles,
  toutesLesPhases = false,
}: {
  phases: PhasePipelineItem[]
  tailles?: TaillesPipeline
  toutesLesPhases?: boolean
}) {
  const [toutes, setToutes] = useState(toutesLesPhases)
  const visibles = toutes ? phases : phases.filter((p) => p.quantite > 0)
  return (
    <div className="space-y-4">
      {visibles.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun passage de phase enregistré.</p>
      )}
      <ol className="space-y-2">
        {visibles.map((p) => (
          <li
            key={p.nom}
            className={`flex items-center gap-3 text-sm ${p.quantite > 0 ? "" : "opacity-50"}`}
          >
            <span className="w-32 shrink-0 truncate text-muted-foreground sm:w-44">{p.nom}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${largeurBarre(p.pct)}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums">
              {p.quantite}{" "}
              <span className="text-xs text-muted-foreground">({Math.round(enPourcent(p.pct))} %)</span>
            </span>
          </li>
        ))}
      </ol>
      {phases.length > visibles.length || (toutes && !toutesLesPhases) ? (
        <button
          type="button"
          onClick={() => setToutes((t) => !t)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          {toutes ? "Masquer les phases vides" : `Afficher toutes les phases (${phases.length})`}
        </button>
      ) : null}
      {tailles && tailles.lignes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {tailles.colonnes.map((c, i) => (
                  <th key={c} className={i === 0 ? "px-3 py-2 text-left" : "px-3 py-2 text-right"}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tailles.lignes.map((l) => (
                <tr key={String(l[0])} className="border-t border-border">
                  {l.map((cellule, i) => (
                    <td
                      key={i}
                      className={i === 0 ? "px-3 py-1.5" : "px-3 py-1.5 text-right tabular-nums"}
                    >
                      {cellule}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
