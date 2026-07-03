import { type FormEvent, useEffect, useState } from 'react'
import { Button, Card, Input, Select } from '../../components/ui'
import { fetchCategories } from '../categories/categoriesApi'
import { getApiErrorMessage } from '../../lib/api'
import { notify } from '../../lib/toast'
import { DEFAULT_CATEGORY_NAME } from '../../lib/defaultCategory'
import type { Category } from '../../types/category'
import type { CatalogItem } from '../../types/catalog'
import type {
  CreateCatalogItemPayload,
  UpdateCatalogItemPayload,
} from '../../types/catalog'

export interface CatalogFormValues {
  codigoSugerido: string
  descripcion: string
  unidad: string
  costoUnitario: string
  categoriaNombre: string
  diasLaborables: string
  ivaPercentage: string
}

const emptyValues: CatalogFormValues = {
  codigoSugerido: '',
  descripcion: '',
  unidad: '',
  costoUnitario: '',
  categoriaNombre: DEFAULT_CATEGORY_NAME,
  diasLaborables: '1',
  ivaPercentage: '15',
}

interface CatalogFormProps {
  editingItem: CatalogItem | null
  isSubmitting: boolean
  onSubmit: (
    payload: CreateCatalogItemPayload | UpdateCatalogItemPayload,
  ) => Promise<void>
  onCancelEdit: () => void
}

export function CatalogForm({
  editingItem,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: CatalogFormProps) {
  const [values, setValues] = useState<CatalogFormValues>(emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CatalogFormValues, string>>>(
    {},
  )
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setIsLoadingCategories(true)
      try {
        const data = await fetchCategories()
        if (!cancelled) setCategories(data)
      } catch (error) {
        if (!cancelled) {
          notify.error('No se pudieron cargar las categorías', getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) setIsLoadingCategories(false)
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (editingItem) {
      setValues({
        codigoSugerido: editingItem.codigoSugerido ?? '',
        descripcion: editingItem.descripcion,
        unidad: editingItem.unidad,
        costoUnitario: String(editingItem.costoUnitario),
        categoriaNombre: editingItem.categoriaNombre ?? DEFAULT_CATEGORY_NAME,
        diasLaborables: String(editingItem.diasLaborables ?? 1),
        ivaPercentage: String(editingItem.ivaPercentage ?? 15),
      })
      setErrors({})
    } else {
      setValues(emptyValues)
      setErrors({})
    }
  }, [editingItem])

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof CatalogFormValues, string>> = {}

    if (!values.descripcion.trim()) {
      nextErrors.descripcion = 'La descripción es obligatoria'
    }
    if (!values.unidad.trim()) {
      nextErrors.unidad = 'La unidad es obligatoria'
    }
    if (!values.costoUnitario.trim()) {
      nextErrors.costoUnitario = 'El costo unitario es obligatorio'
    } else {
      const cost = Number(values.costoUnitario)
      if (Number.isNaN(cost) || cost < 0) {
        nextErrors.costoUnitario = 'Ingrese un número válido mayor o igual a 0'
      }
    }

    if (!values.diasLaborables.trim()) {
      nextErrors.diasLaborables = 'Los días laborables son obligatorios'
    } else {
      const dias = Number(values.diasLaborables)
      if (!Number.isInteger(dias) || dias < 1) {
        nextErrors.diasLaborables = 'Ingrese un entero mayor o igual a 1'
      }
    }

    if (!values.ivaPercentage.trim()) {
      nextErrors.ivaPercentage = 'El porcentaje de IVA es obligatorio'
    } else {
      const iva = Number(values.ivaPercentage)
      if (Number.isNaN(iva) || iva < 0 || iva > 100) {
        nextErrors.ivaPercentage = 'Ingrese un valor entre 0 y 100'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const payload: CreateCatalogItemPayload = {
      codigoSugerido: values.codigoSugerido.trim() || undefined,
      descripcion: values.descripcion.trim(),
      unidad: values.unidad.trim(),
      costoUnitario: Number(values.costoUnitario),
      categoriaNombre: values.categoriaNombre.trim() || DEFAULT_CATEGORY_NAME,
      diasLaborables: Number(values.diasLaborables),
      ivaPercentage: Number(values.ivaPercentage),
    }

    await onSubmit(payload)
    if (!editingItem) {
      setValues(emptyValues)
      setErrors({})
    }
  }

  const categoryOptions = categories.map((category) => ({
    value: category.nombre,
    label: category.nombre,
  }))

  return (
    <Card>
      <h2 className="font-subheading text-lg text-brand-wine">
        {editingItem ? 'Editar rubro' : 'Nuevo rubro'}
      </h2>
      <p className="mt-1 text-sm text-brand-gray/80">
        {editingItem
          ? `Modificando: ${editingItem.descripcion}`
          : 'Agregue un ítem al catálogo reutilizable.'}
      </p>

      <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        <Input
          label="Código sugerido"
          placeholder="Ej. 01.02"
          value={values.codigoSugerido}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              codigoSugerido: event.target.value,
            }))
          }
          hint="Opcional. Se usa como código al insertar en una proforma."
          disabled={isSubmitting}
        />

        <Input
          label="Unidad"
          placeholder="Ej. m², m³, gl"
          value={values.unidad}
          onChange={(event) =>
            setValues((current) => ({ ...current, unidad: event.target.value }))
          }
          error={errors.unidad}
          required
          disabled={isSubmitting}
        />

        <div className="sm:col-span-2">
          <Input
            label="Descripción"
            placeholder="Descripción del rubro"
            value={values.descripcion}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                descripcion: event.target.value,
              }))
            }
            error={errors.descripcion}
            required
            disabled={isSubmitting}
          />
        </div>

        <Select
          label="Categoría"
          placeholder={
            isLoadingCategories ? 'Cargando categorías…' : DEFAULT_CATEGORY_NAME
          }
          options={categoryOptions}
          value={values.categoriaNombre || DEFAULT_CATEGORY_NAME}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              categoriaNombre: event.target.value,
            }))
          }
          disabled={isSubmitting || isLoadingCategories}
          hint="Obligatoria. Los rubros sin categoría van a Otros rubros."
        />

        <Input
          label="Costo unitario"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0"
          value={values.costoUnitario}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              costoUnitario: event.target.value,
            }))
          }
          error={errors.costoUnitario}
          required
          disabled={isSubmitting}
        />

        <Input
          label="Días laborables"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="1"
          value={values.diasLaborables}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              diasLaborables: event.target.value,
            }))
          }
          error={errors.diasLaborables}
          required
          disabled={isSubmitting}
          hint="Mínimo 1. Referencia para el tiempo de ejecución en proformas."
        />

        <Input
          label="IVA aplicable (%)"
          type="number"
          min="0"
          max="100"
          step="any"
          inputMode="decimal"
          placeholder="15"
          value={values.ivaPercentage}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              ivaPercentage: event.target.value,
            }))
          }
          error={errors.ivaPercentage}
          required
          disabled={isSubmitting}
          hint="Por defecto 15. Use 0 para rubros exentos."
        />

        <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {editingItem ? 'Guardar cambios' : 'Crear rubro'}
          </Button>
          {editingItem && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancelEdit}
              disabled={isSubmitting}
            >
              Cancelar edición
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
