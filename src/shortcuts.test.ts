import { describe, expect, it } from 'vitest'
import { appShortcut, isCopyKey, isPasteKey, isPlainCtrlC, plainCtrlCAction } from './shortcuts'

const key = (values: Partial<{ key: string; meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }>) => ({
  key: values.key ?? 'c',
  metaKey: values.meta ?? false,
  ctrlKey: values.ctrl ?? false,
  shiftKey: values.shift ?? false,
  altKey: values.alt ?? false,
})

describe('plain Ctrl+C', () => {
  it('copies on Windows and Linux only when text is selected', () => {
    expect(isPlainCtrlC(key({ ctrl: true }))).toBe(true)
    expect(isPlainCtrlC(key({ ctrl: true, shift: true }))).toBe(false)
    expect(plainCtrlCAction('win32', true)).toBe('copy')
    expect(plainCtrlCAction('linux', true)).toBe('copy')
    expect(plainCtrlCAction('win32', false)).toBe('interrupt')
    expect(plainCtrlCAction('linux', false)).toBe('interrupt')
  })

  it('always interrupts on macOS, where copy is Command+C', () => {
    expect(plainCtrlCAction('darwin', true)).toBe('interrupt')
    expect(plainCtrlCAction('darwin', false)).toBe('interrupt')
    expect(isCopyKey(key({ meta: true }), 'darwin')).toBe(true)
    expect(isCopyKey(key({ ctrl: true }), 'darwin')).toBe(false)
    expect(isPasteKey(key({ key: 'v', meta: true }), 'darwin')).toBe(true)
  })

  it('keeps Ctrl+Shift+C and Ctrl+Shift+V as the Windows and Linux shortcuts', () => {
    expect(isCopyKey(key({ ctrl: true, shift: true }), 'win32')).toBe(true)
    expect(isCopyKey(key({ ctrl: true }), 'linux')).toBe(false)
    expect(isPasteKey(key({ key: 'v', ctrl: true, shift: true }), 'linux')).toBe(true)
    expect(isPasteKey(key({ key: 'v', ctrl: true }), 'win32')).toBe(false)
  })
})

describe('appShortcut', () => {
  it('recognizes the session shortcuts and ignores copy', () => {
    expect(appShortcut(key({ key: 't', meta: true }), 'darwin')).toBe('new')
    expect(appShortcut(key({ key: 'd', ctrl: true, shift: true }), 'linux')).toBe('split')
    expect(appShortcut(key({ key: 'c', ctrl: true, shift: true }), 'win32')).toBeNull()
  })
})
