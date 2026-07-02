import { Page } from "@/components/dashboard/primitives"
import { MachineSimulatorPanel } from "@/components/simulator/MachineSimulatorPanel"

export function SimulateurPage({ ligneId }: { ligneId: number | null }) {
  return (
    <Page
      title="Simulateur Machine"
      description="Le simulateur agit comme un vrai automate : chaque action envoie un événement réel au backend."
    >
      <MachineSimulatorPanel ligneId={ligneId} />
    </Page>
  )
}
