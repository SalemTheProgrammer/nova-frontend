import { useEffect, useState } from "react"

export function useDebounce<T>(valeur: T, delaiMs: number): T {
  const [v, setV] = useState(valeur)
  useEffect(() => {
    const t = setTimeout(() => setV(valeur), delaiMs)
    return () => clearTimeout(t)
  }, [valeur, delaiMs])
  return v
}
