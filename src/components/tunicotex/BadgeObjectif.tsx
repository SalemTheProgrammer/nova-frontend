import { infoObjectif } from "@/components/tunicotex/format"
import type { ProductionLigne } from "@/lib/tunicotex"

/** Petit badge « ancien » à côté d'un taux calculé sur un objectif périmé. */
export function BadgeObjectif({ l }: { l: ProductionLigne }) {
  const info = infoObjectif(l)
  if (!info) return null
  return (
    <span
      title={info}
      className="ml-1.5 whitespace-nowrap rounded bg-amber-500/15 px-1 py-px align-middle text-[10px] font-medium text-amber-700 dark:text-amber-400"
    >
      ancien
    </span>
  )
}
