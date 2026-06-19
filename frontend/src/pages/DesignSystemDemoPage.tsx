import { useState } from 'react'
import {
  Button,
  Card,
  Input,
  Section,
  Select,
  Table,
  TextArea,
} from '../components/ui'
import type { TableColumn } from '../components/ui'
import { notify } from '../lib/toast'

interface DemoRubroRow {
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  costoUnitario: number
  total: number
}

const demoRubros: DemoRubroRow[] = [
  {
    codigo: '01.01',
    descripcion: 'Replanteo y nivelación',
    unidad: 'm²',
    cantidad: 150,
    costoUnitario: 2.5,
    total: 375,
  },
  {
    codigo: '02.03',
    descripcion: 'Excavación manual',
    unidad: 'm³',
    cantidad: 42.5,
    costoUnitario: 18.75,
    total: 796.88,
  },
  {
    codigo: '03.02',
    descripcion: 'Hormigón f\'c=210 kg/cm²',
    unidad: 'm³',
    cantidad: 12,
    costoUnitario: 185,
    total: 2220,
  },
]

const rubroColumns: TableColumn<DemoRubroRow>[] = [
  { key: 'codigo', header: 'Código', accessor: 'codigo' },
  { key: 'descripcion', header: 'Descripción', accessor: 'descripcion' },
  { key: 'unidad', header: 'Unidad', accessor: 'unidad' },
  { key: 'cantidad', header: 'Cantidad', accessor: 'cantidad', numeric: true },
  {
    key: 'costoUnitario',
    header: 'Costo unit.',
    numeric: true,
    render: (row) => `$${row.costoUnitario}`,
  },
  {
    key: 'total',
    header: 'Total',
    numeric: true,
    render: (row) => `$${row.total}`,
  },
]

/** Página de demostración del sistema de diseño (sin conexión a la API). */
export function DesignSystemDemoPage() {
  const [proyecto, setProyecto] = useState('')
  const [perfil, setPerfil] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  return (
    <div className="space-y-8 text-left">
        <header className="border-l-4 border-brand-coral pl-4">
          <h1 className="font-heading text-2xl uppercase text-brand-wine sm:text-3xl">
            Sistema de diseño
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-gray/80">
            Componentes base de Construproformas. Esta página es solo demostración;
            no consume la API.
          </p>
        </header>

        <Section
          title="Botones"
          description="Variantes primario (coral), secundario y peligro."
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Guardar borrador</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="danger">Eliminar línea</Button>
            <Button variant="primary" disabled>
              Deshabilitado
            </Button>
          </div>
        </Section>

        <Section
          title="Formularios"
          description="Campos alineados a la izquierda con label y mensaje de error."
        >
          <Card>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Nombre del proyecto"
                placeholder="Ej. Mejoramiento vial sector norte"
                value={proyecto}
                onChange={(event) => setProyecto(event.target.value)}
                error={
                  showErrors && !proyecto.trim()
                    ? 'El nombre del proyecto es obligatorio'
                    : undefined
                }
                required
              />

              <Select
                label="Perfil emisor"
                placeholder="Seleccione un perfil"
                value={perfil}
                onChange={(event) => setPerfil(event.target.value)}
                options={[
                  { value: '1', label: 'Ing. Juan Pérez — Topografía' },
                  { value: '2', label: 'Ing. María López — Hidráulica' },
                ]}
                error={
                  showErrors && !perfil
                    ? 'Seleccione el perfil que emite la proforma'
                    : undefined
                }
                required
              />
            </div>

            <div className="mt-5">
              <TextArea
                label="Descripción (demo)"
                placeholder="Ejemplo de campo multilínea para componentes UI…"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                hint="Solo demostración del componente TextArea."
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowErrors((current) => !current)}
              >
                {showErrors ? 'Ocultar errores' : 'Mostrar errores de validación'}
              </Button>
              <Button variant="primary" onClick={() => setShowErrors(true)}>
                Validar formulario
              </Button>
            </div>
          </Card>
        </Section>

        <Section
          title="Tabla de rubros"
          description="Diseño sobrio; columnas numéricas alineadas a la derecha."
        >
          <Card className="p-0 sm:p-0">
            <Table
              caption="Detalle de presupuesto (datos de ejemplo)"
              columns={rubroColumns}
              data={demoRubros}
              getRowKey={(row) => row.codigo}
            />
          </Card>
        </Section>

        <Section
          title="Notificaciones Toast"
          description="Cuatro variantes para feedback al usuario. Uso: notify.success('…'), etc."
        >
          <Card>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() =>
                  notify.success('Proforma guardada', 'Borrador CM-PROF-86')
                }
              >
                Éxito
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  notify.error(
                    'Error de conexión',
                    'No se pudo contactar al servidor',
                  )
                }
              >
                Error
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  notify.warning(
                    'ID duplicado',
                    'CM-PROF-85 ya existe en registros exportados',
                  )
                }
              >
                Advertencia
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  notify.info(
                    'Totales recalculados',
                    'El backend recalcula subtotal, IVA y total al guardar',
                  )
                }
              >
                Información
              </Button>
            </div>
          </Card>
        </Section>
      </div>
  )
}
