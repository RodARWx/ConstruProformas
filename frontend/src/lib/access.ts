import { getAccessPin as readAccessPinFromEnv } from './runtimeEnv'

export const ACCESS_SESSION_KEY = 'construproformas_access_granted'

/** PIN de acceso definido en VITE_ACCESS_PIN (barrera solo del lado del cliente). */
export function getAccessPin(): string {
  return readAccessPinFromEnv()
}

export function isAccessPinConfigured(): boolean {
  return getAccessPin().length > 0
}

export function validateAccessPin(input: string): boolean {
  const expected = getAccessPin()
  if (!expected) return false
  return input.trim() === expected
}

export function readAccessSession(): boolean {
  return sessionStorage.getItem(ACCESS_SESSION_KEY) === 'true'
}

export function writeAccessSession(granted: boolean): void {
  if (granted) {
    sessionStorage.setItem(ACCESS_SESSION_KEY, 'true')
  } else {
    sessionStorage.removeItem(ACCESS_SESSION_KEY)
  }
}
