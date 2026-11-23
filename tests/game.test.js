import test from 'node:test';import assert from 'node:assert/strict';
import {makeRoom,joinRoom,chooseAgent,readyUp,launch,advance,pickCard,setInput,disconnect,snapshot,STATS,CARD_CHOICE_MS,BETWEEN_WAVES_S,REWARD_WAIT_MS,ENERGY_INTRO_MS,ENERGY_PHASE_2_AT,ENERGY_PHASE_3_AT} from '../src/game.js';
const t=i=>'token_jogador_'+i;
function revealCards(w){assert.equal(w.phase,'reward_wait');w.lastTime=w.rewardDeadline-1;advance(w,w.rewardDeadline);assert.equal(w.phase,'cards');}
function advanceNext(w){revealCards(w);for(const p of Object.values(w.players))if(p.agent&&p.connected)pickCard(w,p.token,0);assert.equal(w.phase,'between');w.between=.01;w.lastTime=Date.now()-150;advance(w,Date.now());}
function build(num=5){const w=makeRoom('ABCD2345');const ids=['solar','ritual','alvo','feras','lunar'];for(let i=0;i<num;i++){joinRoom(w,t(i),'Agente '+i);assert.equal(chooseAgent(w,t(i),ids[i]),true);readyUp(w,t(i));}assert.equal(launch(w,t(0)),true);return w;}
test('lobby reserva personagens e limita 5 jogadores',()=>{const w=makeRoom('ABCD2345');for(let i=0;i<5;i++)joinRoom(w,t(i),'Agente '+i);assert.throws(()=>joinRoom(w,t(5),'Excedente'),/SALA_CHEIA/);assert.equal(chooseAgent(w,t(0),'solar'),true);assert.equal(chooseAgent(w,t(1),'solar'),false);assert.equal(chooseAgent(w,t(1),'lunar'),true);});
test('cinco jogadores entram com personagens diferentes e vida própria',()=>{const w=build();assert.equal(w.phase,'fight');assert.equal(w.wave,1);const chars=Object.values(w.players);assert.equal(new Set(chars.map(p=>p.agent)).size,5);assert.equal(w.players[t(2)].maxHp,STATS.alvo.hp);assert.equal(snapshot(w,t(0)).players.length,5);});
test('o servidor controla movimentação, habilidades e dano',()=>{const w=build(2);const p=w.players[t(0)];const x=p.x;setInput(w,t(0),{x:1,y:0,fire:true,skill:true,dash:true});assert.ok(p.skillCd>0);assert.ok(p.dashCd>0);w.lastTime=Date.now()-90;advance(w,Date.now());assert.ok(p.x>x);});
test('cada jogador escolhe sua carta e melhoria fica no agente',()=>{const w=build(2);w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());revealCards(w);assert.equal(w.players[t(0)].choices.length,3);assert.equal(w.players[t(1)].choices.length,3);assert.equal(pickCard(w,t(0),0),true);assert.equal(w.phase,'cards');assert.equal(pickCard(w,t(1),1),true);assert.equal(w.phase,'between');assert.equal(w.players[t(0)].upgrades.length,1);w.between=.01;w.lastTime=Date.now()-80;advance(w,Date.now());assert.equal(w.wave,2);});
test('bosses na onda 5, 10 e 15',()=>{const w=build(1);const found=[];for(let n=1;n<=15;n++){if(w.bossKind)found.push([w.wave,w.bossKind]);w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-100;advance(w,Date.now());advanceNext(w);}assert.deepEqual(found,[[5,'sol'],[10,'diretora'],[15,'tv']]);});
test('ataque supremo coletivo usa a barra e atinge monstros',()=>{const w=build(5),p=w.players[t(0)];w.ult=100;const before=w.enemies.map(e=>e.hp);setInput(w,t(0),{ult:true});assert.equal(w.ult,0);assert.ok(w.effects.some(e=>e.t==='ultimate'));assert.ok(w.enemies.every((e,i)=>e.hp<=before[i]));});
test('desconexão de agente mantém vaga para reconexão',()=>{const w=build(1);disconnect(w,t(0));assert.equal(w.players[t(0)].connected,false);joinRoom(w,t(0),'Agente 0');assert.equal(w.players[t(0)].connected,true);assert.equal(w.players[t(0)].agent,'solar');});

