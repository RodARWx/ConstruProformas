import { useApp } from '../../context/AppContext'
import { notify } from '../../lib/toast'
import { cn } from '../../lib/cn'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const { revokeAccess } = useApp()

  function handleLogout() {
    revokeAccess()
    notify.info('Sesión cerrada', 'Ingrese su PIN para volver a acceder.')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-brand-gray/25 bg-white px-2.5 py-1 text-xs font-medium text-brand-gray hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        className,
      )}
      title="Cerrar sesión y proteger el acceso"
    >
      <span className="text-xs leading-none">🔒</span>
      <span>Cerrar sesión</span>
    </button>
  )
}
