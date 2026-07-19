import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Section, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { CustomerForm } from '../../features/customers/CustomerForm'
import {
  createCustomer,
  fetchCustomers,
  searchCustomers,
  updateCustomer,
} from '../../features/customers/customersApi'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getApiErrorMessage, isApiConflict } from '../../lib/api'
import { notify } from '../../lib/toast'
import type { Customer } from '../../types/customer'
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../../types/customer'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300)

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchCustomers()
      setCustomers(data)
    } catch (error) {
      notify.error('No se pudieron cargar los clientes', getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    setIsSearching(true)

    searchCustomers(debouncedSearch, 50, controller.signal)
      .then((results) => {
        setSearchResults(results)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSearchResults([])
        notify.error('Error en la búsqueda', getApiErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [debouncedSearch])

  const displayedCustomers = useMemo(() => {
    if (!debouncedSearch) return customers
    return searchResults ?? []
  }, [customers, debouncedSearch, searchResults])

  async function handleFormSubmit(
    payload: CreateCustomerPayload | UpdateCustomerPayload,
  ) {
    setIsSubmitting(true)
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload as UpdateCustomerPayload)
        setEditingCustomer(null)
        notify.success('Cliente actualizado')
      } else {
        await createCustomer(payload as CreateCustomerPayload)
        notify.success('Cliente creado')
      }
      await loadCustomers()
      if (debouncedSearch) {
        const results = await searchCustomers(debouncedSearch, 50)
        setSearchResults(results)
      }
    } catch (error) {
      if (isApiConflict(error)) {
        throw error
      }
      notify.error('No se pudo guardar el cliente', getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: TableColumn<Customer>[] = [
    { key: 'ruc', header: 'Cédula / RUC', accessor: 'rucCedula' },
    { key: 'nombre', header: 'Nombre', accessor: 'nombreCliente' },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (row) => row.telefono ?? '—',
    },
    {
      key: 'correo',
      header: 'Correo',
      render: (row) => row.correo ?? '—',
    },
    {
      key: 'codigoPostal',
      header: 'Cód. Postal',
      render: (row) => row.codigoPostal ?? '—',
    },
    {
      key: 'direccion',
      header: 'Dirección',
      render: (row) => row.direccion ?? '—',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditingCustomer(row)
            document.getElementById('customer-form-container')?.scrollIntoView({ behavior: 'smooth' })
          }}
          disabled={isSubmitting}
        >
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-8 text-left">
      <header className="border-l-4 border-brand-coral pl-4">
        <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
          Clientes
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
          Administre el catálogo de clientes de Construmétrica. Esta es la única
          pantalla donde se crean o modifican datos de cliente; en las proformas solo
          se seleccionan.
        </p>
      </header>

      <Section
        title="Gestión de clientes"
        description="Registre clientes nuevos o actualice los existentes."
      >
        <div id="customer-form-container">
          <CustomerForm
            editingCustomer={editingCustomer}
            isSubmitting={isSubmitting}
            onSubmit={handleFormSubmit}
            onCancelEdit={() => setEditingCustomer(null)}
          />
        </div>
      </Section>

      <Section
        title="Clientes registrados"
        description="Busque por nombre o cédula/RUC. Deje vacío para ver el listado completo."
      >
        <div className="space-y-5">
          <Card>
            <Input
              label="Buscar cliente"
              placeholder="Nombre o cédula/RUC…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              hint="Coincidencia parcial en nombre o identificación."
            />
          </Card>

          <Card className="p-0 sm:p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-brand-gray/70">Cargando clientes…</p>
            ) : isSearching ? (
              <p className="p-6 text-sm text-brand-gray/70">Buscando…</p>
            ) : (
              <Table
                caption="Listado de clientes"
                columns={columns}
                data={displayedCustomers}
                getRowKey={(row) => row.id}
                emptyMessage={
                  debouncedSearch
                    ? `No se encontraron clientes para "${debouncedSearch}".`
                    : 'No hay clientes registrados. Cree el primero con el formulario superior.'
                }
              />
            )}
          </Card>
        </div>
      </Section>
    </div>
  )
}
