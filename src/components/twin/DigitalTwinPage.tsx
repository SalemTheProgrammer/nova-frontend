import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Activity, CalendarClock, Eye, EyeOff, ListOrdered, Maximize2, Minimize2, Sparkles, TimerReset } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatutMachine } from "@/lib/types"
import { profileForLine, productVisualForArticle } from "./lineProfiles"
import { STATIONS, type StationId } from "./simulation"
import {
  TwinScene,
  flightTo,
  rowFlight,
  ensembleFlight,
  ROW_DEPTH,
  CAMERA_PRESETS,
  type CameraFlight,
  type TwinLineScene,
} from "./TwinScene"
import { TwinSidePanel } from "./TwinSidePanel"
import { TwinFreedBanner, TwinLineControls } from "./TwinLineControls"
import { twinEngineForLine, useTwinBinding } from "./useTwinBinding"
import { twinSession, type TwinCameraState } from "./twinSession"
import { twinBus, type TwinCommand } from "./twinBus"
import { useWebSocket } from "@/hooks/useWebSocket"
import { ordresApi } from "@/lib/api"

/** Charge utile de l'événement `ligne_liberee` diffusé quand un OF atteint sa quantité. */
interface LigneLibereeEvent {
  type: "ligne_liberee"
  ligne_production_id: number
  machine_code: string
  prochain_of: { id: number; numero: string; code_article: string | null } | null
}

const STATUT_DOT: Record<StatutMachine, string> = {
  MARCHE: "bg-emerald-500",
  PAUSE: "bg-amber-500",
  ARRET: "bg-slate-400",
  PANNE: "animate-pulse bg-red-500",
  MAINTENANCE: "bg-blue-500",
}

