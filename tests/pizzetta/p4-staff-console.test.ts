import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('P4 staff console session boundary', () => {
  it('loads staff identity from the server session', () => {
    const access = readFileSync(resolve(root, 'apps/web/src/StaffAccess.tsx'), 'utf8')
    const consoleSource = readFileSync(resolve(root, 'apps/web/src/StaffConsole.tsx'), 'utf8')
    expect(access).toContain('/api/auth/session')
    expect(consoleSource).toContain('session.branch_id')
    expect(consoleSource).toContain('session.role')
  })

  it('does not send spoofable staff identity headers or expose a branch picker', () => {
    const consoleSource = readFileSync(resolve(root, 'apps/web/src/StaffConsole.tsx'), 'utf8')
    expect(consoleSource).not.toContain('x-pizzetta-staff-role')
    expect(consoleSource).not.toContain('x-pizzetta-staff-id')
    expect(consoleSource).not.toContain('x-pizzetta-branch-id')
    expect(consoleSource).not.toContain('<select')
  })

  it('only renders branch timing controls for manager or admin roles', () => {
    const consoleSource = readFileSync(resolve(root, 'apps/web/src/StaffConsole.tsx'), 'utf8')
    expect(consoleSource).toContain("session.role === 'ADMIN' || session.role === 'MANAGER'")
    expect(consoleSource).toContain('canOperate &&')
  })
})
