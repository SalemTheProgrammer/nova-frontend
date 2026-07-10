import type { StatutMachine } from "@/lib/types"

/**
 * Moteur de simulation du jumeau numérique — pur TypeScript, aucune dépendance React.
 * Il fait vivre la ligne : apparition des blisters en sortie de blistéreuse, file
 * d'attente sur les convoyeurs, mise en étui, pesée, vignettage, et les trois
 * mécanismes de rejet (trappe, soufflage, poussoir) avec chute physique dans les bacs.
 * Le rendu 3D lit `products` et les impulsions à chaque frame ; les panneaux React
 * s'abonnent via `subscribe`/`version` (useSyncExternalStore).
 */

export type StationId = "blistereuse" | "trieuse" | "vignetteuse"
export type ProductKind = "blister" | "box"

export const STATIONS: StationId[] = ["blistereuse", "trieuse", "vignetteuse"]

export const STATION_NOMS: Record<StationId, string> = {
  blistereuse: "Blistéreuse",
  trieuse: "Trieuse Pondérale",
  vignetteuse: "Vignetteuse",
}

// --------------------------- Géométrie de la ligne --------------------------- //
// Unités en mètres, l'axe X est le sens de production (gauche → droite comme l'image).

/** Hauteur du dessus de bande. */
export const BELT_Y = 0.92
/** Vitesse de bande (m/s) à vitesse ×1. */
export const BELT_SPEED = 0.55

const GAP_MIN = 0.8
const GRAVITY = 9.81
/** Dessus du fond lumineux des bacs REJET (voir RejectBin). */
const BIN_FLOOR_Y = 0.22
const MAX_BINNED_PAR_BAC = 8
const MAX_PRODUITS_LIGNE = 48

/**
 * Enveloppe de frappe pneumatique pour les mécanismes de rejet et le tampon :
 * extension quasi instantanée (attaque courte) puis retour amorti, calée sur
 * une impulsion qui décroît de 1 vers 0. La frappe coïncide ainsi avec
 * l'éjection du produit au lieu d'arriver après coup.
 */
export function strike(pulse: number, attack = 0.15): number {
  if (pulse <= 0) return 0
  if (pulse >= 1 - attack) return (1 - pulse) / attack
  return Math.sin((pulse / (1 - attack)) * (Math.PI / 2))
}

export const LINE = {
  /** Sortie de la blistéreuse : point d'apparition des blisters. */
  spawnX: -6.32,
  /** Trappe de rejet des blisters non conformes (bac 1). */
  trapX: -4.55,
  /** Mise en étui implicite : le blister devient une boîte blanche. */
  cartonX: -0.4,
  /** Cellule de pesée : met à jour l'afficheur de la trieuse. */
  weighX: 0.55,
  /** Buse de soufflage pneumatique (bac 2). */
  blastX: 2.05,
  /** Tampon d'application de la vignette. */
  labelX: 5.05,
  /** Poussoir pneumatique (bac 3). */
  pushX: 7.6,
  /** Fin de ligne : la boîte quitte la scène. */
  endX: 10.45,
  conv1: { from: -6.28, to: -1.02 },
  weighBelt: { from: -1.0, to: 1.42 },
  conv2: { from: 1.44, to: 3.78 },
  labelBelt: { from: 3.8, to: 6.62 },
  conv3: { from: 6.64, to: 10.6 },
  bins: [
    { x: -4.55, z: 1.02 },
    { x: 2.05, z: 1.12 },
    { x: 7.6, z: 1.18 },
  ],
} as const

/** Demi-hauteur d'un produit posé sur la bande, par type. */
const HALF_H: Record<ProductKind, number> = { blister: 0.03, box: 0.12 }

export interface TwinProduct {
  id: number
  kind: ProductKind
  x: number
  y: number
  z: number
  rot: number
  vx: number
  vy: number
  vz: number
  mode: "belt" | "falling" | "binned"
  /** Index du bac de rejet (0..2) quand le produit a été éjecté. */
  bin: number
  weight: number
  labeled: boolean
  fateTrap: boolean
  fateWeight: boolean
  fateLabel: boolean
}

