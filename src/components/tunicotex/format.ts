import type { ProductionLigne } from "@/lib/tunicotex"

/** Fraction 0–1 -> « 85 % » (« — » si absente). */
export const pct = (f: number | null): string => (f == null ? "—" : `${Math.round(f * 100)} %`)

/** Message d'erreur propre à afficher à la place du texte « Base DIVA injoignable. » par défaut. */
export function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}

/** Compare deux valeurs ; les valeurs absentes (null) restent toujours en fin, quel que soit le sens. */
export function comparerValeurs(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  asc: boolean,
): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const c =
    typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "fr")
  return asc ? c : -c
}

export type RaisonVerification = "sans_lecture" | "objectif_ancien" | "taux_aberrant"

/** Taux au-delà duquel le chiffre n'est pas crédible (objectif périmé ou mal saisi). */
const TAUX_ABERRANT = 2

/** Pourquoi une chaîne est exclue des comparaisons sortie / objectif, ou `null`. */
export function aVerifier(l: ProductionLigne): RaisonVerification | null {
  if (!l.a_des_lectures) return "sans_lecture"
  if (l.objectif_perime) return "objectif_ancien"
  if (l.taux != null && l.taux > TAUX_ABERRANT) return "taux_aberrant"
  return null
}

/** Exclue du graphique sortie / objectif : sans lecture ou taux non crédible. Un objectif
 * ancien reste comparé (c'est le cas de la plupart des chaînes) mais est signalé. */
export function exclueDuGraphique(l: ProductionLigne): boolean {
  const r = aVerifier(l)
  return r === "sans_lecture" || r === "taux_aberrant"
}
