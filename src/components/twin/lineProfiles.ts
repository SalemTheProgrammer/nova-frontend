import type { ArticleMini, LigneNode } from "@/lib/types"
import type { StationId } from "./simulation"

export type ProductVisual = "blister" | "tablet" | "bottle" | "sachet" | "tube" | "powder"

export interface TwinLineProfile {
  key: "blister" | "tablet" | "flex" | "powder"
  shortLabel: string
  processLabel: string
  background: string
  floor: string
  accent: string
  stationNames: Record<StationId, string>
  stationDescriptions: Record<StationId, string>
  stationLines: Record<StationId, string[]>
  fallbackArticleCodes: string[]
}

const PROFILES: Record<TwinLineProfile["key"], TwinLineProfile> = {
  blister: {
    key: "blister",
    shortLabel: "Conditionnement blister",
    processLabel: "Formage · contrôle · étiquetage",
    background: "#edf2f7",
    floor: "#dce4ec",
    accent: "#2563eb",
    stationNames: {
      blistereuse: "Blistéreuse",
      trieuse: "Contrôle pondéral",
      vignetteuse: "Étiqueteuse",
    },
    stationDescriptions: {
      blistereuse: "Formage, remplissage et scellage des plaquettes.",
      trieuse: "Contrôle du poids et éjection des boîtes hors tolérance.",
      vignetteuse: "Pose et vérification des étiquettes de traçabilité.",
    },
    stationLines: {
      blistereuse: ["Formage · remplissage · scellage", "Rejet blister intégré"],
      trieuse: ["Contrôle pondéral dynamique", "Éjection pneumatique"],
      vignetteuse: ["Pose des vignettes", "Contrôle de présence"],
    },
    fallbackArticleCodes: ["PARA500"],
  },
  tablet: {
    key: "tablet",
    shortLabel: "Fabrication comprimés",
    processLabel: "Compression · contrôle · encartonnage",
    background: "#eef3f1",
    floor: "#dbe5e1",
    accent: "#059669",
    stationNames: {
      blistereuse: "Comprimeuse",
      trieuse: "Contrôle comprimés",
      vignetteuse: "Encartonneuse",
    },
    stationDescriptions: {
      blistereuse: "Compression rotative et contrôle de cadence des comprimés.",
      trieuse: "Contrôle en ligne du poids et de la conformité des unités.",
      vignetteuse: "Mise en étui, notice et fermeture des boîtes.",
    },
    stationLines: {
      blistereuse: ["Compression rotative", "Cadence MES synchronisée"],
      trieuse: ["Poids et conformité", "Rejet automatique"],
      vignetteuse: ["Mise en étui", "Fermeture et traçabilité"],
    },
    fallbackArticleCodes: ["PARA500"],
  },
  flex: {
    key: "flex",
    shortLabel: "Ligne pharma flexible",
    processLabel: "Dosage · contrôle · conditionnement",
    background: "#f2eff7",
    floor: "#e4deec",
    accent: "#7c3aed",
    stationNames: {
      blistereuse: "Préparation / dosage",
      trieuse: "Contrôle en ligne",
      vignetteuse: "Conditionnement final",
    },
    stationDescriptions: {
      blistereuse: "Préparation du produit selon la forme sélectionnée.",
      trieuse: "Contrôle qualité en ligne et suivi des dérives.",
      vignetteuse: "Conditionnement final adapté au produit visualisé.",
    },
    stationLines: {
      blistereuse: ["Préparation multi-format", "Cadence adaptée à l'article"],
      trieuse: ["Contrôle qualité", "Détection des dérives"],
      vignetteuse: ["Conditionnement final", "Traçabilité lot"],
    },
    fallbackArticleCodes: ["IBU400", "PARA1000", "PARA-SIROP"],
  },
  powder: {
    key: "powder",
    shortLabel: "Poudres et sachets",
    processLabel: "Dosage · pesée · ensachage",
    background: "#f6f2eb",
    floor: "#e9e0d2",
    accent: "#d97706",
    stationNames: {
      blistereuse: "Doseuse poudre",
      trieuse: "Contrôle pondéral",
      vignetteuse: "Conditionneuse sachets",
    },
    stationDescriptions: {
      blistereuse: "Dosage volumétrique de poudres et alimentation de la ligne.",
      trieuse: "Vérification du poids unitaire et rejet hors tolérance.",
      vignetteuse: "Scellage des sachets ou fermeture des boîtes poudre.",
    },
    stationLines: {
      blistereuse: ["Dosage poudre", "Alimentation contrôlée"],
      trieuse: ["Contrôle du poids", "Rejet hors tolérance"],
      vignetteuse: ["Scellage sachets", "Marquage du lot"],
    },
    fallbackArticleCodes: ["TALC-POUDRE", "SACHET-EFFER", "POUDRE-BEBE"],
  },
}

export function profileForLine(line: Pick<LigneNode, "code" | "designation">): TwinLineProfile {
  const text = `${line.code} ${line.designation}`.toLowerCase()
  if (text.includes("cond-04") || text.includes("poudre") || text.includes("sachet")) {
    return PROFILES.powder
  }
  if (text.includes("comp-03") || text.includes("abondant")) return PROFILES.flex
  if (line.code === "L2" || text.includes("conditionnement 2")) return PROFILES.blister
  return PROFILES.tablet
}

export function compatibleArticles(
  line: LigneNode,
  catalog: ArticleMini[],
): ArticleMini[] {
  const configured = catalog.filter((article) => line.article_ids.includes(article.id))
  if (configured.length > 0) return configured
  const fallback = new Set(profileForLine(line).fallbackArticleCodes)
  return catalog.filter((article) => fallback.has(article.code))
}

export function productVisualForArticle(article?: ArticleMini | null): ProductVisual {
  const text = `${article?.code ?? ""} ${article?.designation ?? ""}`.toLowerCase()
  if (text.includes("sirop") || text.includes("flacon")) return "bottle"
  if (text.includes("sachet")) return "sachet"
  if (text.includes("crème") || text.includes("creme") || text.includes("tube")) return "tube"
  if (text.includes("poudre") || text.includes("talc")) return "powder"
  if (text.includes("blister") || text.includes("para500")) return "blister"
  return "tablet"
}
