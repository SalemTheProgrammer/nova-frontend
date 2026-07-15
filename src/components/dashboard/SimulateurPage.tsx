import { AlertTriangle, Pause, Play, Square } from "lucide-react"
import { useEffect, useState } from "react"
import { lignesApi, machinesApi, simulatorApi } from "@/lib/api"
import type { LigneProduction, Machine, MachineEvent } from "@/lib/types"
import { useSimulator } from "@/hooks/useSimulator"
import { useWebSocket } from "@/hooks/useWebSocket"
import { EVENT_LABEL, EVENT_TONE } from "@/lib/eventLabels"
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Page,
  Select,
  Table,
  Td,
  Th,
} from "@/components/dashboard/primitives"
import { cn } from "@/lib/utils"

const STATUT_DOT: Record<string, string> = {
  MARCHE: "bg-emerald-500",
  ARRET: "bg-muted-foreground/50",
  PAUSE: "bg-amber-500",
  PANNE: "bg-red-500",
  MAINTENANCE: "bg-blue-500",
}

const STATUT_LABEL: Record<string, string> = {
  MARCHE: "En marche",
  ARRET: "À l'arrêt",
  PAUSE: "En pause",
  PANNE: "En panne",
  MAINTENANCE: "Maintenance",
}

const DOT_CLASS: Record<string, string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  neutral: "bg-muted-foreground/50",
}

const SCENARIOS = [
  {
    nom: "panne-critique" as const,
    label: "Provoquer une panne",
    description: "Une machine en production s'arrête net.",
  },
  {
    nom: "derive-qualite" as const,
    label: "Provoquer des défauts",
    description: "Trop de pièces rejetées d'un coup.",
  },
  {
    nom: "rupture-stock" as const,
    label: "Vider un stock",
    description: "Une matière première passe sous le seuil.",
  },
]

