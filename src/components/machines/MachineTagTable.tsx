import type { MachineEvent } from "@/lib/types"
import { Card, EmptyState, Table, Td, Th } from "@/components/dashboard/primitives"

export function MachineTagTable({ events }: { events: MachineEvent[] }) {
  const tags = events.filter((e) => e.type === "SENSOR_TAG_UPDATED").slice(0, 20)

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Tags capteurs (live)</h3>
      {tags.length === 0 ? (
        <EmptyState message="Aucun tag reçu." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Valeur</Th>
              <Th>Horodatage</Th>
            </tr>
          </thead>
          <tbody>
            {tags.map((e) => (
              <tr key={e.id}>
                <Td className="font-mono text-xs">{String(e.payload.tag)}</Td>
                <Td className="font-mono text-xs">{String(e.payload.valeur)}</Td>
                <Td className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleTimeString("fr-FR")}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
