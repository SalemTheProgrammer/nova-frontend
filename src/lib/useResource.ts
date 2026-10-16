import { useCallback, useEffect, useRef, useState } from "react"

export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const derniere = useRef(0) // identifiant de la dernière requête (obsolescence uniquement)
  const monte = useRef(false)
  useEffect(() => {
    monte.current = true
    return () => {
      monte.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    const id = ++derniere.current
    const courante = () => derniere.current === id && monte.current
    setLoading(true)
    setError(null)
    try {
      const resultat = await fetcher()
      if (courante()) setData(resultat)
    } catch (e) {
      if (courante()) setError(e instanceof Error ? e.message : "Erreur de chargement")
    } finally {
      if (courante()) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload, setError }
}