test('10 segundos de escolha de carta, depois carta automática e 1 segundo de pausa',()=>{
 const w=build(3);
 w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());
 revealCards(w);
 assert.ok(Math.abs(w.cardDeadline-w.rewardDeadline-CARD_CHOICE_MS)<1000);
 assert.equal(pickCard(w,t(0),1),true);
 assert.equal(w.phase,'cards');
 // Ninguem precisa esperar o jogador ausente depois dos dez segundos.
 w.lastTime=w.cardDeadline-100;
 advance(w,w.cardDeadline-1);
 assert.equal(w.phase,'cards');
 advance(w,w.cardDeadline);
 assert.equal(w.phase,'between');
 assert.equal(w.between,BETWEEN_WAVES_S);
 for(const p of Object.values(w.players)){
  assert.equal(p.chosen,true);
  assert.equal(p.upgrades.length,1);
 }
 assert.equal(pickCard(w,t(1),0),false);
 w.lastTime=Date.now()-80;
 w.between=.02;
 advance(w,Date.now());
 assert.equal(w.phase,'fight');
 assert.equal(w.wave,2);
});
test('pausa de 1 segundo usa tempo real e nao tempo artificial do simulador',()=>{
 const w=build(1);w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-100;advance(w,Date.now());
 revealCards(w);assert.equal(pickCard(w,t(0),0),true);
 assert.equal(w.phase,'between');
 const afterOneSecond=Date.now()+1100;w.lastTime=afterOneSecond-1100;
 advance(w,afterOneSecond);
 assert.equal(w.phase,'fight');
 assert.equal(w.wave,2);
});
test('quando todos escolhem antes do prazo, nao espera 10 segundos',()=>{
 const w=build(2);w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());
 revealCards(w);assert.equal(pickCard(w,t(0),0),true);
 assert.equal(pickCard(w,t(1),2),true);
 assert.equal(w.phase,'between');
 assert.equal(w.between,1);
});

// Curas coletadas sao objetos autoritativos do servidor, compartilhados entre os cinco agentes.
test('ao derrotar chefe nasce uma cura verde visivel para todos',()=>{
 const w=build(2);const e={id:909,kind:'sol',x:1100,y:510,hp:1,maxHp:5700};
 w.enemies=[e];w.ult=100;
 setInput(w,t(0),{ult:true});
 assert.equal(e.hp,0);
 assert.equal(w.pickups.length,1);
 assert.equal(w.pickups[0].heal,45);
 const a=snapshot(w,t(0)).pickups,b=snapshot(w,t(1)).pickups;
 assert.deepEqual(a,b);
 assert.equal(a[0].x,1100);
});
test('cura do chao e coletada por qualquer jogador ferido, uma so vez',()=>{
 const w=build(2),p=w.players[t(1)];
 p.hp=p.maxHp-55;w.pickups=[{id:123,x:p.x,y:p.y,heal:25,life:22}];
 w.lastTime=Date.now()-100;advance(w,Date.now());
 assert.equal(p.hp,p.maxHp-30);
 assert.equal(w.pickups.length,0);
 assert.ok(w.effects.some(f=>f.t==='heal'));
});
test('jogador com vida cheia nao desperdiça cura e item expira depois da duracao',()=>{
 const w=build(1),p=w.players[t(0)];
 w.pickups=[{id:234,x:p.x,y:p.y,heal:25,life:22}];
 w.lastTime=Date.now()-100;advance(w,Date.now());
 assert.equal(w.pickups.length,1);
 assert.equal(p.hp,p.maxHp);
 w.pickups[0].life=.05;
 w.lastTime=Date.now()-100;advance(w,Date.now());
 assert.equal(w.pickups.length,0);
});
test('cura permanece no chao durante escolha de cartas e transicao de ondas',()=>{
 const w=build(1),p=w.players[t(0)];
 w.pickups=[{id:456,x:p.x+90,y:p.y,heal:25,life:22}];
 w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-80;advance(w,Date.now());
 assert.equal(w.phase,'reward_wait');assert.equal(w.pickups.length,1);
 revealCards(w);assert.equal(pickCard(w,t(0),0),true);assert.equal(w.phase,'between');
 w.lastTime=Date.now()-100;advance(w,Date.now());assert.equal(w.pickups.length,1);
});

