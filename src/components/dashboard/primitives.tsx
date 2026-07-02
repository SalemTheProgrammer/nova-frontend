import { useState, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Page({
  title,
  description,
  actions,
  children,
  fullHeight = false,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  fullHeight?: boolean
}) {
  if (fullHeight) {
    return (
      <div className="flex h-full flex-col overflow-hidden px-5 pb-4 pt-4">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="hidden text-sm text-muted-foreground md:block">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    )
  }
  return (
    <div className="w-full px-6 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
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
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>
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
