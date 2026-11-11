import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
describe('Messenger durable delivery claim',()=>{
  it('preserves existing leads and enforces a single claim per Page/message without transcript columns',()=>{
    const db=new DatabaseSync(':memory:');
    try {
      db.exec('PRAGMA foreign_keys=ON; CREATE TABLE leads(id TEXT PRIMARY KEY); INSERT INTO leads VALUES (\'synthetic-lead\');');
      db.exec(readFileSync('db/migrations-rc/0028_messenger_delivery.sql','utf8'));
      const insert=db.prepare('INSERT OR IGNORE INTO messenger_deliveries(page_id,message_id,status,received_at,updated_at) VALUES (?,?,?,?,?)');
      expect(insert.run('123','mid','PROCESSING','2026-10-07T00:00:00Z','2026-10-07T00:00:00Z').changes).toBe(1);
      expect(insert.run('123','mid','PROCESSING','2026-10-07T00:00:00Z','2026-10-07T00:00:00Z').changes).toBe(0);
      expect(insert.run('456','mid','PROCESSING','2026-10-07T00:00:00Z','2026-10-07T00:00:00Z').changes).toBe(1);
      expect(()=>db.prepare('UPDATE messenger_deliveries SET lead_id=?').run('missing-lead')).toThrow();
      expect(db.prepare('SELECT COUNT(*) AS n FROM leads').get()?.n).toBe(1);
      const columns=db.prepare('PRAGMA table_info(messenger_deliveries)').all().map(column=>column.name);
      expect(columns).not.toContain('text');expect(columns).not.toContain('body');expect(columns).not.toContain('reply');
    } finally {db.close();}
  });
});
