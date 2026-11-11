import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('P0 Pizzetta repository boundary', () => {
  it('uses the Pizzetta entrypoint and database configuration', () => {
    const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
    expect(wrangler).toContain('name = "pizzetta-kiosk-os"')
    expect(wrangler).toContain('main = "apps/worker/src/pizzetta-index-v3.ts"')
    expect(wrangler).toContain('database_name = "pizzetta-kiosk-os"')
    expect(wrangler).not.toMatch(/boutique|rooms-os|BR-OS/i)
  })

  it('keeps the active frontend free of the archived UI dependency', () => {
    const main = readFileSync(resolve(root, 'apps/web/src/main.tsx'), 'utf8')
    const app = readFileSync(resolve(root, 'apps/web/src/App.tsx'), 'utf8')
    expect(main).not.toMatch(/UI\/src|br-os|boutique/i)
    expect(app).toContain('PizzettaWorldApp')
    expect(app).toContain('StaffAccess')
  })

  it('archives legacy material outside the active application graph', () => {
    expect(existsSync(resolve(root, 'legacy-reference/archive'))).toBe(true)
    expect(existsSync(resolve(root, 'legacy-reference/archive/UI'))).toBe(true)
    expect(existsSync(resolve(root, 'legacy-reference/archive/tests'))).toBe(true)
  })
})
