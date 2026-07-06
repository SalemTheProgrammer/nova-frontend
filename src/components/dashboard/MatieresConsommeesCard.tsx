import type { MatiereConsommee } from "@/lib/types"
import { Card, EmptyState } from "@/components/dashboard/primitives"

/** Matières premières consommées (généalogie FEFO) pour l'OF actif. */
export function MatieresConsommeesCard({ matieres }: { matieres: MatiereConsommee[] }) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">Matières consommées (OF actif)</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{matieres.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {matieres.length === 0 ? (
          <div className="p-3">
            <EmptyState message="Aucune consommation pour l'OF actif." />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-1.5 font-medium">Désignation</th>
                <th className="px-2 py-1.5 font-medium">Lot</th>
                <th className="px-4 py-1.5 text-right font-medium">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {matieres.map((m, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-1.5">
                    <span className="font-medium">{m.code_mp}</span>{" "}
                    <span className="text-muted-foreground">{m.designation_mp}</span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-muted-foreground">{m.numero_lot}</td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">{m.quantite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
