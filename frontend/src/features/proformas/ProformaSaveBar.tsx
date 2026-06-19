import axios from 'axios'
import { useState } from 'react'
import { Button } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { useSync } from '../../context/SyncContext'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import {
  draftToCreatePayload,
  draftToUpdatePayload,
} from './proformaMappers'
import {
  validateProformaDetalles,
  validateProformaHeader,
} from './proformaValidation'
import { ProformaServerTotals } from './ProformaServerTotals'
import {
  checkProformaIdAvailability,
  createProforma,
  getIdConflictMessage,
  updateProforma,
} from './proformasApi'

export function ProformaSaveBar() {
  const {
    header,
    detalles,
    editingProformaId,
    isReadOnly,
    savedProforma,
    setHeaderFieldErrors,
    setDetailFieldError,
    setSavedProforma,
    persistDraft,
  } = useProformaDraft()
  const { queueDraftForSync } = useSync()

  const [isSaving, setIsSaving] = useState(false)

  function isConnectivityError(error: unknown): boolean {
    if (!navigator.onLine) return true
    return axios.isAxiosError(error) && !error.response
  }

  async function handleSave() {
    if (isReadOnly) return

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
      return
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
        return
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
      notify.success(
        'Borrador guardado',
        `${saved.idProforma} — total ${formatCurrency(saved.totalGeneral)}`,
      )
    } catch (error) {
      if (isApiConflict(error)) {
        const message = getApiErrorMessage(error)
        setHeaderFieldErrors({ idProforma: message })
        notify.warning('ID no disponible', message)
      } else if (isConnectivityError(error)) {
        const payload = draftToCreatePayload(header, detalles)
        await queueDraftForSync(payload, getApiErrorMessage(error))
        notify.warning(
          'Sin conexión: borrador guardado localmente',
          'Se enviará automáticamente al recuperar conexión. También puede reintentar desde el indicador de estado.',
        )
      } else {
        notify.error('No se pudo guardar el borrador', getApiErrorMessage(error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isReadOnly) {
    return (
      <div className="space-y-4">
        <ProformaServerTotals proforma={savedProforma} />
        <p className="text-sm text-brand-gray/80">
          Esta proforma ya fue exportada y no puede modificarse desde la interfaz.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="primary"
        onClick={() => void handleSave()}
        disabled={isSaving}
      >
        {isSaving ? 'Guardando…' : 'Guardar borrador'}
      </Button>
      <p className="text-sm text-brand-gray/70">
        Envía cabecera y rubros al servidor. Los totales definitivos los calcula el
        backend.
      </p>
    </div>
  )
}
