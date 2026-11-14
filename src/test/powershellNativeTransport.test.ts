import { describe, expect, it } from 'vitest'
import { decodeNativeReport, encodeNativeCases } from './powershellNativeTransport'

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64')
const wireReport = (captured: unknown) => JSON.stringify({
  version: '5.1.0', edition: 'Desktop',
  results: [{ name: encode('Unicode case'), reference: encode("'O’’Brien 😀'"), captured }],
})

describe('native PowerShell transport', () => {
  it('keeps fixture tabs, newlines, quotes and Unicode inside individual fields', () => {
    const values = ['O’Brien\t😀\n', '']
    const encoded = encodeNativeCases([{ name: 'case', code: "'code' ", values }])
    expect(encoded.split('\n')).toHaveLength(2)
    const rawFields = encoded.slice(0, -1).split('\t')
    expect(rawFields).toHaveLength(4)
    expect(rawFields.map(v => Buffer.from(v, 'base64').toString('utf8'))).toEqual(['case', "'code' ", ...values])
    expect(rawFields.every(v => /^[A-Za-z0-9+/=]*$/.test(v))).toBe(true)
  })

  it('preserves original output strings, including an empty argument', () => {
    const result = decodeNativeReport(wireReport([{ count: 2, values: [encode('\uFEFFO’Brien 😀'), ''] }]))
    expect(result.results[0]).toEqual({ name: 'Unicode case', reference: "'O’’Brien 😀'", captured: [{ count: 2, values: ['\uFEFFO’Brien 😀', ''] }] })
  })

  it('rejects extra non-argument output instead of normalizing it away', () => {
    expect(() => decodeNativeReport(wireReport([{ unexpectedOutput: true }]))).toThrow('Unexpected native output')
    expect(() => decodeNativeReport(wireReport([{ count: 2, values: [encode('one')] }]))).toThrow('argument count')
  })

  it('rejects malformed base64 and invalid UTF-8 in reported values', () => {
    expect(() => decodeNativeReport(wireReport([{ count: 1, values: ['%%%'] }]))).toThrow('base64')
    expect(() => decodeNativeReport(wireReport([{ count: 1, values: ['/w=='] }]))).toThrow()
  })
})
