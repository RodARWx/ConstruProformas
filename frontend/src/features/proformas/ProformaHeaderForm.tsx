import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Section, Select } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { CustomerAutocomplete } from '../../features/customers/CustomerAutocomplete'
import { searchCustomers } from '../../features/customers/customersApi'
import {
  checkProformaIdAvailability,
  fetchNextProformaId,
  getIdConflictMessage,
} from '../../features/proformas/proformasApi'
import { ProformaNotesEditor } from '../../features/proformas/ProformaNotesEditor'
import { fetchProfiles } from '../../features/profiles/profilesApi'
import { getApiErrorMessage } from '../../lib/api'
import { GENERIC_CUSTOMER, isGenericCustomer } from '../../lib/genericCustomer'
import { notify } from '../../lib/toast'
import type { Customer } from '../../types/customer'
import type { Profile } from '../../types/profile'
import { ProformaServerTotals } from './ProformaServerTotals'

export function ProformaHeaderForm() {
  const {
    header,
    editingProformaId,
    savedProforma,
    isDraftSaved,
    isReadOnly,
    headerFieldErrors,
    setHeader,
    setHeaderFieldErrors,
  } = useProformaDraft()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoadingRefs, setIsLoadingRefs] = useState(true)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [idConflictMessage, setIdConflictMessage] = useState<string | undefined>()

  const isIdLocked = Boolean(editingProformaId)
  const disabled = isReadOnly || isLoadingRefs

  const loadSuggestedId = useCallback(async () => {
    try {
      const { suggestedId } = await fetchNextProformaId()
      setHeader({ suggestedId, idProforma: header.idProforma || suggestedId })
      return suggestedId
    } catch (error) {
      notify.error('No se pudo obtener el ID sugerido', getApiErrorMessage(error))
      return header.suggestedId
    }
  }, [header.idProforma, header.suggestedId, setHeader])

  useEffect(() => {
    let cancelled = false

    async function loadReferences() {
      setIsLoadingRefs(true)
      try {
        const profileList = await fetchProfiles()
        if (cancelled) return
        setProfiles(profileList)

        if (!editingProformaId) {
          const nextId = await fetchNextProformaId()
          if (cancelled) return
          setHeader((current) => ({
            suggestedId: nextId.suggestedId,
            idProforma: current.idProforma || nextId.suggestedId,
          }))
        }
      } catch (error) {
        if (!cancelled) {
          notify.error('Error al cargar datos', getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) setIsLoadingRefs(false)
      }
    }

    void loadReferences()

    return () => {
      cancelled = true
    }
  }, [editingProformaId, setHeader])

  const applyCustomer = useCallback(
    (customer: Customer) => {
      setHeader({
        customerId: customer.id,
        nombreCliente: customer.nombreCliente,
        rucCedula: customer.rucCedula,
        direccion: customer.direccion ?? '',
        telefonoCliente: customer.telefono ?? '',
      })
      setHeaderFieldErrors({
        ...headerFieldErrors,
        customerId: undefined,
      })
    },
    [headerFieldErrors, setHeader, setHeaderFieldErrors],
  )

  const verifyIdAvailability = useCallback(
    async (idProforma: string, suggestedId = header.suggestedId) => {
      if (isIdLocked) return true

      const trimmed = idProforma.trim()
      if (!trimmed) {
        setIdConflictMessage(undefined)
        return true
      }

      setIsCheckingId(true)
      try {
        const availability = await checkProformaIdAvailability(trimmed)
        if (availability === 'available') {
          setIdConflictMessage(undefined)
          return true
        }

        const message = getIdConflictMessage(trimmed, availability, suggestedId)
        setIdConflictMessage(message)
        setHeaderFieldErrors({ idProforma: message })
        notify.warning('ID no disponible', message)
        return false
      } catch (error) {
        notify.error('No se pudo validar el ID', getApiErrorMessage(error))
        return false
      } finally {
        setIsCheckingId(false)
      }
    },
    [header.suggestedId, isIdLocked, setHeaderFieldErrors],
  )

  async function handleUseSuggestedId() {
    const suggestedId = header.suggestedId || (await loadSuggestedId())
    if (!suggestedId) return

    setHeader({ idProforma: suggestedId })
    setIdConflictMessage(undefined)
    setHeaderFieldErrors({})
    void verifyIdAvailability(suggestedId, suggestedId)
  }

  const selectedProfile = profiles.find((item) => item.id === header.profileId)
  const idError = headerFieldErrors.idProforma ?? idConflictMessage
  const totalsAreStale = Boolean(savedProforma) && !isDraftSaved

  const selectedCustomerHint =
    header.customerId && header.nombreCliente
      ? { nombreCliente: header.nombreCliente, rucCedula: header.rucCedula }
      : null

  const isGenericSelected = isGenericCustomer(header.rucCedula, header.nombreCliente)

  const applyGenericCustomer = useCallback(async () => {
    try {
      const matches = await searchCustomers(GENERIC_CUSTOMER.rucCedula, 5)
      const generic = matches.find(
        (customer) => customer.rucCedula === GENERIC_CUSTOMER.rucCedula,
      )

      if (generic) {
        applyCustomer(generic)
        return
      }

      setHeader({
        customerId: '',
        nombreCliente: GENERIC_CUSTOMER.nombreCliente,
        rucCedula: GENERIC_CUSTOMER.rucCedula,
        direccion: GENERIC_CUSTOMER.direccion,
        telefonoCliente: GENERIC_CUSTOMER.telefono,
      })
      setHeaderFieldErrors({
        ...headerFieldErrors,
        customerId: 'Guarde el cliente genérico en Clientes o reinicie el servidor',
      })
      notify.warning(
        'Cliente genérico no encontrado',
        'El servidor debe tener registrado "A quien interese". Reinicie el backend si acaba de actualizar.',
      )
    } catch (error) {
      notify.error('No se pudo aplicar el cliente genérico', getApiErrorMessage(error))
    }
  }, [applyCustomer, headerFieldErrors, setHeader, setHeaderFieldErrors])

  async function handleGenericToggle(checked: boolean) {
    if (checked) {
      await applyGenericCustomer()
      return
    }

    setHeader({
      customerId: '',
      nombreCliente: '',
      rucCedula: '',
      direccion: '',
      telefonoCliente: '',
    })
    setHeaderFieldErrors({ customerId: undefined })
  }

  return (
    <div className="space-y-8">
      <Section
        title="Identificación"
        description={
          isIdLocked
            ? 'El ID no puede cambiarse al editar un borrador existente.'
            : 'ID sugerido por el servidor, editable manualmente.'
        }
      >
        <Card>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="ID de proforma"
              value={header.idProforma}
              onChange={(event) => {
                setHeader({ idProforma: event.target.value })
                setIdConflictMessage(undefined)
                setHeaderFieldErrors({})
              }}
              onBlur={() => void verifyIdAvailability(header.idProforma)}
              error={idError}
              hint={
                header.suggestedId
                  ? `Sugerido por el servidor: ${header.suggestedId}`
                  : undefined
              }
              required
              disabled={disabled || isCheckingId || isIdLocked}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleUseSuggestedId()}
              disabled={disabled || isCheckingId || isIdLocked || !header.suggestedId}
            >
              Usar sugerido
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Proyecto y cliente">
        <Card>
          {!isReadOnly && (
            <p className="mb-4 text-xs text-brand-gray/75">
              Los datos del cliente y los rubros se congelan al guardar en el servidor.
              Cambios posteriores en Clientes o Catálogo no alteran esta proforma hasta
              que vuelva a guardar el borrador.
            </p>
          )}
          {isReadOnly && (
            <p className="mb-4 text-xs text-brand-wine/80">
              Vista congelada: muestra los datos del cliente y rubros al momento de la
              última exportación o guardado.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Proyecto"
                placeholder="Nombre del proyecto"
                value={header.nombreProyecto}
                onChange={(event) =>
                  setHeader({ nombreProyecto: event.target.value })
                }
                error={headerFieldErrors.nombreProyecto}
                required
                disabled={disabled}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-md border border-brand-gray/15 bg-[#fafafa] p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-brand-coral"
                  checked={isGenericSelected}
                  onChange={(event) => void handleGenericToggle(event.target.checked)}
                  disabled={disabled}
                />
                <span className="text-left text-sm text-brand-gray">
                  <span className="block font-semibold text-brand-wine">
                    A quien interese
                  </span>
                  <span className="mt-1 block text-brand-gray/75">
                    Completa automáticamente nombre, cédula ({GENERIC_CUSTOMER.rucCedula})
                    y teléfono ({GENERIC_CUSTOMER.telefono}).
                  </span>
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <CustomerAutocomplete
                label="Buscar cliente"
                placeholder="Nombre o cédula/RUC…"
                disabled={disabled}
                error={headerFieldErrors.customerId}
                selectedCustomer={selectedCustomerHint}
                onSelect={applyCustomer}
              />
            </div>

            <Input
              label="Nombre del cliente"
              value={header.nombreCliente}
              error={headerFieldErrors.nombreCliente}
              hint="Solo lectura. Edite en /clientes."
              disabled
              readOnly
            />

            <Input
              label="RUC / Cédula"
              value={header.rucCedula}
              error={headerFieldErrors.rucCedula}
              hint="Solo lectura. Edite en /clientes."
              disabled
              readOnly
            />

            <Input
              label="Teléfono"
              value={header.telefonoCliente}
              hint="Solo lectura. Edite en /clientes."
              disabled
              readOnly
            />

            <Input
              label="Dirección"
              value={header.direccion}
              error={headerFieldErrors.direccion}
              hint="Solo lectura. Edite en /clientes."
              disabled
              readOnly
            />

            <Input
              label="Fecha"
              type="date"
              value={header.fecha}
              onChange={(event) => setHeader({ fecha: event.target.value })}
              error={headerFieldErrors.fecha}
              required
              disabled={disabled}
            />
          </div>
        </Card>
      </Section>

      <Section
        title="Notas del documento"
        description="Condiciones o aclaraciones adicionales que aparecerán al pie de la proforma exportada."
      >
        <Card>
          <ProformaNotesEditor
            lines={header.notasLines}
            disabled={disabled}
            onChange={(notasLines) => setHeader({ notasLines })}
          />
        </Card>
      </Section>

      <Section
        title="Totales del documento"
        description="Subtotal, IVA, total con IVA y tiempo de ejecución los calcula el servidor al guardar."
      >
        <Card>
          <ProformaServerTotals
            proforma={savedProforma}
            stale={totalsAreStale}
          />
        </Card>
      </Section>

      <Section
        title="Perfil emisor"
        description="Perfiles oficiales de Construmétrica (solo lectura en el servidor)."
      >
        <Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Perfil emisor"
              placeholder={
                isLoadingRefs ? 'Cargando perfiles…' : 'Seleccione un perfil'
              }
              value={header.profileId ? String(header.profileId) : ''}
              onChange={(event) =>
                setHeader({
                  profileId: event.target.value
                    ? Number(event.target.value)
                    : '',
                })
              }
              options={profiles.map((profile) => ({
                value: String(profile.id),
                label: `${profile.nombre} — ${profile.cargo}`,
              }))}
              error={headerFieldErrors.profileId}
              required
              disabled={disabled}
            />

            {selectedProfile && (
              <div className="rounded-md border border-brand-gray/15 bg-[#fafafa] p-4 text-left text-sm text-brand-gray">
                <p className="font-semibold text-brand-wine">{selectedProfile.nombre}</p>
                <p className="mt-1">{selectedProfile.cargo}</p>
                {selectedProfile.registroSenescyt && (
                  <p className="mt-1 text-xs text-brand-gray/70">
                    Reg. SENESCYT: {selectedProfile.registroSenescyt}
                  </p>
                )}
                {(selectedProfile.telefono || selectedProfile.correo) && (
                  <p className="mt-1 text-xs text-brand-gray/70">
                    {[selectedProfile.telefono, selectedProfile.correo]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </Section>
    </div>
  )
}
