import type { MachineEvent } from "@/lib/types"
import { EVENT_LABEL } from "@/lib/eventLabels"
import { Card, EmptyState } from "@/components/dashboard/primitives"

export function MachineTimeline({ events }: { events: MachineEvent[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Historique d'événements</h3>
      {events.length === 0 ? (
        <EmptyState message="Aucun événement." />
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative text-xs">
              <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
              <span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>{" "}
              <span className="text-muted-foreground">
                — {new Date(e.created_at).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
