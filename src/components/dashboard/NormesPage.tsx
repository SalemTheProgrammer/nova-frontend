import { useState } from "react"
import { FileText, Search, Trash2, Upload } from "lucide-react"
import { normesApi } from "@/lib/api"
import { useResource } from "@/lib/useResource"
import type { Norme, NormePassage } from "@/lib/types"
import {
  Badge,
  Button,
  Card,
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

export function NormesPage() {
  const { data, loading, error, reload, setError } = useResource(() => normesApi.list(), [])

  const [open, setOpen] = useState(false)
  const [nom, setNom] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Test RAG
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [passages, setPassages] = useState<NormePassage[] | null>(null)

  async function uploader() {
    if (!nom.trim() || !file) {
      setError("Renseignez un nom et choisissez un PDF.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      await normesApi.upload(nom.trim(), file)
      setOpen(false)
      setNom("")
      setFile(null)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'indexation")
    } finally {
      setUploading(false)
    }
  }

  async function remove(n: Norme) {
    if (!confirm(`Supprimer la norme « ${n.nom} » et ses vecteurs ?`)) return
    try {
      await normesApi.remove(n.id)
      void reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    }
  }

  async function rechercher() {
    if (query.trim().length < 2) return
    setSearching(true)
    setError(null)
    setPassages(null)
    try {
      const res = await normesApi.search(query.trim())
      setPassages(res.passages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de recherche")
    } finally {
      setSearching(false)
    }
  }

  const rows = data ?? []

  return (
    <Page
      title="Normes"
      description="Documents normatifs (BPF/GMP, procédures qualité) indexés pour le RAG de l'agent."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Upload className="size-4" /> Téléverser un PDF
        </Button>
      }
    >
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Aucune norme indexée. Téléversez un PDF pour commencer." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nom</Th>
              <Th>Fichier</Th>
              <Th className="text-center">Pages</Th>
              <Th className="text-center">Chunks</Th>
              <Th>Statut</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} className="hover:bg-muted/30">
                <Td className="font-medium">{n.nom}</Td>
                <Td className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="size-3.5" /> {n.fichier}
                  </span>
                </Td>
                <Td className="text-center">{n.nb_pages}</Td>
                <Td className="text-center">{n.nb_chunks}</Td>
                <Td>
                  <Badge tone={n.statut === "INDEXEE" ? "green" : "amber"}>{n.statut}</Badge>
                </Td>
                <Td className="text-right">
                  <Button variant="ghost" onClick={() => remove(n)}>
                    <Trash2 className="size-4" />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Test RAG */}
      <Card className="mt-6 p-4">
        <h2 className="mb-1 text-sm font-semibold">Tester la recherche</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Recherche sémantique dans les normes — renvoie les passages avec leur source et
          numéro de page (ce que l'agent utilise pour citer).
        </p>
        <div className="flex gap-2">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rechercher()}
            placeholder="Ex. : exigences de traçabilité des lots"
            className="flex-1"
          />
          <Button onClick={rechercher} disabled={searching}>
            <Search className="size-4" /> {searching ? "Recherche…" : "Rechercher"}
          </Button>
        </div>

        {passages !== null && (
          <div className="mt-4 space-y-3">
            {passages.length === 0 ? (
              <EmptyState message="Aucun passage pertinent." />
            ) : (
              passages.map((p, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <Badge tone="blue">{p.norme_nom}</Badge>
                    {p.page != null && (
                      <span className="text-muted-foreground">page {p.page}</span>
                    )}
                    <span className="ml-auto text-muted-foreground">
                      pertinence {p.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">« {p.citation} »</p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Upload modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Téléverser une norme (PDF)"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={uploader} disabled={uploading}>
              {uploading ? "Indexation…" : "Téléverser et indexer"}
            </Button>
          </>
        }
      >
        <Field label="Nom de la norme">
          <TextInput
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="BPF Tunisie 2023"
          />
        </Field>
        <Field label="Fichier PDF">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          L'indexation génère les embeddings (OpenAI) et les stocke dans Pinecone. Cela
          requiert une clé OpenAI valide dans le backend.
        </p>
      </Modal>
    </Page>
  )
}
