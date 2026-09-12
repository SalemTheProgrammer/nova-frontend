import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Highlighter } from "lucide-react"
import { documentsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { DocumentPassage } from "@/lib/types"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

/** Normalise un texte pour comparer l'extraction pypdf (index) et pdf.js (viewer). */
function normaliser(texte: string): string {
  return texte.toLowerCase().replace(/\s+/g, " ").trim()
}

function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// En dessous de cette longueur, un fragment de ligne matcherait par hasard
// (numéros de page, en-têtes) : on ne le surligne pas.
const LONGUEUR_MIN_MATCH = 6
// Chevauchement minimal (en caractères) entre une ligne du PDF et un extrait
// pour surligner les lignes où l'extrait commence ou se termine en milieu de ligne.
const CHEVAUCHEMENT_MIN = 25

/** Longueur du plus long suffixe de `a` qui est un préfixe de `b`. */
function chevauchementBord(a: string, b: string): number {
  const max = Math.min(a.length, b.length)
  for (let l = max; l >= CHEVAUCHEMENT_MIN; l--) {
    if (b.startsWith(a.slice(a.length - l))) return l
  }
  return 0
}

/** Une ligne du PDF appartient-elle à l'extrait à surligner ?
 *  Cas couverts : ligne entièrement dans l'extrait, extrait entièrement dans la
 *  ligne, ou extrait qui commence/finit au milieu de la ligne. */
function correspond(ligne: string, extrait: string): boolean {
  if (extrait.includes(ligne) || ligne.includes(extrait)) return true
  return (
    chevauchementBord(ligne, extrait) >= CHEVAUCHEMENT_MIN ||
    chevauchementBord(extrait, ligne) >= CHEVAUCHEMENT_MIN
  )
}

interface DocumentViewerProps {
  documentId: number
  page: number
  passages: DocumentPassage[]
  /** Nom du document affiché dans l'en-tête (si connu). */
  nom?: string
  onClose: () => void
}

/**
 * Viewer PDF d'un document : ouvre le fichier à la page citée et surligne en
 * jaune les passages retrouvés par le RAG. Les citations sont listées dans un
 * rail latéral ; cliquer sur l'une d'elles saute à sa page (et change de
 * fichier si la citation vient d'un autre document).
 */
export function DocumentViewer({ documentId, page, passages, nom, onClose }: DocumentViewerProps) {
  const [courant, setCourant] = useState({ documentId, page })
  const [pdf, setPdf] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [erreur, setErreur] = useState<string | null>(null)
  const conteneurRef = useRef<HTMLDivElement | null>(null)
  const [largeur, setLargeur] = useState(760)

  useEffect(() => {
    setCourant({ documentId, page })
  }, [documentId, page])

  useEffect(() => {
    let annule = false
    setPdf(null)
    setErreur(null)
    setNumPages(0)
    documentsApi
      .pdfBlob(courant.documentId)
      .then((blob) => {
        if (!annule) setPdf(blob)
      })
      .catch((e) => {
        if (!annule) setErreur(e instanceof Error ? e.message : "PDF indisponible")
      })
    return () => {
      annule = true
    }
  }, [courant.documentId])

  useEffect(() => {
    const el = conteneurRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setLargeur(Math.max(320, Math.min(el.clientWidth - 32, 980)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Extraits à surligner sur la page affichée : uniquement les phrases qui
  // répondent à la question (repli sur la citation entière si absents).
  const extraitsPage = useMemo(
    () =>
      passages
        .filter((p) => p.document_id === courant.documentId && p.page === courant.page)
        .flatMap((p) => (p.extraits?.length ? p.extraits : [p.citation]))
        .map(normaliser)
        .filter((e) => e.length >= LONGUEUR_MIN_MATCH),
    [passages, courant.documentId, courant.page],
  )

  const surlignables = passages.filter((p) => p.document_id != null && p.page != null)

  function aller(delta: number) {
    setCourant((c) => ({
      ...c,
      page: Math.min(Math.max(1, c.page + delta), numPages || c.page + delta),
    }))
  }

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour
        </button>
        <FileText className="size-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {nom ?? `Document #${courant.documentId}`}
        </span>
        {extraitsPage.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-400">
            <Highlighter className="size-3" />
            {extraitsPage.length} extrait{extraitsPage.length > 1 ? "s" : ""} surligné
            {extraitsPage.length > 1 ? "s" : ""}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-sm">
          <button
            onClick={() => aller(-1)}
            disabled={courant.page <= 1}
            className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[6rem] text-center text-muted-foreground">
            Page {courant.page}
            {numPages > 0 ? ` / ${numPages}` : ""}
          </span>
          <button
            onClick={() => aller(1)}
            disabled={numPages > 0 && courant.page >= numPages}
            className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF */}
        <div ref={conteneurRef} className="flex-1 overflow-auto bg-muted/40 p-4">
          {erreur ? (
            <div className="mx-auto mt-12 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {erreur}
            </div>
          ) : !pdf ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">Chargement du PDF…</p>
          ) : (
            <Document
              file={pdf}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={() => setErreur("Impossible d'afficher ce PDF.")}
              loading={
                <p className="mt-12 text-center text-sm text-muted-foreground">Ouverture…</p>
              }
              className="flex justify-center"
            >
              <Page
                pageNumber={courant.page}
                width={largeur}
                className="shadow-md"
                customTextRenderer={({ str }) => {
                  const html = echapperHtml(str)
                  const n = normaliser(str)
                  if (
                    n.length >= LONGUEUR_MIN_MATCH &&
                    extraitsPage.some((e) => correspond(n, e))
                  ) {
                    return `<mark class="doc-highlight">${html}</mark>`
                  }
                  return html
                }}
              />
            </Document>
          )}
        </div>

        {/* Rail des citations */}
        {surlignables.length > 0 && (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-3 lg:block">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Passages cités
            </p>
            <div className="space-y-2">
              {surlignables.map((p, i) => {
                const actif = p.document_id === courant.documentId && p.page === courant.page
                return (
                  <button
                    key={i}
                    onClick={() => setCourant({ documentId: p.document_id!, page: p.page! })}
                    className={cn(
                      "w-full rounded-lg border p-2.5 text-left text-xs transition-colors",
                      actif
                        ? "border-yellow-400/60 bg-yellow-400/10"
                        : "border-border hover:bg-accent/50",
                    )}
                  >
                    <span className="mb-1 flex items-center gap-1.5 font-medium">
                      <span className="text-muted-foreground">[{i + 1}]</span>
                      <span className="truncate">{p.document_nom}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">p. {p.page}</span>
                    </span>
                    <span className="line-clamp-3 text-muted-foreground">« {p.citation} »</span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
