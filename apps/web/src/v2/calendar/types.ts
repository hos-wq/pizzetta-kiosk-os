export type CalendarNavigationTarget = { screen:string; entityId:string; params?:Record<string, string> }
export type TemporalItem = { projectionId:string; eventType:string; date:string; startTime:string|null; endTime:string|null; allDay:boolean; personId:string|null; personName:string|null; roomId:string|null; sourceEntityType:string; sourceEntityId:string; navigationTarget?:CalendarNavigationTarget; status:string|null; priority:string|null; channel:string|null; labels:string[]; metadata:Record<string, unknown> }
export type WorkloadState = 'EMPTY'|'LIGHT'|'MEDIUM'|'BUSY'|'HEAVY'
export type TemporalWindow = { startDate:string; endDateExclusive:string; days:string[]; from:string; to:string }
