import { describe, expect, it } from 'vitest';
import { DevAuthService } from '../../apps/worker/src/auth';
import { aggregateDashboard, assertTransition, createLead } from '../../apps/worker/src/domain';
import { ApiError } from '../../apps/worker/src/repository';
import { leadCreateSchema, leadPatchSchema, viewingCreateSchema, tenancyCreateSchema, paymentCreateSchema } from '../../packages/contracts/src';
import { hotForScore, isMeaningfulLeadSignal, scoreLeadSignal, scoreLeadSignals, scoreSignalForLeadEvent } from '../../packages/domain/src/lead-intelligence';

describe('backend contracts and domain guards', () => {
  it('rejects invalid lead input', () => expect(leadCreateSchema.safeParse({ people_count: 0 }).success).toBe(false));
  it('rejects invalid viewing interval', () => expect(viewingCreateSchema.safeParse({ unit_id:'BR·02',start_at:'2026-10-10T10:00:00Z',end_at:'2026-10-10T09:00:00Z' }).success).toBe(false));
  it('rejects invalid tenancy money', () => expect(tenancyCreateSchema.safeParse({unit_id:'BR·02',tenant_name:'x',start_at:'2026-10-10T00:00:00Z',monthly_rent_centavos:-1,payment_due_day:1}).success).toBe(false));
  it('rejects invalid payment status', () => expect(paymentCreateSchema.safeParse({tenancy_id:'t',due_date:'2026-10-10',amount_centavos:1,type:'RENT',status:'BROKEN'}).success).toBe(false));
  it('returns 404-shaped domain error for missing records', () => expect(new ApiError(404,'NOT_FOUND','missing').status).toBe(404));
  it('locks dev auth in production', async () => expect(await new DevAuthService().authenticate(new Request('https://x',{headers:{'x-dev-auth':'owner'}}),{ENVIRONMENT:'production'})).toBeNull());
  it('allows dev auth only outside production with explicit header', async () => expect(await new DevAuthService().authenticate(new Request('https://x',{headers:{'x-dev-auth':'owner'}}),{ENVIRONMENT:'development'})).toEqual({subject:'dev-owner'}));
  it('rejects invalid lifecycle transitions', () => expect(() => assertTransition('payment','PAID','DUE',{PAID:[]})).toThrow());
  it('accepts valid viewing, tenancy and payment lifecycle transitions', () => {
    expect(() => assertTransition('viewing','PROPOSED','SCHEDULED',{PROPOSED:['SCHEDULED']})).not.toThrow();
    expect(() => assertTransition('tenancy','UPCOMING','ACTIVE',{UPCOMING:['ACTIVE']})).not.toThrow();
    expect(() => assertTransition('payment','DUE','PAID',{DUE:['PAID']})).not.toThrow();
  });
  it('creates a lead through the repository and writes an audit event', async () => {
    const calls:string[]=[]; const fake={run:async()=>{calls.push('run')},audit:async()=>{calls.push('audit')},first:async()=>({id:'lead'})};
    await createLead(fake as never,{source:'REFERRAL',campaign:'test'});
    expect(calls).toEqual(['run','audit']);
  });
  it('keeps dashboard aggregation separated by operational area', () => expect(aggregateDashboard([{status:'AVAILABLE'}],[{status:'NEW'}],[],[],[])).toEqual({units:[{status:'AVAILABLE'}],leads:[{status:'NEW'}],viewings:[],payments:[],follow_ups:[]}));
  it('scores deterministic lead signals and ignores low-signal messages', () => {
    expect(scoreLeadSignals(['ownerQuestion','apartmentQuestion','moveIn','duration','specificUnit','photosVideo','viewing','proposedViewing','returningMeaningful'])).toBe(19);
    expect(scoreLeadSignals(['GENERIC_AVAILABILITY','GENERIC_NEGOTIABLE','LOW_SIGNAL'])).toBe(0);
    expect(isMeaningfulLeadSignal('GENERIC_AVAILABILITY')).toBe(false);
    expect(scoreLeadSignal('viewing')).toBe(4);
    expect(hotForScore(8)).toBe(true);
    expect(hotForScore(7)).toBe(false);
  });
  it('keeps HOT separate from lifecycle contract', () => expect(leadPatchSchema.safeParse({status:'HOT'}).success).toBe(false));
  it('derives score signals from canonical event types, never arbitrary client scores', () => {
    expect(scoreSignalForLeadEvent('VIEWING_REQUESTED')).toBe('viewing');
    expect(scoreSignalForLeadEvent('CLIENT_SUPPLIED_SCORE')).toBeUndefined();
    expect(leadPatchSchema.safeParse({is_hot:true}).success).toBe(false);
  });
});
