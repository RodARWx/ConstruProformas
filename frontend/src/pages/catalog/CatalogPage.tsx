import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import type { CatalogItem, RubroLineInsert } from '../../types/catalog'
import type {
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
} from '../../types/catalog'
import { CatalogForm } from '../../features/catalog/CatalogForm'
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalogItems,
  updateCatalogItem,
} from '../../features/catalog/catalogApi'
import { RubroAutocomplete } from '../../features/catalog/RubroAutocomplete'

export function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [lastInsertedLine, setLastInsertedLine] = useState<RubroLineInsert | null>(
    null,
  )

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchCatalogItems()
      setItems(data)
    } catch (error) {
      notify.error('No se pudo cargar el catálogo', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  async function handleFormSubmit(
    payload: CreateCatalogItemPayload | UpdateCatalogItemPayload,
  ) {
    setIsSubmitting(true)
    try {
      if (editingItem) {
        const updated = await updateCatalogItem(editingItem.id, payload)
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
        setEditingItem(null)
        notify.success('Rubro actualizado')
      } else {
        const created = await createCatalogItem(payload as CreateCatalogItemPayload)
        setItems((current) => [...current, created])
        notify.success('Rubro creado')
      }
    } catch (error) {
      notify.error('No se pudo guardar el rubro', getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    setIsSubmitting(true)
    try {
      await deleteCatalogItem(id)
      setItems((current) => current.filter((item) => item.id !== id))
      if (editingItem?.id === id) {
        setEditingItem(null)
      }
      setPendingDeleteId(null)
      notify.success('Rubro eliminado')
    } catch (error) {
      notify.error('No se pudo eliminar el rubro', getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: TableColumn<CatalogItem>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (row) => row.codigoSugerido ?? '—',
    },
    { key: 'descripcion', header: 'Descripción', accessor: 'descripcion' },
    { key: 'unidad', header: 'Unidad', accessor: 'unidad' },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (row) => row.categoriaNombre ?? '—',
    },
    {
      key: 'diasLaborables',
      header: 'Días lab.',
      numeric: true,
      render: (row) => row.diasLaborables ?? 1,
    },
    {
      key: 'ivaPercentage',
      header: 'IVA %',
      numeric: true,
      render: (row) => `${row.ivaPercentage ?? 15}%`,
    },
    {
      key: 'costo',
      header: 'Costo unit.',
      numeric: true,
      render: (row) => formatCurrency(row.costoUnitario),
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
              setPendingDeleteId(null)
              setEditingItem(row)
            }}
            disabled={isSubmitting}
          >
            Editar
          </Button>
          {pendingDeleteId === row.id ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDelete(row.id)}
                disabled={isSubmitting}
              >
                Confirmar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingDeleteId(null)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setPendingDeleteId(row.id)}
              disabled={isSubmitting}
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
        <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
          Catálogo de rubros
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
          Administre el catálogo y pruebe el autocompletado. Aún no está conectado al
          formulario principal de proformas.
        </p>
      </header>

      <Section
        title="Prueba de autocompletado"
        description="Busque rubros con al menos 3 caracteres. Al seleccionar uno se simula la inserción de una línea."
      >
        <Card>
          <RubroAutocomplete
            onSelect={(line) => {
              setLastInsertedLine(line)
              notify.success('Rubro seleccionado', line.descripcion)
            }}
          />

          {lastInsertedLine && (
            <div className="mt-5 rounded-md border border-brand-gray/15 bg-[#fafafa] p-4 text-left text-sm text-brand-gray">
              <p className="font-semibold text-brand-wine">
                Línea lista para insertar (simulación)
              </p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Código
                  </dt>
                  <dd>{lastInsertedLine.codigo || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Unidad
                  </dt>
                  <dd>{lastInsertedLine.unidad}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Descripción
                  </dt>
                  <dd>{lastInsertedLine.descripcion}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Costo unitario
                  </dt>
                  <dd>{formatCurrency(lastInsertedLine.costoUnitario)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Categoría
                  </dt>
                  <dd>{lastInsertedLine.categoriaNombre ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    Días laborables
                  </dt>
                  <dd>{lastInsertedLine.diasLaborables}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-brand-gray/60">
                    IVA %
                  </dt>
                  <dd>{lastInsertedLine.ivaPercentage}%</dd>
                </div>
              </dl>
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Gestión del catálogo"
        description="Cree, edite y elimine rubros mediante el API /catalog."
      >
        <div className="space-y-5">
          <CatalogForm
            editingItem={editingItem}
            isSubmitting={isSubmitting}
            onSubmit={handleFormSubmit}
            onCancelEdit={() => setEditingItem(null)}
          />

          <Card className="p-0 sm:p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-brand-gray/70">Cargando catálogo…</p>
            ) : (
              <Table
                caption="Rubros registrados"
                columns={columns}
                data={items}
                getRowKey={(row) => row.id}
                emptyMessage="No hay rubros en el catálogo. Cree el primero con el formulario."
              />
            )}
          </Card>
        </div>
      </Section>
    </div>
  )
}
