import type { LayoutMode } from '../shared/types'

export function LayoutIcon({ mode }: { mode: LayoutMode }) {
  if (mode === 'single') {
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <rect x="3.5" y="3.5" width="11" height="11" rx="1.6" />
      </svg>
    )
  }
  if (mode === 'split') {
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <rect x="2" y="3.5" width="6" height="11" rx="1.3" />
        <rect x="10" y="3.5" width="6" height="11" rx="1.3" />
      </svg>
    )
  }
  if (mode === 'stack') {
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <rect x="3.5" y="2" width="11" height="6" rx="1.3" />
        <rect x="3.5" y="10" width="11" height="6" rx="1.3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.2" />
      <rect x="10" y="2" width="6" height="6" rx="1.2" />
      <rect x="2" y="10" width="6" height="6" rx="1.2" />
      <rect x="10" y="10" width="6" height="6" rx="1.2" />
    </svg>
  )
}

export function LayoutSwitcher({
  layout,
  labels,
  disabledReasons,
  groupLabel,
  onSelect,
}: {
  layout: LayoutMode
  labels: Record<LayoutMode, string>
  disabledReasons: Partial<Record<LayoutMode, string>>
  groupLabel: string
  onSelect: (mode: LayoutMode) => void
}) {
  const modes: LayoutMode[] = ['single', 'split', 'stack', 'grid']
  return (
    <div className="segmented" role="radiogroup" aria-label={groupLabel}>
      {modes.map((mode) => {
        const reason = disabledReasons[mode]
        const disabled = Boolean(reason)
        const name = labels[mode]
        const tip = reason ? `${name}. ${reason}` : name
        return (
          <span key={mode} className="layout-choice" title={tip}>
            <button
              type="button"
              role="radio"
              aria-checked={layout === mode}
              aria-label={tip}
              data-testid={`layout-${mode}`}
              className={layout === mode ? 'is-on' : ''}
              disabled={disabled}
              onClick={() => onSelect(mode)}
            >
              <LayoutIcon mode={mode} />
            </button>
          </span>
        )
      })}
    </div>
  )
}
