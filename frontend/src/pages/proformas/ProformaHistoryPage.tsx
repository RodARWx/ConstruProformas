import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import {
  cloneProforma,
  deleteProforma,
  downloadExportFile,
  exportProformaExcel,
  exportProformaPdf,
  fetchNextProformaId,
  fetchProforma,
  fetchProformas,
} from '../../features/proformas/proformasApi'
import { getApiErrorMessage } from '../../lib/api'
import { buildExportFilename } from '../../lib/exportFilenames'
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
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
        await downloadExportFile(excelFilename)
        notify.success('Excel exportado', 'Archivo descargado en su dispositivo.')
      }
    } catch (error) {
      notify.error('No se pudo exportar a Excel', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

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
        await downloadExportFile(pdfFilename)
        notify.success('PDF exportado', 'Archivo descargado en su dispositivo.')
      }
    } catch (error) {
      notify.error('No se pudo exportar a PDF', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handleDownloadExcel(proforma: Proforma) {
    const excelName = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'xlsx',
    )
    setActiveId(proforma.idProforma)
    try {
      await downloadExportFile(excelName)
      notify.success('Descarga iniciada', 'Excel descargado.')
    } catch (error) {
      notify.error('No se pudo descargar el Excel', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handleDownloadPdf(proforma: Proforma) {
    const pdfName = buildExportFilename(
      proforma.idProforma,
      proforma.nombreProyecto,
      'pdf',
    )
    setActiveId(proforma.idProforma)
    try {
      await downloadExportFile(pdfName)
      notify.success('Descarga iniciada', 'PDF descargado.')
    } catch (error) {
      notify.error('No se pudo descargar el PDF', getApiErrorMessage(error))
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
      setPendingDeleteId(null)
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
      render: (row) => (row.status === 'EXPORTED' ? 'Exportada' : 'Borrador'),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === 'DRAFT' ? (
            <Link to={`/proformas/${encodeURIComponent(row.idProforma)}/editar`}>
              <Button type="button" variant="secondary">
                Editar borrador
              </Button>
            </Link>
          ) : (
            <Link to={`/proformas/${encodeURIComponent(row.idProforma)}/editar`}>
              <Button type="button" variant="secondary">
                Ver (solo lectura)
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleClone(row.idProforma)}
            disabled={activeId === row.idProforma}
          >
            Clonar proforma
          </Button>
          {row.status === 'EXPORTED' ? (
            <>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none focus-visible:ring-emerald-500"
                onClick={() => void handleDownloadExcel(row)}
                disabled={activeId === row.idProforma}
              >
                Descargar Excel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white border-none focus-visible:ring-amber-500"
                onClick={() => void handleDownloadPdf(row)}
                disabled={activeId === row.idProforma}
              >
                Descargar PDF
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none focus-visible:ring-emerald-500"
                onClick={() => void handleExportExcel(row)}
                disabled={activeId === row.idProforma}
              >
                Exportar Excel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white border-none focus-visible:ring-amber-500"
                onClick={() => void handleExportPdf(row)}
                disabled={activeId === row.idProforma}
              >
                Exportar PDF
              </Button>
            </>
          )}
          {pendingDeleteId === row.idProforma ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDelete(row.idProforma)}
                disabled={activeId === row.idProforma}
              >
                Confirmar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeleteId(null)}
                disabled={activeId === row.idProforma}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setPendingDeleteId(row.idProforma)}
              disabled={activeId === row.idProforma}
            >
              Eliminar
            </Button>
          )}
        </div>
      ),
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
    </div>
  )
}
