import { useEffect, useRef, useState } from "react"
import { chatAccueil } from "@/lib/api"

/** Vitesse de frappe simulée (ms par caractère). */
const VITESSE_MS = 16
/** Durée minimale des « … » : Nova a l'air de réfléchir avant d'écrire. */
const REFLEXION_MS = 1100

function mouvementReduit() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Accueil local quand le backend est injoignable (non enregistré). */
function accueilHorsLigne(): string[] {
  const h = new Date().getHours()
  const salut = h >= 18 || h < 5 ? "Bonsoir" : "Bonjour"
  return [
    `${salut} ! Je n'arrive pas à lire l'atelier pour l'instant. Posez-moi votre question, je m'en occupe.`,
  ]
}

/**
 * Message d'accueil de Nova à l'ouverture d'une conversation vide : indicateur
 * de frappe, puis salutation, constats atelier et décisions en attente, écrits
 * lettre par lettre. Le texte vient du backend, qui l'enregistre comme premier
 * message du thread : Nova se souvient de ce qu'elle a dit si l'opérateur y
 * répond (« ok, règle M-03 »).
 */
export function NovaGreeting({
  threadId,
  onThread,
}: {
  threadId?: string
  onThread: (threadId: string) => void
}) {
  const [messages, setMessages] = useState<string[] | null>(null)
  // Nombre de caractères déjà « tapés », tous messages confondus.
  const [tapes, setTapes] = useState(0)
  // Figés au montage : un seul accueil par conversation.
  const initial = useRef({ threadId, onThread })

  useEffect(() => {
    let annule = false
    const debut = Date.now()
    chatAccueil(initial.current.threadId)
      .then((r) => {
        // Adopté tout de suite : le prochain message de l'opérateur doit partir
        // dans CE thread, même s'il l'envoie avant la fin de la frappe.
        if (!annule) initial.current.onThread(r.thread_id)
        return r.messages
      })
      .catch(accueilHorsLigne)
      .then((liste) => {
        const attente = Math.max(0, REFLEXION_MS - (Date.now() - debut))
        setTimeout(() => {
          if (annule) return
          setMessages(liste)
          if (mouvementReduit()) setTapes(Infinity)
        }, attente)
      })
    return () => {
      annule = true
    }
  }, [])

  const total = messages?.reduce((n, m) => n + m.length, 0) ?? 0

  useEffect(() => {
    if (messages == null || tapes >= total) return
    const t = setTimeout(() => setTapes((n) => n + 2), VITESSE_MS)
    return () => clearTimeout(t)
  }, [messages, tapes, total])

  // Découpe le compteur global en texte visible par bulle.
  const visibles: string[] = []
  if (messages) {
    let reste = tapes
    for (const m of messages) {
      if (reste <= 0) break
      visibles.push(m.slice(0, reste))
      reste -= m.length
    }
  }
  const enFrappe = messages != null && tapes < total

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted p-1.5 text-foreground shadow-xs">
        <img src="/nova-logo.png" alt="Nova" className="size-5 object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-foreground">Nova</span>
          {(messages == null || enFrappe) && (
            <span className="text-xs text-muted-foreground">écrit…</span>
          )}
        </div>

        {messages == null ? (
          <div
            className="inline-flex items-center gap-1 rounded-2xl rounded-tl-xs border border-border/80 bg-background px-3.5 py-3 shadow-xs"
            aria-label="Nova écrit"
          >
            {[0, 150, 300].map((delai) => (
              <span
                key={delai}
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
                style={{ animationDelay: `${delai}ms` }}
              />
            ))}
          </div>
        ) : (
          visibles.map((texte, i) => (
            <div
              key={i}
              className="w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-xs border border-border/80 bg-background px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-xs sm:text-sm"
            >
              {texte}
              {enFrappe && i === visibles.length - 1 && (
                <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-foreground/70" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
