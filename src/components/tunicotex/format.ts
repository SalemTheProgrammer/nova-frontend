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
