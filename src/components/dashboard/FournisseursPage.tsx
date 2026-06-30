import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { fournisseursApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type { Fournisseur } from "@/lib/types"
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Page,
  Table,
  Td,
  Th,
  TextInput,
} from "@/components/dashboard/primitives"

export function FournisseursPage() {
  const { data, loading, error, reload, setError } = useResource(
    () => fournisseursApi.list(),
    [],
  )
  const [editing, setEditing] = useState<Fournisseur | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: "", nom: "", contact: "" })

  function openCreate() {
    setEditing(null)
    setForm({ code: "", nom: "", contact: "" })
    setOpen(true)
  }
  function openEdit(f: Fournisseur) {
    setEditing(f)
    setForm({ code: f.code, nom: f.nom, contact: f.contact ?? "" })
    setOpen(true)
  }

  async function save() {
    try {
      const payload = { code: form.code, nom: form.nom, contact: form.contact || null }
      if (editing) await fournisseursApi.update(editing.id, payload)
      else await fournisseursApi.create(payload)
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function remove(f: Fournisseur) {
    if (!confirm(`Supprimer le fournisseur ${f.nom} ?`)) return
    try {
      await fournisseursApi.remove(f.id)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  const rows = data ?? []
  return (
    <Page
      title="Fournisseurs"
      description="Fournisseurs de matières premières."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouveau
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucun fournisseur." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Nom</Th>
              <Th>Contact</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{f.code}</Td>
                <Td>{f.nom}</Td>
                <Td className="text-muted-foreground">{f.contact ?? "—"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => openEdit(f)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => remove(f)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
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
            placeholder="FRN-001"
          />
        </Field>
        <Field label="Nom">
          <TextInput
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
        </Field>
        <Field label="Contact">
          <TextInput
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="email / téléphone"
          />
        </Field>
      </Modal>
    </Page>
  )
}