function cadenceParMin(m: Machine): number | null {
  const cycleS = Number(m.temps_cycle_actuel_s ?? m.temps_cycle_cible_s ?? 0)
  return cycleS > 0 ? 60 / cycleS : null
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className={cn("text-sm font-semibold", tone)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function EventJournal({ events }: { events: MachineEvent[] }) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Journal des événements</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState message="Aucun événement pour le moment." />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    DOT_CLASS[EVENT_TONE[e.type] ?? "neutral"],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleTimeString("fr-FR")}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

/** Pupitre de simulation simplifié : on choisit une ligne, on voit chaque machine de
 * la ligne (cadence, quantité, rejets, TRS), on clique une ligne du tableau pour la
 * piloter — remplace la console HTML embarquée en iframe par une vraie page de l'app. */
export function SimulateurPage() {
  const [lignes, setLignes] = useState<LigneProduction[]>([])
  const [ligneId, setLigneId] = useState<number | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [machineId, setMachineId] = useState<number | null>(null)
  const [scenarioNom, setScenarioNom] = useState<string | null>(null)
  const [scenarioMessage, setScenarioMessage] = useState<string | null>(null)
  const { lastMessage } = useWebSocket()
  const { machine, events, loading, error, run } = useSimulator(machineId)

  useEffect(() => {
    lignesApi
      .list()
      .then((list) => {
        setLignes(list)
        setLigneId((id) => id ?? list[0]?.id ?? null)
      })
      .catch(() => {})
  }, [])

  // Rechargé à chaque événement WebSocket pour garder cadence/quantité/rejets/TRS à jour.
  useEffect(() => {
    if (ligneId == null) {
      setMachines([])
      return
    }
    machinesApi
      .list(ligneId)
      .then((list) => {
        setMachines(list)
        setMachineId((id) => (id != null && list.some((m) => m.id === id) ? id : (list[0]?.id ?? null)))
      })
      .catch(() => {})
  }, [ligneId, lastMessage])

  async function lancerScenario(nom: (typeof SCENARIOS)[number]["nom"]) {
    setScenarioNom(nom)
    setScenarioMessage(null)
    try {
      const r = await simulatorApi.scenario(nom)
      setScenarioMessage(r.message)
    } catch (e) {
      setScenarioMessage(e instanceof Error ? e.message : "Erreur lors du scénario.")
    } finally {
      setScenarioNom(null)
    }
  }

  return (
    <Page
      fullHeight
      title="Simulateur"
      description="Piloter une ligne : machines, incidents, réaction de Nova."
    >
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <Select
          value={ligneId ?? ""}
          onChange={(e) => setLigneId(e.target.value ? Number(e.target.value) : null)}
          className="w-fit min-w-56 shrink-0"
        >
          {lignes.length === 0 && <option value="">Aucune ligne</option>}
          {lignes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} — {l.designation}
            </option>
          ))}
        </Select>

        <ErrorBanner message={error} />

        <div className="max-h-56 shrink-0 overflow-y-auto">
          {machines.length === 0 ? (
            <EmptyState message="Aucune machine sur cette ligne." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Machine</Th>
                  <Th className="text-right">Cadence</Th>
                  <Th className="text-right">Quantité</Th>
                  <Th className="text-right">Rejets</Th>
                  <Th className="text-right">TRS</Th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => {
                  const cadence = cadenceParMin(m)
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setMachineId(m.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent/40",
                        machineId === m.id && "bg-accent/60",
                      )}
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 shrink-0 rounded-full", STATUT_DOT[m.statut])} />
                          <span className="font-medium">
                            {m.code} — {m.nom}
                          </span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        {cadence != null ? `${cadence.toFixed(1)} u/min` : "—"}
                      </Td>
                      <Td className="text-right">{m.quantite_produite}</Td>
                      <Td className="text-right">{m.quantite_rejetee}</Td>
                      <Td className="text-right">
                        {m.trs != null ? `${Math.round(Number(m.trs) * 100)}%` : "—"}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </div>

        {!machine ? (
          <EmptyState message="Choisissez une machine dans le tableau ci-dessus." />
        ) : (
          <Card className="shrink-0 p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2.5 rounded-full", STATUT_DOT[machine.statut])} />
                <div>
                  <p className="text-sm font-semibold">
                    {STATUT_LABEL[machine.statut] ?? machine.statut}
                  </p>
                  <p className="text-xs text-muted-foreground">{machine.nom}</p>
                </div>
              </div>
              <Stat
                label="TRS"
                value={machine.trs != null ? `${Math.round(Number(machine.trs) * 100)}%` : "—"}
              />
              <Stat
                label="Unités bonnes"
                value={String(machine.quantite_bonne)}
                tone="text-emerald-600 dark:text-emerald-400"
              />
              <Stat
                label="Unités rejetées"
                value={String(machine.quantite_rejetee)}
                tone="text-red-600 dark:text-red-400"
              />
              <Stat
                label="Cycle / unité"
                value={`${machine.temps_cycle_actuel_s ?? machine.temps_cycle_cible_s ?? "—"} s`}
              />
              <Stat label="OF en cours" value={machine.numero_of_actif ?? "—"} />
            </div>

            {machine.downtime_actif && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Arrêt en cours : {machine.downtime_actif.cause.replaceAll("_", " ").toLowerCase()}
                {machine.downtime_actif.operator_comment
                  ? ` — ${machine.downtime_actif.operator_comment}`
                  : ""}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => run(() => simulatorApi.start(machine.id))}
                disabled={loading || machine.statut === "MARCHE"}
              >
                <Play className="size-4" /> Démarrer
              </Button>
              <Button
                variant="outline"
                onClick={() => run(() => simulatorApi.pause(machine.id))}
                disabled={loading || machine.statut !== "MARCHE"}
              >
                <Pause className="size-4" /> Pause
              </Button>
              <Button
                variant="danger"
                onClick={() => run(() => simulatorApi.stop(machine.id))}
                disabled={loading || machine.statut === "ARRET"}
              >
                <Square className="size-4" /> Arrêter
              </Button>
              <Button
                variant="outline"
                onClick={() => run(() => simulatorApi.alarme(machine.id))}
                disabled={loading}
              >
                <AlertTriangle className="size-4" /> Alarme
              </Button>
            </div>
          </Card>
        )}

        <div className="shrink-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Provoquer un incident
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <Button
                key={s.nom}
                variant="outline"
                onClick={() => lancerScenario(s.nom)}
                disabled={scenarioNom !== null}
                className="h-auto flex-col items-start gap-0.5 py-2"
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{s.description}</span>
              </Button>
            ))}
          </div>
          {scenarioMessage && <p className="mt-2 text-sm text-muted-foreground">{scenarioMessage}</p>}
        </div>

        <div className="min-h-0 flex-1">
          <EventJournal events={events} />
        </div>
      </div>
    </Page>
  )
}