export function DigitalTwinPage({
  ligneId,
  onChangeLigne,
  fullscreen,
  onFullscreenChange,
  onAskNova,
}: {
  ligneId: number | null
  onChangeLigne: (lineId: number | null) => void
  fullscreen: boolean
  onFullscreenChange: (on: boolean) => void
  onAskNova: (message: string) => void
}) {
  const { contexts, backendOk, lastSyncAt } = useTwinBinding()

  const allLines = useMemo<TwinLineScene[]>(
    () =>
      contexts.map((ctx) => {
        const article =
          ctx.articles.find((a) => a.id === ctx.activeOrder?.article_id) ?? ctx.articles[0] ?? null
        return {
          id: ctx.line.id,
          label: `${ctx.line.code} · ${ctx.line.designation}`,
          engine: twinEngineForLine(ctx.line.id),
          profile: profileForLine(ctx.line),
          productVisual: productVisualForArticle(article),
        }
      }),
    [contexts],
  )

  const [focusedLineId, setFocusedLineId] = useState<number | null>(() => twinSession.focusedLineId)
  const focusedContext = useMemo(() => {
    // Le filtre de ligne global reste la source de vérité lorsqu'il est défini.
    const preferred = ligneId ?? focusedLineId ?? twinSession.focusedLineId
    return contexts.find((item) => item.line.id === preferred) ?? contexts[0] ?? null
  }, [contexts, focusedLineId, ligneId])
  const currentLineId = focusedContext?.line.id ?? 0
  // Keep three production rows visible. When another line is selected, slide the
  // three-line window so the selected line is always part of the live scene.
  const lines = useMemo(() => {
    const visibleCount = Math.min(3, allLines.length)
    if (visibleCount === allLines.length) return allLines
    const focusedIndex = Math.max(0, allLines.findIndex((line) => line.id === currentLineId))
    const start = Math.min(Math.max(0, focusedIndex - 1), allLines.length - visibleCount)
    return allLines.slice(start, start + visibleCount)
  }, [allLines, currentLineId])
  const rowZById = useMemo(
    () => new Map(lines.map((line, index) => [line.id, index * ROW_DEPTH])),
    [lines],
  )
  const engine = twinEngineForLine(currentLineId)
  useSyncExternalStore(engine.subscribe, engine.getVersion)
  const focusedProfile = focusedContext ? profileForLine(focusedContext.line) : null

  const [selected, setSelected] = useState<StationId | null>(() => twinSession.selectedStation)
  const [labelsOn, setLabelsOn] = useState(() => twinSession.labelsOn)
  // Lu une seule fois : chaque sauvegarde remplace `twinSession.camera`, et lire
  // cet objet pendant le rendu ferait varier la prop passée à la scène.
  const [initialCamera] = useState(() => twinSession.camera)
  const [showQueue, setShowQueue] = useState(false)
  const flightRef = useRef<CameraFlight | null>(null)
  const previousLineIdRef = useRef<number | null>(null)

  // File d'attente & notification « ligne libérée » (notify & confirm).
  const { lastMessage } = useWebSocket()
  const [queueKey, setQueueKey] = useState(0)
  const [freed, setFreed] = useState<LigneLibereeEvent | null>(null)
  const [launchingNext, setLaunchingNext] = useState(false)

  useEffect(() => {
    if (lastMessage?.type === "ligne_liberee") {
      setFreed(lastMessage as unknown as LigneLibereeEvent)
      setQueueKey((k) => k + 1)
    } else if (lastMessage?.type === "ordres_update") {
      setQueueKey((k) => k + 1)
    }
  }, [lastMessage])

  useEffect(() => {
    if (!focusedContext) return
    if (ligneId !== focusedContext.line.id) onChangeLigne(focusedContext.line.id)
    twinSession.setFocusedLine(focusedContext.line.id)
  }, [focusedContext, ligneId, onChangeLigne])

  useEffect(() => twinSession.setStation(selected), [selected])
  useEffect(() => twinSession.setLabelsOn(labelsOn), [labelsOn])

  useEffect(() => {
    if (currentLineId <= 0 || !rowZById.has(currentLineId)) return
    if (previousLineIdRef.current === null) {
      flightRef.current = ensembleFlight(lines.length)
    } else if (previousLineIdRef.current !== currentLineId) {
      flightRef.current = rowFlight(rowZById.get(currentLineId) ?? 0)
    }
    previousLineIdRef.current = currentLineId
  }, [currentLineId, lines.length, rowZById])

  function selectLine(lineId: number) {
    setFocusedLineId(lineId)
    if (ligneId !== lineId) onChangeLigne(lineId)
    setSelected(null)
  }

  // Identité stable : `TwinScene` est mémoïsé, une callback recréée à chaque
  // rendu rouvrirait la porte aux reconstructions inutiles de l'arbre 3D.
  const selectStation = useCallback(
    (lineId: number, station: StationId) => {
      setFocusedLineId(lineId)
      if (ligneId !== lineId) onChangeLigne(lineId)
      setSelected(station)
      flightRef.current = flightTo(station, rowZById.get(lineId) ?? 0)
    },
    [ligneId, onChangeLigne, rowZById],
  )

  const saveCamera = useCallback((next: TwinCameraState) => {
    twinSession.setCamera(next)
  }, [])

  const applyRef = useRef<(command: TwinCommand) => void>(() => {})
  applyRef.current = (command) => {
    switch (command.action) {
      case "annotations":
        setLabelsOn(Boolean(command.valeur))
        break
      case "vue": {
        const cible = command.cible ?? "ensemble"
        if (cible === "ensemble") {
          flightRef.current = ensembleFlight(lines.length)
        } else if (cible in CAMERA_PRESETS) {
          const preset = cible as keyof typeof CAMERA_PRESETS
          flightRef.current = flightTo(preset, rowZById.get(currentLineId) ?? 0)
          if (STATIONS.includes(cible as StationId)) setSelected(cible as StationId)
        }
        break
      }
      case "ligne": {
        const target = normalize(command.cible ?? "")
        const match = contexts.find(({ line }) =>
          [String(line.id), line.code, line.designation].some((value) => normalize(value) === target || normalize(value).includes(target)),
        )
        if (match) {
          selectLine(match.line.id)
        }
        break
      }
    }
  }

  useEffect(() => {
    twinBus.setHandler((command) => applyRef.current(command))
    return () => twinBus.setHandler(null)
  }, [])

  function toggleFullscreen() {
    const next = !fullscreen
    onFullscreenChange(next)
    if (next) void document.documentElement.requestFullscreen?.().catch(() => {})
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && fullscreen) onFullscreenChange(false)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [fullscreen, onFullscreenChange])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFullscreenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen, onFullscreenChange])

  useEffect(() => () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }, [])

  const lancerProchain = async () => {
    if (!freed?.prochain_of) return
    setLaunchingNext(true)
    try {
      await ordresApi.lancer(freed.prochain_of.id)
      setFreed(null)
      setQueueKey((k) => k + 1)
    } catch {
      // La ligne peut s'être re-remplie : on ouvre le panneau de file pour arbitrer.
      setShowQueue(true)
    } finally {
      setLaunchingNext(false)
    }
  }

  const askImpact = () => {
    if (!focusedContext) return
    const order = focusedContext.activeOrder
    onAskNova(order
      ? `Actualise d'abord les données MES en temps réel. Analyse ensuite en lecture seule l'impact d'une bascule de l'OF ${order.numero}, actuellement associé à ${focusedContext.line.code}, vers chacune des autres lignes compatibles. Utilise choisir_meilleure_ligne puis analyser_bascule_of pour les cibles pertinentes, et chiffre le temps de réglage, la capacité, le retard ou gain estimé et les risques. Si la ligne cible ou mon intention n'est pas claire, pose-moi une question. Ne lance aucune bascule sans ma confirmation explicite.`
      : `Actualise d'abord les données MES en temps réel. Analyse en lecture seule la capacité et l'impact d'une future bascule vers ou depuis ${focusedContext.line.code} (${focusedContext.line.designation}). Compare les autres lignes compatibles, le temps de réglage, la capacité et les risques. Demande-moi l'OF et la ligne cible s'ils manquent. Ne lance aucune action.`)
  }

  const askRisk = () => {
    if (!focusedContext) return
    const machines = focusedContext.machines.map((machine) => machine.code).join(", ") || "les machines de la ligne"
    onAskNova(`Prédis le risque de panne pour ${focusedContext.line.code} sur les machines ${machines}. Donne les facteurs de risque, l'horizon, le niveau de confiance et les actions préventives prioritaires. Reste en lecture seule.`)
  }

  const askScenario = () => {
    if (!focusedContext) return
    const machine = focusedContext.machines[0]?.code ?? "la machine critique"
    onAskNova(`Simule une panne de 60 minutes de ${machine} sur ${focusedContext.line.code}. Estime les unités perdues, l'impact sur l'OF actif, le TRS et le rattrapage nécessaire, puis propose le meilleur scénario d'ordonnancement. Ne modifie rien.`)
  }

  const askPlanning = () => {
    if (!focusedContext) return
    onAskNova(`Compare les règles d'ordonnancement des OF ouverts en tenant compte de ${focusedContext.line.code}, de ses produits compatibles, des échéances, des temps de cycle et des changements de série. Utilise comparer_algorithmes, recommande la meilleure règle et signale les retards prévisionnels. Reste en lecture seule : n'applique aucun planning, ne lance aucun OF et ne change aucune affectation.`)
  }

  if (lines.length === 0 || !focusedContext || !focusedProfile) {
    return (
      <div className="flex min-h-[32rem] flex-1 items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
          <span className="size-2 animate-pulse rounded-full bg-primary" /> Synchronisation du jumeau…
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-[32rem] overflow-hidden", fullscreen ? "fixed inset-0 z-40 bg-background" : "relative h-full flex-1")}>
      <TwinScene
        lines={lines}
        flightRef={flightRef}
        labelsOn={labelsOn}
        initialCamera={initialCamera}
        onCameraState={saveCamera}
        onSelect={selectStation}
      />

      <div className="absolute left-3 top-3 z-30 max-w-[calc(100%-7rem)] rounded-2xl border border-white/65 bg-background/88 p-2 shadow-lg backdrop-blur-xl sm:left-4 sm:top-4">
        <div className="mb-1.5 flex items-center justify-between gap-4 px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">3 lignes visibles</span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={cn("size-2 rounded-full", backendOk ? "animate-pulse bg-emerald-500" : "bg-red-500")} />
            {backendOk ? `Temps réel${lastSyncAt ? ` · ${new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}` : "Données de secours"}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {lines.map((line) => (
            <button
              key={line.id}
              type="button"
              onClick={() => selectLine(line.id)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                line.id === currentLineId
                  ? "border-violet-400 bg-violet-600 text-white"
                  : "border-border bg-background/80 hover:border-violet-300 hover:bg-violet-50",
              )}
            >
              {line.label.split(" · ")[0]}
            </button>
          ))}
          <button type="button" onClick={() => { flightRef.current = ensembleFlight(lines.length) }} className="shrink-0 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Vue ensemble
          </button>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-30 flex gap-2 sm:right-4 sm:top-4">
        <button type="button" onClick={() => setShowQueue((value) => !value)} aria-label={showQueue ? "Masquer la file de la ligne" : "Afficher la file de la ligne"} className={cn("flex size-10 items-center justify-center rounded-xl border shadow-lg backdrop-blur-xl", showQueue ? "border-violet-400 bg-violet-600 text-white" : "border-white/65 bg-background/88 text-muted-foreground hover:text-foreground")}>
          <ListOrdered className="size-4" />
        </button>
        <button type="button" onClick={() => setLabelsOn((value) => !value)} aria-label={labelsOn ? "Masquer les annotations" : "Afficher les annotations"} className="flex size-10 items-center justify-center rounded-xl border border-white/65 bg-background/88 text-muted-foreground shadow-lg backdrop-blur-xl hover:text-foreground">
          {labelsOn ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"} className="flex size-10 items-center justify-center rounded-xl border border-white/65 bg-background/88 text-muted-foreground shadow-lg backdrop-blur-xl hover:text-foreground">
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {selected && (
        <div className={cn("absolute z-30", fullscreen ? "left-4 top-52" : "right-3 top-16 sm:right-4")}>
          <TwinSidePanel station={selected} engine={engine} profile={focusedProfile} onClose={() => setSelected(null)} />
        </div>
      )}

      {showQueue && !selected && (
        <div className={cn("absolute z-30", fullscreen ? "left-4 top-52" : "right-3 top-16 sm:right-4")}>
          <TwinLineControls
            lineId={focusedContext.line.id}
            lineCode={focusedContext.line.code}
            refreshKey={queueKey}
            onDone={() => setQueueKey((k) => k + 1)}
          />
        </div>
      )}

      {freed && freed.ligne_production_id === focusedContext.line.id && (
        <div className="absolute left-1/2 top-3 z-40 w-[min(30rem,calc(100%-1.5rem))] -translate-x-1/2 sm:top-20">
          <TwinFreedBanner
            lineCode={focusedContext.line.code}
            prochain={freed.prochain_of}
            launching={launchingNext}
            onLaunch={lancerProchain}
            onDismiss={() => setFreed(null)}
          />
        </div>
      )}

      <section className="absolute bottom-10 left-3 z-30 max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/65 bg-background/88 p-2 shadow-xl backdrop-blur-xl sm:bottom-4 sm:left-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="hidden shrink-0 items-center gap-1.5 px-2 text-xs font-bold sm:flex"><Sparkles className="size-3.5 text-violet-500" /> Demander à Nova · {focusedContext.line.code}</span>
          <NovaButton icon={TimerReset} label="Meilleure ligne / bascule" onClick={askImpact} />
          <NovaButton icon={Activity} label="Risque de panne" onClick={askRisk} />
          <NovaButton icon={Sparkles} label="Scénario 60 min" onClick={askScenario} />
          <NovaButton icon={CalendarClock} label="Prévision planning" onClick={askPlanning} />
        </div>
      </section>

      {fullscreen && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 hidden max-w-[calc(100%-2rem)] -translate-x-1/2 items-stretch gap-3 lg:flex">
          {STATIONS.map((station) => {
            const data = engine.stations[station]
            const total = data.bonne + data.rebut
            return (
              <button key={station} type="button" onClick={() => selectStation(currentLineId, station)} className="pointer-events-auto w-48 rounded-xl border border-white/60 bg-background/85 px-4 py-2.5 text-left shadow-lg backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold">{focusedProfile.stationNames[station]}</span>
                  <span className={cn("size-2.5 shrink-0 rounded-full", STATUT_DOT[data.statut])} />
                </div>
                <p className="mt-1 font-mono text-xs"><span className="text-emerald-600">OK {data.bonne}</span> · <span className="text-red-500">NOK {data.rebut}</span> · {total ? ((data.rebut / total) * 100).toFixed(1) : "0.0"}%</p>
              </button>
            )
          })}
        </div>
      )}

      <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/70 px-2 py-0.5 text-[9px] text-muted-foreground shadow-sm backdrop-blur sm:hidden">
        Glisser pour orbiter · pincer pour zoomer
      </p>
    </div>
  )
}

function NovaButton({ icon: Icon, label, onClick }: { icon: typeof Sparkles; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700">
      <Icon className="size-3.5" /> {label}
    </button>
  )
}

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
}
