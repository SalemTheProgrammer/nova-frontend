import { cn } from "@/lib/utils"
import type { Tuile } from "@/lib/tunicotex"

const ETATS = {
  ok: "text-emerald-600 dark:text-emerald-400",
  alerte: "text-destructive",
  neutre: "text-foreground",
}

export function KpiTiles({ tuiles }: { tuiles: Tuile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tuiles.map((t) => (
        <div key={t.libelle} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">{t.libelle}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", ETATS[t.etat ?? "neutre"])}>
            {t.valeur ?? "—"}
            {t.unite && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">{t.unite}</span>
            )}
          </p>
          {t.note && <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>}
        </div>
      ))}
    </div>
  )
}
