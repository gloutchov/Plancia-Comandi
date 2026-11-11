import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { ITheme } from '@xterm/xterm'
import type { RuntimeLimits } from '../shared/appConfig'
import { appShortcut, isCopyKey, isPasteKey, isPlainCtrlC, plainCtrlCAction, type KeyLike } from '../shortcuts'
import { TerminalMenu } from './TerminalMenu'
import { dropIntoTerminal, pasteIntoTerminal, registerTerminalEdit, writeClipboardText } from '../terminalEdit'

const FONT = '"JetBrains Mono", "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace'

export function TerminalView({
  sessionId,
  shellId,
  theme,
  fontSize,
  active,
  platform,
  limits,
  fitToken,
  copyLabel,
  pasteLabel,
  onShortcut,
  onEscape,
  onActivate,
}: {
  sessionId: string
  shellId: string
  theme: ITheme
  fontSize: number
  active: boolean
  platform: string
  limits: RuntimeLimits
  fitToken: string
  copyLabel: string
  pasteLabel: string
  onShortcut: (event: KeyLike) => void
  onEscape: () => boolean
  onActivate: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const shortcutRef = useRef(onShortcut)
  const escapeRef = useRef(onEscape)
  const shellRef = useRef(shellId)
  const limitsRef = useRef(limits)
  const [menu, setMenu] = useState<{ x: number; y: number; selection: string } | null>(null)
  shortcutRef.current = onShortcut
  escapeRef.current = onEscape
  shellRef.current = shellId
  limitsRef.current = limits

  useEffect(() => {
    const host = hostRef.current
    const bridge = window.plancia
    if (!host || !bridge) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontFamily: FONT,
      fontSize,
      lineHeight: 1.2,
      theme,
      scrollback: 8000,
      drawBoldTextInBrightColors: true,
      rightClickSelectsWord: false,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(
      new WebLinksAddon((event, uri) => {
        event.preventDefault()
        window.plancia?.openExternal(uri)
      }),
    )
    term.open(host)
    termRef.current = term
    fitRef.current = fit

    let disposed = false
    let ready = false
    let seq = 0
    const queue: Array<{ seq: number; data: string }> = []

    const writeLive = (chunkSeq: number, data: string) => {
      if (chunkSeq <= seq) return
      seq = chunkSeq
      term.write(data)
    }

    const unsubscribe = bridge.onData((chunk) => {
      if (chunk.id !== sessionId) return
      if (!ready) {
        queue.push(chunk)
        return
      }
      writeLive(chunk.seq, chunk.data)
    })

    term.onData((data) => bridge.write(sessionId, data))

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true
      const key: KeyLike = {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      }
      if (isCopyKey(key, platform)) {
        const selection = term.getSelection()
        if (selection) writeClipboardText(selection)
        return false
      }
      if (isPasteKey(key, platform)) {
        // One shortcut is one Edit-menu command. Swallow the key here so the
        // terminal does not insert it and does not paste it a second time.
        return false
      }
      if (isPlainCtrlC(key)) {
        const action = plainCtrlCAction(platform, term.hasSelection())
        if (action === 'copy') {
          writeClipboardText(term.getSelection())
          term.clearSelection()
          return false
        }
        return true
      }
      if (event.key === 'Escape' && escapeRef.current()) return false
      if (appShortcut(key, platform)) {
        shortcutRef.current(key)
        return false
      }
      return true
    })

    const publishSize = () => {
      if (disposed) return
      if (host.clientWidth < 2 || host.clientHeight < 2) return
      try {
        fit.fit()
      } catch {
        return
      }
      bridge.resize(sessionId, term.cols, term.rows)
    }

    const observer = new ResizeObserver(() => publishSize())
    observer.observe(host)

    const frame = requestAnimationFrame(() => {
      publishSize()
      void bridge.subscribe(sessionId).then((snapshot) => {
        if (disposed) return
        seq = snapshot.seq
        ready = true
        term.write(snapshot.data, () => {
          if (disposed) return
          for (const chunk of queue) writeLive(chunk.seq, chunk.data)
          queue.length = 0
          publishSize()
          if (active) term.focus()
        })
      })
    })

    const unsubscribeEdit = registerTerminalEdit(sessionId, {
      term,
      shellId,
      hasFocus: () => {
        const activeElement = document.activeElement
        return !!activeElement && host.contains(activeElement)
      },
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
      unsubscribeEdit()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
    // The terminal is created once per session. Theme and font size update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, platform])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.theme = theme
  }, [theme])

  useEffect(() => {
    const term = termRef.current
    const fit = fitRef.current
    if (!term || !fit) return
    term.options.fontSize = fontSize
    try {
      fit.fit()
      window.plancia?.resize(sessionId, term.cols, term.rows)
    } catch {
      // Font changes can arrive before the pane has a size.
    }
  }, [fontSize, sessionId])

  useEffect(() => {
    const term = termRef.current
    const fit = fitRef.current
    if (!term || !fit) return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      try {
        fit.fit()
        window.plancia?.resize(sessionId, term.cols, term.rows)
      } catch {
        // The pane may still be hidden.
      }
      inner = requestAnimationFrame(() => {
        try {
          fit.fit()
          window.plancia?.resize(sessionId, term.cols, term.rows)
        } catch {
          // Ignore a second fit that races with disposal.
        }
      })
    })
    const onResize = () => {
      try {
        fit.fit()
        window.plancia?.resize(sessionId, term.cols, term.rows)
      } catch {
        // The window can resize while the terminal is closing.
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
      window.removeEventListener('resize', onResize)
    }
  }, [fitToken, sessionId])

  useEffect(() => {
    if (active) termRef.current?.focus()
  }, [active])

  return (
    <div
      ref={hostRef}
      className="term-host"
      onMouseDownCapture={(event) => {
        if (event.button === 2) event.stopPropagation()
      }}
      onMouseDown={(event) => {
        if (event.button === 2) {
          event.preventDefault()
          event.stopPropagation()
        }
        onActivate()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const term = termRef.current
        const transfer = event.dataTransfer
        if (!term || !transfer) return
        const paths = [...transfer.files].map((file) => window.plancia?.pathForFile(file) ?? '').filter((value) => value.length > 0)
        dropIntoTerminal(term, shellRef.current, paths, transfer.getData('text/plain') ?? '', limitsRef.current)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const term = termRef.current
        if (!term) return
        onActivate()
        setMenu({ x: event.clientX, y: event.clientY, selection: term.getSelection() })
      }}
    >
      {menu ? (
        <TerminalMenu
          x={menu.x}
          y={menu.y}
          canCopy={menu.selection.length > 0}
          copyLabel={copyLabel}
          pasteLabel={pasteLabel}
          onCopy={() => {
            writeClipboardText(menu.selection)
            setMenu(null)
            termRef.current?.focus()
          }}
          onPaste={(event) => {
            const term = termRef.current
            const gesture = `context:${event.timeStamp}`
            setMenu(null)
            if (term) void pasteIntoTerminal(term, shellRef.current, limitsRef.current, gesture)
            term?.focus()
          }}
          onClose={() => {
            setMenu(null)
            termRef.current?.focus()
          }}
        />
      ) : null}
    </div>
  )
}
