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
