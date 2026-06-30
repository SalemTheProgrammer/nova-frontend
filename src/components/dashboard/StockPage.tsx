import { AlertTriangle, RefreshCw } from "lucide-react"
import { matieresApi, ordresApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Page,
  Table,
  Td,
  Th,
} from "@/components/dashboard/primitives"

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  )
}

export function StockPage() {
  const stock = useResource(() => matieresApi.stock(), [])
  const ordres = useResource(() => ordresApi.list(), [])

  const rows = stock.data ?? []
  const sousSeuil = rows.filter((r) => r.sous_seuil).length
  const ofs = ordres.data ?? []
  const ofPlanifies = ofs.filter((o) => o.statut === "PLANIFIE" || o.statut === "EN_COURS").length

  return (
    <Page
      title="Tableau de bord"
      description="Vue d'ensemble du stock des matières premières et de la production."
      actions={
        <Button variant="outline" onClick={() => { void stock.reload(); void ordres.reload() }}>
          <RefreshCw className="size-4" /> Actualiser
        </Button>
      }
    >
      <ErrorBanner message={stock.error} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Matières premières" value={String(rows.length)} />
        <Kpi
          label="Sous le seuil"
          value={String(sousSeuil)}
          tone={sousSeuil > 0 ? "text-amber-600 dark:text-amber-400" : ""}
        />
        <Kpi label="Ordres en cours" value={String(ofPlanifies)} />
        <Kpi label="Total OF" value={String(ofs.length)} />
      </div>

      {stock.loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune matière première." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Désignation</Th>
              <Th className="text-right">Disponible</Th>
              <Th className="text-right">Seuil</Th>
              <Th className="text-center">Lots</Th>
              <Th>État</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.matiere_premiere_id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{r.code}</Td>
                <Td>{r.designation}</Td>
                <Td className="text-right font-medium">
                  {r.disponible} {r.unite}
                </Td>
                <Td className="text-right text-muted-foreground">
                  {r.seuil_alerte ?? "—"}
                </Td>
                <Td className="text-center text-muted-foreground">{r.nb_lots}</Td>
                <Td>
                  {r.sous_seuil ? (
                    <Badge tone="amber">
                      <AlertTriangle className="mr-1 size-3" /> Sous seuil
                    </Badge>
                  ) : (
                    <Badge tone="green">OK</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Page>
  )
}
