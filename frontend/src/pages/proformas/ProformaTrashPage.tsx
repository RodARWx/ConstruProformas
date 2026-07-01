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
  const [pendingPermanentDeleteId, setPendingPermanentDeleteId] = useState<
    string | null
  >(null)

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
    setPendingPermanentDeleteId(null)
    try {
      await restoreProforma(idProforma)
      setItems((current) =>
        current.filter((item) => item.idProforma !== idProforma),
      )
      notify.success('Proforma restaurada', `El ID ${idProforma} volvió al historial.`)
    } catch (error) {
      notify.error('No se pudo restaurar la proforma', getApiErrorMessage(error))
    } finally {
      setActiveId(null)
    }
  }

  async function handlePermanentDelete(idProforma: string) {
    setActiveId(idProforma)
    try {
      await permanentDeleteProforma(idProforma)
      setItems((current) =>
        current.filter((item) => item.idProforma !== idProforma),
      )
      setPendingPermanentDeleteId(null)
      notify.success(
        'Proforma eliminada permanentemente',
        `El ID ${idProforma} ya no existe en el sistema.`,
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
      key: 'estado',
      header: 'Estado',
      render: (row) => (row.status === 'EXPORTED' ? 'Exportada' : 'Borrador'),
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPendingPermanentDeleteId(null)
              void handleRestore(row.idProforma)
            }}
            disabled={activeId === row.idProforma}
          >
            Restaurar
          </Button>
          {pendingPermanentDeleteId === row.idProforma ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handlePermanentDelete(row.idProforma)}
                disabled={activeId === row.idProforma}
              >
                Confirmar eliminación
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingPermanentDeleteId(null)}
                disabled={activeId === row.idProforma}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setPendingPermanentDeleteId(row.idProforma)}
              disabled={activeId === row.idProforma}
            >
              Eliminar permanentemente
            </Button>
          )}
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
          Proformas eliminadas del historial. Puede restaurarlas o eliminarlas
          permanentemente de una en una. La eliminación definitiva libera el ID
          para volver a usarlo.
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
    </div>
  )
}
