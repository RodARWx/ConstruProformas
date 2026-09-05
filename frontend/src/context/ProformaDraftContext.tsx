import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { proformaToDraft } from '../features/proformas/proformaLoaders'
import type { HeaderFieldErrors } from '../features/proformas/proformaValidation'
import {
  createDetailLine,
  createEmptyApuBreakdown,
  type ProformaDetailLine,
} from '../types/proforma-detail'
import {
  createEmptyHeaderDraft,
  type Proforma,
  type ProformaDraft,
  type ProformaHeaderDraft,
} from '../types/proforma'

const STORAGE_KEY = 'construproformas_draft'
const LEGACY_HEADER_KEY = 'construproformas_header_draft'

export type { ProformaDraft }

interface ProformaDraftContextValue {
  header: ProformaHeaderDraft
  detalles: ProformaDetailLine[]
  editingProformaId: string | null
  savedProforma: Proforma | null
  isReadOnly: boolean
  isDraftSaved: boolean
  headerFieldErrors: HeaderFieldErrors
  detailFieldError?: string
  setHeader: (
    patch:
      | Partial<ProformaHeaderDraft>
      | ((current: ProformaHeaderDraft) => Partial<ProformaHeaderDraft>),
  ) => void
  setHeaderFieldErrors: (errors: HeaderFieldErrors) => void
  setDetailFieldError: (error?: string) => void
  replaceDraft: (draft: ProformaDraft) => void
  resetForNew: (suggestedId?: string) => void
  loadFromProforma: (proforma: Proforma) => void
  loadCloneTemplate: (proforma: Proforma, suggestedId: string) => void
  setSavedProforma: (proforma: Proforma | null) => void
  addDetailLine: (line: ProformaDetailLine) => void
  updateDetailLine: (localId: string, patch: Partial<ProformaDetailLine>) => void
  removeDetailLine: (localId: string) => void
  persistDraft: () => void
}

const ProformaDraftContext = createContext<ProformaDraftContextValue | null>(null)

function normalizeDraft(draft: ProformaDraft): ProformaDraft {
  return {
    ...draft,
    detalles: draft.detalles.map((line) => ({
      ...createDetailLine(line),
      ...line,
      apu: line.apu ?? createEmptyApuBreakdown(),
    })),
  }
}

function readStoredDraft(): ProformaDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return normalizeDraft(JSON.parse(raw) as ProformaDraft)
    }

    const legacy = sessionStorage.getItem(LEGACY_HEADER_KEY)
    if (legacy) {
      return normalizeDraft({
        header: JSON.parse(legacy) as ProformaHeaderDraft,
        detalles: [],
      })
    }

    return null
  } catch {
    return null
  }
}

function writeStoredDraft(draft: ProformaDraft | null): void {
  if (draft) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    sessionStorage.removeItem(LEGACY_HEADER_KEY)
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_HEADER_KEY)
  }
}

function createEmptyDraft(suggestedId = ''): ProformaDraft {
  return {
    header: createEmptyHeaderDraft(suggestedId),
    detalles: [],
  }
}

