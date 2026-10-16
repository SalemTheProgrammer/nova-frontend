import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type ToastKind = "succes" | "erreur"
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, kind: ToastKind = "succes") => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border px-4 py-2.5 text-sm shadow-lg",
              t.kind === "succes"
                ? "border-border bg-card text-foreground"
                : "border-destructive/30 bg-card text-destructive",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