export interface TwinStation {
  id: StationId
  nom: string
  statut: StatutMachine
  /** Probabilité de rejet au poste (0..1). */
  defectRate: number
  bonne: number
  rebut: number
  /** Machine MES liée (null si le jumeau tourne en local pur). */
  machineId: number | null
  machineCode: string | null
}

export interface TwinEvent {
  station: StationId
  type: "bonne" | "rebut"
}

function makeStation(id: StationId, defectRate: number): TwinStation {
  return {
    id,
    nom: STATION_NOMS[id],
    statut: "ARRET",
    defectRate,
    bonne: 0,
    rebut: 0,
    machineId: null,
    machineCode: null,
  }
}

export class TwinEngine {
  /** Compteur de versions pour useSyncExternalStore (incrémenté à chaque notif). */
  version = 0

  products: TwinProduct[] = []

  stations: Record<StationId, TwinStation> = {
    blistereuse: makeStation("blistereuse", 0.1),
    trieuse: makeStation("trieuse", 0.12),
    vignetteuse: makeStation("vignetteuse", 0.1),
  }

  /** Multiplicateur global de vitesse (×0.5 à ×3). */
  speed = 1
  /** Temps de cycle de la blistéreuse (s) : cadence d'apparition des blisters. */
  cycleS = 3.5

  /** Dernier poids lu par la trieuse (g) — affiché sur son écran. */
  lastWeight = 237.5
  /** Flash de l'afficheur au passage d'une boîte (1 → 0). */
  weighFlash = 0

  // Impulsions d'animation (1 → 0) lues par les mécanismes 3D.
  trapPulse = 0
  blastPulse = 0
  pushPulse = 0
  tampPulse = 0
  /** Phase continue des presses de la blistéreuse. */
  pressPhase = 0

  /** Callback optionnel (publication MES) déclenché à chaque comptage. */
  onEvent: ((ev: TwinEvent) => void) | null = null

  private nextId = 1
  private spawnTimer = 1
  private listeners = new Set<() => void>()

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  getVersion = (): number => this.version

  private notify() {
    this.version++
    for (const cb of this.listeners) cb()
  }

  // --------------------------- Commandes --------------------------- //

  setStatut(id: StationId, statut: StatutMachine) {
    if (this.stations[id].statut === statut) return
    this.stations[id].statut = statut
    this.notify()
  }

  setAll(statut: StatutMachine) {
    for (const id of STATIONS) this.stations[id].statut = statut
    this.notify()
  }

  setDefectRate(id: StationId, rate: number) {
    this.stations[id].defectRate = Math.min(0.9, Math.max(0, rate))
    this.notify()
  }

  setSpeed(speed: number) {
    this.speed = Math.min(3, Math.max(0.25, speed))
    this.notify()
  }

  setCycle(cycleS: number) {
    this.cycleS = Math.min(10, Math.max(1.5, cycleS))
    // Prise d'effet immédiate : sans ce réarmement, le compte à rebours lancé à
    // l'ancienne cadence (jusqu'à ~10 s) continuerait de retarder le prochain blister.
    this.spawnTimer = Math.min(this.spawnTimer, this.cycleS)
    this.notify()
  }

  bindMachine(id: StationId, machineId: number | null, machineCode: string | null) {
    const st = this.stations[id]
    st.machineId = machineId
    st.machineCode = machineCode
    this.notify()
  }

  stationByMachine(machineId: number): TwinStation | null {
    for (const id of STATIONS) {
      if (this.stations[id].machineId === machineId) return this.stations[id]
    }
    return null
  }

  /** Vide la ligne et remet les compteurs à zéro (les statuts sont conservés). */
  reset() {
    this.products = []
    this.spawnTimer = 1
    this.trapPulse = this.blastPulse = this.pushPulse = this.tampPulse = 0
    for (const id of STATIONS) {
      this.stations[id].bonne = 0
      this.stations[id].rebut = 0
    }
    this.notify()
  }

