import { describe, expect, it } from 'vitest';
import { createViewing, updateViewing, viewingTransitions } from '../../apps/worker/src/domain';
import { ApiError } from '../../apps/worker/src/repository';

const repoFor=(status='SCHEDULED',lead=true,unit=true)=>{
  const calls:string[]=[];
  const repo={
    first:async(sql:string)=>sql.includes('FROM viewings')?{id:'viewing-1',status}:sql.includes('FROM leads')?(lead?{id:'lead-1'}:null):sql.includes('FROM units')?(unit?{id:'BR·02'}:null):{id:'viewing-1'},
    run:async()=>{calls.push('run')}, audit:async()=>{calls.push('audit')}, calls,
  };
  return repo;
};

describe('viewing lifecycle domain',()=>{
  it('creates only with an existing lead and unit',async()=>{
    const repo=repoFor();
    await createViewing(repo as never,{lead_id:'lead-1',unit_id:'BR·02',start_at:'2026-11-01T10:00:00Z',end_at:'2026-11-01T11:00:00Z',confirmation_status:'UNCONFIRMED'});
    expect(repo.calls).toEqual(['run','audit']);
    await expect(createViewing(repoFor('SCHEDULED',false) as never,{lead_id:'missing',unit_id:'BR·02',start_at:'2026-11-01T10:00:00Z',end_at:'2026-11-01T11:00:00Z',confirmation_status:'UNCONFIRMED'})).rejects.toMatchObject({status:404});
  });
  it('supports reschedule and deterministic terminal lifecycle actions',async()=>{
    const rescheduled=repoFor(); await updateViewing(rescheduled as never,'viewing-1',{start_at:'2026-11-01T12:00:00Z',end_at:'2026-11-01T13:00:00Z'}); expect(rescheduled.calls).toContain('run');
    for(const status of ['CANCELLED','COMPLETED','NO_SHOW']) { const repo=repoFor(); await updateViewing(repo as never,'viewing-1',{status}); expect(repo.calls).toContain('audit'); }
    expect(viewingTransitions.SCHEDULED).toEqual(['SCHEDULED','COMPLETED','CANCELLED','NO_SHOW']);
  });
  it('rejects partial reschedule intervals',async()=>await expect(updateViewing(repoFor() as never,'viewing-1',{start_at:'2026-11-01T12:00:00Z'})).rejects.toBeInstanceOf(ApiError));
  it('compares reschedule instants rather than timestamp text',async()=>await expect(updateViewing(repoFor() as never,'viewing-1',{start_at:'2026-11-01T15:00:00+08:00',end_at:'2026-11-01T06:30:00Z'})).rejects.toMatchObject({status:422}));
});
