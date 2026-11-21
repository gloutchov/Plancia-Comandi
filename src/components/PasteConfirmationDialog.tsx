import { useLayoutEffect, useRef } from 'react'
import { translate } from '../shared/i18n'
import type { Locale } from '../shared/types'

export function PasteConfirmationDialog({ locale, sessionName, onConfirm, onCancel }: {
  locale: Locale
  sessionName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const t = (key: 'confirmPasteTitle' | 'confirmPasteBody' | 'menuPaste' | 'cancel') => translate(locale, key, { name: sessionName })

  useLayoutEffect(() => {
    cancel.current?.focus()
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) cancel.current?.focus()
    }
    document.addEventListener('focusin', keepFocus)
    return () => document.removeEventListener('focusin', keepFocus)
  }, [])

  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <div ref={dialog} className="dialog dialog-confirm dialog-paste" data-testid="paste-confirmation"
        role="alertdialog" aria-modal="true" aria-labelledby="paste-confirm-title" aria-describedby="paste-confirm-body"
        onMouseDown={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
          } else if (event.key === 'Tab') {
            if (event.shiftKey && document.activeElement === cancel.current) {
              event.preventDefault()
              confirm.current?.focus()
            } else if (!event.shiftKey && document.activeElement === confirm.current) {
              event.preventDefault()
              cancel.current?.focus()
            }
          }
        }}>
        <h2 id="paste-confirm-title">{t('confirmPasteTitle')}</h2>
        <p id="paste-confirm-body">{t('confirmPasteBody')}</p>
        <div className="dialog-actions">
          <button ref={cancel} type="button" className="btn" onClick={onCancel}>{t('cancel')}</button>
          <button ref={confirm} type="button" className="btn btn-primary" onClick={onConfirm}>{t('menuPaste')}</button>
        </div>
      </div>
    </div>
  )
}
