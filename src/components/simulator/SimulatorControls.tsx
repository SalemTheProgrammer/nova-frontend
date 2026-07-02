import { useState } from "react"
import { AlertTriangle, Pause, Play, Square, Wrench } from "lucide-react"
import { CAUSES_ARRET, CAUSES_REBUT, type CauseArret, type CauseRebut } from "@/lib/types"
import { Button, Card, Disclosure, Field, Select, TextInput } from "@/components/dashboard/primitives"

export interface SimulatorActions {
  start: () => void
  stop: () => void
  pause: () => void
  alarme: (message?: string) => void
  cycleTime: (s: number) => void
  produireBonne: (q: number) => void
  produireRebut: (q: number, cause: CauseRebut) => void
  declencherArret: (cause: CauseArret, comment?: string) => void
  resoudreArret: (comment?: string) => void
  demarrerMaintenance: (description?: string) => void
  terminerMaintenance: () => void
}

export function SimulatorControls({
  disabled,
  actions,
  defectRate,
  onChangeDefectRate,
}: {
  disabled: boolean
  actions: SimulatorActions
  defectRate: number
  onChangeDefectRate: (v: number) => void
}) {
  const [cycleTimeInput, setCycleTimeInput] = useState("4")
  const [causeArret, setCauseArret] = useState<CauseArret>("PANNE_MECANIQUE")
  const [causeRebut, setCauseRebut] = useState<CauseRebut>("DEFAUT_VISUEL")
  const [quantiteBonne, setQuantiteBonne] = useState("1")
  const [quantiteRebut, setQuantiteRebut] = useState("1")

  return (
    <Card className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button className="h-16 text-base" onClick={actions.start} disabled={disabled}>
          <Play className="size-5" /> Démarrer
        </Button>
        <Button
          variant="outline"
          className="h-16 text-base"
          onClick={actions.pause}
          disabled={disabled}
        >
          <Pause className="size-5" /> Pause
        </Button>
        <Button variant="danger" className="h-16 text-base" onClick={actions.stop} disabled={disabled}>
          <Square className="size-5" /> Arrêter
        </Button>
        <Button
          variant="outline"
          className="h-16 text-base"
          onClick={() => actions.alarme("Alarme déclenchée manuellement")}
          disabled={disabled}
        >
          <AlertTriangle className="size-5" /> Alarme
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Taux de défaut simulé pendant la production automatique : {(defectRate * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={defectRate}
          onChange={(e) => onChangeDefectRate(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <Disclosure label="Réglages avancés">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Temps de cycle
            </p>
            <div className="flex items-end gap-2">
              <Field label="Secondes / unité">
                <TextInput
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={cycleTimeInput}
                  onChange={(e) => setCycleTimeInput(e.target.value)}
                  className="h-8 w-28"
                />
              </Field>
              <Button
                variant="outline"
                className="h-8"
                disabled={disabled}
                onClick={() => actions.cycleTime(Number(cycleTimeInput))}
              >
                Appliquer
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Production manuelle
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Bonnes unités">
                <TextInput
                  type="number"
                  min="1"
                  value={quantiteBonne}
                  onChange={(e) => setQuantiteBonne(e.target.value)}
                  className="h-8 w-20"
                />
              </Field>
              <Button
                variant="outline"
                className="h-8"
                disabled={disabled}
                onClick={() => actions.produireBonne(Number(quantiteBonne) || 1)}
              >
                Générer
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Field label="Rebuts">
                <TextInput
                  type="number"
                  min="1"
                  value={quantiteRebut}
                  onChange={(e) => setQuantiteRebut(e.target.value)}
                  className="h-8 w-20"
                />
              </Field>
              <Field label="Cause de rebut">
                <Select
                  value={causeRebut}
                  onChange={(e) => setCauseRebut(e.target.value as CauseRebut)}
                  className="h-8 w-48 text-xs"
                >
                  {CAUSES_REBUT.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ").toLowerCase()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                variant="danger"
                className="h-8"
                disabled={disabled}
                onClick={() => actions.produireRebut(Number(quantiteRebut) || 1, causeRebut)}
              >
                Générer rebut
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Arrêt
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Cause d'arrêt">
                <Select
                  value={causeArret}
                  onChange={(e) => setCauseArret(e.target.value as CauseArret)}
                  className="h-8 w-48 text-xs"
                >
                  {CAUSES_ARRET.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ").toLowerCase()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                variant="outline"
                className="h-8"
                disabled={disabled}
                onClick={() => actions.declencherArret(causeArret)}
              >
                Déclencher l'arrêt
              </Button>
              <Button
                variant="outline"
                className="h-8"
                disabled={disabled}
                onClick={() => actions.resoudreArret()}
              >
                Résoudre l'arrêt
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Maintenance
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => actions.demarrerMaintenance("Maintenance déclenchée depuis le simulateur")}
                disabled={disabled}
              >
                <Wrench className="size-4" /> Démarrer maintenance
              </Button>
              <Button variant="outline" onClick={actions.terminerMaintenance} disabled={disabled}>
                Terminer maintenance
              </Button>
            </div>
          </div>
        </div>
      </Disclosure>
    </Card>
  )
}
