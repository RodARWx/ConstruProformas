import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/layout/BrandLogo'
import { Button, Card, Input } from '../components/ui'
import { useApp } from '../context/AppContext'
import {
  isAccessPinConfigured,
  validateAccessPin,
} from '../lib/access'
import { notify } from '../lib/toast'

/**
 * Pantalla de acceso con PIN del lado del cliente.
 * No reemplaza autenticación real del backend (solo API key de servidor).
 */
export function AccessPage() {
  const { isAccessGranted, grantAccess } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | undefined>()
  const pinConfigured = isAccessPinConfigured()

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/proformas'

  if (isAccessGranted) {
    return <Navigate to={from} replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    if (!pinConfigured) {
      setError('PIN de acceso no configurado (VITE_ACCESS_PIN)')
      notify.error('Configuración incompleta', 'Defina VITE_ACCESS_PIN en el entorno')
      return
    }

    if (!validateAccessPin(pin)) {
      setError('PIN incorrecto')
      notify.error('Acceso denegado', 'Verifique la clave e intente de nuevo')
      return
    }

    grantAccess()
    notify.success('Acceso concedido')
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-stretch justify-center bg-[#fafafa] px-4 py-8">
      <div className="mx-auto w-full max-w-md text-left">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo />
          <p className="text-sm font-semibold text-brand-wine sm:text-base">
            Construproformas
          </p>
        </div>

        <Card>
          <h1 className="font-heading text-xl uppercase text-brand-wine">Acceso</h1>
          <p className="mt-2 text-sm text-brand-gray/80">
            Ingrese el PIN de acceso para usar la aplicación. Esta barrera es solo
            del lado del cliente y no sustituye un login de usuarios en el servidor.
          </p>

          {!pinConfigured && (
            <p className="mt-4 rounded-md border border-brand-red/30 bg-brand-red/5 px-3 py-2 text-sm text-brand-red">
              Configure la variable <code>VITE_ACCESS_PIN</code> en su archivo{' '}
              <code>.env</code> para habilitar el acceso.
            </p>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              label="PIN de acceso"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="Ingrese su clave"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              error={error}
              required
              disabled={!pinConfigured}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={!pinConfigured}
            >
              Ingresar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
