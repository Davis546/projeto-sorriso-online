import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,joinRoom,chooseAgent,readyUp,launch,advance,STATS,SPRINT_FACTOR} from '../src/game.js';
const token='p1216';
function chase(stage='adult_chase'){
 const w=makeRoom('RUN1216','normal','campaign');
 const p=joinRoom(w,token,'Jogador');
 chooseAgent(w,token,'solar');readyUp(w,token);launch(w,token);
 w.story.stage=stage;
 w.story.stalker={x:p.x+250,y:p.y};
 w.story.huntCd=0;w.story.fear=0;
 return {w,p};
}
test('ocultista corre atrás do agente mais próximo (sem se teleportar)',()=>{
 const {w,p}=chase();const start=w.story.stalker.x;
 advance(w,w.lastTime+100);
 const moved=start-w.story.stalker.x;
 assert.ok(moved>20&&moved<33,`avanço do caçador em 100ms deveria ser corrida: ${moved}`);
 assert.ok(p.speed*SPRINT_FACTOR>moved*10,'jogador consegue escapar correndo');
});
test('jumpscare não remove PV nem mata o grupo mesmo com medo máximo',()=>{
 const {w,p}=chase('flashback');
 const original=p.hp;
 w.story.stalker={x:p.x+30,y:p.y};
 w.story.fear=99;
 advance(w,w.lastTime+100);
 assert.equal(p.hp,original);
 assert.equal(w.phase,'campaign');
 assert.equal(w.story.fear,100);
 assert.ok(w.story.shock>0,'jumpscare ainda deve ser exibido');
});
test('jumpscare tem recuo e cooldown para não ser disparado a cada quadro',()=>{
 const {w,p}=chase('adult_chase');
 w.story.stalker={x:p.x+30,y:p.y};
 const first=p.hp;
 advance(w,w.lastTime+100);
 const shock=w.story.shock;
 assert.ok(shock>0);
 assert.ok(w.story.huntCd>1);
 assert.equal(p.hp,first);
 advance(w,w.lastTime+100);
 assert.equal(w.story.shock,shock);
 assert.equal(p.hp,first);
});
