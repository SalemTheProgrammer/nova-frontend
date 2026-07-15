import type { StatutMachine } from "@/lib/types"

/**
 * Moteur d'animation du jumeau numérique — pur TypeScript, aucune dépendance React.
 * Il matérialise en 3D le temps réel MES : apparition des blisters en sortie de
 * blistéreuse au rythme des vraies productions, file d'attente sur les convoyeurs,
 * mise en étui, pesée, vignettage, et les trois mécanismes de rejet (trappe,
 * soufflage, poussoir) déclenchés par les vrais rebuts comptés. Sans backend, il
 * retombe sur une petite animation locale autonome. Le rendu 3D lit `products` et
 * les impulsions à chaque frame ; les panneaux React s'abonnent via
 * `subscribe`/`version` (useSyncExternalStore).
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
/** Distance (axe Z) entre deux lignes empilées dans la vue d'ensemble de l'usine. */
export const ROW_DEPTH = 9

const GAP_MIN = 0.8
const GRAVITY = 9.81
/** Dessus du fond lumineux des bacs REJET (voir RejectBin). */
const BIN_FLOOR_Y = 0.22
const MAX_BINNED_PAR_BAC = 5
const MAX_PRODUITS_LIGNE = 24

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
  /** Entrée de la première machine : le produit traverse toute la ligne. */
  spawnX: -11.05,
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

// ------------------------- Poids réalistes (trieuse) ------------------------- //
// Boîte de 3 blisters : consigne 237,5 g, tolérance min 230 g (voir l'afficheur).

/** Poids d'une boîte conforme : consigne ± dispersion de remplissage (~±1,3 g). */
function poidsConforme(): number {
  return 236.2 + Math.random() * 2.6
}

