import { ApiError, D1Repository, now } from './repository';

export const createTask = async (repo:D1Repository, input:Record<string,unknown>, actor:string) => {
  if(input.person_id && !await repo.first('SELECT id FROM persons WHERE id=?',String(input.person_id))) throw new ApiError(404,'PERSON_NOT_FOUND','Person not found');
  if(input.unit_id && !await repo.first('SELECT id FROM units WHERE id=?',String(input.unit_id))) throw new ApiError(404,'UNIT_NOT_FOUND','Unit not found');
  const id=crypto.randomUUID(), timestamp=now();
  await repo.run('INSERT INTO operational_tasks (id,title,due_at,all_day,priority,status,person_id,unit_id,source_entity_type,source_entity_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id,input.title,input.due_at,input.all_day?1:0,input.priority??'NORMAL','OPEN',input.person_id??null,input.unit_id??null,input.source_entity_type??null,input.source_entity_id??null,timestamp,timestamp);
  await repo.audit('CREATE','operational_task',id,{fields:Object.keys(input),actor});
  return repo.first('SELECT * FROM operational_tasks WHERE id=?',id);
};

export const listTasks = async (repo:D1Repository, query:Record<string,unknown>) => {
  const from=query.from?String(query.from):null,to=query.to?String(query.to):null; const status=query.status?String(query.status):null;
  return repo.all('SELECT t.*,p.display_name AS person_name,u.id AS room_id FROM operational_tasks t LEFT JOIN persons p ON p.id=t.person_id LEFT JOIN units u ON u.id=t.unit_id WHERE (? IS NULL OR t.due_at>=?) AND (? IS NULL OR t.due_at<?) AND (? IS NULL OR t.status=?) ORDER BY t.due_at LIMIT 200',from,from,to,to,status,status);
};

export const updateTask = async (repo:D1Repository, taskId:string, input:Record<string,unknown>, actor:string) => {
  const current=await repo.first('SELECT * FROM operational_tasks WHERE id=?',taskId); if(!current) throw new ApiError(404,'TASK_NOT_FOUND','Task not found');
  if(input.person_id && !await repo.first('SELECT id FROM persons WHERE id=?',String(input.person_id))) throw new ApiError(404,'PERSON_NOT_FOUND','Person not found');
  if(input.unit_id && !await repo.first('SELECT id FROM units WHERE id=?',String(input.unit_id))) throw new ApiError(404,'UNIT_NOT_FOUND','Unit not found');
  const entries=Object.entries(input); if(entries.length) await repo.run(`UPDATE operational_tasks SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=?,completed_at=CASE WHEN ?='COMPLETED' THEN ? ELSE completed_at END,completed_by=CASE WHEN ?='COMPLETED' THEN ? ELSE completed_by END WHERE id=?`,...entries.map(([,value])=>value===true?1:value===false?0:value),now(),input.status??current.status, input.status==='COMPLETED'?now():null, input.status??current.status, input.status==='COMPLETED'?actor:null, taskId);
  await repo.audit('UPDATE','operational_task',taskId,{fields:entries.map(([key])=>key),actor}); return repo.first('SELECT * FROM operational_tasks WHERE id=?',taskId);
};
