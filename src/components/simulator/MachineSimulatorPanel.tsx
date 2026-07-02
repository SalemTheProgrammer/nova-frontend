import { useEffect, useState } from "react"
import { machinesApi, ordresApi, simulatorApi } from "@/lib/api"
import type { Machine, OrdreFabrication } from "@/lib/types"
import { useSimulator } from "@/hooks/useSimulator"
import { Disclosure, ErrorBanner, Field, Select } from "@/components/dashboard/primitives"
import { LiveDeviceState } from "@/components/simulator/LiveDeviceState"
import { SimulatorControls, type SimulatorActions } from "@/components/simulator/SimulatorControls"
import { EventStream } from "@/components/simulator/EventStream"
import { TagValuePanel } from "@/components/simulator/TagValuePanel"
import { useWebSocket } from "@/hooks/useWebSocket"

export function MachineSimulatorPanel({ ligneId }: { ligneId: number | null }) {
  const { connected } = useWebSocket()
  const [machines, setMachines] = useState<Machine[]>([])
  const [ordres, setOrdres] = useState<OrdreFabrication[]>([])
  const [machineId, setMachineId] = useState<number | null>(null)
  const [ordreId, setOrdreId] = useState<number | null>(null)

  useEffect(() => {
    machinesApi.list(ligneId ?? undefined).then((list) => {
      setMachines(list)
      if (list.length > 0 && (machineId == null || !list.some((m) => m.id === machineId))) {
        setMachineId(list[0].id)
      }
      if (list.length === 0) setMachineId(null)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligneId])

  useEffect(() => {
    ordresApi.list().then(setOrdres).catch(() => {})
  }, [])

  const { machine, events, defectRate, setDefectRate, error, run } = useSimulator(machineId)

  const actions: SimulatorActions = {
    start: () => machineId != null && run(() => simulatorApi.start(machineId, ordreId)),
    stop: () => machineId != null && run(() => simulatorApi.stop(machineId)),
    pause: () => machineId != null && run(() => simulatorApi.pause(machineId)),
    alarme: (message) => machineId != null && run(() => simulatorApi.alarme(machineId, message)),
    cycleTime: (s) => machineId != null && s > 0 && run(() => simulatorApi.cycleTime(machineId, s)),
    produireBonne: (q) => machineId != null && run(() => simulatorApi.produireBonne(machineId, q)),
    produireRebut: (q, cause) =>
      machineId != null && run(() => simulatorApi.produireRebut(machineId, q, cause)),
    declencherArret: (cause, comment) =>
      machineId != null && run(() => simulatorApi.declencherArret(machineId, cause, comment)),
    resoudreArret: (comment) =>
      machineId != null && run(() => simulatorApi.resoudreArret(machineId, comment)),
    demarrerMaintenance: (description) =>
      machineId != null && run(() => simulatorApi.demarrerMaintenance(machineId, "PREVENTIVE", description)),
    terminerMaintenance: () => machineId != null && run(() => simulatorApi.terminerMaintenance(machineId)),
  }

  const ordresDisponibles = ordres.filter((o) => o.statut === "PLANIFIE" || o.statut === "EN_COURS")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Machine">
          <Select
            value={machineId ?? ""}
            onChange={(e) => setMachineId(e.target.value ? Number(e.target.value) : null)}
            className="w-56"
          >
            {machines.length === 0 && <option value="">Aucune machine</option>}
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ordre de fabrication">
          <Select
            value={ordreId ?? ""}
            onChange={(e) => setOrdreId(e.target.value ? Number(e.target.value) : null)}
            className="w-64"
          >
            <option value="">— aucun —</option>
            {ordresDisponibles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero} · {o.code_article} ({o.quantite_planifiee} {o.unite})
              </option>
            ))}
          </Select>
        </Field>
        <span
          className={
            "ml-auto text-xs " + (connected ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")
          }
        >
          {connected ? "● WebSocket connecté" : "○ WebSocket déconnecté"}
        </span>
      </div>

      <ErrorBanner message={error} />

      <div className="space-y-4">
        <LiveDeviceState machine={machine} />
        <SimulatorControls
          disabled={machineId == null}
          actions={actions}
          defectRate={defectRate}
          onChangeDefectRate={setDefectRate}
        />

        <Disclosure label="Journal d'événements et tags capteurs">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-[400px]">
              <EventStream events={events} />
            </div>
            <TagValuePanel
              events={events}
              disabled={machineId == null}
              onSend={(tag, valeur) =>
                machineId != null && run(() => simulatorApi.envoyerTag(machineId, tag, valeur))
              }
            />
          </div>
        </Disclosure>
      </div>
    </div>
  )
}
