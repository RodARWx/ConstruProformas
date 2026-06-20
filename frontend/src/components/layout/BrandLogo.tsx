import { cn } from '../../lib/cn'

interface BrandLogoProps {
  className?: string
}

/** Imagotipo oficial Construmétrica (positivo gris). */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/images/imagotipo-positivo-gris.png"
      alt=""
      aria-hidden="true"
      className={cn('h-10 w-auto shrink-0', className)}
    />
  )
}
