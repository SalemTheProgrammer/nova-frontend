import { RefreshCw } from "lucide-react"
import { useResource } from "@/lib/useResource"
import { downtimeApi } from "@/lib/api"
import { Badge, Button, EmptyState, ErrorBanner, Page, Table, Td, Th } from "@/components/dashboard/primitives"

function duree(s: string | null): string {
  if (s == null) return "—"
  const total = Number(s)
  const min = Math.floor(total / 60)
  const sec = Math.round(total % 60)
  return `${min}m ${sec}s`
}

export function ArretsPage() {
  const { data, loading, error, reload } = useResource(() => downtimeApi.list(), [])

  const rows = data ?? []
  const actifs = rows.filter((r) => r.end_time == null)
  const historique = rows.filter((r) => r.end_time != null)

  return (
    <Page
      title="Arrêts"
      description="Suivi des arrêts machine — actifs et historique, avec cause et impact sur la disponibilité."
      actions={
        <Button variant="outline" onClick={() => reload()}>
          <RefreshCw className="size-4" /> Actualiser
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              Arrêts actifs {actifs.length > 0 && <Badge tone="red">{actifs.length}</Badge>}
            </h3>
            {actifs.length === 0 ? (
              <EmptyState message="Aucun arrêt actif." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Machine</Th>
                    <Th>Cause</Th>
                    <Th>Commentaire</Th>
                    <Th>Depuis</Th>
                  </tr>
                </thead>
                <tbody>
                  {actifs.map((d) => (
                    <tr key={d.id}>
                      <Td className="font-mono text-xs">{d.code_machine}</Td>
                      <Td>{d.cause.replace(/_/g, " ").toLowerCase()}</Td>
                      <Td className="text-muted-foreground">{d.operator_comment ?? "—"}</Td>
                      <Td>{new Date(d.start_time).toLocaleTimeString("fr-FR")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Historique</h3>
            {historique.length === 0 ? (
              <EmptyState message="Aucun arrêt résolu." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Machine</Th>
                    <Th>Cause</Th>
                    <Th>Début</Th>
                    <Th>Fin</Th>
                    <Th className="text-right">Durée</Th>
                    <Th>OF lié</Th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((d) => (
                    <tr key={d.id}>
                      <Td className="font-mono text-xs">{d.code_machine}</Td>
                      <Td>{d.cause.replace(/_/g, " ").toLowerCase()}</Td>
                      <Td>{new Date(d.start_time).toLocaleString("fr-FR")}</Td>
                      <Td>{d.end_time ? new Date(d.end_time).toLocaleString("fr-FR") : "—"}</Td>
                      <Td className="text-right">{duree(d.duree_s)}</Td>
                      <Td className="text-muted-foreground">
                        {d.ordre_fabrication_id ?? "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}
