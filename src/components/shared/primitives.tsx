import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Page({
  title,
  description,
  actions,
  children,
  fullHeight = false,
  className,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  fullHeight?: boolean
  className?: string
}) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — Nova`
    }
  }, [title])

  const hasHeader = Boolean(title) || Boolean(actions)
  if (fullHeight) {
    return (
      <div className={cn("flex h-full min-w-0 flex-col overflow-hidden p-3 sm:p-4 xl:p-6", className)}>
        {hasHeader && (
          <div className="page-header mb-3 flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0 sm:flex sm:items-baseline sm:gap-3">
              {title && <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>}
              {description && (
                <p className="hidden text-sm text-muted-foreground md:block">{description}</p>
              )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    )
  }
  return (
    <div className="w-full min-w-0 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      {hasHeader && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn("rounded-xl border border-border bg-card", className)}
    >
      {children}
    </div>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-border bg-muted/40 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-4 py-2.5 align-middle", className)}>{children}</td>
}

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "default" | "outline" | "ghost" | "danger"
  type?: "button" | "submit"
  disabled?: boolean
  className?: string
}) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/85",
    outline: "border border-border bg-background hover:bg-accent",
    ghost: "hover:bg-accent text-muted-foreground hover:text-foreground",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
  className?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className={cn("relative z-10 w-full rounded-2xl border border-border/80 bg-card shadow-2xl transition-all overflow-hidden", maxWidth, className)}>
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-border/80 bg-muted/20 px-6 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "green" | "amber" | "red" | "blue"
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/15 text-red-600 dark:text-red-400",
    blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  }
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

/** Étiquette de section — encode le regroupement thématique d'une rangée de cartes. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-primary" />
      <h2 className="text-xs font-semibold text-muted-foreground">
        {children}
      </h2>
    </div>
  )
}

/** Cache le détail technique derrière un clic — replié par défaut pour un écran simple. */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      {message}
    </div>
  )
}
