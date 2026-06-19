import { type FormEvent, useEffect, useState } from 'react'
import { Button, Card, Input, TextArea } from '../../components/ui'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import type { Category } from '../../types/category'
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../../types/category'

export interface CategoryFormValues {
  nombre: string
  descripcion: string
}

const emptyValues: CategoryFormValues = {
  nombre: '',
  descripcion: '',
}

interface CategoryFormProps {
  editingCategory: Category | null
  isSubmitting: boolean
  onSubmit: (
    payload: CreateCategoryPayload | UpdateCategoryPayload,
  ) => Promise<void>
  onCancelEdit: () => void
}

export function CategoryForm({
  editingCategory,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>(emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormValues, string>>>(
    {},
  )
  const [nombreConflictMessage, setNombreConflictMessage] = useState<string | undefined>()

  useEffect(() => {
    if (editingCategory) {
      setValues({
        nombre: editingCategory.nombre,
        descripcion: editingCategory.descripcion ?? '',
      })
      setErrors({})
      setNombreConflictMessage(undefined)
    } else {
      setValues(emptyValues)
      setErrors({})
      setNombreConflictMessage(undefined)
    }
  }, [editingCategory])

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof CategoryFormValues, string>> = {}

    if (!editingCategory && !values.nombre.trim()) {
      nextErrors.nombre = 'El nombre de la categoría es obligatorio'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    try {
      if (editingCategory) {
        await onSubmit({
          descripcion: values.descripcion.trim() || null,
        })
      } else {
        await onSubmit({
          nombre: values.nombre.trim(),
          descripcion: values.descripcion.trim() || undefined,
        })
        setValues(emptyValues)
        setErrors({})
        setNombreConflictMessage(undefined)
      }
    } catch (error) {
      if (!editingCategory && isApiConflict(error)) {
        const message = getApiErrorMessage(error)
        setNombreConflictMessage(message)
        setErrors((current) => ({ ...current, nombre: message }))
        return
      }
      throw error
    }
  }

  const nombreError = errors.nombre ?? nombreConflictMessage

  return (
    <Card>
      <h2 className="font-subheading text-lg text-brand-wine">
        {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
      </h2>
      <p className="mt-1 text-sm text-brand-gray/80">
        {editingCategory
          ? `Modificando: ${editingCategory.nombre}. El nombre es el identificador único y no puede cambiarse.`
          : 'El nombre identifica la categoría de forma única en el catálogo.'}
      </p>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit} noValidate>
        <Input
          label="Nombre"
          placeholder="Ej. Topografía, Replanteo"
          value={values.nombre}
          onChange={(event) => {
            setValues((current) => ({ ...current, nombre: event.target.value }))
            setNombreConflictMessage(undefined)
            setErrors((current) => ({ ...current, nombre: undefined }))
          }}
          error={nombreError}
          required={!editingCategory}
          disabled={Boolean(editingCategory) || isSubmitting}
          hint={
            editingCategory
              ? 'Identificador fijo de la categoría.'
              : 'Debe ser único. Si ya existe, el servidor responderá con un conflicto.'
          }
        />

        <TextArea
          label="Descripción"
          placeholder="Descripción opcional de la categoría"
          value={values.descripcion}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              descripcion: event.target.value,
            }))
          }
          rows={3}
          disabled={isSubmitting}
          hint="Opcional. Puede editarse en cualquier momento."
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {editingCategory ? 'Guardar descripción' : 'Crear categoría'}
          </Button>
          {editingCategory && (
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
