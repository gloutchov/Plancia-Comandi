import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { headerSha256, integrityFromEntries } from './asar-integrity-resource.mjs'

describe('Windows ASAR integrity resource', () => {
  const header = '{"files":{"index.js":{"size":1,"offset":"0"}}}'
  const hash = createHash('sha256').update(header).digest('hex')

  it('hashes the raw ASAR header string with SHA-256', () => {
    expect(headerSha256(header)).toBe(hash)
  })

  it('matches resources/app.asar and reports a missing resource', () => {
    const bin = Buffer.from(JSON.stringify([{ file: 'resources\\app.asar', alg: 'SHA256', value: hash.toUpperCase() }]))
    const found = integrityFromEntries([{ type: 'INTEGRITY', id: 'ELECTRONASAR', bin }], header)
    expect(found.present).toBe(true)
    expect(found.declared).toBe(hash)
    expect(found.computed).toBe(hash)
    expect(found.matches).toBe(true)
    expect(found.content).toEqual([{ file: 'resources\\app.asar', alg: 'SHA256', value: hash.toUpperCase() }])

    const slash = integrityFromEntries([{
      type: 'Integrity',
      id: 'ElectronAsar',
      bin: Buffer.from(JSON.stringify([{ file: 'resources/app.asar', alg: 'SHA256', value: 'nope' }])),
    }], header)
    expect(slash.matches).toBe(false)
    expect(slash.declared).toBe('nope')

    const missing = integrityFromEntries([{ type: 'VERSION', id: 1, bin: Buffer.from('x') }], header)
    expect(missing.present).toBe(false)
    expect(missing.computed).toBe(hash)
    expect(missing.matches).toBe(false)
  })
})