test('salas antigas criadas antes das curas nao travam apos atualizar',()=>{
 const w=build(1);delete w.pickups;assert.deepEqual(snapshot(w,t(0)).pickups,[]);
 w.lastTime=Date.now()-100;advance(w,Date.now());assert.deepEqual(w.pickups,[]);
});


test('tela de cartas espera 3 segundos completos antes de iniciar os 10 segundos',()=>{
 const w=build(2);w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());
 assert.equal(w.phase,'reward_wait');assert.ok(w.rewardDeadline>Date.now()+REWARD_WAIT_MS-200);
 assert.equal(snapshot(w,t(0)).choices.length,0);
 assert.equal(pickCard(w,t(0),0),false);
 w.lastTime=w.rewardDeadline-80;advance(w,w.rewardDeadline-1);assert.equal(w.phase,'reward_wait');
 revealCards(w);assert.equal(w.cardDeadline,w.rewardDeadline+CARD_CHOICE_MS);
});
test('modo Pesadelo e salvo por sala e monstros ficam mais fortes sem afetar Normal',()=>{
 const normal=build(1),hard=makeRoom('PESA2345','nightmare');joinRoom(hard,t(0),'Davis');chooseAgent(hard,t(0),'solar');readyUp(hard,t(0));launch(hard,t(0));
 assert.equal(snapshot(hard,t(0)).difficulty,'nightmare');assert.equal(snapshot(normal,t(0)).difficulty,'normal');
 assert.ok(hard.enemies[0]===undefined||hard.enemies[0].dmg>=0);
 normal.toSpawn=0;hard.toSpawn=0;normal.spawnCd=0;hard.spawnCd=0;
 // Comparamos chefes da onda 5 para evitar sorteio aleatorio de tipo de inimigo.
 for(let n=1;n<5;n++){
  for(const w of [normal,hard]){w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-95;advance(w,Date.now());revealCards(w);pickCard(w,t(0),0);w.between=.01;w.lastTime=Date.now()-100;advance(w,Date.now());}
 }
 const a=normal.enemies.find(e=>e.kind==='sol'),b=hard.enemies.find(e=>e.kind==='sol');
 assert.ok(b.hp>a.hp*1.49);assert.ok(b.dmg>a.dmg);
});
test('onda 20 tem arena espacial, cinematica e chefe proprio com ataques',()=>{
 const w=build(1);
 for(let n=1;n<20;n++){
  w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-95;advance(w,Date.now());
  revealCards(w);pickCard(w,t(0),0);w.between=.01;w.lastTime=Date.now()-100;advance(w,Date.now());
 }
 assert.equal(w.wave,20);assert.equal(w.bossKind,'energia');assert.equal(w.phase,'boss_intro');assert.equal(snapshot(w,t(0)).arena,'void');assert.ok(w.introDeadline-Date.now()>ENERGY_INTRO_MS-1000);
 w.lastTime=w.introDeadline-1;advance(w,w.introDeadline);assert.equal(w.phase,'fight');
 const e=w.enemies.find(e=>e.kind==='energia');assert.ok(e);assert.ok(e.hp>8500);
 e.patternCd=-.1;w.toSpawn=0;w.lastTime=Date.now()-90;advance(w,Date.now());assert.ok(w.warnings.length>0||w.shots.length>0);
 assert.equal(snapshot(w,t(0)).enemies.find(q=>q.kind==='energia').stage,1);
});
test('reliquia muda tres atos, invoca nucleos e perde invulnerabilidade apos derrota-los',()=>{
 const w=build(1);w.wave=20;w.phase='fight';w.bossKind='energia';w.arena='void';w.toSpawn=0;w.enemies=[{id:88,kind:'energia',x:765,y:490,hp:580,maxHp:9000,r:72,speed:150,dmg:38,cd:2,shoot:2,patternCd:3,phase2:false,stage:1,stun:0,armor:0,bleed:0,bleedTick:.5,move:0}];
 w.lastTime=Date.now()-100;advance(w,Date.now());
 const boss=w.enemies.find(e=>e.kind==='energia');assert.equal(boss.stage,3);assert.equal(w.enemies.filter(e=>e.kind==='nucleo').length,4);
 const before=boss.hp;w.ult=100;setInput(w,t(0),{ult:true});assert.equal(boss.hp,before);
 for(const core of w.enemies.filter(e=>e.kind==='nucleo')){core.hp=0;}
 w.lastTime=Date.now()-100;advance(w,Date.now());w.ult=100;setInput(w,t(0),{ult:true});assert.ok(boss.hp<before);
});
test('tiros carregam identificador e velocidade para animacao fluida no navegador',()=>{
 const w=build(1),p=w.players[t(0)];w.enemies=[{id:44,kind:'sangue',x:p.x+220,y:p.y,hp:100,maxHp:100,r:20,speed:0,dmg:1,cd:99,shoot:99,patternCd:99,stun:0,armor:0,bleed:0,bleedTick:.5,move:0}];w.toSpawn=0;
 setInput(w,t(0),{x:0,y:0,fire:true});w.lastTime=Date.now()-90;advance(w,Date.now());
 const shots=snapshot(w,t(0)).shots;assert.ok(shots.length>0);assert.equal(typeof shots[0].id,'number');assert.ok(Number.isFinite(shots[0].vx));
});

