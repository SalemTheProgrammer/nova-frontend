import { useResource } from "@/lib/useResource"
import { tunicotexApi, type Reference } from "@/lib/tunicotex"

let cache: Promise<Reference> | null = null

/** Référence Tunicotex, récupérée une seule fois par session (réessai possible après erreur). */
function chargerReference(): Promise<Reference> {
  if (!cache) {
    cache = tunicotexApi.reference().catch((e) => {
      cache = null
      throw e
    })
  }
  return cache
}

export function useReference() {
  const { data, loading, error, reload } = useResource(chargerReference, [])
  return {
    dateReference: data?.date_reference ?? "",
    calibre: data?.calibre ?? false,
    groupes: data?.groupes ?? [],
    lignes: data?.lignes ?? [],
    phases: data?.phases ?? [],
    loading,
    error,
    reload,
  }
}
