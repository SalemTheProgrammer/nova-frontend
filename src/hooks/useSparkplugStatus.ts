import { useEffect, useState } from "react"
import { sparkplugApi } from "@/lib/api"
import type { SparkplugStatus } from "@/lib/types"

/** État de l'hôte Sparkplug B (connexion au broker MQTT), rafraîchi périodiquement.
 * `null` tant qu'il n'a pas pu être lu (backend injoignable ou droits insuffisants). */
export function useSparkplugStatus(intervalMs = 15000): SparkplugStatus | null {
  const [status, setStatus] = useState<SparkplugStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      sparkplugApi
        .status()
        .then((s) => {
          if (!cancelled) setStatus(s)
        })
        .catch(() => {
          if (!cancelled) setStatus(null)
        })
    void load()
    const timer = window.setInterval(() => void load(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return status
}
