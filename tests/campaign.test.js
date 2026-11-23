import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRoom,joinRoom,chooseAgent,readyUp,launch,campaignInteract,campaignCode,campaignAckPaper,snapshot,advance,CAMPAIGN_STATIONS,IDS,campaignTargets,disconnect,setInput,FLASHBACK_INTRO_LINES } from '../src/game.js';
const at=(w,p,id)=>{const z=CAMPAIGN_STATIONS.find(x=>x.id===id);assert.ok(z,'Missing station '+id);p.x=z.x;p.y=z.y};
function team(n=5){const w=makeRoom('ABCDEFGH','normal','campaign'),members=[];for(let i=0;i<n;i++){
 const token='player'+i+'token'.repeat(3),p=joinRoom(w,token,'Investigador '+i);chooseAgent(w,token,IDS[i]);readyUp(w,token);members.push(p);
}assert.equal(launch(w,w.host),true);return {w,members};}
function investigate(w,m){at(w,m[0],'portao');assert.equal(campaignInteract(w,m[0].token),true);
 for(const [i,id] of ['fita','arquivo','sandra'].entries()){
  const p=m[i%m.length];at(w,p,id);assert.equal(campaignInteract(w,p.token),true);
  if(w.story.stage==='guard_intro'){assert.equal(w.phase,'campaign');assert.equal(campaignAckPaper(w,p.token,p.paper.id),true);advance(w,w.story.guardAt+60);assert.equal(w.phase,'fight');w.enemies=[];w.toSpawn=0;advance(w,w.lastTime+120);assert.equal(w.phase,'campaign');}
 }
 assert.equal(w.story.stage,'terminal');
}
function memoryAndChase(w,m){at(w,m[0],'terminal');assert.equal(campaignInteract(w,m[0].token,'terminal'),true);assert.equal(w.story.stage,'flashback_intro');for(let i=0;i<FLASHBACK_INTRO_LINES.length;i++)advance(w,(w.story.flashbackNextAt||Date.now())+50);assert.equal(w.story.stage,'flashback');
 w.story.stalker={x:300,y:840};for(let i=0;i<5;i++){let p=m[i%m.length];at(w,p,IDS[i]);assert.equal(campaignInteract(w,p.token),true);}
 assert.equal(w.story.stage,'basement');w.story.stalker={x:350,y:820};
 for(const p of m){at(w,p,p.agent);assert.equal(campaignInteract(w,p.token),true);}
 assert.equal(w.story.stage,'projector');at(w,m[0],'projetor');assert.equal(campaignInteract(w,m[0].token),true);assert.equal(w.story.stage,'adult_chase');
 at(w,m[0],'saida');assert.equal(campaignInteract(w,m[0].token),true);assert.equal(w.story.stage,'masks');
}
function takeMasks(w,m){for(const p of m){at(w,p,p.agent);assert.equal(campaignInteract(w,p.token),true);}assert.equal(w.story.stage,'sigils');}
function completeSigils(w,m){for(const p of m){at(w,p,p.agent);assert.equal(campaignInteract(w,p.token),true);}assert.equal(w.phase,'fight');assert.equal(w.bossKind,'confessor');}
test('sala permite cinco agentes, sexto é rejeitado',()=>{const {w}=team(5);assert.equal(Object.values(w.players).length,5);assert.equal(w.phase,'campaign');assert.throws(()=>joinRoom(w,'player6token8888','Sexto'),/PARTIDA_INICIADA/);});
test('pistas são compartilhadas, mas o papel só aparece na tela de quem coletou',()=>{const {w,members:m}=team(5);at(w,m[0],'portao');campaignInteract(w,m[0].token);at(w,m[0],'fita');campaignInteract(w,m[0].token);const one=snapshot(w,m[0].token),two=snapshot(w,m[1].token);assert.match(one.story.paper.title,/FITA 03/);assert.equal(two.story.paper,null);assert.equal(two.story.evidence.length,1);assert.match(two.story.log.join(' '),/FITA 03/);});
test('pistas e guardas destravam a estação VHS, sem código',()=>{const {w,members:m}=team();investigate(w,m);assert.equal(campaignInteract(w,m[0].token),false);at(w,m[0],'terminal');assert.equal(campaignInteract(w,m[0].token,'terminal'),true);assert.equal(w.story.stage,'flashback_intro');for(let i=0;i<FLASHBACK_INTRO_LINES.length;i++)advance(w,(w.story.flashbackNextAt||Date.now())+50);assert.equal(w.story.stage,'flashback');assert.equal(w.arena,'memory');assert.equal(campaignCode(w,m[0].token,'0317'),false);});
test('2008: cinco memórias levam à arena do porão',()=>{const {w,members:m}=team();investigate(w,m);at(w,m[0],'terminal');campaignInteract(w,m[0].token);for(let i=0;i<FLASHBACK_INTRO_LINES.length;i++)advance(w,(w.story.flashbackNextAt||Date.now())+50);w.story.stalker={x:300,y:840};for(let i=0;i<5;i++){at(w,m[i],IDS[i]);campaignInteract(w,m[i].token);}assert.equal(w.story.stage,'basement');assert.equal(w.arena,'basement');assert.equal(w.story.memories.length,5);assert.equal(campaignTargets(w,m[0].token)[0].id,'solar');});
test('fuga: o mesmo caçador volta em 2025, e só a saída abre a sala das máscaras',()=>{const {w,members:m}=team();investigate(w,m);memoryAndChase(w,m);assert.equal(w.arena,'mask_room');assert.equal(w.story.stalker,null);assert.equal(snapshot(w,m[4].token).story.stage,'masks');});
test('cada agente coleta sua própria máscara e ativa o selo correspondente',()=>{const {w,members:m}=team();investigate(w,m);memoryAndChase(w,m);at(w,m[0],'feras');assert.equal(campaignInteract(w,m[0].token),false);takeMasks(w,m);assert.equal(w.story.masks.length,5);assert.match(snapshot(w,m[0].token).story.paper.title,/MÁSCARA/);assert.equal(campaignInteract(w,m[0].token,'ritual'),false);completeSigils(w,m);assert.equal(w.story.sigils.length,5);assert.equal(w.bossKind,'confessor');});
test('depois do Confessor vem boss final com três fases e não vitória antecipada',()=>{const {w,members:m}=team();investigate(w,m);memoryAndChase(w,m);takeMasks(w,m);completeSigils(w,m);w.enemies=[];w.toSpawn=0;advance(w,w.lastTime+140);assert.equal(w.phase,'campaign');assert.equal(w.story.stage,'finale_intro');advance(w,w.story.finaleAt+50);assert.equal(w.phase,'fight');assert.equal(w.bossKind,'final');assert.ok(w.enemies.some(e=>e.kind==='final'));const final=w.enemies.find(e=>e.kind==='final');final.hp=final.maxHp*.30;final.patternCd=.001;advance(w,w.lastTime+150);assert.equal(final.stage,3);assert.ok(w.enemies.filter(e=>e.kind==='nucleo').length>=3);w.enemies=[];w.toSpawn=0;advance(w,w.lastTime+150);assert.equal(w.phase,'victory');});
test('perseguição gera medo, e dash do celular funciona no servidor',()=>{const {w,members:m}=team(1);investigate(w,m);at(w,m[0],'terminal');campaignInteract(w,m[0].token);for(let i=0;i<FLASHBACK_INTRO_LINES.length;i++)advance(w,(w.story.flashbackNextAt||Date.now())+50);const p=m[0];const x=p.x;setInput(w,p.token,{x:1,y:0,dash:true});assert.ok(p.x>x);assert.ok(p.dashCd>0);w.story.stalker={x:p.x,y:p.y};w.story.huntCd=0;advance(w,w.lastTime+110);assert.ok(w.story.fear>0);});
test('reconexão preserva os registros do grupo',()=>{const {w,members:m}=team();at(w,m[0],'portao');campaignInteract(w,m[0].token);disconnect(w,m[2].token);const same=joinRoom(w,m[2].token,'Retorno');assert.strictEqual(same,m[2]);assert.equal(snapshot(w,m[2].token).story.stage,'investigation');});
test('sozinho também é possível investigar e destravar as próprias cinco etapas',()=>{const {w,members:m}=team(1);investigate(w,m);memoryAndChase(w,m);takeMasks(w,m);completeSigils(w,m);assert.equal(w.bossKind,'confessor');});
test('modo Sobrevivência não mudou com a campanha',()=>{const w=makeRoom('ABCDEFGH','nightmare','survival');const p=joinRoom(w,'player0token8888','Agente');chooseAgent(w,p.token,'solar');readyUp(w,p.token);launch(w,p.token);assert.equal(w.mode,'survival');assert.equal(w.story,null);assert.equal(w.phase,'fight');});

test('a leitura do segundo papel evita início imediato do combate',()=>{
 const {w,members:m}=team(1);at(w,m[0],'portao');campaignInteract(w,m[0].token);
 for(const id of ['fita','arquivo']){at(w,m[0],id);campaignInteract(w,m[0].token);}
 assert.equal(w.story.stage,'guard_intro');assert.equal(w.phase,'campaign');
 const wrong=campaignAckPaper(w,m[0].token,'errado');assert.equal(wrong,false);
 assert.equal(campaignAckPaper(w,m[0].token,m[0].paper.id),true);
 advance(w,w.story.guardAt+20);assert.equal(w.phase,'fight');assert.ok(w.enemies.length>=3);assert.ok(w.toSpawn>=6);
});
