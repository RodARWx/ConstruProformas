import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import {
  fetchTrashedProformas,
  permanentDeleteProforma,
  restoreProforma,
} from '../../features/proformas/proformasApi'
import { getApiErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { getProformaCustomerDisplay } from '../../lib/proformaCustomer'
import { notify } from '../../lib/toast'
import type { Proforma } from '../../types/proforma'

export function ProformaTrashPage() {
  const [items, setItems] = useState<Proforma[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingDeleteProforma, setPendingDeleteProforma] = useState<Proforma | null>(null)

  const loadTrash = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchTrashedProformas()
      setItems(data)
    } catch (error) {
      notify.error('No se pudo cargar la papelera', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTrash()
  }, [loadTrash])

  async function handleRestore(idProforma: string) {
    setActiveId(idProforma)
    setPendingDeleteProforma(null)
    try {
      await restoreProforma(idProforma)
      setItems((current) =>
        current.filter((item) => item.idProforma !== idProforma),
      )
      notify.success('Proforma restaurada', `El ID ${idProforma} volvió al historial con todos sus archivos.`)
    } catch (error) {
      notify.error('No se pudo restaurar la proforma', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handlePermanentDelete(proforma: Proforma) {
    setActiveId(proforma.idProforma)
    try {
      await permanentDeleteProforma(proforma.idProforma)
      setItems((current) =>
        current.filter((item) => item.idProforma !== proforma.idProforma),
      )
      setPendingDeleteProforma(null)
      notify.success(
        'Proforma y archivos eliminados',
        `La proforma ${proforma.idProforma} y su carpeta en el servidor fueron eliminadas permanentemente.`,
      )
    } catch (error) {
      notify.error(
        'No se pudo eliminar permanentemente',
        getApiErrorMessage(error),
      )
    } finally {
      setActiveId(null)
    }
  }

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
      key: 'total',
      header: 'Total c/ IVA',
      numeric: true,
      render: (row) => formatCurrency(row.totalGeneral),
    },
    {
      key: 'eliminada',
      header: 'Eliminada',
      render: (row) =>
        row.deletedAt
          ? new Date(row.deletedAt).toLocaleString('es-EC')
          : '—',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap py-1">
          <Button
            type="button"
            className="inline-flex items-center gap-1 text-xs py-1.5 px-3 min-h-8 font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 opacity-90 hover:opacity-100 text-white transition-opacity shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500"
            onClick={() => void handleRestore(row.idProforma)}
            disabled={activeId === row.idProforma}
            title="Restaurar proforma y archivos al historial"
          >
            {activeId === row.idProforma ? 'Restaurando…' : '↩ Restaurar'}
          </Button>

          <Button
            type="button"
            className="inline-flex items-center gap-1 text-xs py-1.5 px-3 min-h-8 font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 opacity-90 hover:opacity-100 text-white transition-opacity shadow-2xs focus-visible:ring-2 focus-visible:ring-rose-500"
            onClick={() => setPendingDeleteProforma(row)}
            disabled={activeId === row.idProforma}
            title="Eliminar definitivamente esta proforma y borrar su carpeta en el servidor"
          >
            Eliminar definitivamente
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8 text-left">
      <header className="border-l-4 border-brand-coral pl-4">
        <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
          Papelera
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
          Proformas eliminadas del historial. Puede restaurarlas para recuperarlas con sus archivos,
          o eliminarlas definitivamente. La eliminación definitiva borra permanentemente la carpeta asociada
          en el servidor/NAS y libera el ID para reutilización.
        </p>
      </header>

      <Section title="Proformas eliminadas">
        <Card className="p-0 sm:p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-brand-gray/70">Cargando papelera…</p>
          ) : (
            <Table
              caption="Listado de proformas en papelera"
              columns={columns}
              data={items}
              getRowKey={(row) => row.idProforma}
              emptyMessage="No hay proformas en la papelera."
            />
          )}
        </Card>
      </Section>

      {/* Modal de confirmación para eliminar definitivamente y borrar del disco */}
      {pendingDeleteProforma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="perm-delete-modal-title"
          onClick={() => {
            if (activeId !== pendingDeleteProforma.idProforma) {
              setPendingDeleteProforma(null)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-brand-gray/20 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-lg">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3
                  id="perm-delete-modal-title"
                  className="text-base font-bold text-brand-wine"
                >
                  ¿Eliminar definitivamente la proforma?
                </h3>
                <p className="text-xs text-brand-gray/80 leading-relaxed">
                  Está por eliminar la proforma{' '}
                  <strong className="text-brand-gray font-semibold">
                    {pendingDeleteProforma.idProforma}
                  </strong>{' '}
                  ({pendingDeleteProforma.nombreProyecto}).
                </p>
              </div>
            </div>

            {/* Alerta explícita de eliminación de carpeta en el servidor */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-rose-800">
                <span>📁</span> Se borrará la carpeta de archivos en el servidor
              </p>
              <p className="text-[11px] leading-relaxed text-rose-800/90">
                Esta acción es <strong>irreversible</strong>: se borrará la carpeta del servidor con todos sus archivos Excel y PDF históricos, y el ID <strong>{pendingDeleteProforma.idProforma}</strong> quedará liberado.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs py-1.5 px-3 min-h-8 font-semibold"
                onClick={() => setPendingDeleteProforma(null)}
                disabled={activeId === pendingDeleteProforma.idProforma}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5 min-h-8 font-semibold rounded-lg border border-rose-300 bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-rose-400"
                onClick={() => void handlePermanentDelete(pendingDeleteProforma)}
                disabled={activeId === pendingDeleteProforma.idProforma}
              >
                {activeId === pendingDeleteProforma.idProforma
                  ? 'Eliminando…'
                  : 'Sí, eliminar definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
