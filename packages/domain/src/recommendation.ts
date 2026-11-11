export type RecommendationUnit = {
  id: string;
  sqm: number;
  commercialPriority?: 'HIGH' | 'LOW' | string;
  features: Record<string, string | boolean | number>;
};

export type RecommendationInput = {
  requestedUnitId?: string | null;
  objections?: string[];
  units: RecommendationUnit[];
  availability: Record<string, boolean>;
};

export type RecommendationReasonCode = 'SPECIFIC_UNIT_MATCH' | 'SPECIFIC_UNIT_UNAVAILABLE' | 'SPECIFIC_UNIT_INCOMPATIBLE' | 'AVAILABILITY_BLOCKED' | 'QUIET_MATCH' | 'VIEW_MATCH' | 'BRIGHTER_ALTERNATIVE' | 'SIZE_UPGRADE' | 'COMMERCIAL_PRIORITY' | 'PREFERENCE_FALLBACK' | 'NO_COMPATIBLE_UNIT';
export type Recommendation = { unitId: string; reasonCodes: RecommendationReasonCode[] };
export type RecommendationResult = { recommendations: Recommendation[]; unavailable: Array<{ unitId: string; reasonCodes: RecommendationReasonCode[] }>; reasonCodes: RecommendationReasonCode[]; escalationRequired: boolean };

const ACQUISITION_ORDER = ['BR·02','BR·03','BR·05','BR·07','BR·08','BR·09','BR·10'];
const UPGRADE_ORDER = ['BR·04','BR·32','BR·27'];
const indexOf = (id: string, list: string[]) => { const index = list.indexOf(id); return index === -1 ? 999 : index; };
const has = (unit: RecommendationUnit, feature: string) => unit.features[feature] === true || unit.features[feature] === 'true';

export class RecommendationService {
  recommend(input: RecommendationInput): RecommendationResult {
    const objections = new Set(input.objections ?? []);
    const unavailable: RecommendationResult['unavailable'] = [];
    const available = input.units.filter((unit) => {
      if (input.availability[unit.id] === true) return true;
      unavailable.push({ unitId: unit.id, reasonCodes: ['AVAILABILITY_BLOCKED'] });
      return false;
    });
    const specific = input.requestedUnitId ? input.units.find((unit) => unit.id === input.requestedUnitId) : undefined;
    if (specific && !input.availability[specific.id]) unavailable.push({ unitId: specific.id, reasonCodes: ['SPECIFIC_UNIT_UNAVAILABLE', 'AVAILABILITY_BLOCKED'] });
    const tooSmall = objections.has('TOO_SMALL');
    const quiet = objections.has('WANTS_QUIET');
    const view = objections.has('WANTS_VIEW') || objections.has('NO_VIEW');
    const dark = objections.has('TOO_DARK');
    const compatible = available.filter((unit) => !tooSmall || unit.sqm >= 29);
    const ordered = [...compatible].sort((a, b) => {
      const score = (unit: RecommendationUnit) => {
        if (specific?.id === unit.id) return -1000;
        if (tooSmall) return (unit.id === 'BR·04' ? 0 : unit.id === 'BR·32' ? 1 : unit.id === 'BR·27' ? 2 : 100) + indexOf(unit.id, UPGRADE_ORDER);
        if (quiet) return (has(unit, 'quiet_side') ? 0 : 20) + indexOf(unit.id, ACQUISITION_ORDER);
        if (view || dark) return (has(unit, 'panoramic_view') ? 0 : has(unit, 'view') ? 5 : 30) + (dark && has(unit, 'quiet_side') ? 20 : 0) + indexOf(unit.id, ['BR·27','BR·32','BR·04', ...ACQUISITION_ORDER]);
        return (unit.commercialPriority === 'HIGH' ? 0 : 50) + indexOf(unit.id, ACQUISITION_ORDER) + indexOf(unit.id, UPGRADE_ORDER);
      };
      return score(a) - score(b) || a.id.localeCompare(b.id);
    });
    const recommendations = ordered.map((unit): Recommendation => {
      const reasonCodes: RecommendationReasonCode[] = [];
      if (specific?.id === unit.id) reasonCodes.push('SPECIFIC_UNIT_MATCH');
      if (quiet && has(unit, 'quiet_side')) reasonCodes.push('QUIET_MATCH');
      if (view && (has(unit, 'view') || has(unit, 'panoramic_view'))) reasonCodes.push('VIEW_MATCH');
      if (dark && !has(unit, 'quiet_side')) reasonCodes.push('BRIGHTER_ALTERNATIVE');
      if (tooSmall && unit.sqm >= 29) reasonCodes.push('SIZE_UPGRADE');
      if (reasonCodes.length === 0) reasonCodes.push(unit.commercialPriority === 'HIGH' ? 'COMMERCIAL_PRIORITY' : 'PREFERENCE_FALLBACK');
      return { unitId: unit.id, reasonCodes };
    });
    if (specific && input.availability[specific.id] && recommendations[0]?.unitId !== specific.id) recommendations.unshift({ unitId: specific.id, reasonCodes: ['SPECIFIC_UNIT_MATCH'] });
    if (specific && input.availability[specific.id] && !compatible.some((unit) => unit.id === specific.id)) unavailable.push({ unitId: specific.id, reasonCodes: ['SPECIFIC_UNIT_INCOMPATIBLE'] });
    const finalRecommendations = recommendations.slice(0, 5);
    const uniqueUnavailable = [...new Map(unavailable.map(item => [item.unitId, item])).values()];
    for (const item of unavailable) { const existing=uniqueUnavailable.find(candidate=>candidate.unitId===item.unitId); if(existing) existing.reasonCodes=[...new Set([...existing.reasonCodes,...item.reasonCodes])]; }
    return { recommendations: finalRecommendations, unavailable: uniqueUnavailable, reasonCodes: finalRecommendations.length === 0 ? ['NO_COMPATIBLE_UNIT'] : [], escalationRequired: objections.has('SHORT_STAY') || objections.has('PRICE') };
  }
}
