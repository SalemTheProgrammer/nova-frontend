import { Fragment, type ReactNode } from "react"
import { AlertTriangle, Check, Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ArtifactCard } from "@/components/agent/ArtifactCard"
import type { AgentSegment, AgentTurn } from "@/hooks/useAgentChat"

/** Rend le gras `**texte**` et l'italique `*texte*` d'une réponse de l'agent en
 * vrais éléments (jamais d'injection HTML) : le modèle renvoie du markdown léger,
 * et l'afficher tel quel laissait des astérisques visibles à l'écran. */
function texteRiche(contenu: string): ReactNode {
  const noeuds: ReactNode[] = []
  // Alterne hors-marqueur / **gras** / *italique* en préservant les retours ligne.
  const motif = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let dernier = 0
  let m: RegExpExecArray | null
  let cle = 0
  while ((m = motif.exec(contenu)) !== null) {
    if (m.index > dernier) noeuds.push(contenu.slice(dernier, m.index))
    if (m[1] !== undefined) {
      noeuds.push(<strong key={cle++}>{m[1]}</strong>)
    } else {
      noeuds.push(<em key={cle++}>{m[2]}</em>)
    }
    dernier = motif.lastIndex
  }
  if (dernier < contenu.length) noeuds.push(contenu.slice(dernier))
  return noeuds.map((n, i) => <Fragment key={i}>{n}</Fragment>)
}

/** Libellés français des outils : ce que l'opérateur voit pendant que Nova travaille. */
const TOOL_LABEL: Record<string, string> = {
  rechercher_documents: "Recherche dans la base documentaire",
  lister_documents_disponibles: "Lecture des documents disponibles",
  aller_a_la_page: "Redirection",
  envoyer_rapport: "Envoi du rapport",
  envoyer_message: "Envoi du message",
  situation_atelier: "Situation de l'atelier",
  production_chaines: "Production des chaînes",
  detail_chaine: "Détail de la chaîne",
  rechercher_of: "Recherche d'OF",
  avancement_of: "Avancement de l'OF",
  rendement_operateurs: "Rendement des opérateurs",
  fiche_operateur: "Fiche opérateur",
  commandes_a_risque: "Commandes à risque",
  consulter_commande: "Consultation de commande",
  rapport_pdf: "Rapport PDF",
}

/** Outils qui MODIFIENT réellement l'atelier ou envoient quelque chose à
 * l'extérieur — tout le reste est une lecture. Sert uniquement à la mise en
 * forme (un badge ambre plutôt qu'un badge neutre) : la garantie que rien ne
 * s'exécute sans accord réel vit côté backend (`confirmation_gate.py`), ce
 * n'est ici qu'un signal visuel pour que l'opérateur voie la différence entre
 * « Nova regarde » et « Nova s'apprête à agir ».*/
const OUTILS_ACTION = new Set([
  "envoyer_rapport",
  "envoyer_message",
])

function ToolStep({
  segment,
  onQuickReply,
}: {
  segment: Extract<AgentSegment, { type: "tool" }>
  onQuickReply?: (text: string) => void
}) {
  const running = segment.status === "running"
  const estAction = OUTILS_ACTION.has(segment.name)
  // Une action refusée par le garde-fou de confirmation n'a RIEN exécuté :
  // le badge reste ambre et en attente, jamais la coche verte d'une étape
  // terminée normalement — sinon l'opérateur croirait, à tort, que c'est fait.
  const enAttenteConfirmation = segment.artifact?.kind === "confirmation_attente"

  return (
    <div className="space-y-1.5 w-full">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium shadow-xs transition-all",
          running && estAction && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 animate-pulse",
          running && !estAction && "border-border bg-muted/60 text-foreground",
          !running && enAttenteConfirmation &&
            "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          !running && !enAttenteConfirmation && "border-border/80 bg-muted/40 text-muted-foreground",
        )}
      >
        <div className="flex size-4 shrink-0 items-center justify-center">
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : enAttenteConfirmation ? (
            <AlertTriangle className="size-3.5" />
          ) : (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <span>{TOOL_LABEL[segment.name] ?? segment.name}</span>
      </div>
      {segment.artifact && (
        <ArtifactCard artifact={segment.artifact} onQuickReply={onQuickReply} />
      )}
    </div>
  )
}

export function AgentTurnView({
  turn,
  onQuickReply,
}: {
  turn: AgentTurn
  onQuickReply?: (text: string) => void
}) {
  const isUser = turn.role === "user"
  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl shadow-xs transition-all",
          isUser
            ? "bg-foreground text-background font-medium"
            : "border border-border/80 bg-muted text-foreground p-1.5",
        )}
      >
        {isUser ? (
          <User className="size-4" />
        ) : (
          <img src="/nova-logo.png" alt="Nova" className="size-5 object-contain" />
        )}
      </div>
      <div className={cn("min-w-0 flex-1 space-y-1.5", isUser && "flex flex-col items-end")}>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-foreground">
            {isUser ? "Vous" : "Nova"}
          </span>
        </div>
        {turn.segments.map((segment, i) =>
          segment.type === "text" ? (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed",
                isUser
                  ? "rounded-2xl rounded-tr-xs bg-muted/80 border border-border/70 px-3.5 py-2.5 text-foreground shadow-xs max-w-[88%]"
                  : "rounded-2xl rounded-tl-xs bg-background border border-border/80 px-3.5 py-2.5 text-foreground shadow-xs w-full",
              )}
            >
              {texteRiche(segment.content)}
            </div>
          ) : (
            <ToolStep key={segment.id} segment={segment} onQuickReply={onQuickReply} />
          ),
        )}
      </div>
    </div>
  )
}
