import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getApiErrorMessage, ensureArray } from '../lib/api'
import { notify } from '../lib/toast'
import type { CreateProformaPayload } from '../features/proformas/proformaMappers'
import type { SyncItemResult } from '../types/sync'
import { syncProformas } from '../features/proformas/proformasApi'
import {
  listOfflineDrafts,
  listSyncCandidates,
  markOfflineDraftFailed,
  removeOfflineDraft,
  saveOfflineDraft,
} from '../features/proformas/offlineDraftsDb'

interface SyncContextValue {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  queueDraftForSync: (
    payload: CreateProformaPayload,
    errorMessage?: string,
  ) => Promise<void>
  retrySyncNow: () => Promise<void>
  refreshOfflineStatus: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  const refreshOfflineStatus = useCallback(async () => {
    const drafts = await listOfflineDrafts()
    const pending = drafts.filter((item) => item.status === 'pending').length
    const failed = drafts.filter((item) => item.status === 'failed').length
    setPendingCount(pending)
    setFailedCount(failed)
  }, [])

  const queueDraftForSync = useCallback(
    async (payload: CreateProformaPayload, errorMessage?: string) => {
      await saveOfflineDraft(payload, errorMessage ? 'failed' : 'pending', errorMessage)
      await refreshOfflineStatus()
    },
    [refreshOfflineStatus],
  )

  const retrySyncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return

    const candidates = await listSyncCandidates()
    if (candidates.length === 0) {
      await refreshOfflineStatus()
      return
    }

    setIsSyncing(true)
    try {
      const response = await syncProformas(candidates.map((item) => item.payload))
      const byId = new Map(
        candidates.map((item) => [item.payload.idProforma, item.localId]),
      )

      const results = ensureArray<SyncItemResult>(
        response.results,
        'resultados de sincronización',
      )
      for (const result of results) {
        const localId = byId.get(result.idProforma)
        if (!localId) continue

        if (result.success) {
          await removeOfflineDraft(localId)
        } else {
          await markOfflineDraftFailed(
            localId,
            result.error || 'Error desconocido al sincronizar',
          )
        }
      }

      const failedIds = results
        .filter((item) => !item.success)
        .map((item) => item.idProforma)

      if (response.succeeded > 0) {
        notify.success(
          'Sincronización completada',
          `${response.succeeded} proforma(s) sincronizadas.`,
        )
      }

      if (response.failed > 0) {
        notify.warning(
          'Sincronización parcial',
          `${response.failed} pendiente(s): ${failedIds.join(', ')}`,
        )
      }
    } catch (error) {
      const message = getApiErrorMessage(error)
      notify.error('No se pudo sincronizar borradores pendientes', message)
    } finally {
      setIsSyncing(false)
      await refreshOfflineStatus()
    }
  }, [isSyncing, refreshOfflineStatus])

  useEffect(() => {
    void refreshOfflineStatus()
  }, [refreshOfflineStatus])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline) return
    void retrySyncNow()
  }, [isOnline, retrySyncNow])

  const value = useMemo(
    () => ({
      isOnline,
      isSyncing,
      pendingCount,
      failedCount,
      queueDraftForSync,
      retrySyncNow,
      refreshOfflineStatus,
    }),
    [
      failedCount,
      isOnline,
      isSyncing,
      pendingCount,
      queueDraftForSync,
      refreshOfflineStatus,
      retrySyncNow,
    ],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync debe usarse dentro de SyncProvider')
  }
  return context
}

