import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { useSync } from '../../context/SyncContext'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import type { Proforma, ProformaFileEntry } from '../../types/proforma'
import {
  draftToCreatePayload,
  draftToUpdatePayload,
} from './proformaMappers'
import {
  validateProformaDetalles,
  validateProformaHeader,
} from './proformaValidation'
import {
  checkProformaIdAvailability,
  createProforma,
  fetchProformaFiles,
  getIdConflictMessage,
  openProformaFile,
  updateProforma,
} from './proformasApi'

export function ProformaSaveBar() {
  const navigate = useNavigate()
  const {
    header,
    detalles,
    editingProformaId,
    setHeaderFieldErrors,
    setDetailFieldError,
    setSavedProforma,
    persistDraft,
  } = useProformaDraft()
  const { queueDraftForSync } = useSync()

  const [isSaving, setIsSaving] = useState(false)
  const [openingFile, setOpeningFile] = useState<string | null>(null)
  const [files, setFiles] = useState<ProformaFileEntry[]>([])

  const targetProformaId = editingProformaId || header.idProforma

  const refreshFiles = useCallback(async (id: string) => {
    if (!id) return
    try {
      const list = await fetchProformaFiles(id)
      setFiles(list)
    } catch {
      setFiles([])
    }
  }, [])

  useEffect(() => {
    if (targetProformaId) {
      void refreshFiles(targetProformaId)
    }
  }, [targetProformaId, refreshFiles])

  function isConnectivityError(error: unknown): boolean {
    if (!navigator.onLine) return true
    return axios.isAxiosError(error) && !error.response
  }

  async function executeSave(): Promise<Proforma | null> {
    const headerErrors = validateProformaHeader(header)
    const detailError = validateProformaDetalles(detalles)

    setHeaderFieldErrors(headerErrors)
    setDetailFieldError(detailError)

    if (Object.keys(headerErrors).length > 0 || detailError) {
      const messages = [
        ...Object.values(headerErrors).filter(Boolean),
        detailError,
      ].filter(Boolean)
      notify.error('Complete los campos obligatorios', messages.slice(0, 2).join(' · '))
      return null
    }

    if (!editingProformaId) {
      const availability = await checkProformaIdAvailability(header.idProforma)
      if (availability !== 'available') {
        const message = getIdConflictMessage(
          header.idProforma,
          availability,
          header.suggestedId,
        )
        setHeaderFieldErrors({ idProforma: message })
        notify.warning('ID no disponible', message)
        return null
      }
    }

    setIsSaving(true)
    try {
      const createPayload = draftToCreatePayload(header, detalles)
      const saved = editingProformaId
        ? await updateProforma(
          editingProformaId,
          draftToUpdatePayload(header, detalles),
        )
        : await createProforma(createPayload)

      setSavedProforma(saved)
      persistDraft()
      await refreshFiles(saved.idProforma)
      return saved
    } catch (error) {
      if (isApiConflict(error)) {
        const message = getApiErrorMessage(error)
        setHeaderFieldErrors({ idProforma: message })
        notify.warning('ID no disponible', message)
      } else if (isConnectivityError(error)) {
        const payload = draftToCreatePayload(header, detalles)
        await queueDraftForSync(payload, getApiErrorMessage(error))
        notify.warning(
          'Sin conexión: proforma guardada localmente',
          'Se enviará automáticamente al recuperar conexión.',
        )
      } else {
        notify.error('No se pudo guardar la proforma', getApiErrorMessage(error))
      }
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSave() {
    const saved = await executeSave()
    if (saved) {
      notify.success(
        editingProformaId ? 'Cambios guardados' : 'Proforma creada y guardada',
        `${saved.idProforma} — total ${formatCurrency(saved.totalGeneral)}. Se generaron los archivos Excel y PDF.`,
      )
      if (!editingProformaId) {
        navigate(`/proformas/${encodeURIComponent(saved.idProforma)}/editar`, {
          replace: true,
        })
      }
    }
  }

  async function handleOpenFile(filename: string) {
    const id = editingProformaId || header.idProforma
    if (!id) return
    setOpeningFile(filename)
    try {
      await openProformaFile(id, filename)
    } catch (error) {
      notify.error('No se pudo abrir el archivo', getApiErrorMessage(error))
    } finally {
      setOpeningFile(null)
    }
  }

  const latestPdf = files.find((f) => f.extension === 'pdf' && f.isLatest)
  const latestExcel = files.find((f) => f.extension === 'xlsx' && f.isLatest)
  const latestVersion = Math.max(latestPdf?.version ?? 0, latestExcel?.version ?? 0)

  return (
    <div className="rounded-xl border border-brand-gray/20 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-wine uppercase tracking-wide">
            Guardado y Versiones
          </h3>
          <p className="text-xs text-brand-gray/75 mt-0.5">
            {latestVersion > 0
              ? `Versión activa en almacenamiento: V${latestVersion}. Al guardar cambios se generará automáticamente la V${latestVersion + 1} en Excel y PDF.`
              : 'Al guardar la proforma se generará automáticamente la V1 en Excel y PDF en el almacenamiento.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            className="bg-brand-wine hover:bg-brand-wine/90 text-white font-medium py-2 px-4 shadow-sm"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando proforma…'
              : editingProformaId
                ? '💾 Guardar cambios'
                : '💾 Guardar proforma'}
          </Button>

          {latestPdf && (
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white border-none focus-visible:ring-amber-500 py-2 px-3 font-medium text-xs shadow-sm"
              onClick={() => void handleOpenFile(latestPdf.filename)}
              disabled={isSaving || openingFile === latestPdf.filename}
              title={`Abrir ${latestPdf.filename} en nueva pestaña`}
            >
              {openingFile === latestPdf.filename ? 'Abriendo…' : `📄 Ver PDF (V${latestPdf.version})`}
            </Button>
          )}

          {latestExcel && (
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none focus-visible:ring-emerald-500 py-2 px-3 font-medium text-xs shadow-sm"
              onClick={() => void handleOpenFile(latestExcel.filename)}
              disabled={isSaving || openingFile === latestExcel.filename}
              title={`Descargar ${latestExcel.filename}`}
            >
              {openingFile === latestExcel.filename ? 'Descargando…' : `📊 Descargar Excel (V${latestExcel.version})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
