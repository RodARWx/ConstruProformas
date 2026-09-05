import axios from 'axios'
import {
  apiDelete,
  apiDownloadFile,
  apiGet,
  apiOpenFileInline,
  apiPatch,
  apiPost,
  ensureArray,
  isApiConflict,
} from '../../lib/api'
import type { SyncProformasResult } from '../../types/sync'
import type {
  NextIdResponse,
  ProformaExportResult,
  Proforma,
  ProformaIdAvailability,
  ProformaFileEntry,
} from '../../types/proforma'
import type {
  CreateProformaPayload,
  UpdateProformaPayload,
} from './proformaMappers'

export async function fetchProformas(): Promise<Proforma[]> {
  const data = await apiGet<unknown>('/proformas')
  return ensureArray<Proforma>(data, 'proformas')
}

export async function fetchProforma(idProforma: string): Promise<Proforma> {
  return apiGet<Proforma>(`/proformas/${encodeURIComponent(idProforma)}`)
}

export async function fetchNextProformaId(): Promise<NextIdResponse> {
  return apiGet<NextIdResponse>('/proformas/next-id')
}

export async function fetchNotasSuggestions(q?: string): Promise<string[]> {
  return apiGet<string[]>('/proformas/notas/suggestions', {
    params: q ? { q } : undefined,
  })
}

export async function createProforma(
  payload: CreateProformaPayload,
): Promise<Proforma> {
  return apiPost<Proforma>('/proformas', payload)
}

export async function updateProforma(
  idProforma: string,
  payload: UpdateProformaPayload,
): Promise<Proforma> {
  return apiPatch<Proforma>(
    `/proformas/${encodeURIComponent(idProforma)}`,
    payload,
  )
}

export async function cloneProforma(idProforma: string): Promise<Proforma> {
  return apiPost<Proforma>(`/proformas/${encodeURIComponent(idProforma)}/clone`)
}

export async function fetchTrashedProformas(): Promise<Proforma[]> {
  const data = await apiGet<unknown>('/proformas/trash')
  return ensureArray<Proforma>(data, 'proformas en papelera')
}

export async function deleteProforma(idProforma: string): Promise<void> {
  await apiDelete(`/proformas/${encodeURIComponent(idProforma)}`)
}

export async function restoreProforma(idProforma: string): Promise<Proforma> {
  return apiPatch<Proforma>(`/proformas/${encodeURIComponent(idProforma)}/restore`)
}

export async function permanentDeleteProforma(idProforma: string): Promise<void> {
  await apiDelete(`/proformas/trash/${encodeURIComponent(idProforma)}`)
}

export async function downloadExportFile(filename: string): Promise<void> {
  await apiDownloadFile(
    `/export/download/${encodeURIComponent(filename)}`,
    filename,
  )
}

/**
 * Lista todos los archivos (PDF, Excel y versiones) de la carpeta de una proforma en el NAS.
 * Responde con [] si la carpeta aún no existe.
 */
export async function fetchProformaFiles(
  idProforma: string,
): Promise<ProformaFileEntry[]> {
  return apiGet<ProformaFileEntry[]>(
    `/proformas/${encodeURIComponent(idProforma)}/archivos`,
  )
}

/**
 * Abre un archivo de la carpeta de la proforma en una nueva pestaña del navegador.
 * Para PDFs el navegador lo renderiza con su visor nativo (inline).
 * Para Excel el navegador lo descarga.
 */
export async function openProformaFile(
  idProforma: string,
  filename: string,
): Promise<void> {
  await apiOpenFileInline(
    `/proformas/${encodeURIComponent(idProforma)}/archivos/${encodeURIComponent(filename)}`,
    filename,
  )
}

export async function exportProforma(
  idProforma: string,
): Promise<ProformaExportResult> {
  return apiPost<ProformaExportResult>(
    `/proformas/${encodeURIComponent(idProforma)}/export`,
  )
}

export async function exportProformaExcel(
  idProforma: string,
): Promise<ProformaExportResult> {
  return apiPost<ProformaExportResult>(
    `/proformas/${encodeURIComponent(idProforma)}/export/excel`,
  )
}

export async function exportProformaPdf(
  idProforma: string,
): Promise<ProformaExportResult> {
  return apiPost<ProformaExportResult>(
    `/proformas/${encodeURIComponent(idProforma)}/export/pdf`,
  )
}

export async function syncProformas(
  proformas: CreateProformaPayload[],
): Promise<SyncProformasResult> {
  return apiPost<SyncProformasResult>('/proformas/sync', { proformas })
}

export async function checkProformaIdAvailability(
  idProforma: string,
): Promise<ProformaIdAvailability> {
  const trimmed = idProforma.trim()
  if (!trimmed) return 'available'

  try {
    const res = await apiGet<{
      available: boolean
      status: ProformaIdAvailability
      message?: string
    }>(`/proformas/availability/${encodeURIComponent(trimmed)}`)
    return res.status
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return 'available'
    }
    if (isApiConflict(error)) {
      return 'exported'
    }
    return 'in_use'
  }
}

export function getIdConflictMessage(
  idProforma: string,
  availability: ProformaIdAvailability,
  suggestedId?: string,
): string {
  if (availability === 'in_trash') {
    const suffix = suggestedId
      ? ` Use el sugerido (${suggestedId}) o restáurelo desde la papelera.`
      : ' Restáurelo desde la papelera o elija otro número.'
    return `El ID "${idProforma}" está en la papelera.${suffix}`
  }

  if (availability === 'exported') {
    const suffix = suggestedId
      ? ` Cambie el ID o use el sugerido (${suggestedId}).`
      : ' Cambie el ID o use el sugerido por el servidor.'
    return `El ID "${idProforma}" ya existe en una proforma guardada.${suffix}`
  }

  if (availability === 'in_use') {
    const suffix = suggestedId
      ? ` Use otro ID o el sugerido (${suggestedId}).`
      : ' Use otro ID o el sugerido por el servidor.'
    return `El ID "${idProforma}" ya está en uso.${suffix}`
  }

  return ''
}

export { isApiConflict }
