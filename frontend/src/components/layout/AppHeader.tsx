import { BrandLogo } from './BrandLogo'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'
import { RoleBadge } from './RoleBadge'

export function AppHeader() {
  return (
    <header className="border-b border-brand-gray/15 bg-white">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo />
          <p className="text-sm font-semibold text-brand-wine sm:text-base">
            Construproformas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ConnectionStatusBadge />
          <RoleBadge className="hidden shrink-0 sm:inline-flex" />
        </div>
      </div>
    </header>
  )
}
