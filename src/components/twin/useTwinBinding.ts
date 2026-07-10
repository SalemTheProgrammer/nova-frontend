import { useEffect, useMemo, useState } from "react"
import { machinesApi, simulatorApi } from "@/lib/api"
import type { CauseRebut, Machine } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import { STATIONS, type StationId, type TwinEngine, type TwinEvent } from "./simulation"

/**
 * Liaison bidirectionnelle jumeau ↔ MES :
 * - les machines de la ligne sont associées aux postes du jumeau par leur nom
 *   (« blist… » → blistéreuse, etc.), les restantes dans l'ordre ;
 * - les statuts remontent en direct via le WebSocket (une PANNE côté MES fait
 *   clignoter la colonne rouge et fige le tronçon dans la 3D) ;
 * - les commandes redescendent via l'API simulateur quand le poste est lié ;
 * - si `publier` est actif, chaque bonne pièce / rejet du jumeau est poussé
 *   vers le MES (les dashboards TRS bougent en même temps que la 3D).
 * Sans backend, tout fonctionne en local : le jumeau reste autonome.
 */

const PATTERNS: Array<[StationId, RegExp]> = [
  ["blistereuse", /blist/i],
  ["trieuse", /trieuse|pond[eé]r|checkweig|pes[eé]e/i],
  ["vignetteuse", /vignett|[ée]tiquet|label/i],
]

const CAUSE_PAR_POSTE: Record<StationId, CauseRebut> = {
  blistereuse: "DEFAUT_VISUEL",
  trieuse: "DEFAUT_DIMENSIONNEL",
  vignetteuse: "NON_CONFORMITE_PROCESS",
}

export interface TwinCommands {
  demarrer: (id: StationId) => void
  pause: (id: StationId) => void
  arreter: (id: StationId) => void
  panne: (id: StationId) => void
  resoudre: (id: StationId) => void
  demarrerTout: () => void
  pauseTout: () => void
  arreterTout: () => void
}

export function useTwinBinding(
  engine: TwinEngine,
  ligneId: number | null,
  publier: boolean,
): { backendOk: boolean; commands: TwinCommands } {
  const [backendOk, setBackendOk] = useState(false)
  const { lastMessage } = useWebSocket()

  // Association machines MES → postes du jumeau.
  useEffect(() => {
    let annule = false
    machinesApi
      .list(ligneId ?? undefined)
      .then((machines) => {
        if (annule) return
        setBackendOk(true)
        const libres = new Set<StationId>(STATIONS)
        const assign = (id: StationId, m: Machine) => {
          engine.bindMachine(id, m.id, m.code)
          engine.setStatut(id, m.statut)
          libres.delete(id)
        }
        for (const [id, pattern] of PATTERNS) {
          const m = machines.find((mm) => pattern.test(mm.nom) || pattern.test(mm.code))
          if (m) assign(id, m)
        }
        // Machines restantes → postes encore libres, dans l'ordre.
        const dejaLiees = new Set(
          STATIONS.map((id) => engine.stations[id].machineId).filter((v) => v != null),
        )
        for (const m of machines) {
          if (dejaLiees.has(m.id)) continue
          const poste = STATIONS.find((id) => libres.has(id))
          if (!poste) break
          assign(poste, m)
          dejaLiees.add(m.id)
        }
      })
      .catch(() => {
        if (annule) return
        setBackendOk(false)
        for (const id of STATIONS) engine.bindMachine(id, null, null)
      })
    return () => {
      annule = true
    }
  }, [engine, ligneId])

  // Statuts temps réel entrants (WebSocket MES).
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== "machine_update") return
    const m = lastMessage.machine as unknown as Machine
    if (!m?.id) return
    const st = engine.stationByMachine(m.id)
    if (st) engine.setStatut(st.id, m.statut)
  }, [lastMessage, engine])

  // Publication des événements de production vers le MES.
  useEffect(() => {
    if (!publier) {
      engine.onEvent = null
      return
    }
    engine.onEvent = (ev: TwinEvent) => {
      const machineId = engine.stations[ev.station].machineId
      if (machineId == null) return
      const appel =
        ev.type === "bonne"
          ? simulatorApi.produireBonne(machineId, 1)
          : simulatorApi.produireRebut(machineId, 1, CAUSE_PAR_POSTE[ev.station])
      appel.catch(() => {})
    }
    return () => {
      engine.onEvent = null
    }
  }, [publier, engine])

  const commands = useMemo<TwinCommands>(() => {
    const surMachine = (id: StationId, action: (machineId: number) => Promise<Machine>) => {
      const machineId = engine.stations[id].machineId
      if (machineId != null) action(machineId).catch(() => {})
    }
    return {
      demarrer: (id) => {
        engine.setStatut(id, "MARCHE")
        surMachine(id, (m) => simulatorApi.start(m))
      },
      pause: (id) => {
        engine.setStatut(id, "PAUSE")
        surMachine(id, (m) => simulatorApi.pause(m))
      },
      arreter: (id) => {
        engine.setStatut(id, "ARRET")
        surMachine(id, (m) => simulatorApi.stop(m))
      },
      panne: (id) => {
        engine.setStatut(id, "PANNE")
        surMachine(id, (m) => simulatorApi.alarme(m, "Panne simulée depuis le jumeau numérique"))
      },
      resoudre: (id) => {
        engine.setStatut(id, "MARCHE")
        surMachine(id, async (m) => {
          await simulatorApi.resoudreArret(m, "Résolu depuis le jumeau numérique").catch(() => {})
          return simulatorApi.start(m)
        })
      },
      demarrerTout: () => {
        for (const id of STATIONS) {
          engine.setStatut(id, "MARCHE")
          surMachine(id, (m) => simulatorApi.start(m))
        }
      },
      pauseTout: () => {
        for (const id of STATIONS) {
          engine.setStatut(id, "PAUSE")
          surMachine(id, (m) => simulatorApi.pause(m))
        }
      },
      arreterTout: () => {
        for (const id of STATIONS) {
          engine.setStatut(id, "ARRET")
          surMachine(id, (m) => simulatorApi.stop(m))
        }
      },
    }
  }, [engine])

  return { backendOk, commands }
}
