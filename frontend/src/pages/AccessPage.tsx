import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/layout/BrandLogo'
import { Button, Card, Input } from '../components/ui'
import { useApp } from '../context/AppContext'
import { getApiErrorMessage } from '../lib/api'
import { loginWithPin } from '../lib/auth'
import { notify } from '../lib/toast'

/**
 * Pantalla de acceso con PIN validado en el backend.
 * El backend devuelve un JWT que se almacena en sessionStorage
 * y se envía en cada petición subsiguiente como Authorization: Bearer.
 */
export function AccessPage() {
  const { isAccessGranted, grantAccess } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/proformas'

  if (isAccessGranted) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    if (!pin.trim()) {
      setError('Ingrese el PIN de acceso')
      return
    }

    setIsLoading(true)
    try {
      const { access_token } = await loginWithPin(pin.trim())
      grantAccess(access_token)
      notify.success('Acceso concedido')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = getApiErrorMessage(err)
      setError(msg)
      notify.error('Acceso denegado', msg)
    } finally {
      setIsLoading(false)
    }
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
            Ingrese el PIN de acceso para usar la aplicación.
          </p>

          <form className="mt-6 space-y-5" onSubmit={(e) => void handleSubmit(e)} noValidate>
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
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Verificando…' : 'Ingresar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
