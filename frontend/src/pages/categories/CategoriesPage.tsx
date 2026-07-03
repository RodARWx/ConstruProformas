import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { CategoryForm } from '../../features/categories/CategoryForm'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../../features/categories/categoriesApi'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import { isDefaultCategory } from '../../lib/defaultCategory'
import type { Category, CategoryRubro } from '../../types/category'
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../types/category'

const rubroColumns: TableColumn<CategoryRubro>[] = [
  {
    key: 'codigo',
    header: 'Código',
    render: (row) => row.codigoSugerido ?? '—',
  },
  { key: 'descripcion', header: 'Descripción', accessor: 'descripcion' },
  { key: 'unidad', header: 'Unidad', accessor: 'unidad' },
  {
    key: 'costo',
    header: 'Costo unit.',
    numeric: true,
    render: (row) => formatCurrency(row.costoUnitario),
  },
]

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [pendingDeleteNombre, setPendingDeleteNombre] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (error) {
      notify.error('No se pudieron cargar las categorías', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  async function handleFormSubmit(
    payload: CreateCategoryPayload | UpdateCategoryPayload,
  ) {
    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.nombre, payload as UpdateCategoryPayload)
        setEditingCategory(null)
        notify.success('Categoría actualizada')
      } else {
        await createCategory(payload as CreateCategoryPayload)
        notify.success('Categoría creada')
      }
      await loadCategories()
    } catch (error) {
      if (!editingCategory && isApiConflict(error)) {
        throw error
      }
      notify.error('No se pudo guardar la categoría', getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(nombre: string) {
    setIsSubmitting(true)
    try {
      await deleteCategory(nombre)
      setCategories((current) => current.filter((item) => item.nombre !== nombre))
      if (editingCategory?.nombre === nombre) {
        setEditingCategory(null)
      }
      setPendingDeleteNombre(null)
      notify.success('Categoría eliminada')
    } catch (error) {
      if (isApiConflict(error)) {
        notify.error('No se puede eliminar la categoría', getApiErrorMessage(error))
      } else {
        notify.error('No se pudo eliminar la categoría', getApiErrorMessage(error))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 text-left">
      <header className="border-l-4 border-brand-coral pl-4">
        <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
          Categorías
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
          Organice el catálogo de rubros por categorías. Cada categoría agrupa ítems
          relacionados; solo puede eliminarse si no tiene rubros asociados.
        </p>
      </header>

      <Section
        title="Gestión de categorías"
        description="Cree categorías nuevas o edite la descripción de las existentes."
      >
        <CategoryForm
          editingCategory={editingCategory}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onCancelEdit={() => setEditingCategory(null)}
        />
      </Section>

      <Section
        title="Categorías registradas"
        description="Listado con rubros asociados, ordenados alfabéticamente."
      >
        {isLoading ? (
          <Card>
            <p className="text-sm text-brand-gray/70">Cargando categorías…</p>
          </Card>
        ) : categories.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-gray/70">
              No hay categorías registradas. Cree la primera con el formulario superior.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {categories.map((category) => (
              <Card key={category.nombre} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-subheading text-lg text-brand-wine">
                      {category.nombre}
                    </h3>
                    {category.descripcion ? (
                      <p className="mt-1 text-sm text-brand-gray/80">
                        {category.descripcion}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm italic text-brand-gray/50">
                        Sin descripción
                      </p>
                    )}
                    <p className="mt-2 text-xs text-brand-gray/60">
                      {category.rubros.length}{' '}
                      {category.rubros.length === 1 ? 'rubro' : 'rubros'} asociados
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setPendingDeleteNombre(null)
                        setEditingCategory(category)
                      }}
                      disabled={isSubmitting}
                    >
                      Editar
                    </Button>
                    {!isDefaultCategory(category.nombre) &&
                      (pendingDeleteNombre === category.nombre ? (
                      <>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => void handleDelete(category.nombre)}
                          disabled={isSubmitting}
                        >
                          Confirmar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setPendingDeleteNombre(null)}
                          disabled={isSubmitting}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => setPendingDeleteNombre(category.nombre)}
                        disabled={isSubmitting}
                      >
                        Eliminar
                      </Button>
                    ))}
                  </div>
                </div>

                <Table
                  caption={`Rubros de ${category.nombre}`}
                  columns={rubroColumns}
                  data={category.rubros}
                  getRowKey={(row) => row.id}
                  emptyMessage="Esta categoría no tiene rubros asociados todavía."
                />
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
