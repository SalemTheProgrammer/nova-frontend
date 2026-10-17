import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Panneau } from "@/components/tunicotex/Panneau"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex } from "@/components/tunicotex/EtatsDonnees"
import { messageErreur, pct } from "@/components/tunicotex/format"
import { useResource } from "@/lib/useResource"
import { formatDateFr, tunicotexApi } from "@/lib/tunicotex"

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{titre}</h3>
      {children}
    </div>
  )
}

/** Détail d'une chaîne pour un jour, dans la colonne de droite de l'écran Chaînes. */
export function ChaineDetailPanneau({
  id,
  jour,
  calibre,
}: {
  id: number
  jour: string
  calibre: boolean
}) {
  const detail = useResource(() => tunicotexApi.chaine(id, jour || undefined), [id, jour])
  const d = detail.data
  const suffixe = calibre ? "" : " (estimé)"

  return (
    <Panneau
      titre={d ? `${d.production.ligne.code} · ${d.production.ligne.nom}` : "Chaîne"}
      extra={
        d ? (
          <RapportActions
            type="R1"
            libelle="Rapport chaîne"
            parametres={{ jour: jour || null, groupe_id: d.production.ligne.groupe?.id ?? null }}
          />
        ) : undefined
      }
      corpsClassName="space-y-5 px-4 py-3"
    >
      {detail.loading ? (
        <Chargement />
      ) : detail.error ? (
        <ErreurDivatex onRetry={() => void detail.reload()} message={messageErreur(detail.error)} />
      ) : d ? (
        <>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatDateFr(jour)} · Sortie{" "}
            <span className="font-medium text-foreground">{d.production.sortie}</span>
            {d.production.objectif != null && ` / ${d.production.objectif}`} ·{" "}
            {pct(d.production.taux)}
            {d.production.ligne.nature === "confection" &&
              ` · Rendement${suffixe} ${pct(d.production.rendement)}`}
          </p>

          <Section titre="Sortie par heure">
            {d.courbe.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Aucune lecture.</p>
            ) : (
              <div className="h-36 min-w-0">
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
          </Section>

          <Section titre={`Opérateurs (${d.operateurs.length})`}>
            {d.operateurs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun opérateur ce jour-là.</p>
            ) : (
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
                      <td className="max-w-0 truncate py-1.5 pr-3">
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
            )}
          </Section>

          <Section titre={`OF du jour (${d.ofs.length})`}>
            {d.ofs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun OF ce jour-là.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {d.ofs.map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-2">
                    <Link
                      to={`/app/of?id=${o.id}`}
                      title={o.numero}
                      className="min-w-0 truncate font-medium hover:underline"
                    >
                      {o.numero}
                      {o.client && (
                        <span className="ml-2 font-normal text-muted-foreground">{o.client}</span>
                      )}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {o.quantite} p. · {Math.round(o.avancement_final * 100)} %
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </Panneau>
  )
}
