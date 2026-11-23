import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
let src=fs.readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
src=src.replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env;}}');
let timer;
const setInt=globalThis.setInterval,clearInt=globalThis.clearInterval;
globalThis.setInterval=(fn)=>{timer=fn;return 1;};globalThis.clearInterval=()=>{timer=null;};
let ms=0;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>ms}});
const testPath=new URL('../src/.worker_test.mjs',import.meta.url);
fs.writeFileSync(testPath,src);
try{
 const {Lobby}=await import(testPath.href+'?test=36');
 const lobby=new Lobby({getWebSockets:()=>[]},{});
 const mk=(id)=>({id:String(id),sent:[],attachment:{id:String(id)},send(x){this.sent.push(JSON.parse(x));},serializeAttachment(x){this.attachment=x;},deserializeAttachment(){return this.attachment;}});
 let s1=mk(1),s2=mk(2),spect=mk(3);
 for(const s of [s1,s2,spect])lobby.players.set(s.id,{id:s.id,socket:s,room:null,hero:null});
 const msg=(s,obj)=>lobby.webSocketMessage(s,JSON.stringify(obj));
 msg(s1,{t:'pvpCreate'});
 let code=[...lobby.rooms.keys()][0];assert(code);
 msg(s2,{t:'pvpJoin',code,role:'fighter'});
 msg(s1,{t:'pvpChoose',hero:'loid'});
 msg(s2,{t:'pvpChoose',hero:'kris'});
 const room=lobby.rooms.get(code);
 for(const p of room.members){for(const card of p.offer.slice(0,3))msg(p.socket,{t:'pvpPick',card});}
 msg(s1,{t:'pvpBegin'});
 assert.equal(room.match?.getActors().length,2);
 assert(s1.sent.some(x=>x.t==='pvpBegin'&&x.authority==='server'));
 assert(s2.sent.some(x=>x.t==='pvpBegin'&&x.authority==='server'));
 msg(spect,{t:'pvpJoin',code,role:'spectator'});
 const init=room.match.getActors();
 for(let i=0;i<80;i++){
   ms+=50;
   msg(s1,{t:'pvpInput',seq:i+1,x:1,y:0,aim:0,attack:false});
   msg(s2,{t:'pvpInput',seq:i+1,x:-1,y:0,aim:Math.PI,attack:false});
   timer?.();
 }
 const after=room.match.getActors();assert(after[0].x>init[0].x&&after[1].x<init[1].x);
 for(let i=0;i<40;i++){
  ms+=50;
  msg(s1,{t:'pvpInput',seq:80+i,x:0,y:0,aim:0,attack:true});
  msg(s2,{t:'pvpInput',seq:80+i,x:0,y:0,aim:Math.PI,attack:true});
  timer?.();
 }
 assert(room.match.getActors().some((p,i)=>p.hp<init[i].hp),'combat damage from server simulation');
 assert(s1.sent.some(x=>x.t==='pvpSnapshot')&&s2.sent.some(x=>x.t==='pvpSnapshot')&&spect.sent.some(x=>x.t==='pvpSnapshot'));
 assert.deepEqual(s1.sent.filter(x=>x.t==='pvpSnapshot').at(-1).data.players.map(p=>p.hp),s2.sent.filter(x=>x.t==='pvpSnapshot').at(-1).data.players.map(p=>p.hp));
 // A spoofed client-side snapshot is ignored in authoritative server mode.
 let count=s2.sent.length;
 msg(s1,{t:'pvpSnapshot',data:{players:[{id:'fake',hp:0}]}});
 assert.equal(s2.sent.length,count,'forged host state must be ignored');
 console.log('SERVER DUEL PASS',JSON.stringify({room:code,actors:room.match.getActors(),snapshots:spect.sent.filter(x=>x.t==='pvpSnapshot').length}));
}finally{fs.unlinkSync(testPath);globalThis.setInterval=setInt;globalThis.clearInterval=clearInt;}
