import { useResource } from "@/lib/useResource"
import { maintenanceApi } from "@/lib/api"
import { Badge, EmptyState, ErrorBanner, Page, Table, Td, Th } from "@/components/dashboard/primitives"

const TYPE_TONE: Record<string, "neutral" | "blue" | "amber" | "red"> = {
  PREVENTIVE: "blue",
  CORRECTIVE: "amber",
  URGENCE: "red",
}

export function MaintenancePage() {
  const { data, loading, error } = useResource(() => maintenanceApi.list(), [])
  const rows = data ?? []

  return (
    <Page
      title="Maintenance"
      description="Historique des interventions de maintenance (préventive, corrective, urgence)."
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune intervention de maintenance enregistrée." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Machine</Th>
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Début</Th>
              <Th>Fin</Th>
              <Th>Prochaine maintenance</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <Td className="font-mono text-xs">{m.code_machine}</Td>
                <Td>
                  <Badge tone={TYPE_TONE[m.type] ?? "neutral"}>{m.type}</Badge>
                </Td>
                <Td className="text-muted-foreground">{m.description ?? "—"}</Td>
                <Td>{new Date(m.start_time).toLocaleString("fr-FR")}</Td>
                <Td>{m.end_time ? new Date(m.end_time).toLocaleString("fr-FR") : "En cours"}</Td>
                <Td>{m.prochaine_maintenance ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Page>
  )
}
