import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { lignesApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type { LigneProduction } from "@/lib/types"
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

export function LignesPage() {
  const { data, loading, error, reload, setError } = useResource(() => lignesApi.list(), [])
  const [editing, setEditing] = useState<LigneProduction | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: "", designation: "", actif: true })

  function openCreate() {
    setEditing(null)
    setForm({ code: "", designation: "", actif: true })
    setOpen(true)
  }
  function openEdit(l: LigneProduction) {
    setEditing(l)
    setForm({ code: l.code, designation: l.designation, actif: l.actif })
    setOpen(true)
  }

  async function save() {
    try {
      if (editing) await lignesApi.update(editing.id, form)
      else await lignesApi.create(form)
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }
  async function remove(l: LigneProduction) {
    if (!confirm(`Supprimer la ligne ${l.code} ?`)) return
    try {
      await lignesApi.remove(l.id)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  const rows = data ?? []
  return (
    <Page
      title="Lignes de production"
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvelle
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune ligne de production." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Désignation</Th>
              <Th>État</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{l.code}</Td>
                <Td>{l.designation}</Td>
                <Td>{l.actif ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => openEdit(l)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => remove(l)}>
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
        title={editing ? "Modifier la ligne" : "Nouvelle ligne"}
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
            placeholder="LIGNE-COMP-01"
          />
        </Field>
        <Field label="Désignation">
          <TextInput
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
        </Field>
        <Field label="État">
          <Select
            value={form.actif ? "1" : "0"}
            onChange={(e) => setForm({ ...form, actif: e.target.value === "1" })}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </Field>
      </Modal>
    </Page>
  )
}
