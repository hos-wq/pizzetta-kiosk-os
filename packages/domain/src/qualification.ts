export type QualificationFacts = {
  moveInDate?: string | null;
  moveInPrecision?: string | null;
  durationMonths?: number | null;
  endDate?: string | null;
  specificUnitId?: string | null;
  objections?: string[];
  occupancyCount?: number | null;
};

export type QualificationResult = {
  qualified: boolean;
  missingFacts: Array<'MOVE_IN_DATE' | 'DURATION'>;
  nextQuestionCode: 'ASK_MOVE_IN_DATE' | 'ASK_DURATION' | null;
  escalationRequired: boolean;
};

const validDateOnly = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const qualifyLead = (facts: QualificationFacts): QualificationResult => {
  const missingFacts: QualificationResult['missingFacts'] = [];
  const validMoveInPrecision = ['ASAP', 'NEXT_WEEK', 'FLEXIBLE'].includes(String(facts.moveInPrecision ?? ''));
  if (!validDateOnly(facts.moveInDate) && !validMoveInPrecision) missingFacts.push('MOVE_IN_DATE');
  const validDuration = Number.isInteger(facts.durationMonths) && Number(facts.durationMonths) > 0;
  const validEndDate = validDateOnly(facts.endDate);
  if (!validDuration && !validEndDate) missingFacts.push('DURATION');
  return {
    qualified: missingFacts.length === 0,
    missingFacts,
    nextQuestionCode: missingFacts[0] === 'MOVE_IN_DATE' ? 'ASK_MOVE_IN_DATE' : missingFacts[0] === 'DURATION' ? 'ASK_DURATION' : null,
    escalationRequired: facts.objections?.includes('SHORT_STAY') ?? false,
  };
};
