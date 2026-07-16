import { useEffect, useState } from "react"
import { Bot, Hand, Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { agentApi } from "@/lib/api"
import type { AutonomyMode } from "@/lib/types"

const MODES: { value: AutonomyMode; label: string; icon: typeof Hand; description: string }[] = [
  {
    value: "manuel",
    label: "Manuel",
    icon: Hand,
    description: "Toute proposition attend votre décision.",
  },
  {
    value: "assiste",
    label: "Assisté",
    icon: ShieldCheck,
    description: "Nova agit seule sur les propositions à risque faible (aucun impact production).",
  },
  {
    value: "autopilote",
    label: "Autopilote",
    icon: Bot,
    description: "Idem assisté, plus les propositions à risque moyen s'exécutent seules après un délai — rejetez pour annuler.",
  },
]

/**
 * Sélecteur du niveau d'autonomie du superviseur Nova : manuel (tout attend
 * l'opérateur), assisté (risque faible auto-exécuté) ou autopilote (risque
 * moyen aussi, après un compte à rebours). Modifiable en direct, sans
 * redémarrage backend — voir `supervisor_service.definir_mode_autonomie`.
 */
export function AutonomyToggle() {
  const [mode, setMode] = useState<AutonomyMode | null>(null)
  const [delaiS, setDelaiS] = useState(45)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    agentApi
      .autonomie()
      .then((r) => {
        setMode(r.mode)
        setDelaiS(r.delai_moyen_s)
      })
      .catch(() => {})
  }, [])

  async function changer(next: AutonomyMode) {
    if (next === mode || busy) return
    setBusy(true)
    const previous = mode
    setMode(next)
    try {
      const r = await agentApi.definirAutonomie(next)
      setMode(r.mode)
      setDelaiS(r.delai_moyen_s)
    } catch {
      setMode(previous)
    } finally {
      setBusy(false)
    }
  }

  if (mode === null) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Autonomie…
      </div>
    )
  }

  const actif = MODES.find((m) => m.value === mode) ?? MODES[0]

  return (
    <div className="border-b border-border px-3 py-2.5">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
        {MODES.map((m) => {
          const Icon = m.icon
          const selected = m.value === mode
          return (
            <button
              key={m.value}
              onClick={() => void changer(m.value)}
              disabled={busy}
              title={m.description}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                busy && "opacity-60",
              )}
            >
              <Icon className="size-3" />
              {m.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-muted-foreground">
        {actif.description}
        {mode === "autopilote" && ` Délai : ${delaiS}s.`}
      </p>
    </div>
  )
}