test('chefe novo repete nas ondas 20 e 40 sem reiniciar a contagem',()=>{
 const w=build(1);const bosses=[];
 for(let n=1;n<=40;n++){
  assert.equal(w.wave,n);
  if(w.bossKind)bosses.push([n,w.bossKind]);
  if(n===40)break;
  if(w.phase==='boss_intro'){const deadline=w.introDeadline;advance(w,deadline);}
  assert.equal(w.phase,'fight');
  w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());
  revealCards(w);pickCard(w,t(0),0);w.between=.01;w.lastTime=Date.now()-100;advance(w,Date.now());
 }
 assert.deepEqual(bosses,[[5,'sol'],[10,'diretora'],[15,'tv'],[20,'energia'],[25,'sol'],[30,'diretora'],[35,'tv'],[40,'energia']]);
});
test('modo pesadelo limita acumulacao de dano das cartas sem retirar escolhas',()=>{
 const w=makeRoom('PESA2345','nightmare'),p=joinRoom(w,t(0),'Teste');chooseAgent(w,t(0),'solar');readyUp(w,t(0));launch(w,t(0));
 for(let i=0;i<30;i++){
  if(w.phase==='boss_intro')advance(w,w.introDeadline);
  w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-90;advance(w,Date.now());revealCards(w);p.choices=[['forca','⚔️','Precisão Mortal','Dano','common']];pickCard(w,t(0),0);
  w.between=.01;w.lastTime=Date.now()-100;advance(w,Date.now());
 }
 assert.ok(p.attackBonus<=1.7+1e-6);assert.equal(p.upgrades.length,30);
});

