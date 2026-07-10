import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { STATIONS, twinEngine, type StationId } from "./simulation"
import { TwinScene, flightTo, type CameraFlight, CAMERA_PRESETS } from "./TwinScene"
import { TwinSidePanel } from "./TwinSidePanel"
import { useTwinBinding } from "./useTwinBinding"
import { twinBus, type TwinCommand } from "./twinBus"

/**
 * Jumeau numérique de la ligne de conditionnement — réplique 3D fidèle
 * (blistéreuse, trieuse pondérale, vignetteuse et leurs trois postes de rejet),
 * animée en temps réel et liée au MES quand le backend est disponible.
 *
 * Il n'y a plus de pupitre de réglages manuels : c'est l'assistant Nova qui
 * pilote la ligne (démarrer, vitesse, cadence, taux de défauts, panne, vue…)
 * via le canal `twinBus`. Le panneau de gauche n'affiche que l'état.
 */
export function DigitalTwinPage({ ligneId }: { ligneId: number | null }) {
  const engine = twinEngine

  // Re-render des panneaux à chaque évènement moteur (compteurs, statuts…).
  useSyncExternalStore(engine.subscribe, engine.getVersion)

  const [selected, setSelected] = useState<StationId | null>(null)
  const [labelsOn, setLabelsOn] = useState(true)
  const [publier, setPublier] = useState(false)
  const flightRef = useRef<CameraFlight | null>(null)

  const { commands } = useTwinBinding(engine, ligneId, publier)

  function selectionner(station: StationId) {
    setSelected(station)
    flightRef.current = flightTo(station)
  }

  // Application des commandes de Nova. On garde la logique dans une ref pour
  // enregistrer un handler stable auprès du bus tout en voyant les `commands`
  // à jour (elles changent quand la liaison MES se (re)fait).
  const appliquerRef = useRef<(cmd: TwinCommand) => void>(() => {})
  appliquerRef.current = (cmd: TwinCommand) => {
    const poste = cmd.cible as StationId | "tout" | undefined
    const estPoste = poste && poste !== "tout" && STATIONS.includes(poste as StationId)
    switch (cmd.action) {
      case "demarrer":
        estPoste ? commands.demarrer(poste as StationId) : commands.demarrerTout()
        break
      case "pause":
        estPoste ? commands.pause(poste as StationId) : commands.pauseTout()
        break
      case "arreter":
        estPoste ? commands.arreter(poste as StationId) : commands.arreterTout()
        break
      case "panne":
        commands.panne((estPoste ? poste : "trieuse") as StationId)
        break
      case "resoudre":
        commands.resoudre((estPoste ? poste : "trieuse") as StationId)
        break
      case "vitesse":
        if (typeof cmd.valeur === "number") engine.setSpeed(cmd.valeur)
        break
      case "cadence":
        if (typeof cmd.valeur === "number") engine.setCycle(cmd.valeur)
        break
      case "defauts":
        if (typeof cmd.valeur === "number") {
          if (estPoste) engine.setDefectRate(poste as StationId, cmd.valeur)
          else for (const id of STATIONS) engine.setDefectRate(id, cmd.valeur)
        }
        break
      case "publier":
        setPublier(Boolean(cmd.valeur))
        break
      case "annotations":
        setLabelsOn(Boolean(cmd.valeur))
        break
      case "vue": {
        const preset = (cmd.cible ?? "ensemble") as keyof typeof CAMERA_PRESETS
        if (preset in CAMERA_PRESETS) {
          flightRef.current = flightTo(preset)
          if (preset in engine.stations) setSelected(preset as StationId)
        }
        break
      }
      case "reset":
        engine.reset()
        break
    }
  }

  useEffect(() => {
    twinBus.setHandler((cmd) => appliquerRef.current(cmd))
    return () => twinBus.setHandler(null)
  }, [])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <TwinScene
        engine={engine}
        flightRef={flightRef}
        labelsOn={labelsOn}
        onSelect={selectionner}
      />

      {/* Fiche du poste sélectionné */}
      {selected && (
        <div className="pointer-events-none absolute right-4 top-4 z-40">
          <TwinSidePanel
            station={selected}
            engine={engine}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* Aide de navigation */}
      <p className="pointer-events-none absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow backdrop-blur">
        Glisser : orbiter · Molette : zoom · Clic droit : déplacer · Cliquez une machine pour voir sa fiche
      </p>
    </div>
  )
}
