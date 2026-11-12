import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('P5 realtime transport', () => {
  it('declares the Pizzetta Durable Object binding and migration', () => {
    const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
    expect(wrangler).toContain('name = "PIZZETTA_REALTIME"')
    expect(wrangler).toContain('class_name = "PizzettaRealtime"')
    expect(wrangler).toContain('tag = "realtime-v1"')
  })

  it('authenticates staff branch sockets and customer sockets with the HttpOnly order cookie', () => {
    const worker = readFileSync(resolve(root, 'apps/worker/src/pizzetta-index-v3.ts'), 'utf8')
    expect(worker).toContain("session.branch_id !== key")
    expect(worker).toContain('pz_request_token')
    expect(worker).toContain("Order access denied")
    expect(worker).toContain('publishMutation')
  })

  it('keeps a reconnecting WebSocket client and leaves polling fallback available', () => {
    const client = readFileSync(resolve(root, 'apps/web/src/pizzetta-realtime.ts'), 'utf8')
    const staff = readFileSync(resolve(root, 'apps/web/src/StaffConsole.tsx'), 'utf8')
    expect(client).toContain('Math.min(15000, delay * 2)')
    expect(client).toContain("send('ping')")
    expect(staff).toContain('setInterval(() => void refresh(), 10000)')
  })
})
