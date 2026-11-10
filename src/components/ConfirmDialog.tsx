export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="dialog dialog-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
