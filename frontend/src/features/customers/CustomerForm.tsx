import { type FormEvent, useEffect, useState } from 'react'
import { Button, Card, Input } from '../../components/ui'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import { searchCustomers } from './customersApi'
import type { Customer } from '../../types/customer'
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../../types/customer'

export interface CustomerFormValues {
  rucCedula: string
  nombreCliente: string
  telefono: string
  correo: string
  direccion: string
  discountPercentage: string
}

const emptyValues: CustomerFormValues = {
  rucCedula: '',
  nombreCliente: '',
  telefono: '',
  correo: '',
  direccion: '',
  discountPercentage: '0',
}

interface CustomerFormProps {
  editingCustomer: Customer | null
  isSubmitting: boolean
  onSubmit: (
    payload: CreateCustomerPayload | UpdateCustomerPayload,
  ) => Promise<void>
  onCancelEdit: () => void
}

export function CustomerForm({
  editingCustomer,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>(
    {},
  )
  const [rucConflictMessage, setRucConflictMessage] = useState<string | undefined>()

  useEffect(() => {
    if (editingCustomer) {
      setValues({
        rucCedula: editingCustomer.rucCedula,
        nombreCliente: editingCustomer.nombreCliente,
        telefono: editingCustomer.telefono ?? '',
        correo: editingCustomer.correo ?? '',
        direccion: editingCustomer.direccion ?? '',
        discountPercentage: String(editingCustomer.discountPercentage ?? 0),
      })
      setErrors({})
      setRucConflictMessage(undefined)
    } else {
      setValues(emptyValues)
      setErrors({})
      setRucConflictMessage(undefined)
    }
  }, [editingCustomer])

  const [matchingCustomerWarning, setMatchingCustomerWarning] = useState<string | undefined>()

  useEffect(() => {
    const ident = values.rucCedula.trim()
    if (ident.length < 10) {
      setMatchingCustomerWarning(undefined)
      return
    }

    const baseIdent = ident.slice(0, 10)
    const controller = new AbortController()

    searchCustomers(baseIdent, 5, controller.signal)
      .then((results) => {
        const match = results.find(
          (c) =>
            c.rucCedula.startsWith(baseIdent) &&
            (!editingCustomer || c.id !== editingCustomer.id),
        )

        if (match) {
          setValues((current) => ({
            ...current,
            nombreCliente: match.nombreCliente,
          }))
          setMatchingCustomerWarning(
            `Se detectó un cliente coincidente (Cédula/RUC: ${match.rucCedula}). El nombre se ha autocompletado para consistencia.`,
          )
        } else {
          setMatchingCustomerWarning(undefined)
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Error al validar Cédula/RUC coincidente', err)
      })

    return () => {
      controller.abort()
    }
  }, [values.rucCedula, editingCustomer])

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof CustomerFormValues, string>> = {}

    if (!values.rucCedula.trim()) {
      nextErrors.rucCedula = 'La cédula o RUC es obligatorio'
    }
    if (!values.nombreCliente.trim()) {
      nextErrors.nombreCliente = 'El nombre del cliente es obligatorio'
    }
    if (values.discountPercentage.trim()) {
      const discount = Number(values.discountPercentage)
      if (Number.isNaN(discount) || discount < 0) {
        nextErrors.discountPercentage = 'Ingrese un número mayor o igual a 0'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    const payload: CreateCustomerPayload = {
      rucCedula: values.rucCedula.trim(),
      nombreCliente: values.nombreCliente.trim(),
      telefono: values.telefono.trim() || undefined,
      correo: values.correo.trim() || undefined,
      direccion: values.direccion.trim() || undefined,
      discountPercentage: Number(values.discountPercentage || 0),
    }

    try {
      await onSubmit(payload)
      if (!editingCustomer) {
        setValues(emptyValues)
        setErrors({})
        setRucConflictMessage(undefined)
      }
    } catch (error) {
      if (isApiConflict(error)) {
        const message = getApiErrorMessage(error)
        setRucConflictMessage(message)
        setErrors((current) => ({ ...current, rucCedula: message }))
        return
      }
      throw error
    }
  }

  const rucError = errors.rucCedula ?? rucConflictMessage

  return (
    <Card>
      <h2 className="font-subheading text-lg text-brand-wine">
        {editingCustomer ? 'Editar cliente' : 'Nuevo cliente'}
      </h2>
      <p className="mt-1 text-sm text-brand-gray/80">
        {editingCustomer
          ? `Modificando: ${editingCustomer.nombreCliente}`
          : 'Registre un cliente para usarlo en proformas. La cédula/RUC debe ser única.'}
      </p>

      <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        <Input
          label="Cédula / RUC"
          placeholder="Ej. 1790123456001"
          value={values.rucCedula}
          onChange={(event) => {
            setValues((current) => ({ ...current, rucCedula: event.target.value }))
            setRucConflictMessage(undefined)
            setErrors((current) => ({ ...current, rucCedula: undefined }))
          }}
          error={rucError}
          required
          disabled={isSubmitting}
          hint="Identificador único del cliente."
        />

        <Input
          label="Nombre del cliente"
          placeholder="Razón social o nombre completo"
          value={values.nombreCliente}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              nombreCliente: event.target.value,
            }))
          }
          error={errors.nombreCliente}
          required
          disabled={isSubmitting || Boolean(matchingCustomerWarning)}
          hint={matchingCustomerWarning ? "Bloqueado porque este cliente ya existe." : undefined}
        />

        {matchingCustomerWarning && (
          <p className="text-xs text-brand-coral font-semibold sm:col-span-2 -mt-2">
            ⚠️ {matchingCustomerWarning}
          </p>
        )}

        <Input
          label="Teléfono"
          placeholder="Ej. 0991234567"
          value={values.telefono}
          onChange={(event) =>
            setValues((current) => ({ ...current, telefono: event.target.value }))
          }
          disabled={isSubmitting}
          hint="Opcional."
        />

        <Input
          label="Correo (Gmail)"
          placeholder="usuario@gmail.com"
          type="email"
          value={values.correo}
          onChange={(event) =>
            setValues((current) => ({ ...current, correo: event.target.value }))
          }
          disabled={isSubmitting}
          hint="Opcional. Use un correo válido."
        />

        <Input
          label="Dirección"
          placeholder="Dirección fiscal o de contacto"
          value={values.direccion}
          onChange={(event) =>
            setValues((current) => ({ ...current, direccion: event.target.value }))
          }
          disabled={isSubmitting}
          hint="Opcional."
        />

        <Input
          label="Descuento (%)"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0"
          value={values.discountPercentage}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              discountPercentage: event.target.value,
            }))
          }
          error={errors.discountPercentage}
          disabled={isSubmitting}
          hint="Demo. Se suma al descuento del rubro en proformas."
        />

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {editingCustomer ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
          {editingCustomer && (
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