// V12.9 — a Reliquia tem fases distintas, transicoes e zonas seguras autoritativas.
function bossSandbox(players=3,difficulty='normal'){
 const w=makeRoom('RELI1299',difficulty);const ids=['solar','ritual','alvo','feras','lunar'];
 for(let i=0;i<players;i++){joinRoom(w,t(i),'Teste '+i);chooseAgent(w,t(i),ids[i]);readyUp(w,t(i));}
 launch(w,t(0));w.phase='fight';w.wave=20;w.bossKind='energia';w.arena='void';w.toSpawn=0;w.spawnCd=99;
 w.enemies=[{id:500,kind:'energia',x:765,y:490,hp:10000,maxHp:10000,r:72,speed:170,dmg:46,cd:99,shoot:99,patternCd:99,teleportCd:99,phase2:false,stage:1,shieldStages:0,pattern:0,bleed:0,bleedTick:.5,stun:0,armor:0,move:0}];
 return w;
}
function tickBoss(w){const now=Date.now();w.lastTime=now-95;advance(w,now);}
test('Relíquia V12.9 tem três faixas distintas de vida e escudos de três/quatro núcleos',()=>{
 assert.equal(ENERGY_PHASE_2_AT,.70);assert.equal(ENERGY_PHASE_3_AT,.32);
 const w=bossSandbox(),b=w.enemies[0];
 b.hp=7100;tickBoss(w);assert.equal(b.stage,1);
 b.hp=6900;tickBoss(w);assert.equal(b.stage,2);
 assert.equal(w.enemies.filter(e=>e.kind==='nucleo').length,3);
 assert.equal(snapshot(w,t(0)).enemies.find(e=>e.kind==='energia').stage,2);
 // Simulamos destruicao dos nucleos para avancar a luta.
 for(const c of w.enemies.filter(e=>e.kind==='nucleo'))c.hp=0;
 tickBoss(w);b.hp=3100;tickBoss(w);
 assert.equal(b.stage,3);
 assert.equal(w.enemies.filter(e=>e.kind==='nucleo').length,4);
 assert.ok(w.effects.some(e=>e.t==='phase'&&e.stage===3));
});
test('Fase 1 usa lasers, trovoes e orbes; fase 2 adiciona prisao e clones',()=>{
 const w=bossSandbox();const b=w.enemies[0];
 b.patternCd=-1;tickBoss(w);assert.ok(w.warnings.some(z=>z.type==='circle'));
 w.warnings=[];b.patternCd=-1;tickBoss(w);assert.ok(w.warnings.some(z=>z.type==='beam'));
 w.shots=[];b.patternCd=-1;tickBoss(w);assert.ok(w.shots.some(z=>z.team==='bad'));
 b.hp=6900;b.patternCd=99;tickBoss(w);
 assert.equal(b.stage,2);
 // 1º ataque da fase II: prisao circular.
 b.patternCd=-1;tickBoss(w);assert.ok(w.warnings.some(z=>z.type==='ring'));
});
test('Fase 3 tem colapso com dois refugios, lasers cruzados e espiral',()=>{
 const w=bossSandbox(),b=w.enemies[0];b.stage=3;b.phase2=true;b.hp=3100;b.pattern=0;
 for(let i=0;i<4;i++){
  b.patternCd=-1;tickBoss(w);
 }
 const safe=w.warnings.find(z=>z.type==='outside2');
 assert.ok(safe);assert.ok(safe.x!==safe.x2);assert.ok(safe.duration>=3);
 assert.ok(w.warnings.some(z=>z.type==='beam'));
 assert.ok(w.shots.some(z=>z.team==='bad'));
 assert.ok(w.shots.length<=165);
});
test('colapso acerta jogadores fora dos dois refugios, mas preserva quem esta dentro',()=>{
 const w=bossSandbox(),b=w.enemies[0];b.stage=3;b.hp=3100;b.patternCd=99;b.shoot=99;b.cd=99;
 const [p1,p2,p3]=Object.values(w.players);
 Object.assign(p1,{x:475,y:596,inv:0});Object.assign(p2,{x:1060,y:596,inv:0});Object.assign(p3,{x:765,y:800,inv:0});
 const hp=[p1.hp,p2.hp,p3.hp];
 w.warnings=[{type:'outside2',id:800,x:475,y:596,x2:1060,y2:596,r:202,dmg:40,duration:3.1,life:.02,color:'#e6a6ff'}];
 tickBoss(w);
 assert.equal(p1.hp,hp[0]);assert.equal(p2.hp,hp[1]);assert.ok(p3.hp<hp[2]);
});
test('modo Pesadelo aumenta a vida da Relíquia e mantém a OST e curas',()=>{
 const normal=bossSandbox(1),night=bossSandbox(1,'nightmare');
 // Boss real usa o fator de vida que foi aumentado em V12.9.
 normal.enemies=[];night.enemies=[];
 normal.phase=night.phase='between';normal.wave=night.wave=19;
 normal.between=night.between=.01;
 tickBoss(normal);tickBoss(night);
 assert.equal(normal.phase,'boss_intro');assert.equal(night.phase,'boss_intro');
 advance(normal,normal.introDeadline);advance(night,night.introDeadline);
 const a=normal.enemies.find(e=>e.kind==='energia'),b=night.enemies.find(e=>e.kind==='energia');
 assert.ok(a.maxHp>=12800);assert.ok(b.maxHp>=a.maxHp*1.49);
 assert.ok(Array.isArray(snapshot(normal,t(0)).pickups));
});

