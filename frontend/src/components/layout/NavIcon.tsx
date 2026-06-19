import type { NavIconName } from './navItems'

interface NavIconProps {
  name: NavIconName
  className?: string
}

export function NavIcon({ name, className }: NavIconProps) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  switch (name) {
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'catalog':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h10" />
          <path d="M18 17h2" />
        </svg>
      )
    case 'categories':
      return (
        <svg {...common}>
          <path d="M4 6h7v7H4zM13 6h7v7h-7zM4 15h7v7H4zM13 15h7v7h-7z" />
        </svg>
      )
    case 'customers':
      return (
        <svg {...common}>
          <path d="M16 11a4 4 0 1 0-8 0" />
          <path d="M4 20a8 8 0 0 1 16 0" />
          <path d="M12 12a3 3 0 1 0-6 0" />
          <path d="M4 14a6 6 0 0 1 6-3" />
        </svg>
      )
  }
}
