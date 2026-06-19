import { Card, Section } from '../../components/ui'
import type { Proforma } from '../../types/proforma'
import { ProformaServerTotals } from './ProformaServerTotals'

interface ProformaTotalsPreviewProps {
  proforma: Proforma
  stale?: boolean
}

/** Muestra totales devueltos por el backend tras guardar (no cálculo local). */
export function ProformaTotalsPreview({
  proforma,
  stale = false,
}: ProformaTotalsPreviewProps) {
  return (
    <Section
      title="Vista previa — totales del servidor"
      description="Valores recalculados por el backend al guardar. Son los definitivos para este borrador."
    >
      <Card>
        <ProformaServerTotals proforma={proforma} stale={stale} />
        <p className="mt-4 text-xs text-brand-gray/70">
          ID guardado: <span className="font-semibold">{proforma.idProforma}</span> ·
          Estado: {proforma.status === 'EXPORTED' ? 'Exportada' : 'Borrador'}
        </p>
      </Card>
    </Section>
  )
}