/** Poids d'une boîte rejetée : blister manquant / remplissage incomplet. */
function poidsSousTolerance(): number {
  return 218 + Math.random() * 9
}

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

  /**
   * Mode « miroir MES » : quand le backend est joignable, la 3D ne simule plus
   * rien elle-même — elle rejoue ce que le MES diffuse en temps réel :
   * - une unité produite par la machine de tête → un produit apparaît ;
   * - un rebut compté par une machine → un produit est éjecté à son poste ;
   * - les compteurs affichés sont les vraies valeurs machines (setCounts).
   * Sans backend, le moteur retombe sur sa simulation locale autonome.
   */
  mesDriven = false

  /** OF réellement monté sur la ligne. Sans OF actif, aucune animation métier. */
  activeOrderId: number | null = null

  /** Produits à faire apparaître, poussés par les productions réelles du MES. */
  private pendingSpawns = 0

  /** Unités ayant physiquement atteint la sortie et disponibles pour l'opérateur. */
  private completedUnits = 0

  queueSpawn(n = 1) {
    // Plafonné : après un gros rattrapage de compteur, inutile d'inonder la ligne.
    this.pendingSpawns = Math.min(12, this.pendingSpawns + n)
  }

  /**
   * Rejets « commandés » par le MES temps réel : quand une machine réelle
   * compte un rebut, on met en file un rejet visible — le prochain produit qui
   * franchit la porte du poste est éjecté dans le bac, quel que soit son sort
   * tiré au hasard. La 3D matérialise ainsi les vrais événements qualité.
   */
  private pendingRejects: Record<StationId, number> = {
    blistereuse: 0,
    trieuse: 0,
    vignetteuse: 0,
  }

  queueReject(id: StationId, n = 1) {
    // Plafonné : une rafale MES (scénario « dérive qualité ») ne doit pas
    // condamner la ligne entière pendant des minutes.
    this.pendingRejects[id] = Math.min(6, this.pendingRejects[id] + n)
  }

  private takePendingReject(id: StationId): boolean {
    if (this.pendingRejects[id] <= 0) return false
    this.pendingRejects[id]--
    return true
  }

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

  /**
   * Change le contexte produit. Les pièces de l'ancien OF sont retirées pour
   * éviter qu'elles changent visuellement d'article au milieu de la ligne.
   */
  setActiveOrder(orderId: number | null) {
    if (this.activeOrderId === orderId) return
    this.activeOrderId = orderId
    this.products.length = 0
    this.pendingSpawns = 0
    this.completedUnits = 0
    this.pendingRejects = { blistereuse: 0, trieuse: 0, vignetteuse: 0 }
    this.spawnTimer = 0.35
    this.notify()
  }

  /**
   * Une ligne est réellement en production si un OF est monté et si toutes
   * les machines MES qui la composent sont en marche. Les postes 3D sans
   * machine propre héritent de cet état via `syncVirtualStations`.
   */
  isLineWorking(): boolean {
    if (this.activeOrderId == null) return false
    const bound = STATIONS.filter((id) => this.stations[id].machineId != null)
    return bound.length > 0 && bound.every((id) => this.stations[id].statut === "MARCHE")
  }

  /** Aligne les postes visuels non liés sur l'état global des vraies machines. */
  syncVirtualStations() {
    const bound = STATIONS.filter((id) => this.stations[id].machineId != null)
    const statuses = bound.map((id) => this.stations[id].statut)
    const aggregate: StatutMachine =
      statuses.includes("PANNE") ? "PANNE"
      : statuses.includes("MAINTENANCE") ? "MAINTENANCE"
      : statuses.includes("PAUSE") ? "PAUSE"
      : statuses.length > 0 && statuses.every((status) => status === "MARCHE") ? "MARCHE"
      : "ARRET"
    let changed = false
    for (const id of STATIONS) {
      const station = this.stations[id]
      if (station.machineId == null && station.statut !== aggregate) {
        station.statut = aggregate
        changed = true
      }
    }
    if (changed) this.notify()
  }

  setCycle(cycleS: number) {
    const nextCycle = Math.min(10, Math.max(1.5, cycleS))
    if (Math.abs(this.cycleS - nextCycle) < 0.001) return
    this.cycleS = nextCycle
    // Prise d'effet immédiate : sans ce réarmement, le compte à rebours lancé à
    // l'ancienne cadence (jusqu'à ~10 s) continuerait de retarder le prochain blister.
    this.spawnTimer = Math.min(this.spawnTimer, this.cycleS)
    this.notify()
  }

  bindMachine(id: StationId, machineId: number | null, machineCode: string | null) {
    const st = this.stations[id]
    if (st.machineId === machineId && st.machineCode === machineCode) return
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

  /** Station propriétaire du tronçon de bande à l'abscisse donnée. */
  stationOf(x: number): TwinStation {
    if (x < LINE.weighBelt.from) return this.stations.blistereuse
    if (x < LINE.labelBelt.from) return this.stations.trieuse
    return this.stations.vignetteuse
  }

  isRunning(id: StationId): boolean {
    return this.stations[id].statut === "MARCHE"
  }

  /** Le planificateur de rendu peut dormir lorsque toute la scène est immobile. */
  needsAnimation(): boolean {
    const pulseActive =
      this.trapPulse > 0 ||
      this.blastPulse > 0 ||
      this.pushPulse > 0 ||
      this.tampPulse > 0 ||
      this.weighFlash > 0
    return (
      pulseActive ||
      this.products.some((product) => product.mode === "falling") ||
      (this.activeOrderId != null && STATIONS.some((id) => this.isRunning(id)))
    )
  }

  takeCompletedUnit(): boolean {
    if (this.completedUnits <= 0) return false
    this.completedUnits--
    return true
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

    if (this.activeOrderId != null && this.isRunning("blistereuse")) {
      // Une course de presse complète par cycle machine : le rythme visuel
      // des presses reste synchronisé avec la cadence de sortie des blisters.
      this.pressPhase += (dt * Math.PI * 2) / this.cycleS
      if (this.mesDriven) {
        // Miroir MES : un produit apparaît pour chaque unité réellement
        // produite par la machine de tête (dès que la sortie est dégagée).
        if (this.pendingSpawns > 0 && this.trySpawn()) this.pendingSpawns--
      } else {
        this.spawnTimer -= dt
        if (this.spawnTimer <= 0) {
          this.trySpawn()
          this.spawnTimer = this.cycleS * (0.92 + Math.random() * 0.16)
        }
      }
    }

    if (this.activeOrderId != null) this.moveBeltProducts(dt)
    this.moveFallingProducts(dt)
  }

  private trySpawn(): boolean {
    const actifs = this.products.filter((p) => p.mode === "belt")
    if (actifs.length >= MAX_PRODUITS_LIGNE) return false
    // Ne pas faire apparaître un blister sur un autre (sortie machine occupée).
    if (actifs.some((p) => p.x < LINE.spawnX + GAP_MIN)) return false

    // Miroir MES : aucun sort tiré au hasard — seuls les rebuts réellement
    // comptés par le backend (queueReject) éjectent des produits.
    const fateTrap = !this.mesDriven && Math.random() < this.stations.blistereuse.defectRate
    const fateWeight =
      !this.mesDriven && !fateTrap && Math.random() < this.stations.trieuse.defectRate
    const fateLabel =
      !this.mesDriven &&
      !fateTrap &&
      !fateWeight &&
      Math.random() < this.stations.vignetteuse.defectRate
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
      weight: fateWeight ? poidsSousTolerance() : poidsConforme(),
      labeled: false,
      fateTrap,
      fateWeight,
      fateLabel,
    })
    return true
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
        this.completedUnits = Math.min(12, this.completedUnits + 1)
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
      if (p.fateTrap || this.takePendingReject("blistereuse")) {
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
      // Rebut réel de la trieuse en attente : c'est CETTE boîte qui le porte.
      // On lui donne un poids hors tolérance pour que l'afficheur (« SOUS
      // POIDS ») raconte la même histoire que l'éjection qui suit à la buse.
      if (!p.fateWeight && this.takePendingReject("trieuse")) {
        p.fateWeight = true
        p.weight = poidsSousTolerance()
      }
      this.lastWeight = p.weight
      this.weighFlash = 1
    }

    if (crossed(LINE.blastX)) {
      if (p.fateWeight || this.takePendingReject("trieuse")) {
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
      if (p.fateLabel || this.takePendingReject("vignetteuse")) {
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
    // Miroir MES : les compteurs affichés sont les vraies valeurs machines
    // (setCounts) — le comptage local n'a plus de sens.
    if (this.mesDriven) return
    this.stations[id][type]++
    this.notify()
  }

  /** Compteurs réels d'une machine MES, poussés par le temps réel. */
  setCounts(id: StationId, bonne: number, rebut: number) {
    const st = this.stations[id]
    if (st.bonne === bonne && st.rebut === rebut) return
    st.bonne = bonne
    st.rebut = rebut
    this.notify()
  }

  /**
   * Pesée réelle poussée par le MES : chaque pièce comptée par la vraie trieuse
   * met à jour l'afficheur — bonne pièce → poids conforme, rebut → sous tolérance.
   */
  recordWeight(conforme: boolean) {
    this.lastWeight = conforme ? poidsConforme() : poidsSousTolerance()
    this.weighFlash = 1
    this.notify()
  }
}

/**
 * Instance unique du moteur, partagée par la page du jumeau et par le canal de
 * commandes de Nova (`twinBus`). Persiste tant que l'application vit : l'état de
 * la ligne survit à un aller-retour de navigation.
 */
export const twinEngine = new TwinEngine()