// V12.10: Pesadelo Implacável, sem alterar o modo Normal.
test('Pesadelo V12.10 escala HP, dano e velocidade, mantendo onda Normal',()=>{
 const normal=build(1),night=makeRoom('IMPL1210','nightmare');
 joinRoom(night,t(0),'Teste');chooseAgent(night,t(0),'solar');readyUp(night,t(0));launch(night,t(0));
 for(const room of [normal,night]){
  room.wave=4;room.toSpawn=0;room.enemies=[];room.phase='between';room.between=.01;
  room.lastTime=Date.now()-100;advance(room,Date.now());
 }
 const a=normal.enemies.find(e=>e.kind==='sol'),b=night.enemies.find(e=>e.kind==='sol');
 assert.ok(a&&b);assert.ok(b.maxHp>=a.maxHp*1.94);
 assert.ok(b.dmg>=a.dmg*1.50);assert.ok(b.speed>a.speed);
 assert.equal(normal.difficulty,'normal');assert.equal(night.difficulty,'nightmare');
});
test('Pesadelo tem menos recuperacao entre ondas, sem retirar curas do chao',()=>{
 const normal=build(1),night=makeRoom('IMPL1211','nightmare');
 joinRoom(night,t(0),'Teste');chooseAgent(night,t(0),'solar');readyUp(night,t(0));launch(night,t(0));
 for(const room of [normal,night]){
  const p=room.players[t(0)];p.hp=95;
  room.pickups=[{id:999,x:p.x+100,y:p.y,heal:25,life:22}];
  room.toSpawn=0;room.enemies=[];room.lastTime=Date.now()-90;advance(room,Date.now());
 }
 assert.ok(normal.players[t(0)].hp>night.players[t(0)].hp);
 assert.equal(night.pickups.length,1);
 assert.equal(normal.phase,'reward_wait');assert.equal(night.phase,'reward_wait');
});
test('Pesadelo V12.10 limita cartas de projeteis e dano, modo Normal mantido',()=>{
 const normal=build(1),night=makeRoom('IMPL1212','nightmare');
 joinRoom(night,t(0),'Teste');chooseAgent(night,t(0),'solar');readyUp(night,t(0));launch(night,t(0));
 for(let i=0;i<12;i++)for(const room of [normal,night]){
  room.toSpawn=0;room.enemies=[];room.lastTime=Date.now()-90;advance(room,Date.now());
  revealCards(room);const p=room.players[t(0)];p.choices=[['duplo','🔫','Tiro Gemêo','+1','epic']];pickCard(room,t(0),0);
  room.between=.01;room.lastTime=Date.now()-100;advance(room,Date.now());
 }
 assert.equal(night.players[t(0)].projectiles,2);
 assert.equal(normal.players[t(0)].projectiles,4);
});

test('Tenacidade em Pesadelo tem limite de PV e melhora cura, não escala infinitamente',()=>{
 const w=makeRoom('IMPL1213','nightmare'),p=joinRoom(w,t(0),'Teste');chooseAgent(w,t(0),'solar');readyUp(w,t(0));launch(w,t(0));
 for(let i=0;i<20;i++){
  if(w.phase==='boss_intro')advance(w,w.introDeadline);
  w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-80;advance(w,Date.now());
  revealCards(w);p.choices=[['vigor','🛡️','Tenacidade','+25 PV máximo','common']];pickCard(w,t(0),0);
  w.between=.01;w.lastTime=Date.now()-90;advance(w,Date.now());
 }
 assert.equal(p.maxHp,STATS.solar.hp+240);
 p.hp=50;w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-80;advance(w,Date.now());revealCards(w);p.choices=[['vigor','🛡️','Tenacidade','Cura extra','common']];pickCard(w,t(0),0);
 assert.equal(p.maxHp,STATS.solar.hp+240);
 assert.ok(p.hp>=70);
});
test('a cura do agente Lunar e o bonus das cartas têm teto em Pesadelo',()=>{
 const w=makeRoom('IMPL1214','nightmare'),p=joinRoom(w,t(0),'Lunar');chooseAgent(w,t(0),'lunar');readyUp(w,t(0));launch(w,t(0));
 for(let i=0;i<8;i++){
  if(w.phase==='boss_intro')advance(w,w.introDeadline);
  w.toSpawn=0;w.enemies=[];w.lastTime=Date.now()-80;advance(w,Date.now());revealCards(w);p.choices=[['heal','💗','Luz de Cura','buff','rare']];pickCard(w,t(0),0);w.between=.01;w.lastTime=Date.now()-90;advance(w,Date.now());
 }
 assert.equal(p.healBonus,75);p.hp=80;p.skillCd=0;setInput(w,t(0),{skill:true});assert.ok(p.hp<155);
});
