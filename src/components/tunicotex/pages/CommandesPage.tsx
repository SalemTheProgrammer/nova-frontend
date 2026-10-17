import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { Page, Select, TextInput } from "@/components/shared/primitives"
import { DateDonnees } from "@/components/tunicotex/DateDonnees"
import { MaitreDetail } from "@/components/tunicotex/MaitreDetail"
import { Panneau } from "@/components/tunicotex/Panneau"
import { RapportActions } from "@/components/tunicotex/RapportActions"
import { Chargement, ErreurDivatex, Vide } from "@/components/tunicotex/EtatsDonnees"
import { messageErreur, pct } from "@/components/tunicotex/format"
import { useDebounce } from "@/lib/useDebounce"
import { useResource } from "@/lib/useResource"
import {
  formatDateFr,
  tunicotexApi,
  type CommandeDetail,
  type OFResume,
  type OFRisque,
} from "@/lib/tunicotex"
import { cn } from "@/lib/utils"

const HORIZONS = [7, 14, 30]
const SANS_CLIENT = "Client inconnu"

function libelleJours(r: OFRisque): string {
  if (r.statut === "en_retard") return `${r.jours} j de retard`
  return r.jours === 0 ? "aujourd'hui" : `dans ${r.jours} j`
}

function LigneOf({ r }: { r: OFRisque }) {
  const o = r.of
  const retard = r.statut === "en_retard"
  return (
    <li>
      <Link
        to={`/app/of?id=${o.id}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
      >
        <span title={o.numero} className="min-w-0 truncate text-sm font-medium">
          {o.numero}
        </span>
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
            retard
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          )}
        >
          {libelleJours(r)}
        </span>
        <span title={o.article ?? undefined} className="min-w-0 truncate text-xs text-muted-foreground">
          {o.article ?? "—"}
        </span>
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          export {formatDateFr(o.date_export_prevue)} · finale {pct(o.avancement_final)}
        </span>
      </Link>
    </li>
  )
}

function ListeOfs({ ofs }: { ofs: OFResume[] }) {
  if (ofs.length === 0) return <p className="text-sm text-muted-foreground">Aucun OF rattaché.</p>
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
      {ofs.map((o) => (
        <li key={o.id}>
          <Link
            to={`/app/of?id=${o.id}`}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
          >
            <span title={o.numero} className="min-w-0 truncate font-medium">
              {o.numero}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {o.quantite} p. · export {formatDateFr(o.date_export_prevue)} · finale{" "}
              {pct(o.avancement_final)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function DetailCommande({ c }: { c: CommandeDetail }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-all text-base font-semibold tracking-tight">{c.numero}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{c.client ?? SANS_CLIENT}</p>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {c.quantite} pièces · commandée le {formatDateFr(c.date)} · fin visée{" "}
            {formatDateFr(c.date_fin_visee)}
          </p>
        </div>
        {c.a_risque && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            à risque
          </span>
        )}
      </div>
      <h4 className="mb-2 mt-4 text-xs font-medium text-muted-foreground">
        Ordres de fabrication ({c.ofs.length})
      </h4>
      <ListeOfs ofs={c.ofs} />
    </div>
  )
}

/** Résultat de la recherche de commande, dans le panneau de droite. */
function ResultatRecherche({ q }: { q: string }) {
  const [choix, setChoix] = useState<number | null>(null)
  const res = useResource(() => tunicotexApi.rechercherCommandes(q), [q])
  const liste = res.data ?? []
  const choisie = liste.length === 1 ? liste[0] : liste.find((c) => c.id === choix)

  return (
    <Panneau titre={`Recherche « ${q} »`} compteur={res.loading ? undefined : liste.length} corpsClassName="px-4 py-3">
      {res.loading ? (
        <Chargement />
      ) : res.error ? (
        <ErreurDivatex onRetry={() => void res.reload()} message={messageErreur(res.error)} />
      ) : liste.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune commande ne correspond.</p>
      ) : (
        <div className="space-y-4">
          {liste.length > 1 && (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
              {liste.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setChoix(c.id)}
                    aria-current={c.id === choisie?.id ? "true" : undefined}
                    className={cn(
                      "block w-full px-3 py-2 text-left hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                      c.id === choisie?.id && "bg-accent/70",
                    )}
                  >
                    <span title={c.numero} className="block truncate text-sm font-medium">
                      {c.numero}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[c.client, `${c.ofs.length} OF`].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {choisie ? (
            <DetailCommande c={choisie} />
          ) : (
            <p className="text-sm text-muted-foreground">Sélectionnez une commande pour voir ses OF.</p>
          )}
        </div>
      )}
    </Panneau>
  )
}

export function CommandesPage() {
  const [horizon, setHorizon] = useState(7)
  const [saisie, setSaisie] = useState("")
  const q = useDebounce(saisie.trim(), 300)
  const [clientChoisi, setClientChoisi] = useState<string | null>(null)
  const risques = useResource(() => tunicotexApi.commandesARisque(horizon), [horizon])

  const donnees = risques.data ?? []
  const retards = donnees.filter((r) => r.statut === "en_retard").length
  const groupes = useMemo(() => {
    const m = new Map<string, OFRisque[]>()
    for (const r of risques.data ?? []) {
      const nom = r.of.client || SANS_CLIENT
      const l = m.get(nom)
      if (l) l.push(r)
      else m.set(nom, [r])
    }
    return [...m.entries()]
      .map(([nom, lignes]) => ({
        nom,
        retards: lignes.filter((l) => l.statut === "en_retard").length,
        lignes: [...lignes].sort(
          (a, b) =>
            (a.statut === b.statut ? 0 : a.statut === "en_retard" ? -1 : 1) ||
            (a.statut === "en_retard" ? b.jours - a.jours : a.jours - b.jours),
        ),
      }))
      .sort(
        (a, b) =>
          b.retards - a.retards || b.lignes.length - a.lignes.length || a.nom.localeCompare(b.nom, "fr"),
      )
  }, [risques.data])

  // Défaut : le client qui a le plus d'OF en retard.
  const groupe = groupes.find((g) => g.nom === clientChoisi) ?? groupes[0]

  return (
    <Page
      fullHeight
      title="Commandes & livraisons"
      description="OF en retard ou à risque sur la date d'export"
      meta={<DateDonnees />}
      actions={
        <RapportActions type="R4" libelle="Rapport livraisons" parametres={{ horizon_jours: horizon }} />
      }
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Horizon
          <Select
            aria-label="Horizon"
            className="w-auto"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h} jours
              </option>
            ))}
          </Select>
        </label>
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            type="search"
            aria-label="Rechercher une commande"
            placeholder="Rechercher une commande (numéro, client…)"
            className="pl-9"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </div>
        {!risques.loading && !risques.error && (
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">En retard (7 derniers jours) </span>
              <span className="font-semibold tabular-nums text-destructive">{retards}</span>
            </span>
            <span>
              <span className="text-muted-foreground">À risque </span>
              <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {donnees.length - retards}
              </span>
            </span>
          </div>
        )}
      </div>

      {risques.loading ? (
        <Chargement />
      ) : risques.error ? (
        <ErreurDivatex onRetry={() => void risques.reload()} message={messageErreur(risques.error)} />
      ) : groupes.length === 0 && !q ? (
        <Vide raison="Aucun OF en retard ni à risque sur cet horizon." />
      ) : (
        <MaitreDetail
          colonnes="@min-[900px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          maitre={
            <Panneau titre="Clients" compteur={groupes.length}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      En retard
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      À risque
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupes.map((g) => {
                    const actif = !q && g.nom === groupe?.nom
                    return (
                      <tr
                        key={g.nom}
                        tabIndex={0}
                        aria-selected={actif}
                        onClick={() => {
                          setClientChoisi(g.nom)
                          setSaisie("")
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setClientChoisi(g.nom)
                            setSaisie("")
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-t border-border/60 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                          actif && "bg-accent/70",
                        )}
                      >
                        <td className="max-w-0 truncate px-4 py-2 font-medium" title={g.nom}>
                          {g.nom}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-destructive">
                          {g.retards || "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400">
                          {g.lignes.length - g.retards || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Panneau>
          }
          detail={
            q ? (
              <ResultatRecherche key={q} q={q} />
            ) : groupe ? (
              <Panneau
                titre={groupe.nom}
                compteur={groupe.lignes.length}
                corpsClassName="divide-y divide-border/60"
              >
                <ul className="divide-y divide-border/60">
                  {groupe.lignes.map((r) => (
                    <LigneOf key={r.of.id} r={r} />
                  ))}
                </ul>
              </Panneau>
            ) : undefined
          }
        />
      )}
    </Page>
  )
}
