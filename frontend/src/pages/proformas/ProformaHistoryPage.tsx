import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import {
  cloneProforma,
  deleteProforma,
  exportProformaExcel,
  exportProformaPdf,
  fetchNextProformaId,
  fetchProforma,
  fetchProformas,
  openProformaFile,
} from '../../features/proformas/proformasApi'
import { ProformaVersionsModal } from '../../features/proformas/ProformaVersionsModal'
import { getApiErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { getProformaCustomerDisplay } from '../../lib/proformaCustomer'
import { notify } from '../../lib/toast'
import type { Proforma } from '../../types/proforma'

export function ProformaHistoryPage() {
  const navigate = useNavigate()
  const { loadCloneTemplate } = useProformaDraft()
  const [items, setItems] = useState<Proforma[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pendingDeleteProforma, setPendingDeleteProforma] = useState<Proforma | null>(null)
  const [versionModalTarget, setVersionModalTarget] = useState<Proforma | null>(null)
  const [tempFilters, setTempFilters] = useState({
    id: '',
    proyecto: '',
    cliente: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [filters, setFilters] = useState({
    id: '',
    proyecto: '',
    cliente: '',
    fechaDesde: '',
    fechaHasta: '',
  })

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchProformas()
      setItems(data)
    } catch (error) {
      notify.error('No se pudo cargar el historial', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
        setPendingDeleteProforma(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  /**
   * Exporta la proforma (generando archivos nuevos / con versión si había cambios)
   * y luego abre el Excel en el visor/descarga del navegador.
   */
  async function handleExportExcel(proforma: Proforma) {
    const { idProforma } = proforma
    setActiveId(idProforma)
    try {
      const result = await exportProformaExcel(idProforma)
      const refreshed = await fetchProforma(idProforma)
      setItems((current) =>
        current.map((item) =>
          item.idProforma === idProforma ? refreshed : item,
        ),
      )

      const excelFilename = result.excel?.filename
      if (excelFilename) {
        await openProformaFile(idProforma, excelFilename)
        notify.success('Excel exportado', 'Archivo generado y descargando.')
      }
    } catch (error) {
      notify.error('No se pudo exportar a Excel', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  /**
   * Exporta la proforma a PDF y la abre en nueva pestaña del navegador.
   */
  async function handleExportPdf(proforma: Proforma) {
    const { idProforma } = proforma
    setActiveId(idProforma)
    try {
      const result = await exportProformaPdf(idProforma)
      const refreshed = await fetchProforma(idProforma)
      setItems((current) =>
        current.map((item) =>
          item.idProforma === idProforma ? refreshed : item,
        ),
      )

      const pdfFilename = result.pdf?.filename
      if (pdfFilename) {
        await openProformaFile(idProforma, pdfFilename)
        notify.success('PDF exportado', 'Abriendo en nueva pestaña.')
      }
    } catch (error) {
      notify.error('No se pudo exportar a PDF', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handleDelete(idProforma: string) {
    setActiveId(idProforma)
    try {
      await deleteProforma(idProforma)
      setItems((current) =>
        current.filter((item) => item.idProforma !== idProforma),
      )
      setPendingDeleteProforma(null)
      notify.success('Proforma enviada a la papelera')
    } catch (error) {
      notify.error('No se pudo eliminar la proforma', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handleClone(idProforma: string) {
    setActiveId(idProforma)
    try {
      const cloned = await cloneProforma(idProforma)
      const { suggestedId } = await fetchNextProformaId()
      loadCloneTemplate(cloned, suggestedId)

      const lineCount = cloned.detalles?.length ?? 0
      notify.success(
        'Proforma clonada',
        [
          `Plantilla lista con ID sugerido ${suggestedId}.`,
          lineCount > 0
            ? `${lineCount} línea(s) copiadas con días laborables e IVA % por rubro.`
            : undefined,
        ]
          .filter(Boolean)
          .join(' '),
      )
      await loadHistory()
      navigate('/proformas/nueva')
    } catch (error) {
      notify.error('No se pudo clonar la proforma', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  const filteredItems = useMemo(() => {
    const idFilter = filters.id.trim().toLowerCase()
    const projectFilter = filters.proyecto.trim().toLowerCase()
    const customerFilter = filters.cliente.trim().toLowerCase()
    const fromTime = filters.fechaDesde ? Date.parse(filters.fechaDesde) : null
    const toTime = filters.fechaHasta ? Date.parse(filters.fechaHasta) : null

    return items.filter((item) => {
      const customerName = item.customer?.nombreCliente?.toLowerCase() ?? ''
      const itemDate = Date.parse(item.fecha)

      if (idFilter && !item.idProforma.toLowerCase().includes(idFilter)) return false
      if (
        projectFilter &&
        !item.nombreProyecto.toLowerCase().includes(projectFilter)
      )
        return false
      if (customerFilter && !customerName.includes(customerFilter)) return false
      if (fromTime !== null && !Number.isNaN(itemDate) && itemDate < fromTime)
        return false
      if (toTime !== null && !Number.isNaN(itemDate) && itemDate > toTime) return false
      return true
    })
  }, [items, filters])

  const columns: TableColumn<Proforma>[] = [
    { key: 'id', header: 'ID', accessor: 'idProforma' },
    { key: 'proyecto', header: 'Proyecto', accessor: 'nombreProyecto' },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (row) => getProformaCustomerDisplay(row).nombreCliente || '—',
    },
    { key: 'fecha', header: 'Fecha', accessor: 'fecha' },
    {
      key: 'subtotal',
      header: 'Subtotal',
      numeric: true,
      render: (row) => formatCurrency(row.subtotal),
    },
    {
      key: 'iva',
      header: 'IVA',
      numeric: true,
      render: (row) => formatCurrency(row.iva),
    },
    {
      key: 'total',
      header: 'Total c/ IVA',
      numeric: true,
      render: (row) => formatCurrency(row.totalGeneral),
    },
    {
      key: 'tiempo',
      header: 'Días',
      numeric: true,
      render: (row) => row.tiempoEjecucion?.trim() || '—',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === 'EXPORTED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
            }`}
        >
          {row.status === 'EXPORTED' ? 'Guardada' : 'Borrador'}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row, rowIndex) => {
        const isNearBottom =
          rowIndex >= Math.max(0, filteredItems.length - 2) && filteredItems.length >= 3

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap py-1">
            {/* Exportar PDF: botón prioritario */}
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white border-none focus-visible:ring-amber-500 text-xs py-1.5 px-3 min-h-8 font-semibold shadow-xs inline-flex items-center gap-1"
              onClick={() => void handleExportPdf(row)}
              disabled={activeId === row.idProforma}
              title="Exportar y ver archivo PDF"
            >
              {activeId === row.idProforma ? 'Generando…' : '📄 PDF'}
            </Button>

            {/* Exportar Excel: descarga directa */}
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none focus-visible:ring-emerald-500 text-xs py-1.5 px-3 min-h-8 font-semibold shadow-xs inline-flex items-center gap-1"
              onClick={() => void handleExportExcel(row)}
              disabled={activeId === row.idProforma}
              title="Exportar y descargar archivo Excel (.xlsx)"
            >
              {activeId === row.idProforma ? 'Generando…' : '📊 Excel'}
            </Button>

            {/* Menú de más acciones ⋮ */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-gray/30 bg-white text-base font-bold text-brand-gray hover:bg-brand-gray/10 hover:border-brand-gray/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(openMenuId === row.idProforma ? null : row.idProforma)
                }}
                aria-haspopup="true"
                aria-expanded={openMenuId === row.idProforma}
                title="Más opciones (Editar, Versiones, Clonar, Eliminar)"
              >
                ⋮
              </button>

              {openMenuId === row.idProforma && (
                <div
                  className={`absolute right-0 z-50 w-48 rounded-xl border border-brand-gray/20 bg-white py-1.5 shadow-xl transition-all ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to={`/proformas/${encodeURIComponent(row.idProforma)}/editar`}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-brand-gray hover:bg-brand-gray/10 text-left transition-colors"
                    onClick={() => setOpenMenuId(null)}
                  >
                    <span className="text-sm">✏️</span> Editar proforma
                  </Link>

                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-brand-wine hover:bg-brand-wine/10 text-left transition-colors"
                    onClick={() => {
                      setOpenMenuId(null)
                      setVersionModalTarget(row)
                    }}
                  >
                    <span className="text-sm">📁</span> Ver versiones
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-brand-gray hover:bg-brand-gray/10 text-left transition-colors"
                    onClick={() => {
                      setOpenMenuId(null)
                      void handleClone(row.idProforma)
                    }}
                    disabled={activeId === row.idProforma}
                  >
                    <span className="text-sm">📋</span> Clonar proforma
                  </button>

                  <div className="my-1 border-t border-brand-gray/15" />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
                    onClick={() => {
                      setOpenMenuId(null)
                      setPendingDeleteProforma(row)
                    }}
                  >
                    <span className="text-sm">🗑️</span> Mover a papelera
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-8 text-left">
      <header className="border-l-4 border-brand-coral pl-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
              Historial
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
              Proformas guardadas en el servidor. Puede exportar, descargar, clonar,
              eliminar y filtrar por ID, proyecto, cliente y rango de fechas.
            </p>
          </div>
        </div>
      </header>

      <Section title="Filtros">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              label="ID"
              placeholder="CM-PROF-..."
              value={tempFilters.id}
              onChange={(event) =>
                setTempFilters((current) => ({ ...current, id: event.target.value }))
              }
            />
            <Input
              label="Proyecto"
              placeholder="Nombre del proyecto"
              value={tempFilters.proyecto}
              onChange={(event) =>
                setTempFilters((current) => ({ ...current, proyecto: event.target.value }))
              }
            />
            <Input
              label="Cliente"
              placeholder="Nombre cliente"
              value={tempFilters.cliente}
              onChange={(event) =>
                setTempFilters((current) => ({ ...current, cliente: event.target.value }))
              }
            />
            <Input
              label="Fecha desde"
              type="date"
              value={tempFilters.fechaDesde}
              onChange={(event) =>
                setTempFilters((current) => ({ ...current, fechaDesde: event.target.value }))
              }
            />
            <Input
              label="Fecha hasta"
              type="date"
              value={tempFilters.fechaHasta}
              onChange={(event) =>
                setTempFilters((current) => ({ ...current, fechaHasta: event.target.value }))
              }
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => setFilters(tempFilters)}
              variant="primary"
            >
              Buscar
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Proformas registradas">
        <Card className="p-0 sm:p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-brand-gray/70">Cargando historial…</p>
          ) : (
            <Table
              caption="Listado de proformas"
              columns={columns}
              data={filteredItems}
              getRowKey={(row) => row.idProforma}
              emptyMessage="No hay proformas que coincidan con los filtros."
            />
          )}
        </Card>
      </Section>

      <ProformaVersionsModal
        idProforma={versionModalTarget?.idProforma ?? null}
        nombreProyecto={versionModalTarget?.nombreProyecto}
        isOpen={Boolean(versionModalTarget)}
        onClose={() => setVersionModalTarget(null)}
      />

      {/* Modal de confirmación para eliminar */}
      {pendingDeleteProforma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setPendingDeleteProforma(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-brand-gray/20 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-brand-wine">
                  ¿Mover proforma a la papelera?
                </h3>
                <p className="text-xs text-brand-gray/80 leading-relaxed">
                  La proforma <strong className="text-brand-gray font-semibold">{pendingDeleteProforma.idProforma}</strong> ({pendingDeleteProforma.nombreProyecto}) se moverá a la papelera. Podrá restaurarla en cualquier momento desde la sección Papelera.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeleteProforma(null)}
                disabled={activeId === pendingDeleteProforma.idProforma}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDelete(pendingDeleteProforma.idProforma)}
                disabled={activeId === pendingDeleteProforma.idProforma}
              >
                {activeId === pendingDeleteProforma.idProforma ? 'Moviendo…' : 'Sí, mover a papelera'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
