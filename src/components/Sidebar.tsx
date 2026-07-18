import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Boxes,
  ChevronDown,
  ClipboardList,
  Factory,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  UserCog,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { lignesApi } from "@/lib/api"
import type { LigneProduction } from "@/lib/types"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useAuth } from "@/lib/auth"
import { canAccessView } from "@/lib/permissions"

export type NavView =
  | "dashboard"
  | "machines"
  | "jumeau"
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

const GROUPES_PRINCIPAUX: { titre: string; items: NavItem[] }[] = [
  {
    titre: "Pilotage",
    items: [
      { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { view: "machines", label: "Machines", icon: Factory },
      { view: "ordres", label: "Ordres de fabrication", icon: ClipboardList },
      { view: "jumeau", label: "Jumeau numérique", icon: Boxes },
      { view: "assistant", label: "Assistant Nova", icon: MessageSquare },
    ],
  },
  {
    titre: "Analyse",
    items: [
      { view: "trs", label: "TRS", icon: Activity },
      { view: "arrets", label: "Arrêts", icon: AlertTriangle },
      { view: "qualite", label: "Qualité", icon: ShieldCheck },
      { view: "maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
]

const RESSOURCES: NavItem[] = [
  { view: "stock", label: "Stock", icon: Package },
  { view: "articles", label: "Articles", icon: Package },
  { view: "matieres", label: "Matières premières", icon: FlaskConical },
  { view: "lignes", label: "Lignes", icon: Factory },
  { view: "fournisseurs", label: "Fournisseurs", icon: Truck },
  { view: "documents", label: "Documents", icon: BookOpen },
  { view: "simulateur", label: "Simulateur", icon: SlidersHorizontal },
]

interface SidebarProps {
  view: NavView
  onChange: (v: NavView) => void
  open: boolean
  onToggle: () => void
  ligneId: number | null
  onChangeLigne: (id: number | null) => void
}

function NavigationButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  )
}

export function Sidebar({ view, onChange, open, onToggle, ligneId, onChangeLigne }: SidebarProps) {
  const [lignes, setLignes] = useState<LigneProduction[]>([])
  const [resourcesOpen, setResourcesOpen] = useState(() =>
    RESSOURCES.some((item) => item.view === view),
  )
  const { connected } = useWebSocket()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    lignesApi.list().then(setLignes).catch(() => {})
  }, [])

  useEffect(() => {
    if (RESSOURCES.some((item) => item.view === view)) setResourcesOpen(true)
  }, [view])

  // Filtre les entrées de nav selon le périmètre d'outils du numéro connecté
  // (voir lib/permissions.ts) — un compte restreint ne doit pas voir de lien
  // vers une page dont l'API lui refusera l'accès.
  const groupesPrincipauxVisibles = GROUPES_PRINCIPAUX.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessView(user, item.view)),
  })).filter((group) => group.items.length > 0)
  const ressourcesVisibles = RESSOURCES.filter((item) => canAccessView(user, item.view))
  const railItems = groupesPrincipauxVisibles.flatMap((group) => group.items)

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className={cn(
          "group/rail fixed inset-y-0 left-0 z-40 flex h-dvh w-72 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar shadow-xl",
          "transition-[width,transform] duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:shadow-none",
          open ? "translate-x-0 md:w-[17rem]" : "-translate-x-full md:w-16 md:translate-x-0",
        )}
      >
        <div
          aria-hidden={open}
          inert={open}
          className={cn(
            "absolute inset-0 hidden flex-col items-center py-4 transition-opacity duration-150 md:flex",
            open ? "pointer-events-none opacity-0" : "opacity-100 delay-150",
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label="Afficher le menu"
            title="Afficher le menu"
            className="mb-3 flex size-10 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <PanelLeftOpen className="size-4" />
          </button>

          <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
            {railItems.map((item) => (
              <div key={item.view} className="group/item relative">
                <button
                  type="button"
                  onClick={() => onChange(item.view)}
                  aria-label={item.label}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors",
                    view === item.view
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                </button>
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100">
                  {item.label}
                </span>
              </div>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1">
            {user?.is_admin && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                aria-label="Administration"
                title="Administration"
                className="flex size-10 items-center justify-center rounded-xl text-violet-600 transition-colors hover:bg-sidebar-accent/60 dark:text-violet-400"
              >
                <UserCog className="size-4" />
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={logout}
                aria-label="Déconnexion"
                title="Déconnexion"
                className="flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <LogOut className="size-4" />
              </button>
            )}
            <div className="my-1" title={connected ? "Connecté" : "Déconnecté"}>
              {connected ? (
                <Wifi className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="size-3.5 text-destructive" />
              )}
            </div>
          </div>
        </div>

        <div
          aria-hidden={!open}
          inert={!open}
          className={cn(
            "absolute inset-0 flex w-72 flex-col transition-opacity duration-150 md:w-[17rem]",
            open ? "opacity-100 delay-150" : "pointer-events-none opacity-0",
          )}
        >
          <div className="flex h-[4.5rem] items-center justify-between gap-3 border-b border-sidebar-border px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="size-9 shrink-0 rounded-xl shadow-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight">Nova Data</p>
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Manufacturing Intelligence
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Réduire le menu"
              className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>

          <div className="border-b border-sidebar-border p-3">
            <label
              htmlFor="sidebar-ligne"
              className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <Factory className="size-3" /> Ligne active
            </label>
            <select
              id="sidebar-ligne"
              value={ligneId ?? ""}
              onChange={(event) =>
                onChangeLigne(event.target.value ? Number(event.target.value) : null)
              }
              className="h-10 w-full rounded-xl border border-sidebar-border bg-background px-3 text-sm font-medium outline-none transition-shadow focus:border-ring focus:ring-2 focus:ring-ring/15"
            >
              <option value="">Vue usine · toutes les lignes</option>
              {lignes.map((ligne) => (
                <option key={ligne.id} value={ligne.id}>
                  {ligne.designation}
                </option>
              ))}
            </select>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
            {groupesPrincipauxVisibles.map((group) => (
              <div key={group.titre}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                  {group.titre}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavigationButton
                      key={item.view}
                      item={item}
                      active={view === item.view}
                      onClick={() => onChange(item.view)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {ressourcesVisibles.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setResourcesOpen((value) => !value)}
                  aria-expanded={resourcesOpen}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/70"
                >
                  Ressources
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", resourcesOpen && "rotate-180")}
                  />
                </button>
                {resourcesOpen && (
                  <div className="mt-1 space-y-0.5">
                    {ressourcesVisibles.map((item) => (
                      <NavigationButton
                        key={item.view}
                        item={item}
                        active={view === item.view}
                        onClick={() => onChange(item.view)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
            <div
              className={cn(
                "flex items-center gap-2 text-xs font-medium",
                connected ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {connected ? "Temps réel actif" : "Connexion interrompue"}
            </div>

            {user && (
              <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.nom_complet || "Utilisateur"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.telephone}</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {user.is_admin && (
                    <button
                      type="button"
                      onClick={() => navigate("/admin")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
                    >
                      <UserCog className="size-3.5" /> Admin
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-2 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
                  >
                    <LogOut className="size-3.5" /> Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
