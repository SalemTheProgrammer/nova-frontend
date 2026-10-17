import { Popover } from "radix-ui"
import { AlertTriangle } from "lucide-react"
import { formatDateFr, type ProductionLigne } from "@/lib/tunicotex"
import { aVerifier, type RaisonVerification } from "@/components/tunicotex/format"

function libelle(l: ProductionLigne, raison: RaisonVerification): string {
  switch (raison) {
    case "sans_lecture":
      return "aucune lecture"
    case "objectif_ancien":
      return l.objectif_date
        ? `objectif du ${formatDateFr(l.objectif_date).slice(0, 5)}`
        : "objectif ancien"
    case "taux_aberrant":
      return `taux ${Math.round((l.taux ?? 0) * 100)} %`
  }
}

/** Bouton discret « Données à vérifier (n) » ouvrant la liste des chaînes concernées. */
export function DonneesAVerifier({ lignes }: { lignes: ProductionLigne[] }) {
  const items = lignes.flatMap((l) => {
    const r = aVerifier(l)
    return r ? [{ l, r }] : []
  })
  if (items.length === 0) return null
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
        >
          <AlertTriangle className="size-3" />
          Données à vérifier ({items.length})
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 max-h-80 w-72 overflow-auto rounded-xl border border-border bg-popover p-2 text-sm shadow-lg"
        >
          <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
            Objectifs anciens (toujours comparés) et chaînes exclues du graphique : à corriger dans DIVA.
          </p>
          <ul>
            {items.map(({ l, r }) => (
              <li
                key={l.ligne.id}
                className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1"
              >
                <span className="min-w-0 truncate" title={l.ligne.nom}>
                  {l.ligne.nom}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {libelle(l, r)}
                </span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
