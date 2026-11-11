import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const dataset = JSON.parse(fs.readFileSync(path.resolve('data/seed/private/br-os-operational.v1.json'), 'utf8')) as {
  people: Array<{ display_name: string; contacts: Array<{ platform: string; external_id: string }> }>
  tenancies: Array<{ tenant_name: string; contracts: Array<{ start_date: string; end_exclusive: string; last_occupied_date: string; monthly_rent_centavos: number }> }>
  utility_rates: Array<{ rate_centavos: number }>
  dues_rates: Array<{ rate_centavos_per_sqm: number }>
  pricing_target: { target_type: string; amount_centavos: number }
  internet_plans: Array<{ plan_name: string; monthly_fee_centavos: number; advertised_speed_mbps: number | null }>
  internet_equipment: Array<{ unit_id: string; equipment_type: string }>
  internet_subscriptions: Array<{ tenancy_id: string; subscription_status: string; activation_status: string; payment_status: string }>
  condo_billable_areas: Array<{ unit_id: string; condo_billable_area_sqm: number | null; source: string }>
  room_policy_overrides: Array<{ unit_id: string; policy_key: string; value: number }>
}

describe('operational seed', () => {
  it('contains the two supplied tenant identities and contact methods', () => {
    expect(dataset.people.map((person) => person.display_name)).toEqual(['Bianca Dema-ala Liwanag', 'Padilla Jeff Emmanuel Irinco'])
    expect(dataset.people[0].contacts).toEqual([{ id: 'contact-bianca-messenger', platform: 'MESSENGER', external_id: 'facebook-profile-100000072560146', profile_url: 'https://www.facebook.com/profile.php?id=100000072560146&mibextid=wwXIfr' }])
    expect(dataset.people[1].contacts.map((contact) => contact.platform)).toEqual(['MESSENGER', 'WHATSAPP'])
  })

  it('models Jeff as one tenancy with two consecutive contract periods', () => {
    const jeff = dataset.tenancies.find((tenancy) => tenancy.tenant_name.startsWith('Padilla Jeff'))
    expect(jeff?.contracts).toHaveLength(2)
    expect(jeff?.contracts[0].end_exclusive).toBe(jeff?.contracts[1].start_date)
    expect(jeff?.contracts[0].last_occupied_date).toBe('2026-10-14')
    expect(jeff?.contracts[1].last_occupied_date).toBe('2026-12-14')
    expect(jeff?.contracts.map((contract) => contract.monthly_rent_centavos)).toEqual([2500000, 1800000])
  })

  it('keeps utility rates, policies and owner-supplied facts explicit', () => {
    expect(dataset.utility_rates.map((rate) => rate.rate_centavos)).toEqual([4000, 4600])
    expect(dataset.room_policy_overrides).toEqual(expect.arrayContaining([
      { unit_id: 'BR·04', policy_key: 'STANDARD_MAX_TENANTS', value: 3 },
      { unit_id: 'BR·27', policy_key: 'STANDARD_MAX_TENANTS', value: 3 },
    ]))
  })

  it('keeps owner dues and asking rent targets separate from contracts', () => {
    expect(dataset.dues_rates.map((rate) => rate.rate_centavos_per_sqm)).toEqual([6500, 6500])
    expect(dataset.pricing_target).toEqual({ target_type: 'ASKING_RENT', amount_centavos: 2500000, effective_from: '2026-10-15' })
  })

  it('models optional building internet, room equipment and tenancy status separately', () => {
    expect(dataset.internet_plans.map((plan) => [plan.plan_name, plan.monthly_fee_centavos, plan.advertised_speed_mbps])).toEqual([['Basic', 84000, 60], ['SMART Home', 129900, null]])
    expect(dataset.internet_equipment).toEqual([{ id: 'internet-equipment-br27-4g-router', unit_id: 'BR·27', equipment_type: '4G_ROUTER', service_brand: 'SMART Home', technology: '4G_MOBILE_BROADBAND', serial_number: null }])
    expect(dataset.internet_subscriptions.map((subscription) => [subscription.tenancy_id, subscription.subscription_status, subscription.activation_status, subscription.payment_status])).toEqual([['tenancy-bianca-br03', 'NOT_SUBSCRIBED', 'NOT_APPLICABLE', 'NOT_APPLICABLE'], ['tenancy-jeff-br27', 'NOT_CONFIRMED', 'NOT_CONFIRMED', 'NOT_CONFIRMED']])
  })

  it('keeps condominium billing areas unknown until administrative statements provide them', () => {
    expect(dataset.condo_billable_areas).toHaveLength(10)
    expect(dataset.condo_billable_areas.every((area) => area.condo_billable_area_sqm === null && area.source === 'NOT_PROVIDED')).toBe(true)
  })
})