export function ProformaDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ProformaDraft>(
    () => readStoredDraft() ?? createEmptyDraft(),
  )
  const [editingProformaId, setEditingProformaId] = useState<string | null>(null)
  const [savedProforma, setSavedProformaState] = useState<Proforma | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(() => readStoredDraft() !== null)
  const [headerFieldErrors, setHeaderFieldErrors] = useState<HeaderFieldErrors>({})
  const [detailFieldError, setDetailFieldError] = useState<string | undefined>()

  const setHeader = useCallback(
    (
      patch:
        | Partial<ProformaHeaderDraft>
        | ((current: ProformaHeaderDraft) => Partial<ProformaHeaderDraft>),
    ) => {
      setDraft((current) => {
        if (isReadOnly) return current
        return {
          ...current,
          header: {
            ...current.header,
            ...(typeof patch === 'function' ? patch(current.header) : patch),
          },
        }
      })
      if (!isReadOnly) setIsDraftSaved(false)
    },
    [isReadOnly],
  )

  const replaceDraft = useCallback((next: ProformaDraft) => {
    setDraft(normalizeDraft(next))
    setIsDraftSaved(false)
  }, [])

  const resetForNew = useCallback((suggestedId = '') => {
    setDraft(createEmptyDraft(suggestedId))
    setEditingProformaId(null)
    setSavedProformaState(null)
    setIsReadOnly(false)
    setHeaderFieldErrors({})
    setDetailFieldError(undefined)
    writeStoredDraft(null)
    setIsDraftSaved(false)
  }, [])

  const loadFromProforma = useCallback((proforma: Proforma) => {
    const next = proformaToDraft(proforma)
    setDraft(next)
    setEditingProformaId(proforma.idProforma)
    setSavedProformaState(proforma)
    setIsReadOnly(false) // Siempre editable: si estaba EXPORTED, el backend genera _V2 al re-exportar
    setHeaderFieldErrors({})
    setDetailFieldError(undefined)
    writeStoredDraft(next)
    setIsDraftSaved(true)
  }, [])

  const loadCloneTemplate = useCallback(
    (proforma: Proforma, suggestedId: string) => {
      const next = proformaToDraft(proforma)
      next.header.idProforma = suggestedId
      next.header.suggestedId = suggestedId
      next.header.fecha = new Date().toISOString().slice(0, 10)
      setDraft(next)
      setEditingProformaId(null)
      setSavedProformaState(null)
      setIsReadOnly(false)
      setHeaderFieldErrors({})
      setDetailFieldError(undefined)
      writeStoredDraft(next)
      setIsDraftSaved(true)
    },
    [],
  )

  const setSavedProforma = useCallback((proforma: Proforma | null) => {
    setSavedProformaState(proforma)
    if (proforma) {
      setEditingProformaId(proforma.idProforma)
      setIsReadOnly(false) // Siempre editable: guardar cambios crea V2 en próxima exportación
    }
  }, [])

  const addDetailLine = useCallback(
    (line: ProformaDetailLine) => {
      if (isReadOnly) return
      setDraft((current) => ({
        ...current,
        detalles: [...current.detalles, line],
      }))
      setIsDraftSaved(false)
    },
    [isReadOnly],
  )

  const updateDetailLine = useCallback(
    (localId: string, patch: Partial<ProformaDetailLine>) => {
      if (isReadOnly) return
      setDraft((current) => ({
        ...current,
        detalles: current.detalles.map((line) =>
          line.localId === localId ? { ...line, ...patch } : line,
        ),
      }))
      setIsDraftSaved(false)
    },
    [isReadOnly],
  )

  const removeDetailLine = useCallback(
    (localId: string) => {
      if (isReadOnly) return
      setDraft((current) => ({
        ...current,
        detalles: current.detalles.filter((line) => line.localId !== localId),
      }))
      setIsDraftSaved(false)
    },
    [isReadOnly],
  )

  const persistDraft = useCallback(() => {
    setDraft((current) => {
      writeStoredDraft(current)
      return current
    })
    setIsDraftSaved(true)
  }, [])

  const value = useMemo(
    () => ({
      header: draft.header,
      detalles: draft.detalles,
      editingProformaId,
      savedProforma,
      isReadOnly,
      isDraftSaved,
      headerFieldErrors,
      detailFieldError,
      setHeader,
      setHeaderFieldErrors,
      setDetailFieldError,
      replaceDraft,
      resetForNew,
      loadFromProforma,
      loadCloneTemplate,
      setSavedProforma,
      addDetailLine,
      updateDetailLine,
      removeDetailLine,
      persistDraft,
    }),
    [
      draft,
      editingProformaId,
      savedProforma,
      isReadOnly,
      isDraftSaved,
      headerFieldErrors,
      detailFieldError,
      setHeader,
      replaceDraft,
      resetForNew,
      loadFromProforma,
      loadCloneTemplate,
      setSavedProforma,
      addDetailLine,
      updateDetailLine,
      removeDetailLine,
      persistDraft,
    ],
  )

  return (
    <ProformaDraftContext.Provider value={value}>
      {children}
    </ProformaDraftContext.Provider>
  )
}

export function useProformaDraft(): ProformaDraftContextValue {
  const context = useContext(ProformaDraftContext)
  if (!context) {
    throw new Error('useProformaDraft debe usarse dentro de ProformaDraftProvider')
  }
  return context
}
