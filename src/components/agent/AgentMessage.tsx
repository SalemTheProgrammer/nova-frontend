import { AlertTriangle, Bot, Check, Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ArtifactCard } from "@/components/agent/ArtifactCard"
import type { AgentSegment, AgentTurn } from "@/hooks/useAgentChat"

/** Libellés français des outils : ce que l'opérateur voit pendant que Nova travaille. */
const TOOL_LABEL: Record<string, string> = {
  rechercher_documents: "Recherche dans la base documentaire",
  lister_articles: "Lecture du référentiel articles",
  rechercher_article: "Recherche de l'article",
  verifier_disponibilite: "Vérification du stock (nomenclature)",
  lister_lignes_production: "Lecture des lignes de production",
  etat_stock_matiere: "Consultation du stock MP",
  creer_ordre_fabrication: "Création de l'ordre de fabrication",
  consulter_ordre_fabrication: "Consultation de l'OF",
  etat_machine: "Interrogation de la machine",
  resume_trs: "Calcul du TRS",
  arrets_actifs: "Analyse des arrêts en cours",
  alertes_actives: "Lecture des alertes",
  choisir_meilleure_ligne: "Scoring des lignes de production",
  analyser_bascule_of: "Analyse d'impact de la bascule",
  aller_a_la_page: "Redirection",
  generer_rapport_production: "Génération du rapport",
  risque_panne_machines: "Analyse prédictive des pannes",
  simuler_ordonnancement: "Ordonnancement du backlog",
  comparer_algorithmes: "Comparaison des règles d'ordonnancement",
  appliquer_ordonnancement: "Enregistrement du planning",
  envoyer_ordonnancement: "Envoi du plan d'ordonnancement",
  demarrer_machine: "Commande SCADA : démarrage machine",
  arreter_machine: "Commande SCADA : arrêt machine",
  resoudre_arret_machine: "Commande SCADA : résolution d'arrêt",
  lancer_maintenance: "Commande SCADA : maintenance",
  basculer_of_vers_ligne: "Re-routage de l'OF",
  acquitter_alerte: "Acquittement de l'alerte",
  envoyer_rapport: "Envoi du bilan",
  envoyer_message: "Envoi du message",
}

/** Outils qui MODIFIENT réellement l'atelier ou envoient quelque chose à
 * l'extérieur — tout le reste est une lecture. Sert uniquement à la mise en
 * forme (un badge ambre plutôt qu'un badge neutre) : la garantie que rien ne
 * s'exécute sans accord réel vit côté backend (`confirmation_gate.py`), ce
 * n'est ici qu'un signal visuel pour que l'opérateur voie la différence entre
 * « Nova regarde » et « Nova s'apprête à agir ».*/
const OUTILS_ACTION = new Set([
  "creer_ordre_fabrication",
  "demarrer_machine",
  "arreter_machine",
  "resoudre_arret_machine",
  "lancer_maintenance",
  "basculer_of_vers_ligne",
  "acquitter_alerte",
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
    <div className="space-y-1.5">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
          running && estAction && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          running && !estAction && "border-primary/40 bg-primary/5 text-primary",
          !running && enAttenteConfirmation &&
            "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          !running && !enAttenteConfirmation && "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        {running ? (
          <Loader2 className="size-3 animate-spin" />
        ) : enAttenteConfirmation ? (
          <AlertTriangle className="size-3" />
        ) : (
          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
        )}
        {TOOL_LABEL[segment.name] ?? segment.name}
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
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {isUser ? "Vous" : "Nova"}
        </p>
        {turn.segments.map((segment, i) =>
          segment.type === "text" ? (
            <div
              key={i}
              className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
            >
              {segment.content}
            </div>
          ) : (
            <ToolStep key={segment.id} segment={segment} onQuickReply={onQuickReply} />
          ),
        )}
      </div>
    </div>
  )
}
