import { useState } from "react"
import { machinesApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import { EmptyState, ErrorBanner, Page } from "@/components/dashboard/primitives"
import { MachineCard } from "@/components/machines/MachineCard"
import { MachineDetailsPage } from "@/components/dashboard/MachineDetailsPage"

export function MachinesPage({ ligneId }: { ligneId: number | null }) {
  const { data, loading, error } = useResource(() => machinesApi.list(ligneId ?? undefined), [ligneId])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  if (selectedId != null) {
    return (
      <Page title="Détail machine">
        <MachineDetailsPage machineId={selectedId} onBack={() => setSelectedId(null)} />
      </Page>
    )
  }

  const machines = data ?? []

  return (
    <Page title="Machines" description="Liste des machines et leur état SCADA en direct.">
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : machines.length === 0 ? (
        <EmptyState message="Aucune machine configurée." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => (
            <MachineCard key={m.id} machine={m} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>
      )}
    </Page>
  )
}
