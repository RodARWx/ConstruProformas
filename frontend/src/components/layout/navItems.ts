export type NavIconName =
  | 'plus'
  | 'history'
  | 'trash'
  | 'catalog'
  | 'categories'
  | 'customers'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: NavIconName
  end?: boolean
}

export const mainNavItems: NavItem[] = [
  {
    to: '/proformas/nueva',
    label: 'Nueva proforma',
    shortLabel: 'Nueva',
    icon: 'plus',
  },
  {
    to: '/proformas',
    label: 'Historial de proformas',
    shortLabel: 'Historial',
    icon: 'history',
    end: true,
  },
  {
    to: '/proformas/papelera',
    label: 'Papelera',
    shortLabel: 'Papelera',
    icon: 'trash',
  },
  {
    to: '/catalogo',
    label: 'Catálogo de rubros',
    shortLabel: 'Catálogo',
    icon: 'catalog',
  },
  {
    to: '/categorias',
    label: 'Categorías',
    shortLabel: 'Categorías',
    icon: 'categories',
  },
  {
    to: '/clientes',
    label: 'Clientes',
    shortLabel: 'Clientes',
    icon: 'customers',
  },
]
