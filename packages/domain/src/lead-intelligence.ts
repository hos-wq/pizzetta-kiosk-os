export const LEAD_LIFECYCLE = ['NEW','QUALIFIED','VIEWING','FOLLOW_UP','RESERVED','TENANT','PAST_TENANT','CLOSED'] as const;
export const LEAD_OBJECTIONS = ['NO_VIEW','TOO_SMALL','TOO_DARK','WANTS_VIEW','WANTS_QUIET','PRICE','SHORT_STAY','OTHER'] as const;
export const LEAD_SCORE_WEIGHTS = Object.freeze({ ownerQuestion: 1, apartmentQuestion: 1, moveIn: 2, duration: 2, specificUnit: 1, photosVideo: 1, viewing: 4, proposedViewing: 5, returningMeaningful: 2 });
export type LeadScoreSignal = keyof typeof LEAD_SCORE_WEIGHTS | 'GENERIC_AVAILABILITY' | 'GENERIC_NEGOTIABLE' | 'LOW_SIGNAL';
export const scoreLeadSignal = (signal: LeadScoreSignal, weights: typeof LEAD_SCORE_WEIGHTS = LEAD_SCORE_WEIGHTS) => signal in weights ? weights[signal as keyof typeof weights] : 0;
export const scoreLeadSignals = (signals: LeadScoreSignal[], weights: typeof LEAD_SCORE_WEIGHTS = LEAD_SCORE_WEIGHTS) => signals.reduce((total, signal) => total + scoreLeadSignal(signal, weights), 0);
export const isMeaningfulLeadSignal = (signal: LeadScoreSignal) => !['GENERIC_AVAILABILITY','GENERIC_NEGOTIABLE','LOW_SIGNAL'].includes(signal);
export const hotForScore = (score: number, threshold = 8) => score >= threshold;
const EVENT_SCORE_SIGNALS: Record<string, LeadScoreSignal> = {
  OWNER_QUESTION: 'ownerQuestion', ASKED_OWNER: 'ownerQuestion',
  APARTMENT_QUESTION: 'apartmentQuestion', ASKED_PRICE: 'apartmentQuestion',
  MOVE_IN_CAPTURED: 'moveIn', DURATION_CAPTURED: 'duration', UNIT_SELECTED: 'specificUnit',
  PHOTOS_VIDEO_REQUESTED: 'photosVideo', VIEWING_REQUESTED: 'viewing', VIEWING_PROPOSED: 'proposedViewing',
  RETURNING_MEANINGFUL_CONVERSATION: 'returningMeaningful', ASKED_AVAILABILITY: 'GENERIC_AVAILABILITY',
  ASKED_DISCOUNT: 'GENERIC_NEGOTIABLE', LOW_SIGNAL: 'LOW_SIGNAL'
};
export const scoreSignalForLeadEvent = (eventType: string): LeadScoreSignal | undefined => EVENT_SCORE_SIGNALS[eventType];
