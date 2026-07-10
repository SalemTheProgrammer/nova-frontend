import { useState } from "react"
import { AlertTriangle, Pencil, Plus, RefreshCw, Scale, Trash2 } from "lucide-react"
import { fournisseursApi, matieresApi, ordresApi, stockApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import { STATUTS_LOT, type LotDetail, type StatutLot } from "@/lib/types"
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Page,
  SectionLabel,
  Select,
  Table,
  Td,
  Th,
  TextInput,
} from "@/components/dashboard/primitives"

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  )
}

const STATUT_TONE: Record<StatutLot, "green" | "amber" | "red" | "neutral"> = {
  DISPONIBLE: "green",
  BLOQUE: "amber",
  PERIME: "red",
  EPUISE: "neutral",
}

const emptyCreate = {
  matiere_premiere_id: "",
  numero_lot: "",
  quantite: "",
  date_reception: "",
  date_peremption: "",
  fournisseur_id: "",
}

export function StockPage() {
  const stock = useResource(() => matieresApi.stock(), [])
  const ordres = useResource(() => ordresApi.list(), [])
  const lots = useResource(() => stockApi.lots(), [])
  const matieres = useResource(() => matieresApi.list(), [])
  const fournisseurs = useResource(() => fournisseursApi.list(), [])

  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [create, setCreate] = useState(emptyCreate)
  const [editing, setEditing] = useState<LotDetail | null>(null)
  const [editForm, setEditForm] = useState({ statut: "DISPONIBLE" as StatutLot, date_peremption: "" })
  const [adjusting, setAdjusting] = useState<LotDetail | null>(null)
  const [adjustForm, setAdjustForm] = useState({ quantite_restante: "", commentaire: "" })

  const rows = stock.data ?? []
  const sousSeuil = rows.filter((r) => r.sous_seuil).length
  const ofs = ordres.data ?? []
  const ofPlanifies = ofs.filter((o) => o.statut === "PLANIFIE" || o.statut === "EN_COURS").length
  const lotRows = lots.data ?? []

  function reloadAll() {
    void stock.reload()
    void ordres.reload()
    void lots.reload()
  }

  async function submitCreate() {
    setError(null)
    if (!create.matiere_premiere_id || !create.numero_lot.trim() || !create.quantite) {
      setError("Matière première, numéro de lot et quantité sont requis.")
      return
    }
    try {
      await stockApi.create({
        matiere_premiere_id: Number(create.matiere_premiere_id),
        numero_lot: create.numero_lot.trim(),
        quantite: Number(create.quantite),
        date_reception: create.date_reception || null,
        date_peremption: create.date_peremption || null,
        fournisseur_id: create.fournisseur_id ? Number(create.fournisseur_id) : null,
      })
      setCreateOpen(false)
      setCreate(emptyCreate)
      reloadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  function openEdit(lot: LotDetail) {
    setEditing(lot)
    setEditForm({ statut: lot.statut, date_peremption: lot.date_peremption ?? "" })
  }

  async function submitEdit() {
    if (!editing) return
    setError(null)
    try {
      await stockApi.update(editing.id, {
        statut: editForm.statut,
        date_peremption: editForm.date_peremption || null,
      })
      setEditing(null)
      reloadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  function openAdjust(lot: LotDetail) {
    setAdjusting(lot)
    setAdjustForm({ quantite_restante: lot.quantite_restante, commentaire: "" })
  }

  async function submitAdjust() {
    if (!adjusting) return
    setError(null)
    try {
      await stockApi.ajuster(
        adjusting.id,
        Number(adjustForm.quantite_restante),
        adjustForm.commentaire || undefined,
      )
      setAdjusting(null)
      reloadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function remove(lot: LotDetail) {
    if (!confirm(`Supprimer le lot ${lot.numero_lot} (${lot.code_mp}) ?`)) return
    setError(null)
    try {
      await stockApi.remove(lot.id)
      reloadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  return (
    <Page
      title="Stock"
      description="Vue d'ensemble et gestion des lots de matières premières."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={reloadAll}>
            <RefreshCw className="size-4" /> Actualiser
          </Button>
          <Button onClick={() => { setCreate(emptyCreate); setError(null); setCreateOpen(true) }}>
            <Plus className="size-4" /> Réceptionner un lot
          </Button>
        </div>
      }
    >
      <ErrorBanner message={error ?? stock.error ?? lots.error} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Matières premières" value={String(rows.length)} />
        <Kpi
          label="Sous le seuil"
          value={String(sousSeuil)}
          tone={sousSeuil > 0 ? "text-amber-600 dark:text-amber-400" : ""}
        />
        <Kpi label="Lots en stock" value={String(lotRows.length)} />
        <Kpi label="Ordres en cours" value={String(ofPlanifies)} />
      </div>

      {/* --------------------------- Vue d'ensemble par MP --------------------------- */}
      <SectionLabel>Disponibilité par matière première</SectionLabel>
      {stock.loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune matière première." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Désignation</Th>
              <Th className="text-right">Disponible</Th>
              <Th className="text-right">Seuil</Th>
              <Th className="text-center">Lots</Th>
              <Th>État</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.matiere_premiere_id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{r.code}</Td>
                <Td>{r.designation}</Td>
                <Td className="text-right font-medium">
                  {r.disponible} {r.unite}
                </Td>
                <Td className="text-right text-muted-foreground">{r.seuil_alerte ?? "—"}</Td>
                <Td className="text-center text-muted-foreground">{r.nb_lots}</Td>
                <Td>
                  {r.sous_seuil ? (
                    <Badge tone="amber">
                      <AlertTriangle className="mr-1 size-3" /> Sous seuil
                    </Badge>
                  ) : (
                    <Badge tone="green">OK</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* --------------------------- Lots (CRUD) --------------------------- */}
      <div className="mt-8">
        <SectionLabel>Lots en stock</SectionLabel>
      </div>
      {lots.loading ? (
        <EmptyState message="Chargement…" />
      ) : lotRows.length === 0 ? (
        <EmptyState message="Aucun lot en stock." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>N° lot</Th>
              <Th>Matière première</Th>
              <Th className="text-right">Restant / Initial</Th>
              <Th>Réception</Th>
              <Th>Péremption</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {lotRows.map((lot) => (
              <tr key={lot.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{lot.numero_lot}</Td>
                <Td>
                  <span className="font-mono text-xs text-muted-foreground">{lot.code_mp}</span>{" "}
                  {lot.designation_mp}
                </Td>
                <Td className="text-right">
                  <span className="font-medium">{lot.quantite_restante}</span>
                  <span className="text-muted-foreground"> / {lot.quantite_initiale} {lot.unite}</span>
                </Td>
                <Td className="text-muted-foreground">{lot.date_reception}</Td>
                <Td className="text-muted-foreground">{lot.date_peremption ?? "—"}</Td>
                <Td>
                  <Badge tone={STATUT_TONE[lot.statut]}>{lot.statut}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => openAdjust(lot)}>
                      <Scale className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => openEdit(lot)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => remove(lot)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* --------------------------- Modale : réception --------------------------- */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Réceptionner un lot"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitCreate}>Enregistrer</Button>
          </>
        }
      >
        <Field label="Matière première">
          <Select
            value={create.matiere_premiere_id}
            onChange={(e) => setCreate({ ...create, matiere_premiere_id: e.target.value })}
          >
            <option value="">— Sélectionner —</option>
            {(matieres.data ?? []).map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.code} — {mp.designation}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Numéro de lot">
          <TextInput
            value={create.numero_lot}
            onChange={(e) => setCreate({ ...create, numero_lot: e.target.value })}
            placeholder="LOT-2026-001"
          />
        </Field>
        <Field label="Quantité reçue">
          <TextInput
            type="number"
            min="0"
            step="any"
            value={create.quantite}
            onChange={(e) => setCreate({ ...create, quantite: e.target.value })}
          />
        </Field>
        <Field label="Date de réception">
          <TextInput
            type="date"
            value={create.date_reception}
            onChange={(e) => setCreate({ ...create, date_reception: e.target.value })}
          />
        </Field>
        <Field label="Date de péremption">
          <TextInput
            type="date"
            value={create.date_peremption}
            onChange={(e) => setCreate({ ...create, date_peremption: e.target.value })}
          />
        </Field>
        <Field label="Fournisseur">
          <Select
            value={create.fournisseur_id}
            onChange={(e) => setCreate({ ...create, fournisseur_id: e.target.value })}
          >
            <option value="">— Aucun —</option>
            {(fournisseurs.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.nom}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      {/* --------------------------- Modale : édition --------------------------- */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Lot ${editing.numero_lot}` : "Modifier le lot"}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={submitEdit}>Enregistrer</Button>
          </>
        }
      >
        <Field label="Statut">
          <Select
            value={editForm.statut}
            onChange={(e) => setEditForm({ ...editForm, statut: e.target.value as StatutLot })}
          >
            {STATUTS_LOT.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date de péremption">
          <TextInput
            type="date"
            value={editForm.date_peremption}
            onChange={(e) => setEditForm({ ...editForm, date_peremption: e.target.value })}
          />
        </Field>
      </Modal>

      {/* --------------------------- Modale : ajustement --------------------------- */}
      <Modal
        open={adjusting !== null}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Ajuster le lot ${adjusting.numero_lot}` : "Ajuster"}
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjusting(null)}>
              Annuler
            </Button>
            <Button onClick={submitAdjust}>Ajuster</Button>
          </>
        }
      >
        <Field label={`Quantité restante réelle${adjusting ? ` (${adjusting.unite})` : ""}`}>
          <TextInput
            type="number"
            min="0"
            step="any"
            value={adjustForm.quantite_restante}
            onChange={(e) => setAdjustForm({ ...adjustForm, quantite_restante: e.target.value })}
          />
        </Field>
        <Field label="Commentaire (inventaire)">
          <TextInput
            value={adjustForm.commentaire}
            onChange={(e) => setAdjustForm({ ...adjustForm, commentaire: e.target.value })}
            placeholder="Inventaire du 08/07"
          />
        </Field>
      </Modal>
    </Page>
  )
}
