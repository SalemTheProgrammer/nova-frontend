import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OrdreFabrication } from "@/lib/types"

const STATUS_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
}

function normaliser(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function libelle(ordre: OrdreFabrication) {
  return `${ordre.numero} · ${ordre.code_article}`
}

export function OFSearchAutocomplete({
  ordres,
  value,
  onChange,
}: {
  ordres: OrdreFabrication[]
  value: number | null
  onChange: (id: number | null) => void
}) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const selected = ordres.find((ordre) => ordre.id === value)

  useEffect(() => {
    if (!open) setQuery(selected ? libelle(selected) : "")
  }, [open, selected])

  const recommandations = useMemo(() => {
    const term = normaliser(query.trim())
    const source = term
      ? ordres.filter((ordre) =>
          normaliser(
            [
              ordre.numero,
              ordre.code_article,
              ordre.designation_article,
              ordre.numero_lot_produit ?? "",
              STATUS_LABEL[ordre.statut] ?? ordre.statut,
            ].join(" "),
          ).includes(term),
        )
      : ordres

    return source.slice(0, 7)
  }, [ordres, query])

  function choisir(ordre: OrdreFabrication | null) {
    onChange(ordre?.id ?? null)
    setQuery(ordre ? libelle(ordre) : "")
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const optionCount = recommandations.length + 1
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(optionCount - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault()
      choisir(activeIndex === 0 ? null : recommandations[activeIndex - 1])
    } else if (event.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div
      className="relative w-full sm:w-[min(24rem,46vw)]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false)
          setActiveIndex(-1)
        }
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Rechercher un ordre de fabrication"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        value={query}
        placeholder="Rechercher un OF, article ou lot…"
        onFocus={(event) => {
          setOpen(true)
          event.currentTarget.select()
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-xs outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/15"
      />
      {(query || value != null) && (
        <button
          type="button"
          aria-label="Effacer la recherche d'OF"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            choisir(null)
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 max-h-72 w-full min-w-0 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl sm:min-w-[18rem]"
        >
          <button
            id={`${listboxId}-0`}
            type="button"
            role="option"
            aria-selected={value == null}
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => choisir(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs",
              activeIndex === 0 ? "bg-accent" : "hover:bg-accent/70",
            )}
          >
            <span>
              <span className="block font-medium">Sélection automatique</span>
              <span className="text-[11px] text-muted-foreground">OF réellement monté sur une machine</span>
            </span>
            {value == null && <Check className="size-3.5 text-violet-600" />}
          </button>

          {recommandations.map((ordre, index) => {
            const optionIndex = index + 1
            return (
              <button
                id={`${listboxId}-${optionIndex}`}
                key={ordre.id}
                type="button"
                role="option"
                aria-selected={ordre.id === value}
                onMouseEnter={() => setActiveIndex(optionIndex)}
                onClick={() => choisir(ordre)}
                className={cn(
                  "mt-0.5 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left",
                  activeIndex === optionIndex ? "bg-accent" : "hover:bg-accent/70",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold">{ordre.numero}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {ordre.code_article} · {ordre.designation_article}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {STATUS_LABEL[ordre.statut] ?? ordre.statut}
                  </span>
                  {ordre.id === value && <Check className="size-3.5 text-violet-600" />}
                </span>
              </button>
            )
          })}

          {recommandations.length === 0 && (
            <p className="px-3 py-5 text-center text-xs text-muted-foreground">Aucun OF trouvé.</p>
          )}
        </div>
      )}
    </div>
  )
}
