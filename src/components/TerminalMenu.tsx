import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function TerminalMenu({
  x,
  y,
  canCopy,
  copyLabel,
  pasteLabel,
  onCopy,
  onPaste,
  onClose,
}: {
  x: number
  y: number
  canCopy: boolean
  copyLabel: string
  pasteLabel: string
  onCopy: () => void
  onPaste: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const rect = menu.getBoundingClientRect()
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    const first = menu.querySelector<HTMLButtonElement>('button:not(:disabled)')
    first?.focus()
  }, [x, y])

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeRef.current()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        const next = buttons[(current + step + buttons.length) % buttons.length]
        next?.focus()
      }
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div ref={ref} className="term-menu" role="menu" style={{ left: x, top: y }}>
      <button type="button" role="menuitem" disabled={!canCopy} onClick={onCopy}>
        {copyLabel}
      </button>
      <button type="button" role="menuitem" onClick={onPaste}>
        {pasteLabel}
      </button>
    </div>,
    document.body,
  )
}
