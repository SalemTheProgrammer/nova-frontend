import { useEffect, useState } from "react"
import {
  BookOpen,
  Check,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  UserCog,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { canAccessView } from "@/lib/permissions"

export type NavView =
  | "atelier"
  | "chaines"
  | "of"
  | "operateurs"
  | "commandes"
  | "rapports"
  | "documents"
  | "admin"

interface NavItem {
  view: NavView
  label: string
  description: string
  icon: typeof LayoutDashboard
}

type DrawerCategory = "production" | "commandes" | "ressources" | null

interface CategoryConfig {
  id: "production" | "commandes" | "ressources"
  titre: string
  badge: string
  icon: typeof LayoutDashboard
  items: NavItem[]
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "production",
    titre: "Production",
    badge: "Atelier",
    icon: Factory,
    items: [
      {
        view: "atelier",
        label: "Tableau de bord",
        description: "Vue d'ensemble de la production du jour",
        icon: LayoutDashboard,
      },
      {
        view: "chaines",
        label: "Chaînes",
        description: "Rendement et effectif par chaîne de montage",
        icon: Factory,
      },
      {
        view: "operateurs",
        label: "Opérateurs",
        description: "Effectif et affectation aux postes de travail",
        icon: Users,
      },
    ],
  },
  {
    id: "commandes",
    titre: "Commandes",
    badge: "Clients",
    icon: ClipboardList,
    items: [
      {
        view: "of",
        label: "Ordres de fabrication",
        description: "Avancement des ordres de fabrication",
        icon: ClipboardList,
      },
      {
        view: "commandes",
        label: "Commandes & livraisons",
        description: "Commandes clients et dates de livraison",
        icon: Truck,
      },
    ],
  },
  {
    id: "ressources",
    titre: "Ressources",
    badge: "Documents",
    icon: Package,
    items: [
      {
        view: "rapports",
        label: "Rapports",
        description: "Rapports de production à exporter",
        icon: FileText,
      },
      {
        view: "documents",
        label: "Documentation",
        description: "Procédures et fiches techniques",
        icon: BookOpen,
      },
      {
        view: "admin",
        label: "Administration",
        description: "Utilisateurs, droits et audit",
        icon: UserCog,
      },
    ],
  },
]

interface SidebarProps {
  view: NavView
  onChange: (v: NavView) => void
  open: boolean
  onToggle: () => void
}

export function Sidebar({ view, onChange, open, onToggle }: SidebarProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerCategory>(null)
  const { user, logout } = useAuth()

  // Fermer le drawer avec la touche Echap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveDrawer(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Trouve la catégorie à laquelle appartient la vue courante
  const currentCategory = CATEGORIES.find((cat) =>
    cat.items.some((item) => item.view === view),
  )?.id

  // Filtre les items accessibles pour l'utilisateur
  const categoriesVisibles = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => canAccessView(user, item.view)),
  })).filter((cat) => cat.items.length > 0)

  function toggleCategory(catId: DrawerCategory) {
    setActiveDrawer((prev) => (prev === catId ? null : catId))
  }

  function handleSelectView(nextView: NavView) {
    onChange(nextView)
    setActiveDrawer(null)
  }

  const activeCategoryData = categoriesVisibles.find((c) => c.id === activeDrawer)

  return (
    <>
      {/* Fond mobile si ouvert */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          Rail latéral flottant : Uniquement des icônes, marges et border-radius
         ========================================================================= */}
      <aside
        aria-label="Navigation principale"
        className={cn(
          "relative z-30 my-3 ml-3 flex h-[calc(100dvh-1.5rem)] w-16 shrink-0 flex-col items-center justify-between",
          "rounded-xl border border-border bg-card p-2.5 transition-all",
          // Sur mobile uniquement : position fixed en overlay quand ouvert
          "max-md:fixed max-md:left-0 max-md:top-0 max-md:z-40 max-md:shadow-lg",
          !open && "max-md:hidden",
        )}
      >
        {/* Partie Haute : Logo seul + Icônes principales */}
        <div className="flex w-full flex-col items-center gap-2">
          {/* Logo Nova icon-only (sans boîte ni bordure, uniquement le glyphe violet) */}
          <button
            type="button"
            onClick={() => handleSelectView("atelier")}
            title="Nova"
            className="group relative flex size-12 items-center justify-center rounded-xl transition-transform hover:bg-accent/60 active:scale-95"
          >
            <img
              src="/nova-logo.png"
              alt="Nova"
              className="size-9 object-contain transition-transform group-hover:scale-105"
            />
          </button>

          {/* Icônes des catégories principales */}
          <nav className="flex flex-col items-center gap-1.5 pt-1" aria-label="Sections principales">
            {categoriesVisibles.map((cat) => {
              const isSelectedCategory = currentCategory === cat.id
              const isDrawerOpen = activeDrawer === cat.id

              return (
                <div key={cat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    aria-label={cat.titre}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl transition-all",
                      isDrawerOpen
                        ? "bg-foreground text-background"
                        : isSelectedCategory
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <cat.icon className="size-5" />
                  </button>

                  {/* Tooltip au survol */}
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                    {cat.titre}
                  </span>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Partie Basse : Logout */}
        <div className="flex w-full flex-col items-center gap-2">
          <div className="h-px w-8 bg-border/80" />

          {/* Déconnexion */}
          {user && (
            <div className="group relative">
              <button
                type="button"
                onClick={logout}
                title="Déconnexion"
                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
              >
                <LogOut className="size-5" />
              </button>
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                Déconnexion
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          Panneau Drawer Flottant : S'ouvre sur le conteneur à droite du rail
         ========================================================================= */}
      {activeDrawer && (
        <>
          {/* Fond obscurci cliquable pour fermer */}
          <div
            className="fixed inset-0 z-40 bg-black/20 transition-opacity"
            onClick={() => setActiveDrawer(null)}
            aria-hidden="true"
          />

          {/* Tiroir d'éléments */}
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "fixed z-50 top-3 bottom-3 left-[5.25rem] w-80 md:w-88 rounded-xl",
              "border border-border bg-card shadow-lg flex flex-col overflow-hidden",
              "animate-in fade-in slide-in-from-left-4 duration-200",
            )}
          >
            {activeCategoryData && (
                <>
                  <div className="flex items-center justify-between border-b border-border/80 p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                        <activeCategoryData.icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm font-semibold tracking-tight text-foreground">
                            {activeCategoryData.titre}
                          </h2>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {activeCategoryData.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {activeCategoryData.items.length} modules disponibles
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {activeCategoryData.items.map((item) => {
                      const isActive = view === item.view

                      return (
                        <button
                          key={item.view}
                          type="button"
                          onClick={() => handleSelectView(item.view)}
                          className={cn(
                            "group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all",
                            isActive
                              ? "bg-accent text-foreground font-medium"
                              : "hover:bg-accent text-foreground",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors mt-0.5",
                              isActive
                                ? "bg-background text-foreground"
                                : "bg-muted text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <item.icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              {isActive && <Check className="size-4 shrink-0" />}
                            </div>
                            <p
                              className={cn(
                                "text-xs line-clamp-2 mt-0.5 leading-relaxed",
                                isActive ? "text-muted-foreground" : "text-muted-foreground",
                              )}
                            >
                              {item.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
          </div>
        </>
      )}
    </>
  )
}
