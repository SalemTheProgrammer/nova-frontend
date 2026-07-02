import { ArrowLeft } from "lucide-react"
import { useMachineState } from "@/hooks/useMachineState"
import { Button, EmptyState } from "@/components/dashboard/primitives"
import { LiveDeviceState } from "@/components/simulator/LiveDeviceState"
import { MachineTimeline } from "@/components/machines/MachineTimeline"
import { MachineTagTable } from "@/components/machines/MachineTagTable"

export function MachineDetailsPage({ machineId, onBack }: { machineId: number; onBack: () => void }) {
  const { machine, events, loading } = useMachineState(machineId)

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" /> Retour aux machines
      </Button>

      {loading && !machine ? (
        <EmptyState message="Chargement…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveDeviceState machine={machine} />
          <MachineTimeline events={events} />
          <MachineTagTable events={events} />
        </div>
      )}
    </div>
  )
}
