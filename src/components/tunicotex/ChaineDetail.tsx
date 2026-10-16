import { Link } from "react-router-dom"
import { Dialog } from "radix-ui"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { X } from "lucide-react"
import { Card } from "@/components/shared/primitives"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex } from "@/components/tunicotex/EtatsDonnees"
import { useResource } from "@/lib/useResource"
import { formatDateFr, tunicotexApi } from "@/lib/tunicotex"

const pct = (f: number | null): string => (f == null ? "—" : `${Math.round(f * 100)} %`)

function messageErreur(erreur: string | null): string | undefined {
  if (!erreur || /DIVA injoignable/i.test(erreur)) return undefined
  return erreur
}

function Contenu({
  id,
  jour,
  calibre,
  onFermer,
}: {
  id: number
  jour: string
  calibre: boolean
  onFermer: () => void
}) {
  const detail = useResource(() => tunicotexApi.chaine(id, jour || undefined), [id, jour])
  const d = detail.data
  const suffixe = calibre ? "" : " (estimé)"

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
        <div className="min-w-0">
          <Dialog.Title className="truncate text-base font-bold tracking-tight">
            {d ? `${d.production.ligne.code} · ${d.production.ligne.nom}` : "Chaîne"}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Détail du {formatDateFr(jour)}
          </Dialog.Description>
        </div>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {detail.loading ? (
          <Chargement />
        ) : detail.error ? (
          <ErreurDivatex onRetry={() => void detail.reload()} message={messageErreur(detail.error)} />
        ) : d ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm tabular-nums text-muted-foreground">
                Sortie {d.production.sortie}
                {d.production.objectif != null && ` / ${d.production.objectif}`} ·{" "}
                {pct(d.production.taux)}
                {d.production.ligne.nature === "confection" &&
                  ` · Rendement${suffixe} ${pct(d.production.rendement)}`}
              </p>
              <RapportActions
                type="R1"
                libelle="Rapport chaîne"
                parametres={{ jour: jour || null, groupe_id: d.production.ligne.groupe?.id ?? null }}
              />
            </div>

            <Card className="min-w-0 p-4">
              <h3 className="mb-3 text-sm font-medium">Sortie par heure</h3>
              {d.courbe.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">aucune lecture</p>
              ) : (
                <div className="h-48 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.courbe.map((p) => ({ ...p, h: `${p.heure} h` }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="h" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip />
                      <Bar dataKey="pieces" name="Pièces" fill="var(--chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="min-w-0 p-4">
              <h3 className="mb-2 text-sm font-medium">Opérateurs</h3>
              {d.operateurs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun opérateur ce jour-là.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Opérateur</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Opérations</th>
                        <th className="py-1.5 text-right font-medium">Rendement{suffixe}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.operateurs.map((o) => (
                        <tr key={o.operateur.id} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-3">
                            <Link
                              to={`/app/operateurs?id=${o.operateur.id}`}
                              className="font-medium hover:underline"
                            >
                              {o.operateur.prenom} {o.operateur.nom}
                            </Link>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {o.operateur.matricule}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{o.pieces_operations}</td>
                          <td className="py-1.5 text-right tabular-nums">{pct(o.rendement)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="min-w-0 p-4">
              <h3 className="mb-2 text-sm font-medium">OF du jour</h3>
              {d.ofs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun OF ce jour-là.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {d.ofs.map((o) => (
                    <li key={o.id} className="flex items-baseline justify-between gap-2">
                      <Link to={`/app/of?id=${o.id}`} className="min-w-0 truncate font-medium hover:underline">
                        {o.numero}
                        {o.client && <span className="ml-2 font-normal text-muted-foreground">{o.client}</span>}
                      </Link>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {o.quantite} pièces · {Math.round(o.avancement_final * 100)} %
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </>
  )
}

export function ChaineDetail({
  id,
  jour,
  calibre,
  onFermer,
}: {
  id: number | null
  jour: string
  calibre: boolean
  onFermer: () => void
}) {
  return (
    <Dialog.Root open={id != null} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border/80 bg-card shadow-2xl outline-none">
          {id != null && <Contenu id={id} jour={jour} calibre={calibre} onFermer={onFermer} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
