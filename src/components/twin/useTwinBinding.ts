import { useEffect, useState } from "react"
import { ligneFluxApi, machinesApi, ordresApi } from "@/lib/api"
import type { ArticleMini, LigneNode, Machine, OrdreFabrication } from "@/lib/types"
import { connectDashboardSocket } from "@/lib/websocket"
import { compatibleArticles } from "./lineProfiles"
import { STATIONS, TwinEngine, type StationId } from "./simulation"

/** Snapshot fonctionnel d'une ligne : données MES + catalogue réellement compatible. */
export interface TwinLineContext {
  line: LigneNode
  articles: ArticleMini[]
  machines: Machine[]
  activeOrder: OrdreFabrication | null
}

interface FleetSnapshot {
  contexts: TwinLineContext[]
  backendOk: boolean
  lastSyncAt: number | null
}

const engines = new Map<number, TwinEngine>()
const knownProduction = new Map<number, number>()
const knownRejects = new Map<number, number>()

let cachedSnapshot: FleetSnapshot = {
  contexts: [],
  backendOk: false,
  lastSyncAt: null,
}

const OFFLINE_CONTEXTS: TwinLineContext[] = [
  {
    line: { id: 1, code: "LIGNE-COMP-01", designation: "Ligne comprimés 1", actif: true, article_ids: [1] },
    articles: [{ id: 1, code: "PARA500", designation: "Paracétamol 500 mg" }],
    machines: [],
    activeOrder: null,
  },
  {
    line: { id: 2, code: "L2", designation: "Ligne conditionnement 2", actif: true, article_ids: [1] },
    articles: [{ id: 1, code: "PARA500", designation: "Paracétamol 500 mg" }],
    machines: [],
    activeOrder: null,
  },
  {
    line: { id: 3, code: "LIGNE-COMP-03", designation: "Ligne comprimés 3", actif: true, article_ids: [2, 3, 4] },
    articles: [
      { id: 2, code: "IBU400", designation: "Ibuprofène 400 mg" },
      { id: 3, code: "PARA1000", designation: "Paracétamol 1 000 mg" },
      { id: 4, code: "PARA-SIROP", designation: "Sirop de paracétamol" },
    ],
    machines: [],
    activeOrder: null,
  },
  {
    line: { id: 4, code: "LIGNE-COND-04", designation: "Ligne conditionnement 4", actif: true, article_ids: [10, 11, 12] },
    articles: [
      { id: 10, code: "TALC-POUDRE", designation: "Talc pharmaceutique" },
      { id: 11, code: "SACHET-EFFER", designation: "Sachets effervescents" },
      { id: 12, code: "POUDRE-BEBE", designation: "Poudre pour bébé" },
    ],
    machines: [],
    activeOrder: null,
  },
]

export function twinEngineForLine(lineId: number): TwinEngine {
  let engine = engines.get(lineId)
  if (!engine) {
    engine = new TwinEngine()
    engines.set(lineId, engine)
  }
  return engine
}

function takeMatching(remaining: Machine[], pattern: RegExp): Machine | null {
  const index = remaining.findIndex((machine) => pattern.test(`${machine.code} ${machine.nom}`))
  if (index < 0) return null
  return remaining.splice(index, 1)[0]
}

/**
 * Les quatre lignes n'ont pas le même nombre de machines. On conserve trois
 * étapes visuelles cohérentes et on lie les vraies machines pertinentes : tête
 * de procédé, contrôle, fin de ligne. Une étape sans machine reste explicite.
 */
function bindLineMachines(engine: TwinEngine, machines: Machine[]) {
  const remaining = [...machines].sort((a, b) => a.code.localeCompare(b.code, "fr"))
  const mapping: Partial<Record<StationId, Machine>> = {}

  mapping.blistereuse =
    takeMatching(remaining, /blist|comprim|doseuse|prépar|prepar/i) ?? remaining.shift() ?? undefined
  mapping.trieuse = takeMatching(remaining, /trieuse|pond|pes[eé]|check|contr[oô]le/i) ?? undefined
  mapping.vignetteuse =
    takeMatching(remaining, /vignett|[ée]tiquet|encart|conditionneuse|sachet/i) ??
    remaining.pop() ??
    undefined

  if (!mapping.trieuse && remaining.length > 0) mapping.trieuse = remaining.shift()
  if (!mapping.vignetteuse && remaining.length > 0) mapping.vignetteuse = remaining.pop()

  for (const station of STATIONS) {
    const machine = mapping[station]
    engine.bindMachine(station, machine?.id ?? null, machine?.code ?? null)
    if (!machine) {
      engine.setStatut(station, "ARRET")
      engine.setCounts(station, 0, 0)
    }
  }
  engine.mesDriven = true
}

