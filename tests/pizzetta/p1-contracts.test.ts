import { describe, expect, it } from 'vitest'
import { branchOperationPatchSchema, orderRequestSchema, orderStatusPatchSchema } from '../../packages/contracts/src/index'

const validOrder = {
  customerName: 'Maria Santos',
  whatsapp: '+639620558786',
  idempotencyKey: 'order-request-20261112-0001',
  serviceMode: 'PICKUP' as const,
  paymentMethod: 'CASH' as const,
  items: [{ menuItemId: 'pizza-margherita', quantity: 1 }],
}

describe('P1 canonical restaurant contracts', () => {
  it('accepts a valid order request and applies the cash default', () => {
    const result = orderRequestSchema.parse({ ...validOrder, paymentMethod: undefined })
    expect(result.paymentMethod).toBe('CASH')
  })

  it('rejects malformed customer identity and empty cart payloads', () => {
    expect(orderRequestSchema.safeParse({ ...validOrder, whatsapp: 'not-a-number' }).success).toBe(false)
    expect(orderRequestSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false)
  })

  it('requires optimistic concurrency data for staff state changes', () => {
    expect(orderStatusPatchSchema.safeParse({ status: 'READY', version: 2 }).success).toBe(true)
    expect(orderStatusPatchSchema.safeParse({ status: 'READY' }).success).toBe(false)
    expect(branchOperationPatchSchema.safeParse({ waitDelta: 5 }).success).toBe(true)
    expect(branchOperationPatchSchema.safeParse({}).success).toBe(false)
  })
})
