import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, Keyboard, Loader2, Mic, PhoneOff, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentChat } from "@/hooks/useAgentChat"
import { useVoiceLive } from "@/hooks/useVoiceLive"
import { ChatMessage, type ChatMsg } from "@/components/ChatMessage"
import { ChartCard } from "@/components/agent/ChartCard"
import { NovaOrb, type OrbEtat } from "@/components/agent/NovaOrb"
import type { NavView } from "@/components/Sidebar"
import type { AgentArtifact, DocumentPassage } from "@/lib/types"

const VALID_VIEWS: readonly string[] = [
  "dashboard",
  "machines",
  "trs",
  "arrets",
  "qualite",
  "maintenance",
  "stock",
  "ordres",
  "articles",
  "matieres",
  "lignes",
  "fournisseurs",
  "documents",
  "simulateur",
]

type Etat = OrbEtat
type Mode = "voix" | "texte"

const LIBELLES: Record<Etat, string> = {
  repos: "Touchez la bulle pour parler à Nova",
  ecoute: "Je vous écoute…",
  capture: "Je capte votre phrase…",
  reflexion: "Nova réfléchit…",
  parole: "Nova vous répond",
}

// Filet de sécurité TTS : le prompt impose déjà des réponses courtes en mode
// voix, mais si le modèle déborde on ne lit que les premières phrases (~340
// caractères, coupé à une fin de phrase) — jamais de monologue interminable.
const TTS_MAX_CHARS = 340
function limiterPourVoix(texte: string): string {
  const propre = texte.replace(/[*#_`]/g, "").trim()
  if (propre.length <= TTS_MAX_CHARS) return propre
  const tronque = propre.slice(0, TTS_MAX_CHARS)
  const finPhrase = Math.max(
    tronque.lastIndexOf(". "),
    tronque.lastIndexOf("! "),
    tronque.lastIndexOf("? "),
  )
  return finPhrase > 80 ? tronque.slice(0, finPhrase + 1) : tronque
}

/**
 * Assistant Nova plein écran, inspiré du mode voix d'OpenAI — mais en vrai
 * temps réel : le micro reste ouvert en continu (full-duplex), vous pouvez
 * parler par-dessus Nova pour l'interrompre (barge-in), et un bouton permet
 * de basculer à tout moment vers un simple échange par texte.
 *
 * `navigationEnabled` : quand false (défaut ici), les artifacts de navigation
 * émis par l'agent sont IGNORÉS — l'interface ne change pas de page pendant la
 * conversation. La navigation reste active dans le panneau latéral classique.
 */
export function NovaVoicePage({
  navigationEnabled = false,
  onNavigate,
  onDocumentsPassages,
}: {
  navigationEnabled?: boolean
  onNavigate?: (view: NavView) => void
  onDocumentsPassages?: (passages: DocumentPassage[]) => void
}) {
  const [mode, setMode] = useState<Mode>("voix")
  const [dernierUtilisateur, setDernierUtilisateur] = useState("")
  const [texteInput, setTexteInput] = useState("")
  const modeRef = useRef(mode)
  modeRef.current = mode

  const live = useVoiceLive((texte) => {
    setDernierUtilisateur(texte)
    void send(texte, "voix")
  })
  const liveRef = useRef(live)
  liveRef.current = live

  const { turns, loading, send } = useAgentChat(
    (texteFinal) => {
      if (modeRef.current !== "voix" || !liveRef.current.live) return
      if (texteFinal.trim()) void liveRef.current.speak(limiterPourVoix(texteFinal))
      else liveRef.current.libererTour()
    },
    (artifact) => {
      if (!navigationEnabled) return
      if (
        artifact.kind === "navigation" &&
        typeof artifact.page === "string" &&
        VALID_VIEWS.includes(artifact.page)
      ) {
        onNavigate?.(artifact.page as NavView)
      }
      if (artifact.kind === "documents" && Array.isArray(artifact.passages)) {
        onDocumentsPassages?.(artifact.passages as DocumentPassage[])
      }
    },
  )

  // Basculer en mode texte raccroche la session vocale (micro coupé).
  useEffect(() => {
    if (mode === "texte") live.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Nettoyage en quittant la page.
  useEffect(
    () => () => live.stop(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const etat: Etat =
    live.etat === "parole"
      ? "parole"
      : live.etat === "transcription" || loading
        ? "reflexion"
        : live.etat === "capture"
          ? "capture"
          : live.etat === "ecoute"
            ? "ecoute"
            : "repos"

  function toucherBulle() {
    if (!live.live) {
      void live.start()
      return
    }
    if (etat === "parole") {
      // Barge-in manuel : coupe Nova, le micro continue d'écouter tout seul.
      live.stopSpeaking()
      return
    }
    live.stop()
  }

  // Sous-titres : dernier texte de Nova (streamé) + outil en cours.
  const dernierTour = turns[turns.length - 1]
  const texteNova = useMemo(() => {
    if (!dernierTour || dernierTour.role !== "assistant") return ""
    return dernierTour.segments
      .filter((s) => s.type === "text")
      .map((s) => (s.type === "text" ? s.content : ""))
      .join(" ")
      .trim()
  }, [dernierTour])
  const outilEnCours = useMemo(() => {
    if (!dernierTour || dernierTour.role !== "assistant") return null
    const outil = [...dernierTour.segments]
      .reverse()
      .find((s) => s.type === "tool" && s.status === "running")
    return outil && outil.type === "tool" ? outil.name.replaceAll("_", " ") : null
  }, [dernierTour])

  // Graphique du DERNIER tour de l'agent : affiché sous la bulle en mode voix
  // (« montre-moi la courbe du TRS » → le graphique se matérialise pendant
  // qu'elle commente) ; il disparaît dès que la réponse suivante n'en a pas.
  const dernierGraphique = useMemo(() => {
    if (!dernierTour || dernierTour.role !== "assistant") return null
    for (let j = dernierTour.segments.length - 1; j >= 0; j--) {
      const s = dernierTour.segments[j]
      if (s.type === "tool" && s.artifact?.kind === "chart") return s.artifact
    }
    return null
  }, [dernierTour])
  const graphiquesParTour = useMemo(() => {
    const map = new Map<string, AgentArtifact[]>()
    for (const tour of turns) {
      const charts = tour.segments.filter(
        (s) => s.type === "tool" && s.artifact?.kind === "chart",
      )
      if (charts.length > 0) {
        map.set(
          tour.id,
          charts.map((s) => (s.type === "tool" ? s.artifact! : null)).filter(Boolean) as AgentArtifact[],
        )
      }
    }
    return map
  }, [turns])

  // --- Mode texte : mêmes tours (même fil de discussion), rendu en messages simples. ---
  const messages: ChatMsg[] = useMemo(
    () =>
      turns.map((t) => ({
        id: t.id,
        role: t.role,
        content: t.segments
          .filter((s) => s.type === "text")
          .map((s) => (s.type === "text" ? s.content : ""))
          .join(" ")
          .trim(),
      })),
    [turns],
  )

  function envoyerTexte(e?: FormEvent) {
    e?.preventDefault()
    const texte = texteInput.trim()
    if (!texte || loading) return
    setTexteInput("")
    void send(texte)
  }

  function surTouche(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      envoyerTexte()
    }
  }


  return (
    <div className="flex h-full flex-col">
      {/* Bascule Voix / Texte */}
      <div className="flex justify-center pt-4">
        <div className="inline-flex rounded-full border border-border bg-muted/40 p-1 text-sm">
          <button
            onClick={() => setMode("voix")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors",
              mode === "voix"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Mic className="size-3.5" /> Voix
          </button>
          <button
            onClick={() => setMode("texte")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors",
              mode === "texte"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Keyboard className="size-3.5" /> Texte
          </button>
        </div>
      </div>

      {mode === "voix" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          {/* Bulle */}
          <button
            onClick={toucherBulle}
            aria-label={LIBELLES[etat]}
            className="relative flex size-72 items-center justify-center outline-none"
          >
            <NovaOrb etat={etat} levelRef={live.levelRef} className="absolute inset-0 size-full" />

            {/* Icône d'état au centre */}
            <span className="relative z-10 text-white drop-shadow">
              {etat === "reflexion" ? (
                <Loader2 className="size-8 animate-spin" />
              ) : etat === "ecoute" || etat === "capture" ? (
                <Mic className="size-8" />
              ) : (
                <Sparkles className="size-8" />
              )}
            </span>
          </button>

          {/* État + sous-titres */}
          <div className="flex max-w-xl flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {outilEnCours && etat === "reflexion"
                ? `Nova exécute : ${outilEnCours}…`
                : LIBELLES[etat]}
            </p>
            {dernierUtilisateur && (
              <p className="text-xs text-muted-foreground/70">Vous : « {dernierUtilisateur} »</p>
            )}
            {texteNova && (
              <p className="line-clamp-4 text-sm leading-relaxed text-foreground/85">{texteNova}</p>
            )}
          </div>

          {/* Graphique demandé à la voix : se matérialise sous la bulle */}
          {dernierGraphique && (
            <div className="w-full max-w-xl">
              <ChartCard artifact={dernierGraphique} />
            </div>
          )}

          {/* Contrôles */}
          <div className="flex items-center gap-3">
            {live.live && (
              <button
                onClick={() => live.stop()}
                className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
              >
                <PhoneOff className="size-4" /> Terminer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
              {messages
                // Un tour assistant sans texte ni graphique (outil seul) : rien à montrer.
                .filter((m) => m.content || graphiquesParTour.has(m.id))
                .map((m) => (
                  <div key={m.id} className="space-y-3">
                    {m.content && <ChatMessage message={m} />}
                    {graphiquesParTour.get(m.id)?.map((g, i) => (
                      <div key={i} className="pl-11">
                        <ChartCard artifact={g} />
                      </div>
                    ))}
                  </div>
                ))}
              {loading && (
                <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {outilEnCours ? `Nova exécute : ${outilEnCours}…` : "Réflexion…"}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t bg-background">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <form onSubmit={envoyerTexte} className="relative">
                <textarea
                  value={texteInput}
                  onChange={(e) => setTexteInput(e.target.value)}
                  onKeyDown={surTouche}
                  placeholder="Message à Nova…"
                  rows={1}
                  className={cn(
                    "field-sizing-content max-h-40 w-full resize-none rounded-2xl border border-input bg-muted/30 py-3 pl-4 pr-12 text-sm",
                    "outline-none transition-colors placeholder:text-muted-foreground",
                    "focus:border-ring focus:ring-2 focus:ring-ring/20",
                  )}
                />
                <button
                  type="submit"
                  disabled={loading || !texteInput.trim()}
                  className={cn(
                    "absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-xl transition-colors",
                    texteInput.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
