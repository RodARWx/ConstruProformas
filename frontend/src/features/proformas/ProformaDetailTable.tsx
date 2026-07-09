import { Fragment } from 'react'
import { RubroAutocomplete } from '../catalog/RubroAutocomplete'
import { Button, Card, Section } from '../../components/ui'
import { useProformaDraft } from '../../context/ProformaDraftContext'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { notify } from '../../lib/toast'
import type { RubroLineInsert } from '../../types/catalog'
import {
  calculateLineTotalReference,
  createDetailLine,
  type ProformaDetailLine,
} from '../../types/proforma-detail'
import { ApuPanel } from './ApuPanel'
import { ProformaServerTotals } from './ProformaServerTotals'

const cellInputClass = cn(
  'w-full min-w-[5rem] rounded border border-brand-gray/20 bg-white px-2 py-1.5',
  'text-left text-sm text-brand-gray focus:border-brand-coral focus:outline-none focus:ring-1 focus:ring-brand-coral/30',
)

const TABLE_COLUMNS = [
  'Código',
  'Descripción',
  'Unidad',
  'Cantidad',
  'Costo unit.',
  'Días lab.',
  'IVA %',
  'Total ref.',
  'Acciones',
] as const

const COLUMN_COUNT = TABLE_COLUMNS.length

function parseIntegerInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function parseDecimalInput(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

export function ProformaDetailTable() {
  const {
    detalles,
    savedProforma,
    isDraftSaved,
    isReadOnly,
    detailFieldError,
    addDetailLine,
    updateDetailLine,
    removeDetailLine,
    persistDraft,
  } = useProformaDraft()

  function handleAddFromCatalog(line: RubroLineInsert) {
    addDetailLine(
      createDetailLine({
        codigo: line.codigo,
        descripcion: line.descripcion,
        unidad: line.unidad,
        costoUnitario: line.costoUnitario,
        diasLaborables: line.diasLaborables,
        ivaPercentage: line.ivaPercentage,
        cantidad: 1,
      }),
    )
    persistDraft()
    notify.success('Rubro agregado', line.descripcion)
  }

  function handleAddEmptyLine() {
    addDetailLine(createDetailLine())
    persistDraft()
  }

  function handleUpdateLine(localId: string, patch: Partial<ProformaDetailLine>) {
    updateDetailLine(localId, patch)
    persistDraft()
  }

  function handleRemoveLine(localId: string) {
    removeDetailLine(localId)
    persistDraft()
    notify.info('Línea eliminada')
  }

  const totalsAreStale = Boolean(savedProforma) && !isDraftSaved

  return (
    <Section
      title="Detalle de rubros"
      description="Agregue líneas desde el catálogo o manualmente. Días laborables e IVA % son editables por línea; subtotal, IVA, total y tiempo de ejecución los calcula el servidor al guardar."
    >
      <Card className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <RubroAutocomplete
            label="Agregar rubro desde catálogo"
            onSelect={handleAddFromCatalog}
            disabled={isReadOnly}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddEmptyLine}
            disabled={isReadOnly}
          >
            Línea vacía
          </Button>
        </div>

        {detailFieldError && (
          <p className="text-sm text-brand-red" role="alert">
            {detailFieldError}
          </p>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-gray/20">
                {TABLE_COLUMNS.map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      'px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray/80',
                      index >= 3 && index <= 7 && 'text-right',
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-2 py-6 text-left text-brand-gray/70"
                  >
                    No hay líneas. Busque un rubro o agregue una línea vacía.
                  </td>
                </tr>
              ) : (
                detalles.map((line) => {
                  const lineTotal = calculateLineTotalReference(
                    line.cantidad,
                    line.costoUnitario,
                  )

                  return (
                    <Fragment key={line.localId}>
                      <tr className="border-b border-brand-gray/10">
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cellInputClass}
                            value={line.codigo}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                codigo: event.target.value,
                              })
                            }
                            aria-label="Código"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cn(cellInputClass, 'min-w-[10rem]')}
                            value={line.descripcion}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                descripcion: event.target.value,
                              })
                            }
                            aria-label="Descripción"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cellInputClass}
                            value={line.unidad}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                unidad: event.target.value,
                              })
                            }
                            aria-label="Unidad"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cn(cellInputClass, 'text-right tabular-nums')}
                            type="number"
                            min="0"
                            step="any"
                            value={line.cantidad === 0 ? '' : line.cantidad}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                cantidad: parseDecimalInput(event.target.value, 0),
                              })
                            }
                            aria-label="Cantidad"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cn(cellInputClass, 'text-right tabular-nums')}
                            type="number"
                            min="0"
                            step="any"
                            value={line.costoUnitario === 0 ? '' : line.costoUnitario}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                costoUnitario: parseDecimalInput(event.target.value, 0),
                              })
                            }
                            aria-label="Costo unitario"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cn(cellInputClass, 'min-w-[4rem] text-right tabular-nums')}
                            type="number"
                            min="1"
                            step="1"
                            value={line.diasLaborables}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                diasLaborables: Math.max(
                                  1,
                                  parseIntegerInput(event.target.value, 1),
                                ),
                              })
                            }
                            aria-label="Días laborables"
                            title="Días laborables del rubro (suman el tiempo de ejecución del proyecto)"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            className={cn(cellInputClass, 'min-w-[4rem] text-right tabular-nums')}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={line.ivaPercentage}
                            onChange={(event) =>
                              handleUpdateLine(line.localId, {
                                ivaPercentage: Math.min(
                                  100,
                                  Math.max(0, parseDecimalInput(event.target.value, 0)),
                                ),
                              })
                            }
                            aria-label="Porcentaje de IVA"
                            disabled={isReadOnly}
                          />
                        </td>
                        <td className="px-2 py-2 text-right align-top tabular-nums text-brand-gray">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => handleRemoveLine(line.localId)}
                            disabled={isReadOnly}
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={COLUMN_COUNT} className="p-0">
                          <ApuPanel
                            lineId={line.localId}
                            apu={line.apu}
                            onChange={(apu) => handleUpdateLine(line.localId, { apu })}
                            onApplySuggestedCost={(cost) =>
                              handleUpdateLine(line.localId, { costoUnitario: cost })
                            }
                            disabled={isReadOnly}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  )
                })
              )}
            </tbody>
            {detalles.length > 0 && (
              <tfoot className="border-t-2 border-brand-gray/25 bg-[#fafafa]">
                <tr>
                  <td colSpan={COLUMN_COUNT} className="px-3 py-4">
                    <ProformaServerTotals
                      proforma={savedProforma}
                      stale={totalsAreStale}
                      compact
                    />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {detalles.length > 0 && (
          <p className="text-xs text-brand-gray/70">
            «Total ref.» es cantidad × costo unitario (sin IVA), solo como referencia
            mientras edita. La columna «Días lab.» no debe confundirse con el
            rendimiento del panel APU opcional de cada línea.
          </p>
        )}
      </Card>
    </Section>
  )
}
