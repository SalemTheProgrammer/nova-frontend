export type Unite = "KG" | "G" | "L" | "ML" | "UN"
export type TypeArticle = "PF" | "PSF"
export type StatutLot = "DISPONIBLE" | "BLOQUE" | "PERIME" | "EPUISE"
export type StatutOF = "BROUILLON" | "PLANIFIE" | "EN_COURS" | "TERMINE" | "ANNULE"

export type TypeMouvement = "ENTREE" | "SORTIE" | "AJUSTEMENT"

export const UNITES: Unite[] = ["KG", "G", "L", "ML", "UN"]
export const STATUTS_LOT: StatutLot[] = ["DISPONIBLE", "BLOQUE", "PERIME", "EPUISE"]
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

/** Lot enrichi du code/désignation/unité de sa matière première (endpoint /stock). */
export interface LotDetail extends Lot {
  code_mp: string
  designation_mp: string
  unite: Unite
}

export interface Mouvement {
  id: number
  type_mouvement: TypeMouvement
  matiere_premiere_id: number
  lot_matiere_premiere_id: number | null
  quantite: string
  reference_type: string | null
  reference_id: number | null
  commentaire: string | null
  date_mouvement: string
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

// --------------------------- Flux des lignes (graphe n8n) --------------------------- //
export interface LigneNode {
  id: number
  code: string
  designation: string
  actif: boolean
  article_ids: number[]
}

export interface LigneLien {
  id: number
  source_id: number
  target_id: number
}

export interface ArticleMini {
  id: number
  code: string
  designation: string
}

export interface LigneFlux {
  lignes: LigneNode[]
  liens: LigneLien[]
  articles: ArticleMini[]
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

export interface DocumentRag {
  id: number
  nom: string
  fichier: string
  categorie: string | null
  nb_pages: number
  nb_chunks: number
  statut: string
  date_creation: string
}

export interface DocumentPassage {
  document_id: number | null
  document_nom: string
  source: string
  page: number | null
  score: number
  citation: string
  /** Phrases du chunk qui répondent à la question — seul ce texte est surligné. */
  extraits?: string[]
}

export interface DocumentSearchResult {
  query: string
  passages: DocumentPassage[]
}

/** Contexte de consultation d'un document : PDF à ouvrir + passages à surligner. */
export interface DocumentFocus {
  documentId: number
  page: number
  passages: DocumentPassage[]
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

// --------------------------- Superviseur autonome --------------------------- //
export type StatutProposition = "PROPOSEE" | "APPROUVEE" | "REJETEE" | "EXECUTEE" | "ECHOUEE"

export interface AgentProposal {
  id: number
  type: string
  severite: SeveriteAlerte
  titre: string
  diagnostic: string
  action_libelle: string
  action: Record<string, unknown>
  statut: StatutProposition
  machine_id: number | null
  ordre_fabrication_id: number | null
  resultat: string | null
  created_at: string
  decided_at: string | null
}

// --------------------------- Agent streaming --------------------------- //
export interface AgentArtifact {
  kind: string
  [key: string]: unknown
}

export type AgentStreamEvent =
  | { type: "turn_start" }
  | { type: "token"; content: string }
  | { type: "tool_start"; id: string; name: string; input?: unknown }
  | { type: "tool_end"; id: string; name: string; output: string; artifact: AgentArtifact | null }
  | { type: "done"; thread_id: string; response: string }
  | { type: "error"; message: string }

export interface BesoinArtifact {
  code: string
  designation: string
  unite: string
  requis: string
  disponible: string
  manquant: string
  suffisant: boolean
}

export interface LigneScoreArtifact {
  ligne_id: number
  code: string
  designation: string
  score: number
  trs: number | null
  machines_total: number
  machines_libres: number
  machines_en_panne: number
  raison: string
}

export interface RisqueMachineArtifact {
  machine_id: number
  code: string
  nom: string
  score: number
  niveau: "faible" | "modere" | "eleve"
  nb_pannes_7j: number
  jours_depuis_maintenance: number | null
  recommandation: string
}

export interface OFActif {
  id: number
  numero: string
  article_code: string
  article_designation: string
  lot_produit: string | null
  quantite_planifiee: string
  quantite_bonne: string
  quantite_rejetee: string
  statut: StatutOF
  ligne_production_id: number | null
}

export interface ArretCategorie {
  nb_actifs: number
  duree_totale_s: string
}

export interface MatiereConsommee {
  code_mp: string
  designation_mp: string
  numero_lot: string
  quantite: string
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
  mttf_s: string
  nb_pannes: number
  top_causes_arret: CauseArretResume[]
  alertes_actives: AlertRead[]
  serie_production: PointSerie[]
  cadence_actuelle_par_min: string
  activite_recente: ActiviteEvenement[]
  of_actif: OFActif | null
  taux_charge: string
  taux_engagement: string
  cadence_nominale_par_min: string
  production_theorique: string
  reste_a_produire: string
  arrets_planifies: ArretCategorie
  arrets_non_planifies: ArretCategorie
  micro_arrets_nombre: number
  matieres_consommees: MatiereConsommee[]
}
