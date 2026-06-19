import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import type { Proforma } from '../../types/proforma'

export interface ProformaServerTotalsProps {
  proforma: Proforma | null
  /** Hay cambios locales sin guardar respecto al último cálculo del servidor. */
  stale?: boolean
  compact?: boolean
  className?: string
}

/**
 * Totales calculados por el backend (subtotal sin IVA, IVA, total con IVA, tiempo).
 * Nunca calcula en cliente.
 */
export function ProformaServerTotals({
  proforma,
  stale = false,
  compact = false,
  className,
}: ProformaServerTotalsProps) {
  if (!proforma) {
    return (
      <p className={cn('text-sm text-brand-gray/70', className)}>
        Guarde el borrador para ver subtotal, IVA, total con IVA y tiempo de ejecución
        calculados por el servidor.
      </p>
    )
  }

  const items = [
    {
      label: 'Subtotal sin IVA',
      value: formatCurrency(proforma.subtotal),
      emphasis: false,
    },
    {
      label: 'IVA',
      value: formatCurrency(proforma.iva),
      emphasis: false,
    },
    {
      label: 'Total con IVA',
      value: formatCurrency(proforma.totalGeneral),
      emphasis: true,
    },
    {
      label: 'Tiempo de ejecución (días)',
      value: proforma.tiempoEjecucion?.trim() || '—',
      emphasis: false,
    },
  ]

  return (
    <div className={className}>
      <dl
        className={cn(
          'grid gap-4 text-left',
          compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-semibold uppercase text-brand-gray/60">
              {item.label}
            </dt>
            <dd
              className={cn(
                'mt-1 tabular-nums',
                compact ? 'text-base font-semibold' : 'text-lg font-semibold',
                item.emphasis ? 'text-brand-wine' : 'text-brand-gray',
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {stale && (
        <p className="mt-3 text-xs text-brand-coral">
          Hay cambios sin guardar. Los totales corresponden al último guardado; pulse
          «Guardar borrador» para recalcular.
        </p>
      )}
    </div>
  )
}
