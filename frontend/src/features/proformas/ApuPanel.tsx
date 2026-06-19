import { useState } from 'react'
import { Button, Input } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import type { ApuBreakdown } from '../../types/proforma-detail'
import { calculateApuSuggestedUnitCost } from './apuCalculator'

interface ApuPanelProps {
  lineId: string
  apu: ApuBreakdown
  onChange: (apu: ApuBreakdown) => void
  onApplySuggestedCost: (cost: number) => void
  disabled?: boolean
}

/**
 * Panel desplegable de APU por línea.
 * Solo apoyo visual/calculadora local; no se persiste en el backend actual.
 */
export function ApuPanel({
  lineId,
  apu,
  onChange,
  onApplySuggestedCost,
  disabled = false,
}: ApuPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const suggested = calculateApuSuggestedUnitCost(apu)

  function updateField(field: keyof ApuBreakdown, value: string) {
    onChange({ ...apu, [field]: value })
  }

  return (
    <div className="border-t border-brand-gray/10 bg-[#fafafa] px-3 py-3">
      <button
        type="button"
        className="text-left text-xs font-semibold text-brand-wine underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral/40 disabled:cursor-not-allowed disabled:opacity-50"
        aria-expanded={isOpen}
        aria-controls={`apu-panel-${lineId}`}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
      >
        {isOpen ? 'Ocultar' : 'Ver'} calculadora APU local (costo unitario)
      </button>

      {isOpen && (
        <div id={`apu-panel-${lineId}`} className="mt-4 space-y-4">
          <p className="text-xs text-brand-gray/70">
            Calculadora auxiliar para estimar el <strong>costo unitario</strong> a partir
            de componentes. No se envía al servidor. Es distinta de la columna{' '}
            <strong>«Días lab.»</strong> de la tabla: esos días suman el tiempo de
            ejecución del proyecto; el <strong>rendimiento</strong> del APU solo divide
            el costo directo para obtener un precio unitario sugerido.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Rendimiento (APU)"
              type="number"
              min="0"
              step="any"
              value={apu.rendimiento}
              onChange={(event) => updateField('rendimiento', event.target.value)}
              hint="Factor de productividad del APU, no es «días laborables» del rubro."
              disabled={disabled}
            />
            <Input
              label="Equipos"
              type="number"
              min="0"
              step="any"
              value={apu.equipos}
              onChange={(event) => updateField('equipos', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Mano de obra"
              type="number"
              min="0"
              step="any"
              value={apu.manoObra}
              onChange={(event) => updateField('manoObra', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Materiales"
              type="number"
              min="0"
              step="any"
              value={apu.materiales}
              onChange={(event) => updateField('materiales', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Herramientas"
              type="number"
              min="0"
              step="any"
              value={apu.herramientas}
              onChange={(event) => updateField('herramientas', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Transporte"
              type="number"
              min="0"
              step="any"
              value={apu.transporte}
              onChange={(event) => updateField('transporte', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Alimentación / estadía"
              type="number"
              min="0"
              step="any"
              value={apu.alimentacionEstadia}
              onChange={(event) =>
                updateField('alimentacionEstadia', event.target.value)
              }
              disabled={disabled}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-brand-gray">
              Costo unitario sugerido por APU:{' '}
              <span className={cn('font-semibold tabular-nums text-brand-wine')}>
                {formatCurrency(suggested)}
              </span>
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onApplySuggestedCost(suggested)}
              disabled={disabled}
            >
              Aplicar al costo unitario
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
