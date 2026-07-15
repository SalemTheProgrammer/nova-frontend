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

export const twinSession = {
  get focusedLineId() {
    return state.focusedLineId
  },
  setFocusedLine(lineId: number) {
    state.focusedLineId = lineId
    save()
  },
  get selectedStation() {
    return state.selectedStation
  },
  setStation(station: StationId | null) {
    state.selectedStation = station
    save()
  },
  get labelsOn() {
    return state.labelsOn
  },
  setLabelsOn(value: boolean) {
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
