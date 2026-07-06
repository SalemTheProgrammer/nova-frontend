import { useEffect, useId, useRef } from "react"
import { cn } from "@/lib/utils"

export type OrbEtat = "repos" | "ecoute" | "capture" | "reflexion" | "parole"

/** Palette de la bulle par état (dégradés + halo). */
export const ORB_PALETTE: Record<OrbEtat, { a: string; b: string; halo: string }> = {
  repos: { a: "#94a3b8", b: "#64748b", halo: "rgba(100,116,139,.35)" },
  ecoute: { a: "#34d399", b: "#0ea5e9", halo: "rgba(52,211,153,.4)" },
  capture: { a: "#fbbf24", b: "#f97316", halo: "rgba(251,191,36,.5)" },
  reflexion: { a: "#a78bfa", b: "#6366f1", halo: "rgba(139,92,246,.45)" },
  parole: { a: "#38bdf8", b: "#2563eb", halo: "rgba(56,189,248,.5)" },
}

/**
 * La bulle vivante de Nova — l'identité visuelle de l'agent, en pur SVG animé :
 * cœur audio-réactif + nappes orbitantes fusionnées par un filtre « goo » et
 * reflet mouvant. Réutilisable à toutes les tailles (page vocale plein écran,
 * mini-orbe du bouton flottant).
 *
 * `levelRef` (optionnel) : niveau audio 0..1 lu dans une boucle rAF — le cœur
 * et le halo gonflent avec la voix. Sans `levelRef`, la bulle respire
 * simplement au repos.
 */
export function NovaOrb({
  etat,
  levelRef,
  className,
}: {
  etat: OrbEtat
  levelRef?: React.RefObject<number>
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
  const gooId = `nova-goo-${uid}`
  const gradId = `nova-grad-${uid}`
  const coreRef = useRef<SVGCircleElement | null>(null)
  const haloRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    if (!levelRef) return
    let raf = 0
    let lisse = 0
    const tick = () => {
      const brut = Math.min(levelRef.current * 2.6, 0.6)
      lisse += (brut - lisse) * 0.25 // lissage pour un mouvement organique
      coreRef.current?.setAttribute("r", String(46 + lisse * 34))
      haloRef.current?.setAttribute("r", String(72 + lisse * 40))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [levelRef])

  const palette = ORB_PALETTE[etat]

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(etat === "repos" && "animate-nova-breathe", className)}
    >
      <defs>
        <filter id={gooId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="flou" />
          <feColorMatrix
            in="flou"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
          />
        </filter>
        <radialGradient id={gradId} cx="35%" cy="30%">
          <stop offset="0%" stopColor={palette.a} />
          <stop offset="100%" stopColor={palette.b} />
        </radialGradient>
      </defs>

      {/* Halo diffus */}
      <circle
        ref={haloRef}
        cx="100"
        cy="100"
        r="72"
        fill={palette.halo}
        style={{ filter: "blur(16px)", transition: "fill 0.5s" }}
      />

      {/* Corps gooey : cœur + nappes orbitantes fusionnées */}
      <g filter={`url(#${gooId})`}>
        <g className="animate-nova-orbit-1">
          <circle cx="146" cy="86" r="20" fill={palette.b} opacity="0.65" />
        </g>
        <g className="animate-nova-orbit-2">
          <circle cx="58" cy="122" r="17" fill={palette.a} opacity="0.6" />
        </g>
        <circle
          ref={coreRef}
          cx="100"
          cy="100"
          r="55"
          fill={`url(#${gradId})`}
          style={{ transition: "fill 0.5s" }}
        />
      </g>

      {/* Reflet mouvant */}
      <g className="animate-nova-orbit-3">
        <circle cx="100" cy="48" r="9" fill="white" opacity="0.45" />
      </g>
    </svg>
  )
}
