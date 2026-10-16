import { formatDateFr } from "@/lib/tunicotex"
import { useReference } from "@/components/tunicotex/useReference"

export function ReferenceBanner() {
  const { dateReference, calibre, loading, error } = useReference()
  if (loading || error || !dateReference) return null
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:px-4 lg:px-6">
      <span className="font-medium text-foreground">
        Données DIVA au {formatDateFr(dateReference)}
      </span>
      {!calibre && <span>Rendement estimé (calibration en cours)</span>}
    </div>
  )
}
