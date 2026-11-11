import type { TemporalWindow } from './types'
const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' })
export function addCivilDays(value:string, days:number):string { const [year,month,day]=value.split('-').map(Number); return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10) }
export function manilaMidnightUtc(value:string):string { return new Date(`${value}T00:00:00+08:00`).toISOString() }
export function buildTemporalWindow(anchorDate:string):TemporalWindow { const startDate=addCivilDays(anchorDate,-35); const days=Array.from({length:75},(_,index)=>addCivilDays(startDate,index)); const endDateExclusive=addCivilDays(startDate,75); return {startDate,endDateExclusive,days,from:manilaMidnightUtc(startDate),to:manilaMidnightUtc(endDateExclusive)} }
export function todayInManila(now=new Date()):string { return parts.format(now) }
export const weekColumns=(days:string[])=>Array.from({length:Math.ceil(days.length/5)},(_,column)=>days.slice(column*5,column*5+5))