  /** Station propriétaire du tronçon de bande à l'abscisse donnée. */
  stationOf(x: number): TwinStation {
    if (x < LINE.weighBelt.from) return this.stations.blistereuse
    if (x < LINE.labelBelt.from) return this.stations.trieuse
    return this.stations.vignetteuse
  }

  isRunning(id: StationId): boolean {
    return this.stations[id].statut === "MARCHE"
  }

  totalBonne(): number {
    return this.stations.vignetteuse.bonne
  }

  totalRebut(): number {
    return STATIONS.reduce((acc, id) => acc + this.stations[id].rebut, 0)
  }

  // --------------------------- Boucle de simulation --------------------------- //

  tick(rawDt: number) {
    const dt = Math.min(rawDt, 0.1) * this.speed

    // Décroissance des impulsions d'animation.
    this.trapPulse = Math.max(0, this.trapPulse - dt * 1.8)
    this.blastPulse = Math.max(0, this.blastPulse - dt * 2.2)
    this.pushPulse = Math.max(0, this.pushPulse - dt * 1.6)
    this.tampPulse = Math.max(0, this.tampPulse - dt * 2.4)
    this.weighFlash = Math.max(0, this.weighFlash - dt * 1.5)

    if (this.isRunning("blistereuse")) {
      // Une course de presse complète par cycle machine : le rythme visuel
      // des presses reste synchronisé avec la cadence de sortie des blisters.
      this.pressPhase += (dt * Math.PI * 2) / this.cycleS
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) {
        this.trySpawn()
        this.spawnTimer = this.cycleS * (0.92 + Math.random() * 0.16)
      }
    }

