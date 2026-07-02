export type Unite = "KG" | "G" | "L" | "ML" | "UN"
export type TypeArticle = "PF" | "PSF"
export type StatutLot = "DISPONIBLE" | "BLOQUE" | "PERIME" | "EPUISE"
export type StatutOF = "BROUILLON" | "PLANIFIE" | "EN_COURS" | "TERMINE" | "ANNULE"

export const UNITES: Unite[] = ["KG", "G", "L", "ML", "UN"]
export const STATUTS_OF: StatutOF[] = [
  "BROUILLON",
  "PLANIFIE",
  "EN_COURS",
  "TERMINE",
  "ANNULE",
]

export interface Article {
  id: number
  code: string
  designation: string
  unite: Unite
  type: TypeArticle
  actif: boolean
}

export interface MatierePremiere {
  id: number
  code: string
  designation: string
  unite: Unite
  seuil_alerte: string | null
  actif: boolean
  stock_disponible: string | null
}

export interface Lot {
  id: number
  numero_lot: string
  matiere_premiere_id: number
  fournisseur_id: number | null
  quantite_initiale: string
  quantite_restante: string
  date_reception: string
  date_peremption: string | null
  statut: StatutLot
}

export interface Fournisseur {
  id: number
  code: string
  nom: string
  contact: string | null
}

export interface LigneProduction {
  id: number
  code: string
  designation: string
  actif: boolean
}

export interface NomenclatureLigne {
  id: number
  matiere_premiere_id: number
  code_mp: string
  designation_mp: string
  unite: Unite
  quantite_par_unite: string
}

export interface Nomenclature {
  id: number
  article_id: number
  version: number
  actif: boolean
  lignes: NomenclatureLigne[]
}

export interface Besoin {
  matiere_premiere_id: number
  code: string
  designation: string
  unite: string
  quantite_requise: string
  quantite_disponible: string
  manquant: string
  suffisant: boolean
}

export interface Faisabilite {
  article_id: number
  quantite: string
  faisable: boolean
  besoins: Besoin[]
}

export interface OFConsommation {
  matiere_premiere_id: number
  code_mp: string
  lot_id: number
  numero_lot: string
  quantite_consommee: string
}

export interface OrdreFabrication {
  id: number
  numero: string
  article_id: number
  code_article: string
  designation_article: string
  quantite_planifiee: string
  unite: Unite
  statut: StatutOF
  numero_lot_produit: string | null
  date_fin_prevue: string | null
  ligne_production_id: number | null
  date_creation: string
  consommations: OFConsommation[]
}

export interface StockMP {
  matiere_premiere_id: number
  code: string
  designation: string
  unite: Unite
  disponible: string
  seuil_alerte: string | null
  sous_seuil: boolean
  nb_lots: number
}

export interface Norme {
  id: number
  nom: string
  fichier: string
  nb_pages: number
  nb_chunks: number
  statut: string
  date_creation: string
}

export interface NormePassage {
  norme_id: number | null
  norme_nom: string
  source: string
  page: number | null
  score: number
  citation: string
}

export interface NormeSearchResult {
  query: string
  passages: NormePassage[]
}

// --------------------------- MES / SCADA --------------------------- //
export type StatutMachine = "ARRET" | "MARCHE" | "PAUSE" | "PANNE" | "MAINTENANCE"

export type CauseArret =
  | "PANNE_MECANIQUE"
  | "PANNE_ELECTRIQUE"
  | "ATTENTE_MATIERE"
  | "CHANGEMENT_SERIE"
  | "REGLAGE_MACHINE"
  | "MANQUE_OPERATEUR"
  | "NETTOYAGE"
  | "MAINTENANCE_PLANIFIEE"
  | "MICRO_ARRET"
  | "QUALITE_BLOQUANTE"
  | "AUTRE"

export const CAUSES_ARRET: CauseArret[] = [
  "PANNE_MECANIQUE",
  "PANNE_ELECTRIQUE",
  "ATTENTE_MATIERE",
  "CHANGEMENT_SERIE",
  "REGLAGE_MACHINE",
  "MANQUE_OPERATEUR",
  "NETTOYAGE",
  "MAINTENANCE_PLANIFIEE",
  "MICRO_ARRET",
  "QUALITE_BLOQUANTE",
  "AUTRE",
]

