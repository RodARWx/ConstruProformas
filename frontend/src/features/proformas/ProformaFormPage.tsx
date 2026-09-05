import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { getApiErrorMessage } from '../../lib/api'
import { notify } from '../../lib/toast'
import { ProformaDetailTable } from './ProformaDetailTable'
import { ProformaHeaderForm } from './ProformaHeaderForm'
import { ProformaSaveBar } from './ProformaSaveBar'
import { fetchNextProformaId, fetchProforma } from './proformasApi'

interface ProformaFormPageProps {
  mode: 'create' | 'edit'
}

export function ProformaFormPage({ mode }: ProformaFormPageProps) {
  const { id } = useParams()
  const proformaId = mode === 'edit' ? id : undefined
  const { loadFromProforma, resetForNew } = useProformaDraft()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (mode === 'create') {
      setIsLoading(true)
      fetchNextProformaId()
        .then(({ suggestedId }) => {
          if (!cancelled) {
            resetForNew(suggestedId)
          }
        })
        .catch(() => {
          if (!cancelled) {
            resetForNew()
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false)
          }
        })

      return () => {
        cancelled = true
      }
    }

    if (mode === 'edit' && proformaId) {
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
    }
  }, [mode, proformaId, loadFromProforma, resetForNew])

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
          Complete la cabecera y el detalle de rubros. Al guardar se genera automáticamente la versión en Excel y PDF.
        </p>
        <Link
          to="/proformas"
          className="app-text-link mt-3 inline-block text-sm"
        >
          ← Volver al historial
        </Link>
      </header>

      <ProformaHeaderForm />
      <ProformaDetailTable />
      <ProformaSaveBar />
    </div>
  )
}
