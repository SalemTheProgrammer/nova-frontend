import { useState } from "react"
import { Boxes, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react"
import { fournisseursApi, matieresApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type { Fournisseur, Lot, MatierePremiere } from "@/lib/types"
import { UNITES } from "@/lib/types"
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

const lotTone: Record<string, "green" | "amber" | "red" | "neutral"> = {
  DISPONIBLE: "green",
  BLOQUE: "amber",
  PERIME: "red",
  EPUISE: "neutral",
}

export function MatieresPage() {
  const { data, loading, error, reload, setError } = useResource(() => matieresApi.list(), [])
  const fournisseurs = useResource(() => fournisseursApi.list(), [])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MatierePremiere | null>(null)
  const [form, setForm] = useState({ code: "", designation: "", unite: "KG", seuil_alerte: "" })

  // Lots
  const [lotsMp, setLotsMp] = useState<MatierePremiere | null>(null)
  const [lots, setLots] = useState<Lot[]>([])
  const [recOpen, setRecOpen] = useState(false)
  const [rec, setRec] = useState({
    numero_lot: "",
    quantite: "",
    date_reception: "",
    date_peremption: "",
    fournisseur_id: "",
  })

  function openCreate() {
    setEditing(null)
    setForm({ code: "", designation: "", unite: "KG", seuil_alerte: "" })
    setOpen(true)
  }
  function openEdit(mp: MatierePremiere) {
    setEditing(mp)
    setForm({
      code: mp.code,
      designation: mp.designation,
      unite: mp.unite,
      seuil_alerte: mp.seuil_alerte ?? "",
    })
    setOpen(true)
  }

  async function save() {
    try {
      const payload = {
        code: form.code,
        designation: form.designation,
        unite: form.unite as MatierePremiere["unite"],
        seuil_alerte: form.seuil_alerte ? Number(form.seuil_alerte) : null,
      }
      if (editing) await matieresApi.update(editing.id, payload as Partial<MatierePremiere>)
      else await matieresApi.create(payload as Partial<MatierePremiere>)
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }
  async function remove(mp: MatierePremiere) {
    if (!confirm(`Supprimer la MP ${mp.code} ?`)) return
    try {
      await matieresApi.remove(mp.id)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function openLots(mp: MatierePremiere) {
    setLotsMp(mp)
    try {
      setLots(await matieresApi.lots(mp.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  function openReception() {
    setRec({
      numero_lot: "",
      quantite: "",
      date_reception: new Date().toISOString().slice(0, 10),
      date_peremption: "",
      fournisseur_id: "",
    })
    setRecOpen(true)
  }

  async function saveReception() {
    if (!lotsMp) return
    try {
      await matieresApi.receptionner(lotsMp.id, {
        numero_lot: rec.numero_lot,
        quantite: Number(rec.quantite),
        date_reception: rec.date_reception || null,
        date_peremption: rec.date_peremption || null,
        fournisseur_id: rec.fournisseur_id ? Number(rec.fournisseur_id) : null,
      })
      setRecOpen(false)
      setLots(await matieresApi.lots(lotsMp.id))
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  const fournisseursList: Fournisseur[] = fournisseurs.data ?? []
  const rows = data ?? []

  return (
    <Page
      title="Matières premières"
      description="Stock lot par lot avec traçabilité et péremption (FEFO)."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvelle MP
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune matière première." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Désignation</Th>
              <Th className="text-right">Stock dispo.</Th>
              <Th className="text-right">Seuil</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((mp) => (
              <tr key={mp.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{mp.code}</Td>
                <Td>{mp.designation}</Td>
                <Td className="text-right font-medium">
                  {mp.stock_disponible ?? "0"} {mp.unite}
                </Td>
                <Td className="text-right text-muted-foreground">{mp.seuil_alerte ?? "—"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => openLots(mp)}>
                      <Boxes className="size-4" /> Lots
                    </Button>
                    <Button variant="ghost" onClick={() => openEdit(mp)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => remove(mp)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Create/edit MP */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier la MP" : "Nouvelle matière première"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save}>Enregistrer</Button>
          </>
        }
      >
        <Field label="Code">
          <TextInput
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="MP-API"
          />
        </Field>
        <Field label="Désignation">
          <TextInput
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
        </Field>
        <Field label="Unité">
          <Select value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })}>
            {UNITES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seuil d'alerte (optionnel)">
          <TextInput
            type="number"
            step="any"
            value={form.seuil_alerte}
            onChange={(e) => setForm({ ...form, seuil_alerte: e.target.value })}
          />
        </Field>
      </Modal>

      {/* Lots */}
      <Modal
        open={lotsMp !== null}
        onClose={() => setLotsMp(null)}
        title={`Lots — ${lotsMp?.code ?? ""}`}
        footer={
          <Button onClick={openReception}>
            <PackagePlus className="size-4" /> Réceptionner un lot
          </Button>
        }
      >
        {lots.length === 0 ? (
          <EmptyState message="Aucun lot. Réceptionnez-en un." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>N° lot</Th>
                <Th className="text-right">Restant</Th>
                <Th>Péremption</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id}>
                  <Td className="font-mono text-xs">{lot.numero_lot}</Td>
                  <Td className="text-right">
                    {lot.quantite_restante} / {lot.quantite_initiale}
                  </Td>
                  <Td>{lot.date_peremption ?? "—"}</Td>
                  <Td>
                    <Badge tone={lotTone[lot.statut] ?? "neutral"}>{lot.statut}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal>

      {/* Réception */}
      <Modal
        open={recOpen}
        onClose={() => setRecOpen(false)}
        title={`Réception — ${lotsMp?.code ?? ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRecOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveReception}>Réceptionner</Button>
          </>
        }
      >
        <Field label="N° de lot (fournisseur)">
          <TextInput
            value={rec.numero_lot}
            onChange={(e) => setRec({ ...rec, numero_lot: e.target.value })}
          />
        </Field>
        <Field label="Quantité reçue">
          <TextInput
            type="number"
            step="any"
            value={rec.quantite}
            onChange={(e) => setRec({ ...rec, quantite: e.target.value })}
          />
        </Field>
        <Field label="Date de réception">
          <TextInput
            type="date"
            value={rec.date_reception}
            onChange={(e) => setRec({ ...rec, date_reception: e.target.value })}
          />
        </Field>
        <Field label="Date de péremption (optionnel)">
          <TextInput
            type="date"
            value={rec.date_peremption}
            onChange={(e) => setRec({ ...rec, date_peremption: e.target.value })}
          />
        </Field>
        <Field label="Fournisseur (optionnel)">
          <Select
            value={rec.fournisseur_id}
            onChange={(e) => setRec({ ...rec, fournisseur_id: e.target.value })}
          >
            <option value="">— aucun —</option>
            {fournisseursList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} · {f.nom}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </Page>
  )
}
