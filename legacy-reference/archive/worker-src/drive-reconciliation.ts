import { ApiError, D1Repository, now } from './repository';
import { createDriveDocument as uploadDriveDocument, type DriveEnv } from './drive';

type DriveIdentity = { subject: string; email: string; role: 'OWNER' };
type DriveInput = { entity_type: string; entity_id: string; purpose: string; file: File };

export async function createDriveDocumentWithReconciliation(repo: D1Repository, env: DriveEnv, identity: DriveIdentity, input: DriveInput) {
  const attemptId = crypto.randomUUID();
  const timestamp = now();
  await repo.run('INSERT INTO drive_upload_attempts (id,google_sub,entity_type,entity_id,purpose,filename,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', attemptId, identity.subject, input.entity_type, input.entity_id, input.purpose, input.file.name.slice(0, 180), 'PENDING', timestamp, timestamp);
  try {
    const result = await uploadDriveDocument(repo, env, identity, { ...input, upload_attempt_id: attemptId });
    await repo.run("UPDATE drive_upload_attempts SET status='COMPLETED',external_file_id=?,media_id=?,updated_at=? WHERE id=? AND status IN ('PENDING','UPLOADED')", result.external_file_id, result.id, now(), attemptId);
    return result;
  } catch (error) {
    await repo.run("UPDATE drive_upload_attempts SET status='RECONCILE_REQUIRED',updated_at=? WHERE id=? AND status<>'COMPLETED'", now(), attemptId);
    throw error;
  }
}

export async function reconcileDriveUpload(repo: D1Repository, attemptId: string, actor: string) {
  const attempt = await repo.first('SELECT * FROM drive_upload_attempts WHERE id=? AND google_sub=?', attemptId, actor);
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'Drive upload attempt not found');
  if (attempt.status === 'COMPLETED') return { attempt_id: attemptId, status: 'COMPLETED', media_id: attempt.media_id, external_file_id: attempt.external_file_id };
  if (!attempt.external_file_id) throw new ApiError(409, 'RECONCILIATION_DATA_MISSING', 'No external Drive file ID is available for this attempt');
  const existing = await repo.first("SELECT id FROM media_records WHERE external_file_id=? AND status IN ('ACTIVE','REPLACED')", attempt.external_file_id);
  const mediaId = existing?.id ? String(existing.id) : crypto.randomUUID();
  if (!existing) {
    await repo.run('INSERT INTO media_records (id,reference_url,mime_type,byte_size,purpose,access_class,entity_type,entity_id,status,uploaded_by,created_at,updated_at,provider,external_provider,external_file_id,external_parent_id,transformation_preset) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', mediaId, attempt.external_reference_url ?? `https://drive.google.com/open?id=${attempt.external_file_id}`, attempt.external_mime_type ?? 'application/octet-stream', attempt.external_size ?? null, attempt.purpose, 'SENSITIVE', attempt.entity_type, attempt.entity_id, 'ACTIVE', actor, now(), now(), 'EXTERNAL', 'GOOGLE_DRIVE', attempt.external_file_id, attempt.external_parent_id, null);
    await repo.audit('RECONCILE', 'media_record', mediaId, { provider: 'GOOGLE_DRIVE', external_file_id: attempt.external_file_id, attempt_id: attemptId });
  }
  await repo.run("UPDATE drive_upload_attempts SET status='COMPLETED',media_id=?,updated_at=? WHERE id=? AND status<>'COMPLETED'", mediaId, now(), attemptId);
  return { attempt_id: attemptId, status: 'COMPLETED', media_id: mediaId, external_file_id: attempt.external_file_id };
}
