import { isGenericCustomer } from './genericCustomer'

/**
 * Valida si una cédula ecuatoriana es matemáticamente válida usando el algoritmo de módulo 10.
 */
export function validateEcuadorianCedula(cedula: string): boolean {
  if (isGenericCustomer(cedula)) return true
  if (!/^\d{10}$/.test(cedula)) return false

  const province = parseInt(cedula.substring(0, 2), 10)
  if ((province < 1 || province > 24) && province !== 30) return false

  const thirdDigit = parseInt(cedula.charAt(2), 10)
  if (thirdDigit >= 6) return false

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let sum = 0

  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula.charAt(i), 10) * coefficients[i]
    if (val >= 10) {
      val -= 9
    }
    sum += val
  }

  const checkDigit = parseInt(cedula.charAt(9), 10)
  const calculatedCheckDigit = (10 - (sum % 10)) % 10

  return checkDigit === calculatedCheckDigit
}

/**
 * Valida si un RUC ecuatoriano es matemáticamente válido según el tipo de persona.
 */
export function validateEcuadorianRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false

  const province = parseInt(ruc.substring(0, 2), 10)
  if ((province < 1 || province > 24) && province !== 30) return false

  const thirdDigit = parseInt(ruc.charAt(2), 10)

  if (thirdDigit < 6) {
    // Persona natural: Primeros 10 dígitos son una cédula válida, últimos 3 dígitos no pueden ser 000
    const cedula = ruc.substring(0, 10)
    if (!validateEcuadorianCedula(cedula)) return false

    const establishment = ruc.substring(10, 13)
    if (establishment === '000') return false

    return true
  } else if (thirdDigit === 9) {
    // Persona jurídica privada / Extranjeros sin cédula:
    // Coeficientes: 4, 3, 2, 7, 6, 5, 4, 3, 2
    // Dígito verificador: posición 10, últimos 3 dígitos no pueden ser 000
    const coefficients = [4, 3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(ruc.charAt(i), 10) * coefficients[i]
    }
    const remainder = sum % 11
    let calculatedCheckDigit = remainder === 0 ? 0 : 11 - remainder
    if (calculatedCheckDigit === 10) {
      calculatedCheckDigit = 0
    }
    const checkDigit = parseInt(ruc.charAt(9), 10)
    if (checkDigit !== calculatedCheckDigit) return false

    const establishment = ruc.substring(10, 13)
    if (establishment === '000') return false

    return true
  } else if (thirdDigit === 6) {
    // Entidades públicas:
    // Coeficientes: 3, 2, 7, 6, 5, 4, 3, 2
    // Dígito verificador: posición 9, posición 10 debe ser 0, últimos 4 dígitos no pueden ser 0000
    const coefficients = [3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 8; i++) {
      sum += parseInt(ruc.charAt(i), 10) * coefficients[i]
    }
    const remainder = sum % 11
    let calculatedCheckDigit = remainder === 0 ? 0 : 11 - remainder
    if (calculatedCheckDigit === 10) {
      calculatedCheckDigit = 0
    }
    const checkDigit = parseInt(ruc.charAt(8), 10)
    if (checkDigit !== calculatedCheckDigit) return false

    const tenthDigit = parseInt(ruc.charAt(9), 10)
    if (tenthDigit !== 0) return false

    const establishment = ruc.substring(9, 13)
    if (establishment === '0000') return false

    return true
  }

  return false
}

/**
 * Validador unificado para Cédula o RUC ecuatoriano.
 */
export function validateEcuadorianId(id: string): boolean {
  const trimmed = id.trim()
  if (isGenericCustomer(trimmed)) return true

  if (trimmed.length === 10) {
    return validateEcuadorianCedula(trimmed)
  } else if (trimmed.length === 13) {
    return validateEcuadorianRuc(trimmed)
  }
  return false
}
