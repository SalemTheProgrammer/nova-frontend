import { useState } from "react"
import { AlertTriangle, Check, Loader2, ShieldAlert, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { agentApi } from "@/lib/api"
import type { AgentProposal } from "@/lib/types"

const SEVERITE_STYLE: Record<string, { border: string; icon: string }> = {
  CRITICAL: { border: "border-destructive/50", icon: "text-destructive" },
  WARNING: { border: "border-amber-500/50", icon: "text-amber-600 dark:text-amber-400" },
  INFO: { border: "border-border", icon: "text-primary" },
}

const STATUT_LABEL: Record<string, string> = {
  EXECUTEE: "Exécutée",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
  ECHOUEE: "Échec",
}

/**
 * Carte de proposition du superviseur autonome : diagnostic chiffré + action en
 * un clic. Le human-in-the-loop du système : rien ne s'exécute sans « Approuver ».
 */
export function ProposalCard({
  proposal,
  onDecided,
  compact = false,
}: {
  proposal: AgentProposal
  onDecided?: (updated: AgentProposal) => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
  const style = SEVERITE_STYLE[proposal.severite] ?? SEVERITE_STYLE.INFO
  const pending = proposal.statut === "PROPOSEE"

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject")
    try {
      const updated = approve
        ? await agentApi.approuver(proposal.id)
        : await agentApi.rejeter(proposal.id)
      onDecided?.(updated)
    } catch {
      // le WebSocket ou le prochain refresh remettra l'état à jour
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        style.border,
        pending && "animate-in fade-in slide-in-from-top-2 duration-300",
      )}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5">
        {proposal.severite === "CRITICAL" ? (
          <ShieldAlert className={cn("mt-0.5 size-4 shrink-0", style.icon)} />
        ) : proposal.severite === "WARNING" ? (
          <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", style.icon)} />
        ) : (
          <Sparkles className={cn("mt-0.5 size-4 shrink-0", style.icon)} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold leading-snug">{proposal.titre}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {new Date(proposal.created_at + "Z").toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">
              {proposal.diagnostic}
            </p>
          )}
          {proposal.resultat && (
            <p
              className={cn(
                "mt-1 text-xs",
                proposal.statut === "ECHOUEE"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {proposal.resultat}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {pending ? (
          <>
            <button
              onClick={() => decide(true)}
              disabled={busy !== null}
              className={cn(
                "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md",
                "bg-primary text-xs font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/85 disabled:opacity-50",
              )}
            >
              {busy === "approve" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              {proposal.action_libelle}
            </button>
            <button
              onClick={() => decide(false)}
              disabled={busy !== null}
              className={cn(
                "inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border",
                "px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent",
                "hover:text-foreground disabled:opacity-50",
              )}
            >
              {busy === "reject" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              Rejeter
            </button>
          </>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium",
              proposal.statut === "EXECUTEE"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : proposal.statut === "ECHOUEE"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {STATUT_LABEL[proposal.statut] ?? proposal.statut}
          </span>
        )}
      </div>
    </div>
  )
}
