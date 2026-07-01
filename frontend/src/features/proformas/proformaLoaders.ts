import { createDetailLine } from '../../types/proforma-detail'
import {
  createEmptyHeaderDraft,
  type Proforma,
  type ProformaDraft,
} from '../../types/proforma'
import { getProformaCustomerDisplay } from '../../lib/proformaCustomer'

export function proformaToDraft(proforma: Proforma): ProformaDraft {
  const customer = getProformaCustomerDisplay(proforma)

  return {
    header: {
      ...createEmptyHeaderDraft(proforma.idProforma, proforma.fecha),
      idProforma: proforma.idProforma,
      suggestedId: proforma.idProforma,
      nombreProyecto: proforma.nombreProyecto,
      customerId: proforma.customerId,
      nombreCliente: customer.nombreCliente,
      rucCedula: customer.rucCedula,
      direccion: customer.direccion,
      telefonoCliente: customer.telefono,
      fecha: proforma.fecha,
      profileId: proforma.profileId,
    },
    detalles: (proforma.detalles ?? []).map((line) =>
      createDetailLine({
        codigo: line.codigo ?? '',
        descripcion: line.descripcion,
        tiempo: line.tiempo ?? undefined,
        unidad: line.unidad,
        cantidad: line.cantidad,
        costoUnitario: line.costoUnitario,
        diasLaborables: line.diasLaborables ?? 1,
        ivaPercentage: line.ivaPercentage ?? 15,
      }),
    ),
  }
}
