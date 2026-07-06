import { ClipboardList, Package, Zap } from "lucide-react"
import type { OFActif } from "@/lib/types"
import { Card } from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const EN_MARCHE = new Set(["EN_COURS"])

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-[9rem] flex-1 items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

/** Bandeau façon poste de supervision : OF / article / lot / quantité / statut, à la
 * manière d'une console SCADA — mêmes cases bordées qu'un pupitre atelier. */
export function OFHeaderBar({ of }: { of: OFActif | null }) {
  if (!of) {
    return (
      <Card className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
        <ClipboardList className="size-4 shrink-0" />
        Aucun ordre de fabrication en cours sur ce périmètre.
      </Card>
    )
  }

  const enMarche = EN_MARCHE.has(of.statut)

  return (
    <div className="flex flex-wrap items-stretch gap-3 rounded-xl border border-border bg-card p-3">
      <Field icon={ClipboardList} label="OF" value={of.numero} />
      <Field icon={Package} label="Article" value={of.article_designation} />
      <Field icon={ClipboardList} label="Lot" value={of.lot_produit ?? "—"} />
      <Field icon={Package} label="Quantité OF" value={String(of.quantite_planifiee)} />
      <Field icon={Zap} label="Énergie (W/h)" value="—" />
      <div className="flex min-w-[9rem] flex-1 items-center justify-between gap-2.5 rounded-lg border border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Statut
          </p>
          <p className="truncate text-sm font-semibold">
            {enMarche ? "Marche" : of.statut.replace("_", " ")}
          </p>
        </div>
        <span
          className={cn(
            "size-3 shrink-0 rounded-full",
            enMarche ? "bg-emerald-500" : "bg-destructive",
          )}
        />
      </div>
    </div>
  )
}