export type CauseRebut =
  | "DEFAUT_MATIERE"
  | "DEFAUT_DIMENSIONNEL"
  | "DEFAUT_VISUEL"
  | "MAUVAIS_REGLAGE"
  | "ERREUR_OPERATEUR"
  | "PROBLEME_MACHINE"
  | "NON_CONFORMITE_PROCESS"
  | "AUTRE"

export const CAUSES_REBUT: CauseRebut[] = [
  "DEFAUT_MATIERE",
  "DEFAUT_DIMENSIONNEL",
  "DEFAUT_VISUEL",
  "MAUVAIS_REGLAGE",
  "ERREUR_OPERATEUR",
  "PROBLEME_MACHINE",
  "NON_CONFORMITE_PROCESS",
  "AUTRE",
]

export type TypeMaintenance = "PREVENTIVE" | "CORRECTIVE" | "URGENCE"
export type TypeEvenementQualite = "BONNE" | "REBUT"
export type SeveriteAlerte = "INFO" | "WARNING" | "CRITICAL"

export interface DowntimeActif {
  id: number
  cause: CauseArret
  operator_comment: string | null
  start_time: string
}

export interface Machine {
  id: number
  code: string
  nom: string
  ligne_production_id: number
  temps_cycle_cible_s: string | null
  statut: StatutMachine
  ordre_fabrication_id: number | null
  numero_of_actif: string | null
  temps_cycle_actuel_s: string | null
  quantite_produite: number
  quantite_bonne: number
  quantite_rejetee: number
  dernier_evenement_at: string | null
  downtime_actif: DowntimeActif | null
  trs: string | null
  tq: string | null
  tp: string | null
  do: string | null
}

export interface MachineEvent {
  id: number
  machine_id: number
  ordre_fabrication_id: number | null
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface DowntimeEventRead {
  id: number
  machine_id: number
  code_machine: string
  ordre_fabrication_id: number | null
  cause: CauseArret
  operator_comment: string | null
  start_time: string
  end_time: string | null
  duree_s: string | null
}

export interface QualityEventRead {
  id: number
  machine_id: number
  code_machine: string
  ordre_fabrication_id: number | null
  type: TypeEvenementQualite
  quantite: number
  cause: CauseRebut | null
  created_at: string
}

export interface QualiteResume {
  quantite_bonne: number
  quantite_rejetee: number
  taux_rebut: string
  causes: Record<string, number>
}

export interface MaintenanceEventRead {
  id: number
  machine_id: number
  code_machine: string
  type: TypeMaintenance
  description: string | null
  start_time: string
  end_time: string | null
  prochaine_maintenance: string | null
}

export interface AlertRead {
  id: number
  machine_id: number | null
  ordre_fabrication_id: number | null
  severity: SeveriteAlerte
  type: string
  message: string
  created_at: string
  resolved: boolean
}

export interface TempsModel {
  tt: string
  to: string
  tr: string
  tf: string
  tn: string
  tu: string
}

export interface Pertes {
  disponibilite_s: string
  performance_s: string
  qualite_s: string
  principale: "disponibilite" | "performance" | "qualite"
}

export interface TRSRead {
  scope: "machine" | "ligne" | "of" | "global"
  scope_id: number | null
  temps: TempsModel
  tq: string
  tp: string
  do: string
  trs: string
  trg: string
  tre: string
  pertes: Pertes
  quantite_bonne: number
  quantite_rejetee: number
}

export interface CauseArretResume {
  cause: string
  duree_s: string
}

export interface PointSerie {
  horodatage: string
  quantite_bonne_cumulee: number
}

export interface ActiviteEvenement {
  id: number
  machine_id: number
  code_machine: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface DashboardResume {
  trs_global: string
  disponibilite: string
  performance: string
  qualite: string
  trs_detail: TRSRead | null
  machines_en_marche: number
  machines_arretees: number
  machines_total: number
  ordres_actifs: number
  production_reelle: string
  production_cible: string
  quantite_bonne: string
  quantite_rejetee: string
  temps_arret_total_s: string
  mttr_s: string
  mtbf_s: string
  nb_pannes: number
  top_causes_arret: CauseArretResume[]
  alertes_actives: AlertRead[]
  serie_production: PointSerie[]
  cadence_actuelle_par_min: string
  activite_recente: ActiviteEvenement[]
}
