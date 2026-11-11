UPDATE units
SET type='Studio', updated_at='2026-10-15T00:00:00.000Z'
WHERE id IN ('BR·02','BR·03','BR·05','BR·07','BR·08','BR·09','BR·10','BR·27','BR·32')
  AND type='Standard Studio';

UPDATE units
SET type='Executive studio', updated_at='2026-10-15T00:00:00.000Z'
WHERE id='BR·04' AND type='Executive Studio';
