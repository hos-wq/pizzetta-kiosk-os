import { D1Repository } from './repository';

const businessDate = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);

export const getAttentionItems = async (repo: D1Repository, reference = new Date()) => {
  const nowIso = reference.toISOString(); const today = businessDate(reference); const horizonDate = businessDate(new Date(reference.getTime() + 30 * 86400000));
  const [maintenance, tasks, physicalCheckIns, physicalCheckouts, contractBoundaries, missingDocuments, terminations, messaging] = await Promise.all([
    repo.all("SELECT CASE WHEN service_type='HOUSEKEEPING' THEN 'HOUSEKEEPING' ELSE 'MAINTENANCE' END AS kind,id,unit_id,title,priority,status,COALESCE(scheduled_at,opened_at) AS due_at FROM maintenance_issues WHERE status NOT IN ('RESOLVED','CLOSED') ORDER BY CASE priority WHEN 'URGENT' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,COALESCE(scheduled_at,opened_at) LIMIT 50"),
    repo.all("SELECT 'TURNOVER' AS kind,id,unit_id,label,status,due_at FROM turnover_tasks WHERE status='OPEN' AND is_blocker=1 ORDER BY due_at LIMIT 50"),
    repo.all("SELECT CASE WHEN t.status='ACTIVE' THEN 'CHECK_IN_MISSING' ELSE 'CHECK_IN' END AS kind,t.id,t.unit_id,t.start_at AS due_at,t.status,t.person_id,COALESCE(p.display_name,t.tenant_name) AS person_name FROM tenancies t LEFT JOIN tenancy_check_ins c ON c.tenancy_id=t.id LEFT JOIN persons p ON p.id=t.person_id WHERE c.id IS NULL AND ((t.status='UPCOMING' AND t.start_at>=? AND t.start_at<?) OR t.status='ACTIVE') ORDER BY t.start_at LIMIT 50", nowIso, new Date(reference.getTime() + 30 * 86400000).toISOString()),
    repo.all("SELECT 'CHECK_OUT_MISSING' AS kind,t.id,t.unit_id,COALESCE(t.end_at,tt.effective_date) AS due_at,t.status,t.person_id,COALESCE(p.display_name,t.tenant_name) AS person_name FROM tenancies t LEFT JOIN tenancy_terminations tt ON tt.tenancy_id=t.id LEFT JOIN tenancy_checkouts c ON c.tenancy_id=t.id LEFT JOIN persons p ON p.id=t.person_id WHERE c.id IS NULL AND t.status='ENDED' AND COALESCE(t.end_at,tt.effective_date) IS NOT NULL LIMIT 50"),
    repo.all("SELECT cv.id,cv.tenancy_id,cv.version_number,cv.start_date,cv.end_exclusive,t.unit_id,t.person_id,COALESCE(p.display_name,t.tenant_name) AS person_name,t.status FROM tenancy_contract_versions cv JOIN tenancies t ON t.id=cv.tenancy_id LEFT JOIN persons p ON p.id=t.person_id WHERE t.status!='TERMINATED' LIMIT 200"),
    repo.all("SELECT 'DOCUMENT_REQUIRED' AS kind,r.id,r.tenancy_id,r.document_key AS label,r.status,t.unit_id,t.person_id,COALESCE(p.display_name,t.tenant_name) AS person_name,r.updated_at AS due_at FROM tenancy_document_requirements r JOIN tenancies t ON t.id=r.tenancy_id LEFT JOIN persons p ON p.id=t.person_id WHERE r.status='REQUIRED' LIMIT 100"),
    repo.all("SELECT 'TERMINATION_FOLLOW_UP' AS kind,x.id,x.tenancy_id,x.effective_date AS due_at,x.reason,t.unit_id,t.person_id,COALESCE(p.display_name,t.tenant_name) AS person_name FROM tenancy_terminations x JOIN tenancies t ON t.id=x.tenancy_id LEFT JOIN tenancy_checkouts c ON c.tenancy_id=t.id LEFT JOIN persons p ON p.id=t.person_id WHERE c.id IS NULL LIMIT 50"),
    repo.all("SELECT 'MESSAGING' AS kind,a.id,a.person_id,a.signal_id,a.signal_key,a.priority,a.status,a.channel,a.external_conversation_id,a.bot_can_continue,p.display_name,s.value_json,i.conversation_url,c.control_mode,c.do_not_auto_reply,a.updated_at AS due_at FROM messaging_attention a LEFT JOIN persons p ON p.id=a.person_id LEFT JOIN person_messaging_signals s ON s.id=a.signal_id LEFT JOIN person_external_identities i ON i.person_id=a.person_id AND i.platform=a.channel AND i.external_id=a.external_conversation_id LEFT JOIN messaging_conversation_controls c ON c.channel=a.channel AND c.external_conversation_id=a.external_conversation_id WHERE a.status='OPEN' ORDER BY CASE a.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'INTERESTING' THEN 2 ELSE 3 END,a.updated_at LIMIT 50").catch(() => []),
  ]);
  const contractItems: Record<string, unknown>[] = []; const versionsByTenancy = new Map<string, Record<string, unknown>[]>();
  for (const row of contractBoundaries as Record<string, unknown>[]) { const list = versionsByTenancy.get(String(row.tenancy_id)) ?? []; list.push(row); versionsByTenancy.set(String(row.tenancy_id), list); }
  for (const [tenancyId, versions] of versionsByTenancy) {
    versions.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date))); const tenancyStatus = String(versions[0]?.status ?? '');
    for (let index = 0; index < versions.length; index += 1) {
      const version = versions[index]; const start = String(version.start_date).slice(0, 10); const end = String(version.end_exclusive).slice(0, 10); const next = versions[index + 1];
      if (next && String(next.start_date).slice(0, 10) === end && end >= today && end <= horizonDate) contractItems.push({ kind: 'RENEWAL_BOUNDARY', id: `contract:${String(version.id)}:renewal`, tenancy_id: tenancyId, unit_id: version.unit_id, person_id: version.person_id, person_name: version.person_name, due_at: end, status: tenancyStatus, version_number: version.version_number });
      if (!next && end >= today && end <= horizonDate) contractItems.push({ kind: 'CONTRACT_EXPIRY', id: `contract:${String(version.id)}:expiry`, tenancy_id: tenancyId, unit_id: version.unit_id, person_id: version.person_id, person_name: version.person_name, due_at: end, status: tenancyStatus, version_number: version.version_number });
    }
  }
  const items = [...maintenance, ...tasks, ...physicalCheckIns, ...physicalCheckouts, ...contractItems, ...missingDocuments, ...terminations, ...messaging];
  const seen = new Set<string>();
  return items.filter(item => { const key = `${String(item.kind)}:${String(item.id)}:${String(item.due_at ?? '')}`; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => String(a.due_at ?? '').localeCompare(String(b.due_at ?? '')));
};