function applyMachine(machine: Machine, seed: boolean) {
  const engine = twinEngineForLine(machine.ligne_production_id)
  const station = engine.stationByMachine(machine.id)
  if (!station) return

  engine.setStatut(station.id, machine.statut)
  engine.setCounts(station.id, machine.quantite_bonne, machine.quantite_rejetee)
  if (station.id === "blistereuse") {
    const cycle = Number(machine.temps_cycle_actuel_s ?? machine.temps_cycle_cible_s)
    if (cycle > 0) engine.setCycle(cycle)
  }
  engine.syncVirtualStations()

  const total = machine.quantite_bonne + machine.quantite_rejetee
  const previousTotal = knownProduction.get(machine.id)
  const previousRejects = knownRejects.get(machine.id)
  if (!seed) {
    if (station.id === "blistereuse" && previousTotal != null && total > previousTotal) {
      engine.queueSpawn(total - previousTotal)
    }
    if (previousRejects != null && machine.quantite_rejetee > previousRejects) {
      engine.queueReject(station.id, machine.quantite_rejetee - previousRejects)
    }
    if (station.id === "trieuse" && previousTotal != null && previousRejects != null) {
      if (machine.quantite_rejetee > previousRejects) engine.recordWeight(false)
      else if (total > previousTotal) engine.recordWeight(true)
    }
  }
  knownProduction.set(machine.id, total)
  knownRejects.set(machine.id, machine.quantite_rejetee)
}

function activeOrderForLine(
  lineId: number,
  machines: Machine[],
  orders: OrdreFabrication[],
): OrdreFabrication | null {
  const activeId = machines.find((machine) => machine.ordre_fabrication_id != null)
    ?.ordre_fabrication_id
  return (
    orders.find((order) => order.id === activeId && order.statut === "EN_COURS") ??
    orders.find((order) => order.ligne_production_id === lineId && order.statut === "EN_COURS") ??
    null
  )
}

/**
 * Synchronise les quatre lignes en une seule connexion. Les moteurs restent en
 * mémoire entre deux visites ; au retour, un snapshot frais recale les compteurs
 * et les deltas survenus en arrière-plan sont rejoués sans réinitialiser la scène.
 */
export function useTwinBinding(): FleetSnapshot {
  const [snapshot, setSnapshot] = useState<FleetSnapshot>(cachedSnapshot)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [flux, allMachines, orders] = await Promise.all([
        ligneFluxApi.get(),
        machinesApi.list(),
        ordresApi.list(),
      ])
      if (cancelled) return

      const contexts = flux.lignes
        .filter((line) => line.actif)
        .map((line) => {
          const machines = allMachines.filter((machine) => machine.ligne_production_id === line.id)
          const engine = twinEngineForLine(line.id)
          const activeOrder = activeOrderForLine(line.id, machines, orders)
          const activeMachineId =
            machines.find((machine) => machine.ordre_fabrication_id === activeOrder?.id)?.id ?? null
          bindLineMachines(engine, machines)
          engine.setActiveOrder(activeOrder?.id ?? null, activeMachineId)
          for (const machine of machines) applyMachine(machine, !knownProduction.has(machine.id))
          engine.syncVirtualStations()
          return {
            line,
            articles: compatibleArticles(line, flux.articles),
            machines,
            activeOrder,
          }
        })

      cachedSnapshot = { contexts, backendOk: true, lastSyncAt: Date.now() }
      setSnapshot(cachedSnapshot)
    }

    void load().catch(() => {
      if (cancelled) return
      cachedSnapshot = {
        ...cachedSnapshot,
        contexts: cachedSnapshot.contexts.length > 0 ? cachedSnapshot.contexts : OFFLINE_CONTEXTS,
        backendOk: false,
      }
      for (const engine of engines.values()) engine.mesDriven = false
      setSnapshot(cachedSnapshot)
    })

    const closeSocket = connectDashboardSocket(
      (data) => {
        if (cancelled) return
        const message = data as { type?: string; machine?: Machine }
        if (message.type !== "machine_update" || !message.machine?.id) return
        const previous = cachedSnapshot.contexts
          .flatMap((context) => context.machines)
          .find((machine) => machine.id === message.machine!.id)
        applyMachine(message.machine, !knownProduction.has(message.machine.id))

        // Bascule d'OF (ex. Nova a déplacé la production vers une autre ligne) :
        // resynchronisation complète immédiate pour recaler l'OF actif et le
        // produit visualisé de chaque ligne, sans attendre le poll de 15 s.
        if (previous && previous.ordre_fabrication_id !== message.machine.ordre_fabrication_id) {
          void load().catch(() => {})
          return
        }

        // Les compteurs vivent dans le moteur. React ne se réveille que pour un
        // changement structurel utile à l'interface (statut ou OF), pas à chaque pièce.
        if (
          previous &&
          previous.statut === message.machine.statut &&
          previous.ordre_fabrication_id === message.machine.ordre_fabrication_id
        ) {
          return
        }
        const contexts = cachedSnapshot.contexts.map((context) =>
          context.line.id !== message.machine!.ligne_production_id
            ? context
            : {
                ...context,
                machines: context.machines.map((machine) =>
                  machine.id === message.machine!.id ? message.machine! : machine,
                ),
              },
        )
        cachedSnapshot = { ...cachedSnapshot, contexts, lastSyncAt: Date.now() }
        setSnapshot(cachedSnapshot)
      },
      (connected) => {
        if (cancelled || connected === cachedSnapshot.backendOk) return
        cachedSnapshot = { ...cachedSnapshot, backendOk: connected }
        setSnapshot(cachedSnapshot)
      },
    )

    const timer = window.setInterval(() => void load().catch(() => {}), 15000)
    return () => {
      cancelled = true
      closeSocket()
      window.clearInterval(timer)
    }
  }, [])

  return snapshot
}
