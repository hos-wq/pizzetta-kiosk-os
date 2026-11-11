import { describe, expect, it } from 'vitest';
import { qualifyLead } from '../../packages/domain/src/qualification';
import { RecommendationService, type RecommendationUnit } from '../../packages/domain/src/recommendation';

const units:RecommendationUnit[]=[
  {id:'BR·02',sqm:24,commercialPriority:'HIGH',features:{view:true}},
  {id:'BR·04',sqm:42,commercialPriority:'LOW',features:{view:true}},
  {id:'BR·07',sqm:24,commercialPriority:'HIGH',features:{quiet_side:true,view:false}},
  {id:'BR·09',sqm:24,commercialPriority:'HIGH',features:{quiet_side:true,view:false}},
  {id:'BR·27',sqm:29,commercialPriority:'LOW',features:{panoramic_view:true}},
  {id:'BR·32',sqm:31,commercialPriority:'LOW',features:{panoramic_view:true}},
];
const allAvailable=Object.fromEntries(units.map(unit=>[unit.id,true]));

describe('qualification and recommendation vertical slice',()=>{
  it('asks only for missing qualification facts',()=>{
    expect(qualifyLead({}).missingFacts).toEqual(['MOVE_IN_DATE','DURATION']);
    expect(qualifyLead({moveInDate:'2026-11-01'}).missingFacts).toEqual(['DURATION']);
    expect(qualifyLead({moveInDate:'2026-11-01',durationMonths:3}).qualified).toBe(true);
    expect(qualifyLead({moveInDate:'2026-11-01',durationMonths:3}).nextQuestionCode).toBeNull();
  });
  it('treats malformed dates and durations as missing facts',()=>{
    const result=qualifyLead({moveInDate:'2026-02-30',durationMonths:0});
    expect(result.missingFacts).toEqual(['MOVE_IN_DATE','DURATION']);
    expect(result.nextQuestionCode).toBe('ASK_MOVE_IN_DATE');
  });
  it('prioritizes quiet rooms',()=>expect(new RecommendationService().recommend({objections:['WANTS_QUIET'],units,availability:allAvailable}).recommendations.slice(0,2).map(item=>item.unitId)).toEqual(['BR·07','BR·09']));
  it('prioritizes view rooms and upgrades for size',()=>{
    expect(new RecommendationService().recommend({objections:['WANTS_VIEW'],units,availability:allAvailable}).recommendations[0].unitId).toBe('BR·27');
    expect(new RecommendationService().recommend({objections:['TOO_SMALL'],units,availability:allAvailable}).recommendations.slice(0,3).map(item=>item.unitId)).toEqual(['BR·04','BR·32','BR·27']);
  });
  it('never recommends unavailable rooms and returns alternatives',()=>{
    const result=new RecommendationService().recommend({requestedUnitId:'BR·02',units,objections:[],availability:{...allAvailable,'BR·02':false}});
    expect(result.recommendations.some(item=>item.unitId==='BR·02')).toBe(false);
    expect(result.unavailable.find(item=>item.unitId==='BR·02')?.reasonCodes).toContain('SPECIFIC_UNIT_UNAVAILABLE');
  });
  it('escalates short stay and reports no compatible size',()=>{
    const result=new RecommendationService().recommend({objections:['SHORT_STAY','TOO_SMALL'],units:units.filter(unit=>unit.id==='BR·02'),availability:{'BR·02':true}});
    expect(result.escalationRequired).toBe(true);
    expect(result.reasonCodes).toContain('NO_COMPATIBLE_UNIT');
  });
});
