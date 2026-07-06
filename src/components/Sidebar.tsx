import { useEffect, useState } from "react"
import {
  BookOpen,
  ClipboardList,
  Factory,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Package,
  PanelLeftClose,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { lignesApi } from "@/lib/api"
import type { LigneProduction } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"

export type NavView =
  | "dashboard"
  | "machines"
  | "trs"
  | "arrets"
  | "qualite"
  | "maintenance"
  | "stock"
  | "ordres"
  | "articles"
  | "matieres"
  | "lignes"
  | "fournisseurs"
  | "documents"
  | "simulateur"
  | "assistant"

interface NavItem {
  view: NavView
  label: string
  icon: typeof LayoutDashboard
}

const GROUPES: { titre: string; items: NavItem[] }[] = [
  {
    titre: "Atelier",
    items: [
      { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { view: "machines", label: "Machines", icon: Factory },
      { view: "assistant", label: "Assistant Nova", icon: MessageSquare },
    ],
  },
  {
    titre: "Gestion",
    items: [
      { view: "stock", label: "Stock", icon: Package },
      { view: "ordres", label: "Ordres", icon: ClipboardList },
      { view: "articles", label: "Articles", icon: Package },
      { view: "matieres", label: "Matières premières", icon: FlaskConical },
      { view: "lignes", label: "Lignes", icon: Factory },
      { view: "fournisseurs", label: "Fournisseurs", icon: Truck },
      { view: "documents", label: "Documents", icon: BookOpen },
    ],
  },
]

interface SidebarProps {
  view: NavView
  onChange: (v: NavView) => void
  open: boolean
  onToggle: () => void
  ligneId: number | null
  onChangeLigne: (id: number | null) => void
}

export function Sidebar({ view, onChange, open, onToggle, ligneId, onChangeLigne }: SidebarProps) {
  const [lignes, setLignes] = useState<LigneProduction[]>([])
  const { connected } = useWebSocket()

  useEffect(() => {
    lignesApi.list().then(setLignes).catch(() => {})
  }, [])

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        open ? "w-64" : "w-0 overflow-hidden border-r-0",
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <img src="/r.png" alt="Nova" className="mx-auto h-10" />
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="border-b border-sidebar-border px-3 pb-3">
        <select
          value={ligneId ?? ""}
          onChange={(e) => onChangeLigne(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-sidebar-border bg-background px-2.5 py-2 text-sm outline-none focus:border-ring"
        >
          <option value="">Toutes les lignes</option>
          {lignes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.designation}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {GROUPES.map((groupe) => (
          <div key={groupe.titre}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {groupe.titre}
            </p>
            <div className="space-y-0.5">
              {groupe.items.map((item) => (
                <button
                  key={item.view}
                  onClick={() => onChange(item.view)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    view === item.view
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs",
            connected ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {connected ? "Connecté" : "Déconnecté"}
        </div>
      </div>
    </aside>
  )
}
