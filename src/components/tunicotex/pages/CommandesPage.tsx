import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, ChevronRight, Search } from "lucide-react"
import { Card, Page, Select, TextInput } from "@/components/shared/primitives"
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
const SEUIL_REPLIE = 20
const SANS_CLIENT = "Client inconnu"

function libelleJours(r: OFRisque): string {
  if (r.statut === "en_retard") return `${r.jours} j de retard`
  return r.jours === 0 ? "aujourd'hui" : `dans ${r.jours} j`
}

function Compteur({ libelle, valeur, ton }: { libelle: string; valeur: number; ton: string }) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-xs text-muted-foreground">{libelle}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", ton)}>{valeur}</p>
    </Card>
  )
}

function LigneOf({ r }: { r: OFRisque }) {
  const o = r.of
  const retard = r.statut === "en_retard"
  return (
    <li>
      <Link
        to={`/app/of?id=${o.id}`}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
      >
        <span title={o.numero} className="min-w-0 truncate text-sm font-medium">
          {o.numero}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            retard
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          )}
        >
          {libelleJours(r)}
        </span>
        <span
          title={o.article ?? undefined}
          className="min-w-0 truncate text-xs text-muted-foreground"
        >
          {o.article ?? "—"}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          export {formatDateFr(o.date_export_prevue)} · finale {pct(o.avancement_final)}
        </span>
      </Link>
    </li>
  )
}

function GroupeClient({ nom, lignes }: { nom: string; lignes: OFRisque[] }) {
  const [ouvert, setOuvert] = useState(lignes.length <= SEUIL_REPLIE)
  const retards = lignes.filter((l) => l.statut === "en_retard").length
  const risques = lignes.length - retards
  const Chevron = ouvert ? ChevronDown : ChevronRight
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <Chevron className="size-4 shrink-0 text-muted-foreground" />
        <span title={nom} className="min-w-0 flex-1 truncate text-sm font-semibold">
          {nom}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {retards > 0 && <span className="text-destructive">{retards} en retard</span>}
          {retards > 0 && risques > 0 && " · "}
          {risques > 0 && <span>{risques} à risque</span>}
        </span>
      </button>
      {ouvert && (
        <ul className="divide-y divide-border/60">
          {lignes.map((r) => (
            <LigneOf key={r.of.id} r={r} />
          ))}
        </ul>
      )}
    </section>
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
    <Card className="min-w-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-all text-base font-bold tracking-tight">{c.numero}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{c.client ?? SANS_CLIENT}</p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
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
      <h4 className="mb-2 mt-4 text-sm font-medium">Ordres de fabrication ({c.ofs.length})</h4>
      <ListeOfs ofs={c.ofs} />
    </Card>
  )
}

function RechercheCommande() {
  const [saisie, setSaisie] = useState("")
  const q = useDebounce(saisie.trim(), 300)
  const [choix, setChoix] = useState<number | null>(null)
  const res = useResource(
    () => (q ? tunicotexApi.rechercherCommandes(q) : Promise.resolve([] as CommandeDetail[])),
    [q],
  )
  const liste = res.data ?? []
  const choisie = liste.length === 1 ? liste[0] : liste.find((c) => c.id === choix)

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <TextInput
          type="search"
          aria-label="Rechercher une commande"
          placeholder="Numéro de commande, client…"
          className="pl-9"
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value)
            setChoix(null)
          }}
        />
      </div>
      {!q ? (
        <p className="text-sm text-muted-foreground">
          Saisissez un numéro de commande pour voir ses OF.
        </p>
      ) : res.loading ? (
        <Chargement />
      ) : res.error ? (
        <ErreurDivatex onRetry={() => void res.reload()} message={messageErreur(res.error)} />
      ) : liste.length === 0 ? (
        <Vide raison="Aucune commande ne correspond." />
      ) : (
        <div
          className={cn(
            "grid gap-4",
            liste.length > 1 && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
          )}
        >
          {liste.length > 1 && (
            <ul className="divide-y divide-border/60 self-start overflow-hidden rounded-xl border border-border">
              {liste.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setChoix(c.id)}
                    aria-current={c.id === choisie?.id ? "true" : undefined}
                    className={cn(
                      "block w-full px-3 py-2 text-left hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none",
                      c.id === choisie?.id && "bg-accent/60",
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
          <div className="min-w-0">
            {choisie ? (
              <DetailCommande c={choisie} />
            ) : (
              <Vide raison="Sélectionnez une commande pour voir ses OF." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CommandesPage() {
  const [horizon, setHorizon] = useState(7)
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
        lignes: [...lignes].sort(
          (a, b) =>
            (a.statut === b.statut ? 0 : a.statut === "en_retard" ? -1 : 1) ||
            (a.statut === "en_retard" ? b.jours - a.jours : a.jours - b.jours),
        ),
      }))
      .sort((a, b) => b.lignes.length - a.lignes.length || a.nom.localeCompare(b.nom, "fr"))
  }, [risques.data])

  return (
    <Page
      title="Commandes & livraisons"
      description="OF en retard ou à risque sur la date d'export"
      actions={
        <RapportActions
          type="R4"
          libelle="Rapport livraisons"
          parametres={{ horizon_jours: horizon }}
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
      </div>

      {risques.loading ? (
        <Chargement />
      ) : risques.error ? (
        <ErreurDivatex
          onRetry={() => void risques.reload()}
          message={messageErreur(risques.error)}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <Compteur
              libelle="En retard (7 derniers jours)"
              valeur={retards}
              ton="text-destructive"
            />
            <Compteur
              libelle="À risque"
              valeur={donnees.length - retards}
              ton="text-amber-700 dark:text-amber-400"
            />
          </div>
          {groupes.length === 0 ? (
            <Vide raison="Aucun OF en retard ni à risque sur cet horizon." />
          ) : (
            <div className="space-y-3">
              {groupes.map((g) => (
                <GroupeClient key={`${horizon}-${g.nom}`} nom={g.nom} lignes={g.lignes} />
              ))}
            </div>
          )}
        </>
      )}

      <h2 className="mb-3 mt-8 text-sm font-medium">Rechercher une commande</h2>
      <RechercheCommande />
    </Page>
  )
}
