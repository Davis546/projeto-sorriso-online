import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {makeRoom,joinRoom,chooseAgent,readyUp,launch,campaignInteract,CAMPAIGN_STATIONS,advance,snapshot,FLASHBACK_INTRO_LINES,setInput} from '../src/game.js';
const client=readFileSync(new URL('../public/client.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const testRoom=()=>{const w=makeRoom('TESTCUT1','normal','campaign');const p=joinRoom(w,'token-c1','Teste');chooseAgent(w,p.token,'solar');readyUp(w,p.token);launch(w,p.token);w.story.stage='terminal';const terminal=CAMPAIGN_STATIONS.find(s=>s.id==='terminal');p.x=terminal.x;p.y=terminal.y;return {w,p};};
test('cutscene real aparece no jogo com os cinco sprites de crianças',()=>{
 assert.match(html,/id="memoryCutscene"/);assert.match(html,/id="memorySpeaker"/);assert.match(html,/id="memoryLine"/);assert.match(html,/id="memoryActors"/);
 for(const agent of ['solar','ritual','alvo','feras','lunar']){
  assert.match(html,new RegExp('data-actor="'+agent+'"'));
  assert.ok(statSync(new URL('../public/assets/adolescente-'+agent+'.png',import.meta.url)).size>2500);
 }
 assert.match(client,/function updateMemoryCutscene\(w\)/);
 assert.match(client,/updateMemoryCutscene\(w\)/);
 assert.match(css,/\.memory-actor\.speaking/);
 assert.match(css,/#memoryCutscene\[hidden\]/);
});
test('diálogo e personagem ativo são sincronizados no estado do servidor',()=>{
 const {w,p}=testRoom();assert.equal(campaignInteract(w,p.token,'terminal'),true);
 let state=snapshot(w,p.token);assert.equal(state.story.stage,'flashback_intro');assert.equal(state.story.flashbackSpeaker,'NARRAÇÃO');
 assert.match(state.story.flashbackLine,/TV Paulista/);assert.equal(state.story.flashbackTotal,FLASHBACK_INTRO_LINES.length);
 for(let i=1;i<FLASHBACK_INTRO_LINES.length;i++){
  advance(w,w.story.flashbackNextAt+10);state=snapshot(w,p.token);
  assert.equal(state.story.flashbackSpeaker,FLASHBACK_INTRO_LINES[i].speaker);
  assert.equal(state.story.flashbackLine,FLASHBACK_INTRO_LINES[i].line);
  assert.equal(state.story.stage,'flashback_intro');
 }
 advance(w,w.story.flashbackNextAt+10);assert.equal(w.story.stage,'flashback');assert.equal(w.arena,'memory');
});
test('durante a cutscene ninguém consegue se mover ou usar esquiva',()=>{
 const {w,p}=testRoom();campaignInteract(w,p.token,'terminal');const {x,y}=p;
 setInput(w,p.token,{x:1,y:1,dash:true,run:true});advance(w,w.lastTime+95);
 assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(p.dashCd,0);
});
