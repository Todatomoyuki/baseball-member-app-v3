import { z } from 'zod';
export const POSITIONS = ['投','捕','一','二','三','遊','左','中','右','DH'] as const;
export type Position = typeof POSITIONS[number];
export type Player = {id:string; name:string; number:string; kana:string};
export type Slot = {playerId:string|null; position:Position};
export type TeamData = {teamName:string;manager:string;tournament:string;tournaments:string[];date:string;opponent:string;opponents:string[];mode:'normal'|'dh';count:number;players:Player[];slots:Slot[];pitcher:string|null;benchOrder:string[];absentIds:string[]};
export function nextSaturday(now = new Date()) { const date = new Date(now); date.setDate(date.getDate()+((6-date.getDay()+7)%7 || 7));return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function initialData():TeamData{return {teamName:'YGファイヤーズ',manager:'池原　海斗',tournament:'',tournaments:[],date:nextSaturday(),opponent:'',opponents:[],mode:'normal',count:9,players:[],slots:POSITIONS.slice(0,9).map(position=>({playerId:null,position})),pitcher:null,benchOrder:[],absentIds:[]};}
export function normalizeData(data:TeamData):TeamData{return {...data,manager:data.manager?.trim()?data.manager:'池原　海斗',tournaments:data.tournaments??[],absentIds:data.absentIds??[]};}
export function benchPlayers(data:TeamData){const active=new Set([...data.slots.map(s=>s.playerId),data.pitcher,...(data.absentIds??[])]);return data.players.filter(p=>!active.has(p.id)).sort((a,b)=>{const ai=data.benchOrder.indexOf(a.id),bi=data.benchOrder.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)});}
export function absentPlayers(data:TeamData){const absent=new Set(data.absentIds??[]);return data.players.filter(p=>absent.has(p.id));}
export function changeMode(data:TeamData, mode:'normal'|'dh', count=9):TeamData {
 count=9; let slots=data.slots.map(s=>({...s})); let pitcher=data.pitcher;
 if(mode==='dh' && data.mode==='normal'){const i=slots.findIndex(s=>s.position==='投');pitcher=slots[i].playerId;slots[i]={playerId:null,position:'DH'};}
 if(mode==='normal' && data.mode==='dh'){const firstDH=slots.findIndex(s=>s.position==='DH');slots[firstDH]={playerId:pitcher,position:'投'};pitcher=null;slots=slots.filter(s=>s.position!=='DH');}
 if(mode==='dh'){while(slots.length>count){const i=slots.findLastIndex(s=>s.position==='DH');slots.splice(i,1)}while(slots.length<count)slots.push({playerId:null,position:'DH'});}
 return {...data,mode,count:mode==='normal'?9:count,slots,pitcher};
}
export function swapPlayer(data:TeamData, from:string, to:string):TeamData {
 const d=structuredClone(normalizeData(data)); const get=(key:string):string|null=>key==='pitcher'?d.pitcher:key.startsWith('slot:')?d.slots[Number(key.slice(5))]?.playerId:key.startsWith('bench:')?key.slice(6):key.startsWith('absent:')?key.slice(7):null;
 const a=get(from),b=get(to);if(from===to)return d;
 const put=(key:string,id:string|null)=>{if(key==='pitcher')d.pitcher=id;else if(key.startsWith('slot:'))d.slots[Number(key.slice(5))].playerId=id;};
 if(from.startsWith('bench:') && to.startsWith('bench:')){const list=benchPlayers(d).map(p=>p.id),i=list.indexOf(a!),j=list.indexOf(b!);[list[i],list[j]]=[list[j],list[i]];d.benchOrder=list;return d;}
 put(from,b);put(to,a);
 if(from.startsWith('absent:'))d.absentIds=d.absentIds.filter(id=>id!==a);
 if(to.startsWith('absent:'))d.absentIds=d.absentIds.filter(id=>id!==b);
 if(to.startsWith('absent:')&&a)d.absentIds.push(a);
 if(from.startsWith('absent:')&&b)d.absentIds.push(b);
 return d;
}
const short=z.string().trim().max(80);
const schema=z.object({teamName:short.min(1),manager:short,tournament:short,tournaments:z.array(short.min(1)).max(200).default([]),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v),opponent:short,opponents:z.array(short.min(1)).max(200),mode:z.enum(['normal','dh']),count:z.literal(9),players:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(30),number:z.string().regex(/^\d{1,3}$/),kana:z.string().trim().max(50)})).max(30),slots:z.array(z.object({playerId:z.string().uuid().nullable(),position:z.enum(POSITIONS)})).length(9),pitcher:z.string().uuid().nullable(),benchOrder:z.array(z.string().uuid()).max(30),absentIds:z.array(z.string().uuid()).max(30).default([])});
export function validateData(input:unknown):TeamData {const d=schema.parse(input);const ids=d.players.map(p=>p.id),used=[...d.slots.map(s=>s.playerId),d.pitcher,...d.absentIds].filter(Boolean);if(new Set(ids).size!==ids.length||new Set(used).size!==used.length||used.some(id=>!ids.includes(id!)))throw new Error('選手が重複しているか、未登録です。');if(d.slots.length!==d.count || (d.mode==='normal' && (d.count!==9||d.pitcher!==null)))throw new Error('人数設定が一致しません。');const required=d.mode==='normal'?POSITIONS.slice(0,9):POSITIONS.slice(1,9);if(required.some(p=>d.slots.filter(s=>s.position===p).length!==1)||d.slots.filter(s=>s.position==='DH').length!==(d.mode==='normal'?0:d.count-8))throw new Error('守備位置が重複しています。');return normalizeData(d);}
export function lineupWarnings(d:TeamData){const issues:string[]=[];if(d.slots.some(s=>!s.playerId)||d.mode==='dh'&&!d.pitcher)issues.push('スターティングオーダーに未選択の選手がいます。');if(!d.tournament.trim())issues.push('大会名を入力してください。');if(!d.opponent.trim())issues.push('相手チーム名を入力してください。');if(!d.manager.trim())issues.push('監督名を入力してください。');return issues;}

