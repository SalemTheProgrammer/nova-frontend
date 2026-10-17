import { formatDateFr } from "@/lib/tunicotex"
import { useReference } from "@/components/tunicotex/useReference"

/** « Données au JJ/MM/AAAA » à côté du titre de page (remplace l'ancien bandeau). */
export function DateDonnees() {
  const { dateReference, calibre, loading, error } = useReference()
  if (loading || error || !dateReference) return null
  return (
    <span
      className="shrink-0 text-xs text-muted-foreground"
      title={calibre ? undefined : "Rendement estimé (calibration en cours)"}
    >
      Données au {formatDateFr(dateReference)}
    </span>
  )
}
