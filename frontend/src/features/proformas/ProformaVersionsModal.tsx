import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/api'
import { notify } from '../../lib/toast'
import type { ProformaFileEntry } from '../../types/proforma'
import { fetchProformaFiles, openProformaFile } from './proformasApi'

interface ProformaVersionsModalProps {
  idProforma: string | null
  nombreProyecto?: string
  isOpen: boolean
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function ProformaVersionsModal({
  idProforma,
  nombreProyecto,
  isOpen,
  onClose,
}: ProformaVersionsModalProps) {
  const [files, setFiles] = useState<ProformaFileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [openingFilename, setOpeningFilename] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    if (!idProforma) return
    setIsLoading(true)
    try {
      const data = await fetchProformaFiles(idProforma)
      setFiles(data)
    } catch (err) {
      notify.error('No se pudo cargar versiones', getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [idProforma])

  useEffect(() => {
    if (isOpen && idProforma) {
      void loadFiles()
    } else {
      setFiles([])
    }
  }, [isOpen, idProforma, loadFiles])

  async function handleOpenFile(file: ProformaFileEntry) {
    if (!idProforma) return
    setOpeningFilename(file.filename)
    try {
      await openProformaFile(idProforma, file.filename)
      notify.success(
        file.extension === 'pdf' ? 'Abriendo PDF' : 'Descargando Excel',
        file.filename,
      )
    } catch (err) {
      notify.error(`No se pudo abrir ${file.filename}`, getApiErrorMessage(err))
    } finally {
      setOpeningFilename(null)
    }
  }

  if (!isOpen || !idProforma) return null

  // Agrupar archivos por versión
  const groupedByVersion = files.reduce<Record<number, ProformaFileEntry[]>>(
    (acc, file) => {
      const v = file.version ?? 1
      if (!acc[v]) acc[v] = []
      acc[v].push(file)
      return acc
    },
    {},
  )

  const versionKeys = Object.keys(groupedByVersion)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="versions-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-brand-gray/15 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-brand-gray/15 px-6 py-4 bg-[#fafafa]">
          <div>
            <h2
              id="versions-modal-title"
              className="font-heading text-lg sm:text-xl font-bold uppercase text-brand-wine"
            >
              Control de Versiones en Servidor
            </h2>
            <p className="text-xs text-brand-gray/80 mt-0.5">
              <span className="font-semibold text-brand-wine">{idProforma}</span>
              {nombreProyecto ? ` · ${nombreProyecto}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-brand-gray/70 hover:bg-brand-gray/10 hover:text-brand-wine transition-colors"
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-brand-gray/70">
              <span className="inline-block animate-spin mr-2">⏳</span>
              Cargando historial de versiones desde el servidor…
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-sm text-brand-gray/70 space-y-2">
              <p className="text-base font-semibold text-brand-wine">
                No hay archivos exportados en el servidor
              </p>
              <p className="text-xs text-brand-gray/60 max-w-md mx-auto">
                Esta proforma aún no ha sido exportada a Excel o PDF. Al exportar, los archivos se archivarán automáticamente en el servidor con control de versiones.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {versionKeys.map((versionNumber) => {
                const versionFiles = groupedByVersion[versionNumber]
                const isCurrent = versionNumber === versionKeys[0]

                return (
                  <div
                    key={versionNumber}
                    className={`rounded-xl border p-4 transition-all ${isCurrent
                        ? 'border-brand-coral/40 bg-brand-coral/[0.02] shadow-sm'
                        : 'border-brand-gray/20 bg-[#fbfbfb]'
                      }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-gray/10">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center rounded-lg bg-brand-wine text-white font-bold text-xs px-2.5 py-1">
                          Versión {versionNumber}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 border border-emerald-300">
                            ⭐ Más reciente
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-brand-gray/60">
                        {versionFiles.length} archivo(s)
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {versionFiles.map((file) => {
                        const isOpening = openingFilename === file.filename
                        const isPdf = file.extension === 'pdf'

                        return (
                          <div
                            key={file.filename}
                            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-white border border-brand-gray/15 hover:border-brand-coral/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs shrink-0 text-white ${isPdf ? 'bg-red-600' : 'bg-emerald-600'
                                  }`}
                              >
                                {isPdf ? 'PDF' : 'XLS'}
                              </span>
                              <div className="min-w-0">
                                <p
                                  className="text-xs font-semibold text-brand-wine truncate max-w-xs sm:max-w-md"
                                  title={file.filename}
                                >
                                  {file.filename}
                                </p>
                                <p className="text-[11px] text-brand-gray/70">
                                  {formatSize(file.sizeBytes)} · {formatDate(file.modifiedAt)}
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs py-1.5 px-3 min-h-8"
                              disabled={isOpening}
                              onClick={() => void handleOpenFile(file)}
                            >
                              {isOpening
                                ? 'Abriendo…'
                                : isPdf
                                  ? '👁 Ver PDF'
                                  : '⬇ Descargar Excel'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="flex items-center justify-between border-t border-brand-gray/15 px-6 py-4 bg-[#fafafa]">
          <span className="text-xs text-brand-gray/75">
            Total en servidor: <strong>{files.length}</strong> archivo(s)
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="text-xs min-h-9 px-3"
              onClick={() => void loadFiles()}
              disabled={isLoading}
            >
              🔄 Actualizar
            </Button>
            <Button
              type="button"
              variant="primary"
              className="text-xs min-h-9 px-4"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
