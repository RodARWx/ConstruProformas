import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import { getApiErrorMessage } from '../../lib/api'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { CatalogItem, RubroLineInsert } from '../../types/catalog'
import { catalogItemToLineInsert } from '../../types/catalog'
import { searchCatalogItems } from './catalogApi'

const MIN_QUERY_LENGTH = 1
const DEFAULT_LIMIT = 10

export interface RubroAutocompleteProps {
  label?: string
  placeholder?: string
  limit?: number
  disabled?: boolean
  /** Se invoca al seleccionar un rubro, con datos listos para una línea de proforma. */
  onSelect: (line: RubroLineInsert, item: CatalogItem) => void
  className?: string
}

export function RubroAutocomplete({
  label = 'Buscar rubro',
  placeholder = 'Buscar por código o descripción…',
  limit = DEFAULT_LIMIT,
  disabled = false,
  onSelect,
  className,
}: RubroAutocompleteProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [activeIndex, setActiveIndex] = useState(-1)

  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  const closeList = useCallback(() => {
    setIsOpen(false)
    setActiveIndex(-1)
  }, [])

  const handleSelect = useCallback(
    (item: CatalogItem) => {
      onSelect(catalogItemToLineInsert(item), item)
      setQuery('')
      setResults([])
      closeList()
      inputRef.current?.focus()
    },
    [closeList, onSelect],
  )

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([])
      setIsLoading(false)
      setError(undefined)
      setIsOpen(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(undefined)

    searchCatalogItems(debouncedQuery, limit, controller.signal)
      .then((items) => {
        setResults(items)
        setIsOpen(true)
        setActiveIndex(items.length > 0 ? 0 : -1)
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return
        setResults([])
        setIsOpen(false)
        setError(getApiErrorMessage(fetchError))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [debouncedQuery, limit])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeList()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [closeList])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (event.key === 'Escape') closeList()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        current <= 0 ? results.length - 1 : current - 1,
      )
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelect(results[activeIndex])
    } else if (event.key === 'Escape') {
      closeList()
    }
  }

  const showHint = false
  const showEmpty =
    isOpen &&
    !isLoading &&
    !error &&
    debouncedQuery.length >= MIN_QUERY_LENGTH &&
    results.length === 0

  return (
    <div ref={containerRef} className={cn('relative text-left', className)}>
      <label
        htmlFor={listboxId}
        className="mb-1.5 block text-sm font-semibold text-brand-gray"
      >
        {label}
      </label>

      <input
        ref={inputRef}
        id={listboxId}
        type="search"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${listboxId}-listbox`}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value)
          setError(undefined)
          if (event.target.value.trim().length >= MIN_QUERY_LENGTH) {
            setIsOpen(true)
          }
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full rounded-md border border-brand-gray/20 bg-white px-3 py-2.5 text-left text-sm text-brand-gray placeholder:text-brand-gray/45',
          'focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/30 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-brand-gray/5 disabled:opacity-60',
          error && 'border-brand-red focus:border-brand-red focus:ring-brand-red/30',
        )}
      />

      {showHint && (
        <p className="mt-1.5 text-xs text-brand-gray/70">
          Escriba al menos {MIN_QUERY_LENGTH} caracteres para buscar.
        </p>
      )}

      {isLoading && debouncedQuery.length >= MIN_QUERY_LENGTH && (
        <p className="mt-1.5 text-xs text-brand-gray/70">Buscando rubros…</p>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-brand-red" role="alert">
          {error}
        </p>
      )}

      {isOpen && results.length > 0 && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-brand-gray/15 bg-white py-1 shadow-lg"
        >
          {results.map((item, index) => (
            <li key={item.id} role="presentation">
              <button
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full px-3 py-2.5 text-left transition-colors',
                  index === activeIndex
                    ? 'bg-brand-coral/10'
                    : 'hover:bg-brand-gray/5',
                )}
              >
                <span className="block text-sm font-semibold text-brand-gray">
                  {item.descripcion}
                </span>
                <span className="mt-0.5 block text-xs text-brand-gray/70">
                  {item.codigoSugerido ? `${item.codigoSugerido} · ` : ''}
                  Unidad: {item.unidad} · Costo unit.:{' '}
                  {formatCurrency(item.costoUnitario)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-brand-gray/15 bg-white px-3 py-2.5 text-left text-sm text-brand-gray/70 shadow-lg">
          No se encontraron rubros para &quot;{debouncedQuery}&quot;.
        </div>
      )}
    </div>
  )
}
