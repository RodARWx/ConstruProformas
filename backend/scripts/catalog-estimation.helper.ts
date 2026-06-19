/**
 * Estimaciones iniciales de unidad y costo unitario para el seed desde Excel.
 *
 * CRITERIO GENERAL (valores editables después desde la app, NO definitivos):
 * - Servicios de ingeniería civil / topografía en Ecuador suelen facturarse por
 *   unidad física del entregable: m², ha, día de equipo, punto, informe global, etc.
 * - Se normaliza el nombre del rubro y se aplican reglas por palabras clave
 *   (alquiler, levantamiento, replanteo, diseño, trámite, ensayo, etc.).
 * - Los montos son referencias de mercado interno razonables para arrancar el
 *   catálogo; el usuario los ajustará en la aplicación contra la base de datos.
 *
 * Este helper solo se usa en la carga inicial manual (`npm run seed:catalog`).
 * Después del seed, la fuente de verdad es SQLite vía la API, nunca el Excel.
 */
export interface CatalogEstimation {
  unidad: string;
  costoUnitario: number;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function estimateCatalogDefaults(descripcion: string): CatalogEstimation {
  const text = normalizeText(descripcion);

  if (text.includes('alquiler') || text.includes('reembolso de equip')) {
    if (text.includes('drone') || text.includes('estacion total')) {
      return { unidad: 'día', costoUnitario: 450 };
    }
    if (text.includes('nivel')) {
      return { unidad: 'día', costoUnitario: 120 };
    }
    return { unidad: 'día', costoUnitario: 280 };
  }

  if (text.includes('viatic') || text.includes('subsistencia')) {
    return { unidad: 'día', costoUnitario: 85 };
  }

  if (text.includes('movilizacion')) {
    return { unidad: 'glb', costoUnitario: 180 };
  }

  if (
    text.includes(' x ha') ||
    text.includes(' xha') ||
    text.includes('por ha') ||
    text.includes('hectarea')
  ) {
    return { unidad: 'ha', costoUnitario: 420 };
  }

  if (
    text.includes(' x m2') ||
    text.includes(' x m²') ||
    text.includes('por m2') ||
    text.includes('por m²') ||
    text.includes('/m2')
  ) {
    return { unidad: 'm²', costoUnitario: 1.25 };
  }

  if (text.includes('vuelo') || text.includes('aerofotogram') || text.includes('lidar')) {
    return { unidad: 'ha', costoUnitario: 35 };
  }

  if (text.includes('replanteo')) {
    if (text.includes('vial') || text.includes('alcantarill')) {
      return { unidad: 'km', costoUnitario: 650 };
    }
    return { unidad: 'punto', costoUnitario: 45 };
  }

  if (text.includes('recorrido') && text.includes('lindero')) {
    return { unidad: 'km', costoUnitario: 380 };
  }

  if (
    text.includes('levantamiento') ||
    text.includes('topograf') ||
    text.includes('planimetr')
  ) {
    return { unidad: 'm²', costoUnitario: 0.35 };
  }

  if (text.includes('diseno') || text.includes('diseño')) {
    if (text.includes('hidro') || text.includes('alcantarill') || text.includes('agua potable')) {
      return { unidad: 'glb', costoUnitario: 1800 };
    }
    return { unidad: 'm²', costoUnitario: 8.5 };
  }

  if (
    text.includes('calculo') ||
    text.includes('cálculo') ||
    text.includes('estructural') ||
    text.includes('volumen')
  ) {
    return { unidad: 'm²', costoUnitario: 6.5 };
  }

  if (
    text.includes('ensayo') ||
    text.includes('calicata') ||
    text.includes('perforacion') ||
    text.includes('geofis') ||
    text.includes('mecanica de suelos') ||
    text.includes('geotec')
  ) {
    return { unidad: 'u', costoUnitario: 220 };
  }

  if (
    text.includes('plano') ||
    text.includes('mapa') ||
    text.includes('ortofoto') ||
    text.includes('sig') ||
    text.includes('shp') ||
    text.includes('arcgis')
  ) {
    return { unidad: 'glb', costoUnitario: 650 };
  }

  if (text.includes('informe') || text.includes('peritaje') || text.includes('consultoria')) {
    return { unidad: 'glb', costoUnitario: 900 };
  }

  if (text.includes('tramite') || text.includes('trámite') || text.includes('aprobacion')) {
    return { unidad: 'glb', costoUnitario: 350 };
  }

  if (text.includes('asesoria') || text.includes('asesoría') || text.includes('socializacion')) {
    return { unidad: 'glb', costoUnitario: 500 };
  }

  if (text.includes('monitoreo')) {
    return { unidad: 'mes', costoUnitario: 480 };
  }

  if (text.includes('colocacion') || text.includes('punto de control') || text.includes('monumentacion')) {
    return { unidad: 'punto', costoUnitario: 120 };
  }

  if (text.includes('foco') || text.includes('suministro')) {
    return { unidad: 'u', costoUnitario: 18 };
  }

  if (text.includes('impresion') || text.includes('copia')) {
    return { unidad: 'u', costoUnitario: 0.35 };
  }

  if (text.includes('visita') || text.includes('reconocimiento')) {
    return { unidad: 'visita', costoUnitario: 180 };
  }

  if (text.includes('medicion de area')) {
    return { unidad: 'm²', costoUnitario: 0.2 };
  }

  return { unidad: 'glb', costoUnitario: 400 };
}
