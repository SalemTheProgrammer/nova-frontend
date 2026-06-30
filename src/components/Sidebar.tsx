import {
  BookText,
  ClipboardList,
  Factory,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Package,
  PanelLeftClose,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NavView =
  | "assistant"
  | "stock"
  | "ordres"
  | "articles"
  | "matieres"
  | "lignes"
  | "fournisseurs"
  | "normes"

const NAV: { view: NavView; label: string; icon: typeof MessageSquare }[] = [
  { view: "assistant", label: "Assistant", icon: MessageSquare },
  { view: "stock", label: "Tableau de bord", icon: LayoutDashboard },
  { view: "ordres", label: "Ordres de fabrication", icon: ClipboardList },
  { view: "articles", label: "Articles", icon: Package },
  { view: "matieres", label: "Matières premières", icon: FlaskConical },
  { view: "lignes", label: "Lignes de production", icon: Factory },
  { view: "fournisseurs", label: "Fournisseurs", icon: Truck },
  { view: "normes", label: "Normes", icon: BookText },
]

interface SidebarProps {
  view: NavView
  onChange: (v: NavView) => void
  open: boolean
  onToggle: () => void
}

export function Sidebar({ view, onChange, open, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        open ? "w-64" : "w-0 overflow-hidden border-r-0",
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <img src="/r.png" alt="Nova Data" className="mx-auto h-10" />
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV.map((item) => (
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
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
            N
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">Nova Fabrication</p>
            <p className="truncate text-xs text-muted-foreground">v0.1.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
