export class ApiError extends Error { constructor(public readonly status:number, public readonly code:string, message:string, public readonly details?:unknown){super(message)} }
export const now = () => new Date().toISOString();
export class D1Repository {
  private actor?: string;
  constructor(private readonly db: D1Database, actor?: string) { this.actor = actor; }
  setActor(actor: string) { this.actor = actor; }
  async all(sql:string, ...args:unknown[]) { return (await this.db.prepare(sql).bind(...args).all()).results; }
  async first(sql:string, ...args:unknown[]) { return (await this.db.prepare(sql).bind(...args).first()) as Record<string,unknown> | null; }
  async run(sql:string, ...args:unknown[]) { return this.db.prepare(sql).bind(...args).run(); }
  async batch(statements: Array<{ sql: string; args?: unknown[] }>) {
    return this.db.batch(statements.map(statement => this.db.prepare(statement.sql).bind(...(statement.args ?? []))));
  }
  async audit(action:string, entityType:string, entityId:string, payload:unknown) { const value = payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...(payload as Record<string, unknown>), ...(this.actor ? { actor: this.actor } : {}) } : { value: payload, ...(this.actor ? { actor: this.actor } : {}) }; await this.run('INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', crypto.randomUUID(), action, entityType, entityId, JSON.stringify(value), now()); }
}