    this.moveBeltProducts(dt)
    this.moveFallingProducts(dt)
  }

  private trySpawn() {
    const actifs = this.products.filter((p) => p.mode === "belt")
    if (actifs.length >= MAX_PRODUITS_LIGNE) return
    // Ne pas faire apparaître un blister sur un autre (sortie machine occupée).
    if (actifs.some((p) => p.x < LINE.spawnX + GAP_MIN)) return

    const fateTrap = Math.random() < this.stations.blistereuse.defectRate
    const fateWeight = !fateTrap && Math.random() < this.stations.trieuse.defectRate
    const fateLabel = !fateTrap && !fateWeight && Math.random() < this.stations.vignetteuse.defectRate
    this.products.push({
      id: this.nextId++,
      kind: "blister",
      x: LINE.spawnX,
      y: BELT_Y + HALF_H.blister,
      z: 0,
      rot: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      mode: "belt",
      bin: -1,
      weight: fateWeight ? 208 + Math.random() * 18 : 234.5 + Math.random() * 6,
      labeled: false,
      fateTrap,
      fateWeight,
      fateLabel,
    })
  }

  private moveBeltProducts(dt: number) {
    const surBande = this.products
      .filter((p) => p.mode === "belt")
      .sort((a, b) => b.x - a.x)

    let prevX = Number.POSITIVE_INFINITY
    for (const p of surBande) {
      const st = this.stationOf(p.x)
      let nx = p.x
      if (st.statut === "MARCHE") nx = p.x + BELT_SPEED * dt
      // File d'attente : on ne colle pas le produit de devant.
      nx = Math.max(p.x, Math.min(nx, prevX - GAP_MIN))

      const ejecte = this.crossGates(p, p.x, nx)
      if (ejecte) continue // le produit a quitté la bande (rejet)

      p.x = nx
      if (p.x >= LINE.endX) {
        p.mode = "binned" // marqué pour retrait
        this.remove(p)
        continue
      }
      prevX = p.x
    }
  }

  /**
   * Applique les portes franchies entre x0 et x1. Retourne true si le produit
   * a été éjecté de la bande (rejet), auquel cas sa position a déjà été figée.
   */
  private crossGates(p: TwinProduct, x0: number, x1: number): boolean {
    const crossed = (gx: number) => x0 < gx && x1 >= gx

    if (crossed(LINE.trapX)) {
      if (p.fateTrap) {
        this.trapPulse = 1
        // La trappe bascule vers le bas : le blister glisse, il ne saute pas.
        this.reject(p, 0, LINE.trapX, { vx: 0.15, vy: 0.05, vz: 2.2 })
        this.count("blistereuse", "rebut")
        return true
      }
      this.count("blistereuse", "bonne")
    }

    if (crossed(LINE.cartonX) && p.kind === "blister") {
      // Mise en étui implicite : le blister devient une boîte blanche.
      p.kind = "box"
      p.y = BELT_Y + HALF_H.box
    }

    if (crossed(LINE.weighX)) {
      this.lastWeight = p.weight
      this.weighFlash = 1
    }

    if (crossed(LINE.blastX)) {
      if (p.fateWeight) {
        this.blastPulse = 1
        this.reject(p, 1, LINE.blastX, { vx: 0.1, vy: 1.1, vz: 2.6 })
        this.count("trieuse", "rebut")
        return true
      }
      this.count("trieuse", "bonne")
    }

    if (crossed(LINE.labelX)) {
      p.labeled = true
      this.tampPulse = 1
    }

    if (crossed(LINE.pushX)) {
      if (p.fateLabel) {
        this.pushPulse = 1
        this.reject(p, 2, LINE.pushX, { vx: 0.05, vy: 0.35, vz: 2.3 })
        this.count("vignetteuse", "rebut")
        return true
      }
      this.count("vignetteuse", "bonne")
    }

    return false
  }

  private reject(
    p: TwinProduct,
    bin: number,
    gateX: number,
    v: { vx: number; vy: number; vz: number },
  ) {
    p.mode = "falling"
    p.bin = bin
    p.x = gateX
    p.vx = v.vx
    p.vy = v.vy
    p.vz = v.vz
  }

  private moveFallingProducts(dt: number) {
    for (const p of this.products) {
      if (p.mode !== "falling") continue
      p.vy -= GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      p.rot += dt * 3.5
      // Hauteur de repos selon le type : un blister plat ne flotte pas
      // à la même hauteur qu'un étui — chacun se pose sur le fond du bac.
      const restY = BIN_FLOOR_Y + HALF_H[p.kind]
      if (p.y <= restY && p.vy < 0) {
        // Le produit se pose dans son bac, avec un léger désordre réaliste.
        const bac = LINE.bins[p.bin]
        p.mode = "binned"
        p.x = bac.x + (Math.random() - 0.5) * 0.45
        p.z = bac.z + (Math.random() - 0.5) * 0.35
        p.y = restY + Math.random() * 0.12
        p.rot = Math.random() * Math.PI
        p.vx = p.vy = p.vz = 0
        this.trimBin(p.bin)
      }
    }
  }

  /** Limite le nombre de produits visibles par bac (retire les plus anciens). */
  private trimBin(bin: number) {
    const dansBac = this.products.filter((p) => p.mode === "binned" && p.bin === bin)
    if (dansBac.length <= MAX_BINNED_PAR_BAC) return
    const excedent = dansBac.slice(0, dansBac.length - MAX_BINNED_PAR_BAC)
    for (const p of excedent) this.remove(p)
  }

  private remove(p: TwinProduct) {
    const i = this.products.indexOf(p)
    if (i >= 0) this.products.splice(i, 1)
  }

  private count(id: StationId, type: "bonne" | "rebut") {
    this.stations[id][type]++
    this.onEvent?.({ station: id, type })
    this.notify()
  }
}

/**
 * Instance unique du moteur, partagée par la page du jumeau et par le canal de
 * commandes de Nova (`twinBus`). Persiste tant que l'application vit : l'état de
 * la ligne survit à un aller-retour de navigation.
 */
export const twinEngine = new TwinEngine()
