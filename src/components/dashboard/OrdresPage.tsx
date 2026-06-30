import { useState } from "react"
import { CheckCircle2, Eye, Plus, XCircle } from "lucide-react"
import { articlesApi, lignesApi, ordresApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type {
  Article,
  Faisabilite,
  LigneProduction,
  OrdreFabrication,
  StatutOF,
} from "@/lib/types"
import { STATUTS_OF } from "@/lib/types"
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Page,
  Select,
  Table,
  Td,
  Th,
  TextInput,
} from "@/components/dashboard/primitives"

const statutTone: Record<StatutOF, "neutral" | "blue" | "amber" | "green" | "red"> = {
  BROUILLON: "neutral",
  PLANIFIE: "blue",
  EN_COURS: "amber",
  TERMINE: "green",
  ANNULE: "red",
}

export function OrdresPage() {
  const { data, loading, error, reload, setError } = useResource(() => ordresApi.list(), [])
  const articles = useResource(() => articlesApi.list(), [])
  const lignes = useResource(() => lignesApi.list(), [])

  const [detail, setDetail] = useState<OrdreFabrication | null>(null)

  // Create wizard
  const [open, setOpen] = useState(false)
  const [articleId, setArticleId] = useState("")
  const [quantite, setQuantite] = useState("")
  const [faisa, setFaisa] = useState<Faisabilite | null>(null)
  const [checking, setChecking] = useState(false)
  const [dateFin, setDateFin] = useState("")
  const [ligneId, setLigneId] = useState("")
  const [creating, setCreating] = useState(false)

  function openCreate() {
    setArticleId("")
    setQuantite("")
    setFaisa(null)
    setDateFin("")
    setLigneId("")
    setOpen(true)
  }

  async function verifier() {
    setError(null)
    setFaisa(null)
    if (!articleId || !quantite || Number(quantite) <= 0) {
      setError("Choisissez un article et une quantité.")
      return
    }
    setChecking(true)
    try {
      setFaisa(await ordresApi.faisabilite(Number(articleId), Number(quantite)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setChecking(false)
    }
  }

  async function creer() {
    setCreating(true)
    try {
      await ordresApi.create({
        article_id: Number(articleId),
        quantite: Number(quantite),
        date_fin_prevue: dateFin || null,
        ligne_production_id: ligneId ? Number(ligneId) : null,
      })
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setCreating(false)
    }
  }

  async function changerStatut(of: OrdreFabrication, statut: StatutOF) {
    try {
      await ordresApi.setStatut(of.id, statut)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  const rows = data ?? []
  const articleList: Article[] = articles.data ?? []
  const ligneList: LigneProduction[] = lignes.data ?? []

  return (
    <Page
      title="Ordres de fabrication"
      description="Lancement et suivi des OF. La création consomme les MP en FEFO."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvel OF
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucun ordre de fabrication." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>N° OF</Th>
              <Th>Article</Th>
              <Th className="text-right">Quantité</Th>
              <Th>Lot produit</Th>
              <Th>Fin prévue</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((of) => (
              <tr key={of.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{of.numero}</Td>
                <Td>{of.code_article}</Td>
                <Td className="text-right">
                  {of.quantite_planifiee} {of.unite}
                </Td>
                <Td className="font-mono text-xs">{of.numero_lot_produit ?? "—"}</Td>
                <Td>{of.date_fin_prevue ?? "—"}</Td>
                <Td>
                  <Select
                    value={of.statut}
                    onChange={(e) => changerStatut(of, e.target.value as StatutOF)}
                    className="h-7 w-32 text-xs"
                  >
                    {STATUTS_OF.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td className="text-right">
                  <Button variant="ghost" onClick={() => setDetail(of)}>
                    <Eye className="size-4" /> Généalogie
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Détail / généalogie */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`Généalogie — ${detail?.numero ?? ""}`}
      >
        {detail && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Article</p>
                <p>{detail.designation_article}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lot produit</p>
                <p className="font-mono text-xs">{detail.numero_lot_produit}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantité</p>
                <p>
                  {detail.quantite_planifiee} {detail.unite}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge tone={statutTone[detail.statut]}>{detail.statut}</Badge>
              </div>
            </div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Matières premières consommées (FEFO)
            </p>
            {detail.consommations.length === 0 ? (
              <EmptyState message="Aucune consommation." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>MP</Th>
                    <Th>Lot</Th>
                    <Th className="text-right">Quantité</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.consommations.map((c, i) => (
                    <tr key={i}>
                      <Td className="font-mono text-xs">{c.code_mp}</Td>
                      <Td className="font-mono text-xs">{c.numero_lot}</Td>
                      <Td className="text-right">{c.quantite_consommee}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </>
        )}
      </Modal>

      {/* Création */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouvel ordre de fabrication"
        footer={
          faisa?.faisable ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={creer} disabled={creating}>
                <CheckCircle2 className="size-4" />
                {creating ? "Création…" : "Confirmer et créer l'OF"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button onClick={verifier} disabled={checking}>
                {checking ? "Vérification…" : "Vérifier la disponibilité"}
              </Button>
            </>
          )
        }
      >
        <Field label="Article">
          <Select
            value={articleId}
            onChange={(e) => {
              setArticleId(e.target.value)
              setFaisa(null)
            }}
          >
            <option value="">— choisir —</option>
            {articleList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.designation}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantité à produire">
          <TextInput
            type="number"
            step="any"
            value={quantite}
            onChange={(e) => {
              setQuantite(e.target.value)
              setFaisa(null)
            }}
          />
        </Field>

        {faisa && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              {faisa.faisable ? (
                <Badge tone="green">
                  <CheckCircle2 className="mr-1 size-3" /> Fabrication possible
                </Badge>
              ) : (
                <Badge tone="red">
                  <XCircle className="mr-1 size-3" /> Stock insuffisant
                </Badge>
              )}
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>MP</Th>
                  <Th className="text-right">Requis</Th>
                  <Th className="text-right">Dispo.</Th>
                  <Th className="text-right">Manque</Th>
                </tr>
              </thead>
              <tbody>
                {faisa.besoins.map((b) => (
                  <tr key={b.matiere_premiere_id}>
                    <Td className="font-mono text-xs">{b.code}</Td>
                    <Td className="text-right">
                      {b.quantite_requise} {b.unite}
                    </Td>
                    <Td className="text-right">{b.quantite_disponible}</Td>
                    <Td className="text-right">
                      {b.suffisant ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-destructive">{b.manquant}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {faisa.faisable && (
              <div className="mt-4">
                <Field label="Date de fin prévue">
                  <TextInput
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                  />
                </Field>
                <Field label="Ligne de production (optionnel)">
                  <Select value={ligneId} onChange={(e) => setLigneId(e.target.value)}>
                    <option value="">— aucune —</option>
                    {ligneList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code} · {l.designation}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Page>
  )
}
