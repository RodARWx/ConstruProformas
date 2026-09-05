import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-pastel'
  | 'export-pdf'
  | 'export-excel'
  | 'restore'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-coral text-white hover:bg-brand-coral/90 focus-visible:ring-brand-coral',
  secondary:
    'border border-brand-gray/25 bg-white text-brand-gray hover:bg-brand-gray/5 focus-visible:ring-brand-gray',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  'danger-pastel':
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 focus-visible:ring-rose-300',
  'export-pdf':
    'bg-rose-50/90 text-rose-800 border border-rose-200 hover:bg-rose-100 focus-visible:ring-rose-300 shadow-xs',
  'export-excel':
    'bg-emerald-50/90 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-300 shadow-xs',
  restore:
    'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-600 shadow-xs',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-left text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth && 'w-full',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
