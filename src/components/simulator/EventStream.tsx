import type { MachineEvent } from "@/lib/types"
import { EVENT_LABEL } from "@/lib/eventLabels"
import { Card, EmptyState } from "@/components/dashboard/primitives"

function formatPayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== "")
  if (entries.length === 0) return ""
  return entries.map(([k, v]) => `${k}=${v}`).join(" · ")
}

export function EventStream({ events }: { events: MachineEvent[] }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">Flux d'événements</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState message="Aucun événement pour le moment." />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="px-4 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleTimeString("fr-FR")}
                  </span>
                </div>
                {formatPayload(e.payload) && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {formatPayload(e.payload)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
