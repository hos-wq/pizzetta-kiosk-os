import { z } from 'zod'

export const serviceModeSchema = z.enum(['PICKUP', 'DINE_IN'])
export const paymentMethodSchema = z.enum(['CASH', 'GCASH'])
export const orderStatusSchema = z.enum(['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
export const staffRoleSchema = z.enum(['ADMIN', 'MANAGER', 'CASHIER'])

export const menuItemSchema = z.object({
  id: z.string().min(1).max(100),
  sku: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(160),
  category_slug: z.string().trim().min(1).max(80),
  variant_label: z.string().trim().max(80).nullable().optional(),
  price_centavos: z.number().int().nonnegative(),
  ingredients_json: z.string().optional(),
  allergens_json: z.string().optional(),
  is_active: z.boolean().optional(),
}).strict()

export const branchSchema = z.object({
  id: z.string().min(1).max(100),
  code: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(400),
  latitude: z.number().finite().gte(-90).lte(90),
  longitude: z.number().finite().gte(-180).lte(180),
  timezone: z.string().min(1).max(80),
}).strict()

export const orderLineSchema = z.object({
  menuItemId: z.string().min(1).max(100),
  variantLabel: z.string().trim().max(80).optional(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(500).optional(),
}).strict()

export const orderRequestSchema = z.object({
  branchId: z.string().min(1).max(100).optional(),
  customerId: z.string().min(1).max(100).optional(),
  customerName: z.string().trim().min(2).max(80),
  whatsapp: z.string().trim().regex(/^[+0-9][0-9 ()-]{6,31}$/),
  idempotencyKey: z.string().trim().min(16).max(120),
  accessToken: z.string().min(16).max(300).optional(),
  accessTokenHash: z.string().length(64).optional(),
  serviceMode: serviceModeSchema,
  scheduledFor: z.string().datetime({ offset: true }).optional(),
  tableLabel: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: paymentMethodSchema.default('CASH'),
  items: z.array(orderLineSchema).min(1).max(30),
}).strict()

export const orderStatusPatchSchema = z.object({
  status: orderStatusSchema,
  version: z.number().int().nonnegative(),
}).strict()

export const branchOperationPatchSchema = z.object({
  paused: z.boolean().optional(),
  waitDelta: z.number().int().min(-60).max(60).optional(),
  reason: z.string().trim().max(300).optional(),
}).strict().refine(value => value.paused !== undefined || value.waitDelta !== undefined || value.reason !== undefined, 'at least one operation field is required')

export type OrderRequestInput = z.infer<typeof orderRequestSchema>
export type OrderStatusPatch = z.infer<typeof orderStatusPatchSchema>
export type BranchOperationPatch = z.infer<typeof branchOperationPatchSchema>
