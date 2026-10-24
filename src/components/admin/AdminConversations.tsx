import { useEffect, useMemo, useState } from "react"
import { Eye, Globe, Loader2, MessageCircle, MessagesSquare, RefreshCw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgentTurnView } from "@/components/agent/AgentMessage"
import { cn } from "@/lib/utils"
import { adminApi, type ConversationDetail, type ConversationResume } from "@/lib/api"

type FiltreCanal = "ALL" | "web" | "whatsapp"

/** Les dates du backend sont en UTC sans fuseau : on l'ajoute avant d'afficher en heure locale. */
function formaterDate(iso: string): string {
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

function nomAffiche(c: ConversationResume): string {
  return c.utilisateur_nom || c.telephone || "Utilisateur inconnu"
}

function BadgeCanal({ canal }: { canal: ConversationResume["canal"] }) {
  const whatsapp = canal === "whatsapp"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
        whatsapp
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      )}
    >
      {whatsapp ? <MessageCircle className="size-3" /> : <Globe className="size-3" />}
      {whatsapp ? "WhatsApp" : "Web"}
    </span>
  )
}

/** Conversations des utilisateurs avec Nova — consultation seule, rien n'est modifiable ici. */
export function AdminConversations() {
  const [conversations, setConversations] = useState<ConversationResume[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [recherche, setRecherche] = useState("")
  const [filtreUtilisateur, setFiltreUtilisateur] = useState<string>("ALL")
  const [filtreCanal, setFiltreCanal] = useState<FiltreCanal>("ALL")
  const [selection, setSelection] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [chargementDetail, setChargementDetail] = useState(false)
  const [erreurDetail, setErreurDetail] = useState<string | null>(null)

  async function recharger() {
    setChargement(true)
    try {
      setConversations(await adminApi.conversations())
      setErreur(null)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible.")
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    recharger()
  }, [])

  useEffect(() => {
    if (!selection) {
      setDetail(null)
      return
    }
    let annule = false
    setChargementDetail(true)
    setErreurDetail(null)
    adminApi
      .conversation(selection)
      .then((d) => {
        if (!annule) setDetail(d)
      })
      .catch((err) => {
        if (!annule) setErreurDetail(err instanceof Error ? err.message : "Chargement impossible.")
      })
      .finally(() => {
        if (!annule) setChargementDetail(false)
      })
    return () => {
      annule = true
    }
  }, [selection])

  // Un utilisateur = un compte (ou, à défaut, un numéro WhatsApp non enregistré).
  const utilisateurs = useMemo(() => {
    const map = new Map<string, { cle: string; nom: string; total: number }>()
    for (const c of conversations) {
      const cle = c.utilisateur_id != null ? `u${c.utilisateur_id}` : `n${c.telephone}`
      const existant = map.get(cle)
      if (existant) existant.total += 1
      else map.set(cle, { cle, nom: nomAffiche(c), total: 1 })
    }
    return [...map.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
  }, [conversations])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return conversations.filter((c) => {
      const cle = c.utilisateur_id != null ? `u${c.utilisateur_id}` : `n${c.telephone}`
      if (filtreUtilisateur !== "ALL" && cle !== filtreUtilisateur) return false
      if (filtreCanal !== "ALL" && c.canal !== filtreCanal) return false
      if (!q) return true
      return [c.utilisateur_nom, c.telephone, c.apercu].some((v) => (v || "").toLowerCase().includes(q))
    })
  }, [conversations, recherche, filtreUtilisateur, filtreCanal])

  const compteurs = useMemo(
    () => ({
      web: conversations.filter((c) => c.canal === "web").length,
      whatsapp: conversations.filter((c) => c.canal === "whatsapp").length,
    }),
    [conversations],
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Échanges des utilisateurs avec Nova sur le web et WhatsApp — consultation uniquement.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={recharger}
          disabled={chargement}
          title="Actualiser la liste"
          className="border-zinc-300 dark:border-zinc-700 text-black dark:text-white font-bold text-xs h-8 px-2.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className={cn("size-3.5", chargement && "animate-spin text-violet-600")} />
        </Button>
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {erreur}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Liste des conversations */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Rechercher un nom, un numéro ou un message…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-8 h-8 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
              />
              {recherche && (
                <button
                  type="button"
                  onClick={() => setRecherche("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <select
              value={filtreUtilisateur}
              onChange={(e) => setFiltreUtilisateur(e.target.value)}
              className="w-full h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-2 text-xs font-semibold text-black dark:text-white"
            >
              <option value="ALL">Tous les utilisateurs ({conversations.length})</option>
              {utilisateurs.map((u) => (
                <option key={u.cle} value={u.cle}>
                  {u.nom} ({u.total})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              {(
                [
                  ["ALL", `Tous (${conversations.length})`],
                  ["web", `Web (${compteurs.web})`],
                  ["whatsapp", `WhatsApp (${compteurs.whatsapp})`],
                ] as [FiltreCanal, string][]
              ).map(([valeur, libelle]) => (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setFiltreCanal(valeur)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer",
                    filtreCanal === valeur
                      ? "bg-black text-white dark:bg-white dark:text-black font-black"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black",
                  )}
                >
                  {libelle}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {chargement ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-zinc-500">
                <Loader2 className="size-4 animate-spin text-violet-600" /> Chargement des conversations…
              </div>
            ) : filtrees.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-zinc-500">
                {conversations.length === 0
                  ? "Aucune conversation enregistrée pour l'instant."
                  : "Aucune conversation ne correspond à votre recherche."}
              </div>
            ) : (
              filtrees.map((c) => (
                <button
                  key={c.thread_id}
                  type="button"
                  onClick={() => setSelection(c.thread_id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl border-2 transition-all cursor-pointer shadow-2xs",
                    selection === c.thread_id
                      ? "border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 dark:border-violet-500"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-black dark:text-white truncate">
                      {nomAffiche(c)}
                    </span>
                    <BadgeCanal canal={c.canal} />
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                    {c.apercu || "(pas encore de message)"}
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-zinc-500 font-mono">
                    {formaterDate(c.date_maj)}
                    {c.utilisateur_nom && c.telephone ? ` · ${c.telephone}` : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Détail de la conversation */}
        <div className="lg:col-span-7">
          {!selection ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
              <MessagesSquare className="size-12 text-zinc-400 dark:text-zinc-600 mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Sélectionnez une conversation</h3>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                Cliquez sur une conversation à gauche pour lire les questions posées, les réponses de Nova
                et les outils utilisés.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs">
              {detail && detail.conversation.thread_id === selection && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-black dark:text-white truncate">
                        {nomAffiche(detail.conversation)}
                      </h2>
                      <BadgeCanal canal={detail.conversation.canal} />
                    </div>
                    <div className="text-[11px] font-bold text-zinc-500 font-mono mt-0.5">
                      {detail.conversation.telephone && `${detail.conversation.telephone} · `}
                      du {formaterDate(detail.conversation.date_creation)} au{" "}
                      {formaterDate(detail.conversation.date_maj)}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    <Eye className="size-3" /> Lecture seule
                  </span>
                </div>
              )}

              {chargementDetail ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-zinc-500">
                  <Loader2 className="size-4 animate-spin text-violet-600" /> Chargement des messages…
                </div>
              ) : erreurDetail ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                  {erreurDetail}
                </div>
              ) : detail && detail.turns.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-zinc-500">
                  Cette conversation ne contient aucun message (elle a peut-être été effacée par l'utilisateur).
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                  {detail?.turns.map((turn) => (
                    <AgentTurnView
                      key={turn.id}
                      turn={turn}
                      userLabel={detail ? nomAffiche(detail.conversation) : "Utilisateur"}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
