import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChartCard } from "@/components/agent/ChartCard"
import { Gauge as GaugeDial } from "@/components/shared/Gauge"
import type { AgentArtifact } from "@/lib/types"

/** Rend l'artifact structuré d'un outil sous forme de carte riche.
 *
 * `onQuickReply` (optionnel) permet aux cartes d'action (confirmation en
 * attente) d'offrir un vrai bouton « Oui »/« Non » plutôt que de forcer
 * l'opérateur à retaper sa réponse : cliquer envoie le même message qu'il
 * aurait tapé, la conversation continue normalement.
 */
export function ArtifactCard({
  artifact,
  onQuickReply,
}: {
  artifact: AgentArtifact
  onQuickReply?: (text: string) => void
}) {
  switch (artifact.kind) {
    case "documents":
      return <DocumentsCard artifact={artifact} />
    case "gauge":
      return <GaugeArtifactCard artifact={artifact} />
    case "navigation":
      return <NavigationCard artifact={artifact} />
    case "chart":
      return <ChartCard artifact={artifact} />
    case "confirmation_attente":
      return <ConfirmationAttenteCard artifact={artifact} onQuickReply={onQuickReply} />
    case "action_executee":
      return <ActionExecuteeCard artifact={artifact} />
    default:
      return null
  }
}

function Shell({
  icon: Icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: typeof CheckCircle2
  title: string
  tone?: "neutral" | "green" | "red" | "amber"
  children: React.ReactNode
}) {
  const tones = {
    neutral: "border-border",
    green: "border-emerald-500/40",
    red: "border-destructive/40",
    amber: "border-amber-500/40",
  }
  const iconTones = {
    neutral: "text-muted-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-destructive",
    amber: "text-amber-600 dark:text-amber-400",
  }
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", tones[tone])}>
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Icon className={cn("size-3.5 shrink-0", iconTones[tone])} />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  )
}

function DocumentsCard({ artifact }: { artifact: AgentArtifact }) {
  const passages =
    (artifact.passages as {
      document_nom: string
      page: number | string | null
      citation: string
      score: number
    }[]) ?? []
  return (
    <Shell icon={BookOpen} title="Sources documentaires">
      <ul className="space-y-2">
        {passages.slice(0, 3).map((p, i) => (
          <li key={i} className="text-xs">
            <p className="line-clamp-3 italic text-foreground/80">« {p.citation} »</p>
            <p className="mt-0.5 font-medium text-muted-foreground">
              {p.document_nom}
              {p.page != null && `, p. ${p.page}`}
            </p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function GaugeArtifactCard({ artifact }: { artifact: AgentArtifact }) {
  const pct = Number(artifact.valeur_pct ?? 0)
  const objectif = artifact.objectif_pct != null ? Number(artifact.objectif_pct) : null
  return (
    <Shell icon={Gauge} title={String(artifact.title ?? "Jauge")}>
      <div className="flex flex-col items-center gap-1">
        <GaugeDial value={pct / 100} label="" size={140} />
        {objectif != null && (
          <p className="text-xs text-muted-foreground">Objectif {objectif.toFixed(0)} %</p>
        )}
        {artifact.sous_titre != null && (
          <p className="text-xs text-muted-foreground">{String(artifact.sous_titre)}</p>
        )}
      </div>
    </Shell>
  )
}

function NavigationCard({ artifact }: { artifact: AgentArtifact }) {
  const raison = artifact.raison ? String(artifact.raison) : null
  return (
    <Shell icon={Compass} title="Redirection" tone="neutral">
      <p className="text-xs">
        Page ouverte : <span className="font-medium">{String(artifact.label)}</span>
        {raison && <span className="text-muted-foreground"> — {raison}</span>}
      </p>
    </Shell>
  )
}

/**
 * Nova propose une action réelle (création d'OF, envoi) mais ne l'a PAS
 * exécutée : le backend refuse tant que l'opérateur n'a pas répondu depuis un
 * message séparé (voir `agent/tools/confirmation_gate.py`, ce n'est pas qu'une
 * formule de politesse). Rendu volontairement chaleureux et jamais vert : ça
 * n'a rien fait, ça attend un humain.
 */
function ConfirmationAttenteCard({
  artifact,
  onQuickReply,
}: {
  artifact: AgentArtifact
  onQuickReply?: (text: string) => void
}) {
  return (
    <Shell icon={Clock} title="En attente de votre feu vert" tone="amber">
      <div className="space-y-2.5 text-xs">
        <p className="text-foreground/85">{String(artifact.libelle ?? "")}</p>
        <p className="italic text-muted-foreground">Rien n'a été modifié pour l'instant.</p>
        {onQuickReply && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => onQuickReply("Oui, confirme.")}
              className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              <ThumbsUp className="size-3" />
              Oui, vas-y
            </button>
            <button
              onClick={() => onQuickReply("Non, annule.")}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ThumbsDown className="size-3" />
              Non
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

/** Une action irréversible/sortante vient réellement de s'exécuter — rendu
 * distinct d'une simple lecture pour que l'opérateur voie que quelque chose
 * de réel vient de se passer sur l'atelier. */
function ActionExecuteeCard({ artifact }: { artifact: AgentArtifact }) {
  return (
    <Shell icon={ShieldCheck} title="Action exécutée" tone="green">
      <p className="text-xs text-foreground/85">{String(artifact.libelle ?? "")}</p>
    </Shell>
  )
}
