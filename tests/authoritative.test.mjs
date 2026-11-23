import assert from 'node:assert/strict';
import {createDuel} from '../src/duel-engine.mjs';
let ms=0;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>ms}});
const match=createDuel([{id:'playerA',hero:'loid',cards:['heart','blade','fast']},{id:'playerB',hero:'kris',cards:['heart','blade','fast']}]);
let snap=match.snapshot();
assert.equal(snap.players.length,2);
assert.equal(snap.players[0].hp,12300);
const a0=snap.players[0].x,b0=snap.players[1].x;
match.input('playerA',{x:1,y:0,aim:0,attack:false},1);
match.input('playerB',{x:-1,y:0,aim:Math.PI,attack:false},1);
for(let i=0;i<67;i++){ms+=50;match.input('playerA',{x:1,y:0,aim:0,attack:false},i+2);match.input('playerB',{x:-1,y:0,aim:Math.PI,attack:false},i+2);match.tick();}
snap=match.snapshot();
assert(snap.players[0].x>a0 && snap.players[1].x<b0,'both fighters move from authenticated input');
match.action('playerA','e','',0);
snap=match.snapshot();
assert.equal(snap.clones.length,4,'Loid creates four active shadows');
match.input('playerA',{x:0,y:0,aim:0,attack:true},100);
match.input('playerB',{x:0,y:0,aim:Math.PI,attack:true},100);
for(let i=0;i<30;i++){ms+=50;match.input('playerA',{x:0,y:0,aim:0,attack:true},101+i);match.input('playerB',{x:0,y:0,aim:Math.PI,attack:true},101+i);match.tick();}
snap=match.snapshot();
assert(snap.players[0].hp<12300 || snap.players[1].hp<12300,'server resolves hit damage');
console.log('AUTHORITATIVE DUEL TEST PASS',JSON.stringify({p0:snap.players[0].hp,p1:snap.players[1].hp,clones:snap.clones.length}));
