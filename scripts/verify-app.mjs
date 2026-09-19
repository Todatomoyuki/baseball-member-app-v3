import assert from 'node:assert/strict';
import {initialData,changeMode,swapPlayer,benchPlayers,validateData,nextSaturday} from '../lib/model.ts';
const base='http://localhost:5173';let cookie='';
async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')}}
assert.equal((await call('/api/team')).status,401);
assert.equal((await call('/api/auth','POST',{password:'wrong-password'})).status,401);
const login=await call('/api/auth','POST',{password:'local-test-team-2026'});assert.equal(login.status,200,JSON.stringify(login.body));cookie=login.cookie.split(';')[0];assert(login.cookie.includes('HttpOnly'));assert(login.cookie.includes('SameSite=Strict'));
const current=await call('/api/team');let d=initialData();d.players=Array.from({length:30},(_,i)=>({id:crypto.randomUUID(),name:`テスト選手${String(i+1).padStart(2,'0')}`,number:String(i+1),kana:'てすとせんしゅ'}));d.slots=d.slots.map((s,i)=>({...s,playerId:d.players[i].id}));d.manager='テスト監督';d.opponent='テスト対戦相手';d.opponents=[d.opponent];d.tournament='動作確認大会';validateData(d);assert.equal(benchPlayers(d).length,21);
let dh=changeMode(d,'dh');assert.equal(dh.pitcher,d.players[0].id);assert.equal(dh.slots.length,9);dh=swapPlayer(dh,'bench:'+d.players[9].id,'slot:0');validateData(dh);assert.equal(benchPlayers(dh).length,20);const normal=changeMode(dh,'normal');validateData(normal);assert.equal(benchPlayers(normal).length,21);assert.equal(normal.slots[0].playerId,d.players[0].id);
const swapped=swapPlayer(dh,'slot:1','bench:'+d.players[15].id);validateData(swapped);assert.equal(swapped.slots[1].playerId,d.players[15].id);assert(benchPlayers(swapped).some(p=>p.id===d.players[1].id));
const firstSave=await call('/api/team','PUT',{data:swapped,revision:current.body.revision});assert.equal(firstSave.status,200,JSON.stringify(firstSave.body));const read=await call('/api/team');assert.deepEqual(read.body.data,swapped);assert.equal((await call('/api/team','PUT',{data:d,revision:current.body.revision})).status,409);
const csrf=await fetch(base+'/api/team',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify({data:d,revision:read.body.revision})});assert.equal(csrf.status,403);
const invalid=structuredClone(d);invalid.slots[1].playerId=invalid.slots[0].playerId;assert.equal((await call('/api/team','PUT',{data:invalid,revision:read.body.revision})).status,400);
assert.equal((await call('/api/auth')).body.authenticated,true);
console.log('PASS: unauthenticated protection, password login, cookie flags, roster30, normal/DH conversion, bench swaps, persistent read-back, conflict409, CSRF403, duplicate rejection.');
