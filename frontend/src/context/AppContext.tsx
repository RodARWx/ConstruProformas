import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearToken, getStoredToken, storeToken } from '../lib/api'
import type { UserRole } from '../types/app'

interface AppContextValue {
  /** Indica si hay un JWT válido en sesión. */
  isAccessGranted: boolean
  /** Almacena el JWT y marca sesión como activa. */
  grantAccess: (token: string) => void
  /** Elimina el JWT y cierra sesión. */
  revokeAccess: () => void
  role: UserRole
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAccessGranted, setIsAccessGranted] = useState(
    () => !!getStoredToken(),
  )

  const role: UserRole = 'emisor'

  const grantAccess = useCallback((token: string) => {
    storeToken(token)
    setIsAccessGranted(true)
  }, [])

  const revokeAccess = useCallback(() => {
    clearToken()
    setIsAccessGranted(false)
  }, [])

  const value = useMemo(
    () => ({
      isAccessGranted,
      grantAccess,
      revokeAccess,
      role,
    }),
    [isAccessGranted, grantAccess, revokeAccess, role],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider')
  }
  return context
}
