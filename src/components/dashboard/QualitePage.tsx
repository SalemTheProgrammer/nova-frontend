import { useResource } from "@/lib/useResource"
import { qualiteApi } from "@/lib/api"
import { Badge, Card, EmptyState, ErrorBanner, Page, Table, Td, Th } from "@/components/dashboard/primitives"
import { KpiCard } from "@/components/dashboard/KpiCard"

export function QualitePage() {
  const resume = useResource(() => qualiteApi.resume(), [])
  const evenements = useResource(() => qualiteApi.evenements(), [])

  const causes = Object.entries(resume.data?.causes ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <Page
      title="Contrôle Qualité & Rejets"
      description="Suivi des bonnes pièces et rebuts, et de leur cause — impact direct sur TQ."
    >
      <ErrorBanner message={resume.error ?? evenements.error} />
      {resume.loading ? (
        <EmptyState message="Chargement…" />
      ) : !resume.data ? (
        <EmptyState message="Aucune donnée qualité." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label="Quantité bonne" value={String(resume.data.quantite_bonne)} tone="green" />
            <KpiCard label="Quantité rejetée" value={String(resume.data.quantite_rejetee)} tone="red" />
            <KpiCard
              label="Taux de rebut"
              value={`${(Number(resume.data.taux_rebut) * 100).toFixed(1)}%`}
              tone={Number(resume.data.taux_rebut) > 0.1 ? "amber" : "neutral"}
            />
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Causes de rebut</h3>
            {causes.length === 0 ? (
              <EmptyState message="Aucun rebut enregistré." />
            ) : (
              <div className="space-y-2">
                {causes.map(([cause, count]) => (
                  <div key={cause} className="flex items-center justify-between text-sm">
                    <span>{cause.replace(/_/g, " ").toLowerCase()}</span>
                    <Badge tone="red">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Événements qualité</h3>
            {evenements.loading ? (
              <EmptyState message="Chargement…" />
            ) : (evenements.data ?? []).length === 0 ? (
              <EmptyState message="Aucun événement." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Machine</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Quantité</Th>
                    <Th>Cause</Th>
                    <Th>Horodatage</Th>
                  </tr>
                </thead>
                <tbody>
                  {(evenements.data ?? []).map((e) => (
                    <tr key={e.id}>
                      <Td className="font-mono text-xs">{e.code_machine}</Td>
                      <Td>
                        <Badge tone={e.type === "BONNE" ? "green" : "red"}>{e.type}</Badge>
                      </Td>
                      <Td className="text-right">{e.quantite}</Td>
                      <Td className="text-muted-foreground">
                        {e.cause ? e.cause.replace(/_/g, " ").toLowerCase() : "—"}
                      </Td>
                      <Td className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("fr-FR")}
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
