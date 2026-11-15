import { describe, expect, it } from 'vitest'
import { smokeFailureMetadata } from './smoke-report.mjs'

describe('public smoke failure metadata', () => {
  it('retains the failing request and at most 32 request identifiers', () => {
    const requests = Array.from({ length: 70 }, (_, id) => ({ id, method: 'Runtime.evaluate', stage: 'native PTY 1 create', status: id === 69 ? 'timeout' : 'resolved' }))
    const report = smokeFailureMetadata('native PTY 1 create', requests)
    expect(report.requests).toHaveLength(32)
    expect(report.requests[0].id).toBe(38)
    expect(report.requests.at(-1)).toEqual({ id: 69, method: 'Runtime.evaluate', stage: 'native PTY 1 create', status: 'timeout' })
  })

  it('exports no payload, expression, exception or arbitrary metadata value', () => {
    const secret = '/synthetic/private TOKEN=SYNTHETIC_SECRET'
    const report = smokeFailureMetadata(secret, [{ id: secret, method: secret, stage: secret, status: secret,
      expression: secret, params: { password: secret }, get error() { throw new Error('must not read raw error') },
    }])
    expect(report).toEqual({ stage: 'unknown', requests: [{ id: null, method: 'unknown', stage: 'unknown', status: 'unknown' }] })
    expect(JSON.stringify(report)).not.toContain('SYNTHETIC_SECRET')
  })
})
