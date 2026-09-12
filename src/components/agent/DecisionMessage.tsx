import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { agentApi } from "@/lib/api"
import type { AgentProposal } from "@/lib/types"

const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })

/** Le backend sérialise des datetimes UTC naïfs (sans fuseau) : les lire en UTC. */
function dateUtc(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
}

function issue(p: AgentProposal): { texte: string; classes: string } | null {
  switch (p.statut) {
    case "EXECUTEE":
      return {
        texte: `${p.decideur === "autopilote" ? "Nova a agi seule" : "Fait"} : ${p.resultat ?? p.action_libelle}`,
        classes: "text-emerald-700 dark:text-emerald-400",
      }
    case "REJETEE":
      return { texte: "Ignorée. La situation reste sous surveillance.", classes: "text-muted-foreground" }
    case "ECHOUEE":
      return { texte: p.resultat ?? "Échec de l'exécution.", classes: "text-destructive" }
    case "APPROUVEE":
      return { texte: "Exécution en cours…", classes: "text-muted-foreground" }
    default:
      return null
  }
}

/**
 * Une décision du superviseur, présentée comme un message de Nova dans le chat :
 * constat chiffré, action proposée, et boutons Oui / Non. Le clic est l'accord
 * de l'opérateur (même API que l'ancien onglet Décisions) ; une fois tranchée,
 * le résultat remplace les boutons.
 */
export function DecisionMessage({
  proposition,
  onDecidee,
}: {
  proposition: AgentProposal
  onDecidee: (maj: AgentProposal) => void
}) {
  const [envoi, setEnvoi] = useState<"oui" | "non" | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const critique = proposition.severite === "CRITICAL"
  const resultat = issue(proposition)

  async function decider(approuver: boolean) {
    setEnvoi(approuver ? "oui" : "non")
    setErreur(null)
    try {
      onDecidee(
        await (approuver
          ? agentApi.approuver(proposition.id)
          : agentApi.rejeter(proposition.id)),
      )
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "La décision n'a pas pu être envoyée.")
    } finally {
      setEnvoi(null)
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted p-1.5 text-foreground shadow-xs">
        <img src="/nova-logo.png" alt="Nova" className="size-5 object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-foreground">Nova</span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-medium",
              critique
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            {critique ? "Urgent" : "À décider"}
          </span>
          <span className="text-xs text-muted-foreground">
            {HEURE.format(dateUtc(proposition.created_at))}
          </span>
        </div>

        <div className="w-full space-y-2 rounded-2xl rounded-tl-xs border border-border/80 bg-background px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-xs sm:text-sm">
          <p className="font-semibold">{proposition.titre}</p>
          <p className="text-foreground/85">{proposition.diagnostic}</p>
          <p>
            Je propose : <span className="font-medium">{proposition.action_libelle}</span>.
          </p>

          {resultat ? (
            <p className={cn("font-medium", resultat.classes)}>{resultat.texte}</p>
          ) : (
            <>
              {proposition.execution_auto_at && (
                <p className="text-xs text-muted-foreground">
                  Sans réponse, je le fais automatiquement à{" "}
                  {HEURE.format(dateUtc(proposition.execution_auto_at))}.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void decider(true)}
                  disabled={envoi != null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {envoi === "oui" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Oui, fais-le
                </button>
                <button
                  type="button"
                  onClick={() => void decider(false)}
                  disabled={envoi != null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {envoi === "non" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  Non
                </button>
              </div>
              {erreur && <p className="text-xs text-destructive">{erreur}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
