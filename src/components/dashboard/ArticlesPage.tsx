import { useState } from "react"
import { ListTree, Pencil, Plus, Trash2 } from "lucide-react"
import { articlesApi, matieresApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type { Article, MatierePremiere, Nomenclature } from "@/lib/types"
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

interface LigneForm {
  matiere_premiere_id: number
  quantite_par_unite: string
}

export function ArticlesPage() {
  const { data, loading, error, reload, setError } = useResource(() => articlesApi.list(), [])
  const mps = useResource(() => matieresApi.list(), [])

  const [editing, setEditing] = useState<Article | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: "", designation: "", unite: "UN", actif: true })

  // Nomenclature modal
  const [nomArticle, setNomArticle] = useState<Article | null>(null)
  const [nomLignes, setNomLignes] = useState<LigneForm[]>([])
  const [nomLoading, setNomLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm({ code: "", designation: "", unite: "UN", actif: true })
    setOpen(true)
  }
  function openEdit(a: Article) {
    setEditing(a)
    setForm({ code: a.code, designation: a.designation, unite: a.unite, actif: a.actif })
    setOpen(true)
  }

  async function save() {
    try {
      const payload = { ...form, unite: form.unite as Article["unite"] }
      if (editing) await articlesApi.update(editing.id, payload)
      else await articlesApi.create(payload)
      setOpen(false)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }
  async function remove(a: Article) {
    if (!confirm(`Supprimer l'article ${a.code} ?`)) return
    try {
      await articlesApi.remove(a.id)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function openNomenclature(a: Article) {
    setNomArticle(a)
    setNomLignes([])
    setNomLoading(true)
    try {
      const nom: Nomenclature = await articlesApi.nomenclature(a.id)
      setNomLignes(
        nom.lignes.map((l) => ({
          matiere_premiere_id: l.matiere_premiere_id,
          quantite_par_unite: l.quantite_par_unite,
        })),
      )
    } catch {
      // pas de nomenclature encore — on part d'une formule vide
      setNomLignes([])
    } finally {
      setNomLoading(false)
    }
  }

  async function saveNomenclature() {
    if (!nomArticle) return
    const lignes = nomLignes
      .filter((l) => l.matiere_premiere_id && Number(l.quantite_par_unite) > 0)
      .map((l) => ({
        matiere_premiere_id: l.matiere_premiere_id,
        quantite_par_unite: Number(l.quantite_par_unite),
      }))
    if (lignes.length === 0) {
      setError("Ajoutez au moins une matière première.")
      return
    }
    try {
      await articlesApi.setNomenclature(nomArticle.id, lignes)
      setNomArticle(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  const mpList: MatierePremiere[] = mps.data ?? []
  const rows = data ?? []

  return (
    <Page
      title="Articles"
      description="Produits finis fabricables et leur formule (nomenclature)."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvel article
        </Button>
      }
    >
      <ErrorBanner message={error} />
      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucun article." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Désignation</Th>
              <Th>Unité</Th>
              <Th>État</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{a.code}</Td>
                <Td>{a.designation}</Td>
                <Td>{a.unite}</Td>
                <Td>{a.actif ? <Badge tone="green">Actif</Badge> : <Badge>Inactif</Badge>}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => openNomenclature(a)}>
                      <ListTree className="size-4" /> Formule
                    </Button>
                    <Button variant="ghost" onClick={() => openEdit(a)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => remove(a)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Create/edit article */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier l'article" : "Nouvel article"}
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
            placeholder="PARA500"
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
        <Field label="État">
          <Select
            value={form.actif ? "1" : "0"}
            onChange={(e) => setForm({ ...form, actif: e.target.value === "1" })}
          >
            <option value="1">Actif</option>
            <option value="0">Inactif</option>
          </Select>
        </Field>
      </Modal>

      {/* Nomenclature */}
      <Modal
        open={nomArticle !== null}
        onClose={() => setNomArticle(null)}
        title={`Formule — ${nomArticle?.code ?? ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setNomArticle(null)}>
              Annuler
            </Button>
            <Button onClick={saveNomenclature}>Enregistrer la formule</Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Quantité de chaque matière première par unité produite. Enregistrer crée une
          nouvelle version de la nomenclature.
        </p>
        {nomLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-2">
            {nomLignes.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={l.matiere_premiere_id || ""}
                  onChange={(e) => {
                    const next = [...nomLignes]
                    next[i] = { ...l, matiere_premiere_id: Number(e.target.value) }
                    setNomLignes(next)
                  }}
                  className="flex-1"
                >
                  <option value="">— matière première —</option>
                  {mpList.map((mp) => (
                    <option key={mp.id} value={mp.id}>
                      {mp.code} · {mp.designation}
                    </option>
                  ))}
                </Select>
                <TextInput
                  type="number"
                  step="any"
                  value={l.quantite_par_unite}
                  onChange={(e) => {
                    const next = [...nomLignes]
                    next[i] = { ...l, quantite_par_unite: e.target.value }
                    setNomLignes(next)
                  }}
                  placeholder="qté"
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  onClick={() => setNomLignes(nomLignes.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setNomLignes([...nomLignes, { matiere_premiere_id: 0, quantite_par_unite: "" }])
              }
            >
              <Plus className="size-4" /> Ajouter une MP
            </Button>
          </div>
        )}
      </Modal>
    </Page>
  )
}
