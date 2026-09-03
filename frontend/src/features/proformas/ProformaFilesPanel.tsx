import { useCallback, useEffect, useState } from 'react'
import { fetchProformaFiles, openProformaFile } from './proformasApi'
import { getApiErrorMessage } from '../../lib/api'
import { notify } from '../../lib/toast'
import type { ProformaFileEntry } from '../../types/proforma'

interface ProformaFilesPanelProps {
  idProforma: string
  /** Clave para forzar recarga (pásala después de exportar) */
  refreshKey?: number
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

/** Icono inline según extensión */
function FileIcon({ ext }: { ext: 'pdf' | 'xlsx' }) {
  return ext === 'pdf' ? (
    <span
      title="PDF"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 4,
        background: '#dc2626',
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      PDF
    </span>
  ) : (
    <span
      title="Excel"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 4,
        background: '#16a34a',
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      XLS
    </span>
  )
}

/**
 * Panel colapsable que lista todos los archivos de la carpeta de una proforma en el NAS.
 * Permite abrir PDFs en nueva pestaña o descargar Excels con un solo clic.
 */
export function ProformaFilesPanel({
  idProforma,
  refreshKey = 0,
}: ProformaFilesPanelProps) {
  const [files, setFiles] = useState<ProformaFileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [openingFile, setOpeningFile] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchProformaFiles(idProforma)
      setFiles(data)
    } catch (err) {
      notify.error('No se pudo cargar archivos', getApiErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [idProforma])

  // Cargar al abrir el panel o cuando refreshKey cambia
  useEffect(() => {
    if (isOpen || refreshKey > 0) {
      void loadFiles()
    }
  }, [isOpen, refreshKey, loadFiles])

  async function handleOpen(file: ProformaFileEntry) {
    setOpeningFile(file.filename)
    try {
      await openProformaFile(idProforma, file.filename)
    } catch (err) {
      notify.error(`No se pudo abrir ${file.filename}`, getApiErrorMessage(err))
    } finally {
      setOpeningFile(null)
    }
  }

  const count = files.length
  const hasFiles = count > 0

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 4,
        background: '#fafafa',
      }}
    >
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: '#374151',
          fontWeight: 500,
          textAlign: 'left',
        }}
        aria-expanded={isOpen}
      >
        <span style={{ fontSize: 12, transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
        <span>
          Versiones en servidor
          {hasFiles && (
            <span
              style={{
                marginLeft: 8,
                background: '#550012',
                color: '#fff',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {count}
            </span>
          )}
        </span>
        {isLoading && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>Cargando…</span>}
      </button>

      {/* Lista de archivos */}
      {isOpen && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          {!hasFiles && !isLoading ? (
            <p style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af', margin: 0 }}>
              No hay archivos exportados en el servidor aún.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {files.map((file) => (
                <li
                  key={file.filename}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 14px',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: 12,
                  }}
                >
                  <FileIcon ext={file.extension} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#111827',
                      }}
                      title={file.filename}
                    >
                      {file.filename}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>
                      {formatSize(file.sizeBytes)} · {formatDate(file.modifiedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={openingFile === file.filename}
                    onClick={() => void handleOpen(file)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      background: openingFile === file.filename ? '#f3f4f6' : '#fff',
                      cursor: openingFile === file.filename ? 'wait' : 'pointer',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#374151',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {openingFile === file.filename
                      ? 'Abriendo…'
                      : file.extension === 'pdf'
                        ? '👁 Ver'
                        : '⬇ Descargar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
