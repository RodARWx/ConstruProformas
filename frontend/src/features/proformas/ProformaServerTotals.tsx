import { cn } from '../../lib/cn'
import { formatCurrency, formatNumber } from '../../lib/format'
import type { Proforma } from '../../types/proforma'

export interface ProformaServerTotalsProps {
  proforma: Proforma | null
  /** Hay cambios locales sin guardar respecto al último cálculo del servidor. */
  stale?: boolean
  compact?: boolean
  className?: string
}

function deriveDiscountTotals(proforma: Proforma) {
  const subtotal = proforma.subtotal
  const subtotalConDescuento = proforma.totalGeneral - proforma.iva
  const descuentoMonto = subtotal - subtotalConDescuento
  const descuentoPorcentaje =
    subtotal > 0 ? (descuentoMonto / subtotal) * 100 : 0

  return {
    subtotal,
    descuentoPorcentaje,
    descuentoMonto,
    subtotalConDescuento,
    iva: proforma.iva,
    total: proforma.totalGeneral,
  }
}

/**
 * Totales calculados por el backend (subtotal, descuento, IVA, total).
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
        Guarde el borrador para ver subtotal, descuento, IVA, total y tiempo de
        ejecución calculados por el servidor.
      </p>
    )
  }

  const totals = deriveDiscountTotals(proforma)

  const items = [
    {
      label: 'Subtotal',
      value: formatCurrency(totals.subtotal),
      emphasis: false,
    },
    {
      label: 'Descuento (%)',
      value: `${formatNumber(totals.descuentoPorcentaje)}%`,
      emphasis: false,
    },
    {
      label: 'Descuento ($)',
      value: formatCurrency(totals.descuentoMonto),
      emphasis: false,
    },
    {
      label: 'Subtotal con descuento',
      value: formatCurrency(totals.subtotalConDescuento),
      emphasis: false,
    },
    {
      label: 'IVA',
      value: formatCurrency(totals.iva),
      emphasis: false,
    },
    {
      label: 'Total',
      value: formatCurrency(totals.total),
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
