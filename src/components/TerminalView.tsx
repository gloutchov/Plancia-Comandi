import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { ITheme } from '@xterm/xterm'
import { appShortcut, isCopyKey, isPasteKey, type KeyLike } from '../shortcuts'

const FONT = '"JetBrains Mono", "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace'

export function TerminalView({
  sessionId,
  theme,
  fontSize,
  active,
  platform,
  onShortcut,
  onEscape,
  onActivate,
}: {
  sessionId: string
  theme: ITheme
  fontSize: number
  active: boolean
  platform: string
  onShortcut: (event: KeyLike) => void
  onEscape: () => boolean
  onActivate: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const shortcutRef = useRef(onShortcut)
  const escapeRef = useRef(onEscape)
  shortcutRef.current = onShortcut
  escapeRef.current = onEscape

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
        if (selection) void navigator.clipboard.writeText(selection)
        return false
      }
      if (isPasteKey(key, platform)) {
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (text) bridge.write(sessionId, text)
          })
          .catch(() => undefined)
        return false
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
      fit.fit()
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

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
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
    fit.fit()
    window.plancia?.resize(sessionId, term.cols, term.rows)
  }, [fontSize, sessionId])

  useEffect(() => {
    if (active) termRef.current?.focus()
  }, [active])

  return (
    <div
      ref={hostRef}
      className="term-host"
      onMouseDown={onActivate}
      onContextMenu={(event) => {
        event.preventDefault()
        const term = termRef.current
        if (!term) return
        const selection = term.getSelection()
        if (selection) {
          void navigator.clipboard.writeText(selection)
          return
        }
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (text) window.plancia?.write(sessionId, text)
          })
          .catch(() => undefined)
      }}
    />
  )
}
