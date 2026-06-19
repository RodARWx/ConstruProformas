import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { getApiErrorMessage } from '../../lib/api'
import { notify } from '../../lib/toast'
import { ProformaDetailTable } from './ProformaDetailTable'
import { ProformaHeaderForm } from './ProformaHeaderForm'
import { ProformaSaveBar } from './ProformaSaveBar'
import { fetchProforma } from './proformasApi'

interface ProformaFormPageProps {
  mode: 'create' | 'edit'
}

export function ProformaFormPage({ mode }: ProformaFormPageProps) {
  const { id } = useParams()
  const proformaId = mode === 'edit' ? id : undefined
  const { isReadOnly, loadFromProforma } = useProformaDraft()
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  useEffect(() => {
    if (mode === 'create') {
      setIsLoading(false)
      return
    }
    if (mode !== 'edit' || !proformaId) return

    let cancelled = false
    setIsLoading(true)

    fetchProforma(proformaId)
      .then((proforma) => {
        if (!cancelled) loadFromProforma(proforma)
      })
      .catch((error) => {
        if (!cancelled) {
          notify.error('No se pudo cargar la proforma', getApiErrorMessage(error))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode, proformaId, loadFromProforma])

  if (isLoading) {
    return <p className="text-left text-sm text-brand-gray/70">Cargando proforma…</p>
  }

  return (
    <div className="space-y-10 text-left">
      <header className="border-l-4 border-brand-coral pl-4">
        <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
          {mode === 'edit' ? 'Editar proforma' : 'Nueva proforma'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
          {isReadOnly
            ? 'Vista de solo lectura: las proformas exportadas no admiten edición.'
            : 'Complete la cabecera y el detalle de rubros, luego guarde el borrador en el servidor.'}
        </p>
        {mode === 'edit' && (
          <Link
            to="/proformas"
            className="app-text-link mt-3 inline-block text-sm"
          >
            ← Volver al historial
          </Link>
        )}
      </header>

      {isReadOnly && (
        <Card className="border-brand-wine/20 bg-brand-wine/5">
          <p className="text-sm text-brand-wine">
            Esta proforma tiene estado <strong>EXPORTED</strong>. El backend rechaza
            cambios en registros ya exportados; la edición está deshabilitada.
          </p>
        </Card>
      )}

      <ProformaHeaderForm />
      <ProformaDetailTable />
      <ProformaSaveBar />
    </div>
  )
}
