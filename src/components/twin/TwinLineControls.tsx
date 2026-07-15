import { useCallback, useEffect, useState } from "react"
import { ListPlus, Play, X } from "lucide-react"
import { ordresApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ContexteLigne, DispositionPreemption } from "@/lib/types"

/**
 * Contrôles de file d'attente d'une ligne, posés sur le jumeau : ce qui tourne,
 * ce qui attend (tri par échéance) et le lancement du prochain OF. Quand la ligne
 * est pleine, le lancement ouvre le choix préemption (requeue / pause / cancel).
 * Le composant se resynchronise sur les événements temps réel `refreshKey`.
 */
export function TwinLineControls({
  lineId,
  lineCode,
  refreshKey,
  onDone,
}: {
  lineId: number
  lineCode: string
  refreshKey: number
  onDone?: () => void
}) {
  const [ctx, setCtx] = useState<ContexteLigne | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingOf, setPendingOf] = useState<number | null>(null)
  // OF de la file dont on doit décider (préempter/file) car la ligne est pleine.
  const [busyOfId, setBusyOfId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setCtx(await ordresApi.contexteLigne(lineId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }, [lineId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function lancer(ofId: number) {
    setPendingOf(ofId)
    setError(null)
    try {
      await ordresApi.lancer(ofId)
      await load()
      onDone?.()
    } catch {
      // Ligne pleine : bascule vers le choix préemption/file pour cet OF.
      setBusyOfId(ofId)
    } finally {
      setPendingOf(null)
    }
  }

  async function preempter(ofId: number, disposition: DispositionPreemption) {
    setPendingOf(ofId)
    try {
      await ordresApi.lancer(ofId, disposition)
      setBusyOfId(null)
      await load()
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setPendingOf(null)
    }
  }

  if (!ctx) return null

  return (
    <div className="pointer-events-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/60 bg-background/90 p-3 shadow-xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold">File de ligne · {lineCode}</span>
        <span className="text-[10px] text-muted-foreground">
          {ctx.machines_libres > 0 ? "machine libre" : "ligne pleine"}
        </span>
      </div>

      {error && <p className="mb-2 text-[11px] text-destructive">{error}</p>}

      {ctx.occupations.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            En cours
          </p>
          {ctx.occupations.map((o) => (
            <div key={o.machine_id} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs dark:bg-emerald-950/40">
              <span className="font-mono">{o.of_numero}</span> · {o.code_article} · reste{" "}
              {o.reste_a_produire}
            </div>
          ))}
        </div>
      )}

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        En attente (échéance) · {ctx.file_attente.length}
      </p>
      {ctx.file_attente.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Aucun OF en file.</p>
      ) : (
        <ul className="space-y-1.5">
          {ctx.file_attente.map((of, i) => (
            <li key={of.id} className="rounded-lg border px-2.5 py-1.5">
              {busyOfId === of.id ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium">
                    Ligne pleine — que faire de l'OF en cours ?
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <MiniButton
                      label="Remettre en file"
                      onClick={() => preempter(of.id, "requeue")}
                      disabled={pendingOf === of.id}
                    />
                    <MiniButton
                      label="Pause"
                      onClick={() => preempter(of.id, "pause")}
                      disabled={pendingOf === of.id}
                    />
                    <MiniButton
                      label="Annuler l'ancien"
                      onClick={() => preempter(of.id, "cancel")}
                      disabled={pendingOf === of.id}
                    />
                    <MiniButton label="Retour" variant="ghost" onClick={() => setBusyOfId(null)} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs">
                    <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                    <span className="font-mono">{of.numero}</span> · {of.code_article} · reste{" "}
                    {of.reste_a_produire}
                  </span>
                  <button
                    type="button"
                    onClick={() => lancer(of.id)}
                    disabled={pendingOf === of.id}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Play className="size-3" /> Lancer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Bandeau « notify & confirm » : quand une ligne se libère (OF terminé à sa
 * quantité), le backend diffuse `ligne_liberee` avec le prochain OF en file.
 * Rien n'est démarré automatiquement — l'opérateur confirme ici.
 */
export function TwinFreedBanner({
  lineCode,
  prochain,
  onLaunch,
  onDismiss,
  launching,
}: {
  lineCode: string
  prochain: { id: number; numero: string; code_article: string | null } | null
  onLaunch: () => void
  onDismiss: () => void
  launching: boolean
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/95 px-4 py-2.5 shadow-xl backdrop-blur-xl dark:border-emerald-800 dark:bg-emerald-950/80">
      <div className="min-w-0 text-xs">
        <p className="font-bold text-emerald-800 dark:text-emerald-200">
          Ligne {lineCode} libérée
        </p>
        <p className="text-emerald-700 dark:text-emerald-300">
          {prochain
            ? <>Prochain OF en file : <span className="font-mono">{prochain.numero}</span>{prochain.code_article ? ` (${prochain.code_article})` : ""}. Le lancer ?</>
            : "Aucun OF en file. La ligne est disponible."}
        </p>
      </div>
      {prochain && (
        <button
          type="button"
          onClick={onLaunch}
          disabled={launching}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50",
          )}
        >
          <ListPlus className="size-3.5" /> {launching ? "Lancement…" : "Lancer le prochain"}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Ignorer"
        className="shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function MiniButton({
  label,
  onClick,
  disabled,
  variant = "solid",
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "solid" | "ghost"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md px-2 py-1 text-[10px] font-semibold disabled:opacity-50",
        variant === "solid"
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}
