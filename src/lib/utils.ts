import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate une durée (en secondes) au format strict :
 * 00HH:00MM:00SS (ex: 02HH:15MM:30SS)
 */
export function formatDureeHHMMSS(seconds: number | string | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds || 0)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  const hh = String(hours).padStart(2, "0")
  const mm = String(minutes).padStart(2, "0")
  const ss = String(secs).padStart(2, "0")

  return `${hh}HH:${mm}MM:${ss}SS`
}
