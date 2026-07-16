import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  authApi,
  clearSession,
  getStoredUser,
  getToken,
  storeSession,
  type User,
} from "@/lib/api"

interface AuthContextValue {
  user: User | null
  /** true tant qu'on vérifie le jeton stocké au chargement. */
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (getToken() ? getStoredUser() : null))
  const [loading, setLoading] = useState<boolean>(() => !!getToken())

  // Au chargement, si un jeton existe, on le revalide auprès du backend
  // (jeton expiré/révoqué → déconnexion propre).
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    let annule = false
    authApi
      .me()
      .then((u) => {
        if (annule) return
        setUser(u)
        // rafraîchit le profil stocké (droits/outils à jour)
        storeSession(getToken()!, u)
      })
      .catch(() => {
        if (annule) return
        clearSession()
        setUser(null)
      })
      .finally(() => {
        if (!annule) setLoading(false)
      })
    return () => {
      annule = true
    }
  }, [])

  const login = useCallback((token: string, u: User) => {
    storeSession(token, u)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    window.location.href = "/login"
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>")
  return ctx
}
