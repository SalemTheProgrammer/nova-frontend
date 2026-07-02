import { useState } from "react"
import { Send } from "lucide-react"
import type { MachineEvent } from "@/lib/types"
import { Button, Card, Field, TextInput } from "@/components/dashboard/primitives"

export function TagValuePanel({
  events,
  onSend,
  disabled,
}: {
  events: MachineEvent[]
  onSend: (tag: string, valeur: number | string) => void
  disabled?: boolean
}) {
  const [tag, setTag] = useState("Temperature_C")
  const [valeur, setValeur] = useState("")

  const dernierTags = events
    .filter((e) => e.type === "SENSOR_TAG_UPDATED")
    .slice(0, 5)

  function envoyer() {
    if (!tag.trim() || valeur.trim() === "") return
    const numeric = Number(valeur)
    onSend(tag.trim(), Number.isNaN(numeric) ? valeur.trim() : numeric)
    setValeur("")
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Tags capteurs</h3>
      <div className="flex items-end gap-2">
        <Field label="Tag">
          <TextInput value={tag} onChange={(e) => setTag(e.target.value)} className="h-8 w-40" />
        </Field>
        <Field label="Valeur">
          <TextInput
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            className="h-8 w-24"
          />
        </Field>
        <Button variant="outline" onClick={envoyer} disabled={disabled} className="h-8">
          <Send className="size-3.5" />
        </Button>
      </div>
      <div className="mt-3 space-y-1">
        {dernierTags.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun tag envoyé.</p>
        ) : (
          dernierTags.map((e) => (
            <p key={e.id} className="font-mono text-xs text-muted-foreground">
              {String(e.payload.tag)} = {String(e.payload.valeur)}{" "}
              <span className="text-muted-foreground/60">
                ({new Date(e.created_at).toLocaleTimeString("fr-FR")})
              </span>
            </p>
          ))
        )}
      </div>
    </Card>
  )
}
