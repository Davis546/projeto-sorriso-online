import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import {makeRoom,joinRoom,chooseAgent,readyUp,launch,advance,contactRadius,sprintMovement,setInput,campaignInteract,INTERACT_RADIUS,snapshot} from '../src/game.js';
const token='v1215-player-token-0001';
const room=(mode='survival')=>{const w=makeRoom('ABCDEFGH','normal',mode);const p=joinRoom(w,token,'Tester');chooseAgent(w,token,'solar');readyUp(w,token);assert.ok(launch(w,w.host));return {w,p};};
test('interação autoritativa tem alcance aumentado e rejeita interação remota',()=>{
 const {w,p}=room('campaign');assert.equal(INTERACT_RADIUS,110);
 p.x=755+100;p.y=740;
 assert.equal(snapshot(w,token).story.near,'portao');
 assert.equal(campaignInteract(w,token,'portao'),true);
 const {w:far,p:q}=room('campaign');q.x=755+125;q.y=740;
 assert.equal(campaignInteract(far,token,'portao'),false);
});
test('corrida requer tecla ou botão pressionado, gasta e recupera fôlego',()=>{
 const p={speed:220,stamina:100,inp:{run:false},running:false};
 assert.equal(sprintMovement(p,.1,1,0),220);
 p.inp.run=true;
 assert.equal(sprintMovement(p,.1,1,0),220*1.64);
 assert.equal(p.running,true);assert.ok(p.stamina<100);
 const low=p.stamina;p.inp.run=false;sprintMovement(p,.1,0,0);
 assert.equal(p.running,false);assert.ok(p.stamina>low);
 const {w}=room();setInput(w,token,{x:1,y:0,run:true});assert.equal(w.players[token].inp.run,true);
});
test('chefe so causa dano fisico quando realmente se aproxima do agente',()=>{
 const {w,p}=room();w.toSpawn=3;w.spawnCd=999;
 const e={id:100,kind:'final',hp:1000,maxHp:1000,r:74,x:p.x+80,y:p.y,
  speed:0,dmg:41,cd:0,shoot:999,stun:0,armor:0,move:0,bleed:0,bleedTick:1,patternCd:999,stage:1,phase2:false};
 assert.ok(contactRadius(e)<60);assert.ok(contactRadius(e)>30);
 w.enemies=[e];const before=p.hp;advance(w,w.lastTime+95);
 assert.equal(p.hp,before,'boss 80 unidades distante não pode causar dano de contato');
 e.x=p.x+30;advance(w,w.lastTime+95);
 assert.ok(p.hp<before,'boss próximo causa dano');
});
test('sprite de perseguidor em 16 quadros, grito original e corrida aparecem no cliente',()=>{
 const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const client=readFileSync(new URL('../public/client.js',import.meta.url),'utf8');
 assert.match(index,/V12\.19 CAMPANHA ONLINE/);
 assert.match(index,/id="runAction"/);
 assert.match(client,/occultistFrames/);assert.match(client,/renderX/);
 assert.match(client,/run:touch\.run\|\|keys\.has\('shift'\)/);
 assert.ok(statSync(new URL('../public/assets/ocultista-passos-4x4.png',import.meta.url)).size>100_000);
 assert.ok(statSync(new URL('../public/audio/grito-ocultista.wav',import.meta.url)).size>10_000);
 for(const age of ['campanha','adolescente'])for(const a of ['solar','ritual','alvo','feras','lunar'])assert.ok(statSync(new URL('../public/assets/walk-'+age+'-'+a+'.png',import.meta.url)).size>1200);
});
