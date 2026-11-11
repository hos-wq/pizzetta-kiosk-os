import { describe, expect, it } from 'vitest';
import { analyzeMessagingText, canAutoReply, explainMessagingText, normalizeMessagingText, SIGNAL_DEFINITIONS } from '../../apps/worker/src/messaging-intelligence';

describe('Messaging Intelligence deterministic corpus', () => {
  it('normalizes Taglish, text-speak and punctuation without persisting a transcript', () => {
    expect(normalizeMessagingText('Avail? po!!!')).toBe('available po');
    expect(normalizeMessagingText('pwede ba bukas?')).toBe('can ba tomorrow');
    const result = analyzeMessagingText('pwede BR07, tahimik, 2 months from Nov 1', new Date('2026-10-05T00:00:00Z'));
    expect(result.entities).toMatchObject({ unitId: 'BR·07', durationMonths: 2, moveInDate: '2026-11-01', preference: 'WANTS_QUIET' });
    expect(result.signals.map(signal => signal.key)).toEqual(expect.arrayContaining(['ROOM_INTEREST','PREFERENCE_QUIET','STAY_DURATION','MOVE_IN_DATE']));
    expect(JSON.stringify(result.signals)).not.toContain('pwede BR07');
  });

  it('handles negation and disambiguates laundry from washing machine', () => {
    expect(analyzeMessagingText("I don't need parking").signals.map(signal => signal.key)).toContain('PARKING_NOT_REQUIRED');
    expect(analyzeMessagingText('Do you have laundry?').signals.map(signal => signal.key)).toContain('LAUNDRY_QUERY');
    expect(analyzeMessagingText('Is there a washing machine?').signals.map(signal => signal.key)).toContain('WASHING_MACHINE_QUERY');
  });

  it('keeps preference and objection signals distinct and supports supersession input', () => {
    const quiet = analyzeMessagingText('I want somewhere quiet');
    const view = analyzeMessagingText('Actually I prefer a good view');
    expect(quiet.signals.map(signal => signal.key)).toContain('PREFERENCE_QUIET');
    expect(view.signals.map(signal => signal.key)).toContain('PREFERENCE_VIEW');
    expect(analyzeMessagingText('too expensive').signals.map(signal => signal.key)).toEqual(expect.arrayContaining(['OBJECTION_PRICE']));
  });

  it('marks owner attention without changing automation control', () => {
    const result = analyzeMessagingText('negotiable?');
    const signal = result.signals.find(item => item.key === 'NEGOTIATION_REQUEST');
    expect(signal).toMatchObject({ needsAlan: true, botCanContinue: true });
    expect(canAutoReply({ control_mode: 'BOT', do_not_auto_reply: 0 })).toBe(true);
    expect(canAutoReply({ control_mode: 'HUMAN', do_not_auto_reply: 0 })).toBe(false);
    expect(canAutoReply({ control_mode: 'BOT', do_not_auto_reply: 1 })).toBe(false);
  });

  it('does not silently invent a taxonomy definition', () => {
    expect(SIGNAL_DEFINITIONS.some(signal => signal.key === 'PARKING_REQUIRED')).toBe(true);
    expect(SIGNAL_DEFINITIONS.some(signal => signal.key === 'UNKNOWN_PRIVATE_GUESS')).toBe(false);
  });

  it('covers the Normalization Lab acceptance phrases without H&M false pricing', () => {
    expect(analyzeMessagingText('avail pa 07?').signals.map(signal => signal.key)).toEqual(expect.arrayContaining(['AVAILABILITY_QUERY','ROOM_INTEREST']));
    expect(analyzeMessagingText('wala akong car').signals.map(signal => signal.key)).toContain('PARKING_NOT_REQUIRED');
    expect(analyzeMessagingText('20k kaya?').signals.map(signal => signal.key)).toContain('LOW_OFFER');
    expect(analyzeMessagingText('pde ko mkta 07 tom mga 3 po?').signals.map(signal => signal.key)).toEqual(expect.arrayContaining(['ROOM_INTEREST','VIEWING_INTEREST','VIEWING_DATE_PROPOSED']));
    expect(analyzeMessagingText('can move asap').signals.map(signal => signal.key)).toContain('MOVE_IN_DATE');
    expect(analyzeMessagingText('Is there H&M near the building?').signals.map(signal => signal.key)).not.toContain('PRICE_QUERY');
    expect(analyzeMessagingText('H&M clothes nearby?').signals.map(signal => signal.key)).not.toContain('PRICE_QUERY');
  });

  it('runs as a dry-run with zero repository writes', async () => {
    let writes = 0;
    const repo = { async all() { return []; }, async run() { writes += 1; } };
    const result = await explainMessagingText(repo as never, 'I don\'t need parking');
    expect(result.summary.sideEffects).toBe('NONE');
    expect(result.signals.map(signal => signal.key)).toContain('PARKING_NOT_REQUIRED');
    expect(writes).toBe(0);
  });
});
