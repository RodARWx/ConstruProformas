import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Section, Select, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { fetchCategories } from '../../features/categories/categoriesApi'
import { getApiErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import type { CatalogItem, RubroLineInsert } from '../../types/catalog'
import type {
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
} from '../../types/catalog'
import type { Category } from '../../types/category'
import { CatalogForm } from '../../features/catalog/CatalogForm'
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalogItems,
  updateCatalogItem,
  type CatalogListParams,
  type CatalogSortBy,
  type CatalogSortOrder,
} from '../../features/catalog/catalogApi'
import { RubroAutocomplete } from '../../features/catalog/RubroAutocomplete'

type PageSizeOption = '10' | '20' | 'all'

export function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [lastInsertedLine, setLastInsertedLine] = useState<RubroLineInsert | null>(
    null,
  )

  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [sortBy, setSortBy] = useState<CatalogSortBy>('descripcion')
  const [sortOrder, setSortOrder] = useState<CatalogSortOrder>('asc')
  const [pageSize, setPageSize] = useState<PageSizeOption>('20')

  const listParams: CatalogListParams = {
    categoriaNombre: categoriaFilter || undefined,
    sortBy,
    sortOrder,
    page,
    limit: pageSize === 'all' ? 0 : Number(pageSize),
  }

  const totalPages =
    pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / Number(pageSize)))

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchCatalogItems(listParams)
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      notify.error('No se pudo cargar el catálogo', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [categoriaFilter, page, pageSize, sortBy, sortOrder])

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (error) {
      notify.error('No se pudieron cargar las categorías', getApiErrorMessage(error))
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    setPage(1)
  }, [categoriaFilter, sortBy, sortOrder, pageSize])

  async function handleFormSubmit(
    payload: CreateCatalogItemPayload | UpdateCatalogItemPayload,
  ) {
    setIsSubmitting(true)
    try {
      if (editingItem) {
        await updateCatalogItem(editingItem.id, payload)
        setEditingItem(null)
        notify.success('Rubro actualizado')
      } else {
        await createCatalogItem(payload as CreateCatalogItemPayload)
        notify.success('Rubro creado')
      }
      await loadItems()
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
      if (editingItem?.id === id) {
        setEditingItem(null)
      }
      setPendingDeleteId(null)
      notify.success('Rubro eliminado')
      await loadItems()
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
              document.getElementById('catalog-form-container')?.scrollIntoView({ behavior: 'smooth' })
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
          Administre el catálogo, filtre por categoría y ordene los resultados.
          La búsqueda rápida funciona desde la primera letra.
        </p>
      </header>

      <Section
        title="Prueba de autocompletado"
        description="Busque rubros por código o descripción. Al seleccionar uno se simula la inserción de una línea."
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
              </dl>
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Gestión del catálogo"
        description="Cree, edite y elimine rubros. Use los filtros para navegar listas grandes."
      >
        <div className="space-y-5">
          <div id="catalog-form-container">
            <CatalogForm
              editingItem={editingItem}
              isSubmitting={isSubmitting}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => setEditingItem(null)}
            />
          </div>

          <Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Categoría"
                placeholder="Todas"
                value={categoriaFilter}
                onChange={(event) => setCategoriaFilter(event.target.value)}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  ...categories.map((category) => ({
                    value: category.nombre,
                    label: category.nombre,
                  })),
                ]}
              />

              <Select
                label="Ordenar por"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as CatalogSortBy)}
                options={[
                  { value: 'descripcion', label: 'Descripción' },
                  { value: 'codigo', label: 'Código' },
                  { value: 'costo', label: 'Costo unitario' },
                ]}
              />

              <Select
                label="Orden"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as CatalogSortOrder)
                }
                options={[
                  { value: 'asc', label: 'Ascendente' },
                  { value: 'desc', label: 'Descendente' },
                ]}
              />

              <Select
                label="Mostrar"
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value as PageSizeOption)}
                options={[
                  { value: '10', label: '10 por página' },
                  { value: '20', label: '20 por página' },
                  { value: 'all', label: 'Todos' },
                ]}
              />
            </div>

            <p className="mt-4 text-xs text-brand-gray/70">
              {total} rubro{total === 1 ? '' : 's'} encontrados
              {pageSize !== 'all' && total > 0
                ? ` · Página ${page} de ${totalPages}`
                : ''}
            </p>
          </Card>

          <Card className="p-0 sm:p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-brand-gray/70">Cargando catálogo…</p>
            ) : (
              <>
                <Table
                  caption="Rubros registrados"
                  columns={columns}
                  data={items}
                  getRowKey={(row) => row.id}
                  emptyMessage="No hay rubros que coincidan con los filtros."
                />

                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-gray/10 px-4 py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || isSubmitting}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-brand-gray/75">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      disabled={page >= totalPages || isSubmitting}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </Section>
    </div>
  )
}
