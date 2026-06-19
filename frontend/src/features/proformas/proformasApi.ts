import axios from 'axios'
import { apiGet, apiPatch, apiPost, ensureArray, isApiConflict } from '../../lib/api'
import type { SyncProformasResult } from '../../types/sync'
import type {
  NextIdResponse,
  ProformaExportResult,
  Proforma,
  ProformaIdAvailability,
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

export async function exportProforma(
  idProforma: string,
): Promise<ProformaExportResult> {
  return apiPost<ProformaExportResult>(
    `/proformas/${encodeURIComponent(idProforma)}/export`,
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
    const existing = await apiGet<Proforma>(
      `/proformas/${encodeURIComponent(trimmed)}`,
    )
    return existing.status === 'EXPORTED' ? 'exported' : 'in_use'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return 'available'
    }
    if (isApiConflict(error)) {
      return 'exported'
    }
    throw error
  }
}

export function getIdConflictMessage(
  idProforma: string,
  availability: ProformaIdAvailability,
  suggestedId?: string,
): string {
  if (availability === 'exported') {
    const suffix = suggestedId
      ? ` Cambie el ID o use el sugerido (${suggestedId}).`
      : ' Cambie el ID o use el sugerido por el servidor.'
    return `El ID "${idProforma}" ya existe en una proforma exportada.${suffix}`
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
