import type { StationId } from "./simulation"

export interface TwinCameraState {
  position: [number, number, number]
  target: [number, number, number]
}

interface StoredTwinSession {
  focusedLineId: number | null
  selectedStation: StationId | null
  labelsOn: boolean
  camera: TwinCameraState | null
}

const STORAGE_KEY = "nova:twin-session:v3"

function load(): StoredTwinSession {
  if (typeof window === "undefined") {
    return { focusedLineId: null, selectedStation: null, labelsOn: true, camera: null }
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<StoredTwinSession>
    return {
      focusedLineId: parsed.focusedLineId ?? null,
      selectedStation: parsed.selectedStation ?? null,
      labelsOn: parsed.labelsOn ?? true,
      camera: parsed.camera ?? null,
    }
  } catch {
    return { focusedLineId: null, selectedStation: null, labelsOn: true, camera: null }
  }
}

const state = load()

function save() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Les setters ignorent une valeur inchangée : leurs appelants sont des effets
 * qui se rejouent au rythme du temps réel MES (l'identité du contexte change à
 * chaque rafraîchissement), et `save()` sérialise puis écrit dans localStorage
 * de façon synchrone — donc sur le thread qui anime la 3D.
 */
export const twinSession = {
  get focusedLineId() {
    return state.focusedLineId
  },
  setFocusedLine(lineId: number) {
    if (state.focusedLineId === lineId) return
    state.focusedLineId = lineId
    save()
  },
  get selectedStation() {
    return state.selectedStation
  },
  setStation(station: StationId | null) {
    if (state.selectedStation === station) return
    state.selectedStation = station
    save()
  },
  get labelsOn() {
    return state.labelsOn
  },
  setLabelsOn(value: boolean) {
    if (state.labelsOn === value) return
    state.labelsOn = value
    save()
  },
  get camera() {
    return state.camera
  },
  setCamera(camera: TwinCameraState) {
    state.camera = camera
    save()
  },
}
