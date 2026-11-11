-- Explicitly authorized synthetic contact only. Preserve history and correction audit.
UPDATE leads SET move_in_precision='ASAP',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='0b372921-8295-4daa-81b7-b8805dbf0f1f' AND platform='MESSENGER' AND external_contact_id='28917897477822972'
AND move_in_date IS NULL AND move_in_precision IS NULL
AND EXISTS(SELECT 1 FROM person_messaging_signals WHERE person_id='c231ca0c-0d86-4eeb-8b66-0bd538e744bc' AND signal_key='MOVE_IN_DATE' AND normalized_value='ASAP' AND status='ACTIVE');
INSERT INTO lead_events(id,lead_id,event_type,structured_payload_json,occurred_at,source)
SELECT 'rc-repair-asap-20261008','0b372921-8295-4daa-81b7-b8805dbf0f1f','MOVE_IN_CAPTURED','{"precision":"ASAP","correction":"legacy selection decoding"}',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'RC_REPAIR'
WHERE EXISTS(SELECT 1 FROM leads WHERE id='0b372921-8295-4daa-81b7-b8805dbf0f1f' AND move_in_precision='ASAP')
AND NOT EXISTS(SELECT 1 FROM lead_events WHERE lead_id='0b372921-8295-4daa-81b7-b8805dbf0f1f' AND event_type='MOVE_IN_CAPTURED');
UPDATE leads SET interest_score=MAX(interest_score,2)
WHERE id='0b372921-8295-4daa-81b7-b8805dbf0f1f'
AND EXISTS(SELECT 1 FROM lead_events WHERE id='rc-repair-asap-20261008')
AND NOT EXISTS(SELECT 1 FROM audit_log WHERE id='rc-repair-person-memory-20261008');
UPDATE person_messaging_signals SET status='RETRACTED' WHERE person_id='c231ca0c-0d86-4eeb-8b66-0bd538e744bc' AND signal_key='LOW_CONFIDENCE' AND status='ACTIVE' AND last_seen_at<'2026-10-08T05:00:00Z';
UPDATE messaging_attention SET status='RESOLVED',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE person_id='c231ca0c-0d86-4eeb-8b66-0bd538e744bc' AND signal_key='LOW_CONFIDENCE' AND status='OPEN' AND created_at<'2026-10-08T05:00:00Z';
INSERT OR IGNORE INTO audit_log(id,action,entity_type,entity_id,payload_json,occurred_at)
VALUES('rc-repair-person-memory-20261008','CORRECT','person','c231ca0c-0d86-4eeb-8b66-0bd538e744bc','{"actor":"owner:rc-repair","reason":"legacy ASAP selection misclassified LOW_CONFIDENCE","history_preserved":true}',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
