import { describe, expect, it } from 'vitest'
import {
  DEV_SERVER_ORIGIN,
  contentSecurityPolicyForRenderer,
  contentSecurityPolicyForUrl,
  contentSecurityPolicyMeta,
  developmentContentSecurityPolicy,
  productionContentSecurityPolicy,
  withContentSecurityPolicy,
} from './csp'

function directives(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean)
    const name = tokens.shift()
    if (!name) continue
    map.set(name, tokens)
  }
  return map
}

function sources(policy: string): string[] {
  return [...directives(policy).values()].flat()
}

describe('production Content-Security-Policy', () => {
  const policy = productionContentSecurityPolicy()
  const rules = directives(policy)

  it('keeps scripts on self, without eval or inline scripts', () => {
    expect(rules.get('default-src')).toEqual(["'none'"])
    expect(rules.get('script-src')).toEqual(["'self'"])
    expect(rules.get('script-src-attr')).toEqual(["'none'"])
    expect(policy).not.toContain('unsafe-eval')
    expect(rules.get('script-src')).not.toContain("'unsafe-inline'")
  })

  it('allows inline styles only where xterm writes the theme', () => {
    expect(rules.get('style-src')).toEqual(["'self'"])
    expect(rules.get('style-src-elem')).toEqual(["'self'", "'unsafe-inline'"])
    expect(rules.get('style-src-attr')).toEqual(["'unsafe-inline'"])
  })

  it('has no remote or wildcard source', () => {
    expect(rules.get('connect-src')).toEqual(["'none'"])
    expect(rules.get('frame-ancestors')).toEqual(["'none'"])
    expect(rules.get('img-src')).toEqual(["'self'"])
    expect(contentSecurityPolicyMeta(policy)).not.toContain('frame-ancestors')
    expect(sources(policy).some((source) => source.includes('*'))).toBe(false)
    expect(policy).not.toMatch(/https?:|wss?:|\/\//)
  })
})

describe('development Content-Security-Policy', () => {
  const policy = developmentContentSecurityPolicy(DEV_SERVER_ORIGIN)
  if (!policy) throw new Error('loopback dev policy was refused')
  const rules = directives(policy)

  it('allows the React refresh preamble and not eval', () => {
    expect(rules.get('script-src')).toEqual(["'self'", "'unsafe-inline'"])
    expect(rules.get('script-src-attr')).toEqual(["'none'"])
    expect(policy).not.toContain('unsafe-eval')
  })

  it('talks only to the loopback dev server', () => {
    expect(rules.get('connect-src')).toEqual(["'self'", DEV_SERVER_ORIGIN, 'ws://127.0.0.1:47231'])
    expect(rules.get('frame-ancestors')).toEqual(["'none'"])
    expect(contentSecurityPolicyMeta(policy)).not.toContain('frame-ancestors')
    expect(policy).not.toMatch(/https:|wss:|\*/)
  })

  it('refuses a remote dev server instead of loosening the policy', () => {
    expect(developmentContentSecurityPolicy('https://cdn.example')).toBeNull()
    expect(developmentContentSecurityPolicy('http://192.168.1.20:47231')).toBeNull()
    expect(contentSecurityPolicyForRenderer('https://cdn.example')).toBe(productionContentSecurityPolicy())
    expect(contentSecurityPolicyForRenderer(undefined)).toBe(productionContentSecurityPolicy())
    expect(contentSecurityPolicyForRenderer('http://localhost:47231/')).toContain('http://localhost:47231')
  })
})

describe('response policy', () => {
  it('uses the dev policy only for that loopback origin and production for file', () => {
    const dev = DEV_SERVER_ORIGIN + '/'
    expect(contentSecurityPolicyForUrl('http://127.0.0.1:47231/src/main.tsx', dev)).toContain('unsafe-inline')
    expect(contentSecurityPolicyForUrl('http://127.0.0.1:47231.evil/', dev)).toBeNull()
    expect(contentSecurityPolicyForUrl('https://example.test/', dev)).toBeNull()
    expect(contentSecurityPolicyForUrl('devtools://devtools/bundled/devtools_app.html', dev)).toBeNull()
    expect(contentSecurityPolicyForUrl('file:///app/dist/index.html', dev)).toBe(productionContentSecurityPolicy())
    expect(contentSecurityPolicyForUrl('file:///app/dist/index.html', undefined)).toBe(productionContentSecurityPolicy())
  })

  it('replaces an existing CSP header without keeping a second policy', () => {
    const headers = withContentSecurityPolicy(
      { 'content-security-policy': ["default-src *"], 'X-Other': ['1'] },
      productionContentSecurityPolicy(),
    )
    expect(headers['X-Other']).toEqual(['1'])
    expect(headers['Content-Security-Policy']).toEqual([productionContentSecurityPolicy()])
    expect(headers['content-security-policy']).toBeUndefined()
  })
})
