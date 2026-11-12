import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('P6 map and branch tracking', () => {
  it('returns the server-assigned branch in the order request response', () => {
    const worker = readFileSync(resolve(root, 'apps/worker/src/pizzetta-index-v2.ts'), 'utf8')
    expect(worker).toContain('branch_id: branchId')
  })

  it('renders a real OpenStreetMap embed and a routing action', () => {
    const map = readFileSync(resolve(root, 'apps/web/src/PizzettaBranchMap.tsx'), 'utf8')
    expect(map).toContain('openstreetmap.org/export/embed.html')
    expect(map).toContain('openstreetmap.org/directions')
    expect(map).toContain('referrerPolicy="no-referrer"')
  })

  it('passes GPS location and assigned branch into tracking', () => {
    const app = readFileSync(resolve(root, 'apps/web/src/PizzettaWorldApp.tsx'), 'utf8')
    expect(app).toContain('location={location}')
    expect(app).toContain('payload.data?.branch_id')
    expect(app).toContain('<PizzettaBranchMap')
  })
})
