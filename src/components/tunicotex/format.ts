/** Fraction 0–1 -> « 85 % » (« — » si absente). */
export const pct = (f: number | null): string => (f == null ? "—" : `${Math.round(f * 100)} %`)

/** Message d'erreur propre à afficher à la place du texte « Base DIVA injoignable. » par défaut. */
export function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}
