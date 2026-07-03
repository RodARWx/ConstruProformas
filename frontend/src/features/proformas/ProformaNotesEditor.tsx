import { useEffect, useId, useState } from 'react'
import { Button, Input } from '../../components/ui'
import { getApiErrorMessage } from '../../lib/api'
import { fetchNotasSuggestions } from './proformasApi'

interface ProformaNotesEditorProps {
  lines: string[]
  disabled?: boolean
  onChange: (lines: string[]) => void
}

export function ProformaNotesEditor({
  lines,
  disabled = false,
  onChange,
}: ProformaNotesEditorProps) {
  const listId = useId()
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadSuggestions() {
      try {
        const data = await fetchNotasSuggestions()
        if (!cancelled) setSuggestions(data)
      } catch (error) {
        if (!cancelled) {
          console.warn('No se pudieron cargar sugerencias de notas', getApiErrorMessage(error))
        }
      }
    }

    void loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [])

  function updateLine(index: number, value: string) {
    const next = [...lines]
    next[index] = value
    onChange(next)
  }

  function addLine() {
    onChange([...lines, ''])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) {
      onChange([''])
      return
    }
    onChange(lines.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className="space-y-3">
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>

      {lines.map((line, index) => (
        <div key={`note-${index}`} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={index === 0 ? 'Notas adicionales' : ' '}
              placeholder="Ej. Validez de la oferta 15 días"
              value={line}
              list={listId}
              onChange={(event) => updateLine(index, event.target.value)}
              disabled={disabled}
              hint={
                index === 0
                  ? 'Cada línea se exporta con viñeta. Se sugieren notas usadas antes.'
                  : undefined
              }
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeLine(index)}
              aria-label={`Quitar nota ${index + 1}`}
            >
              Quitar
            </Button>
          )}
        </div>
      ))}

      {!disabled && (
        <Button type="button" variant="secondary" onClick={addLine}>
          Agregar nota
        </Button>
      )}
    </div>
  )
}
