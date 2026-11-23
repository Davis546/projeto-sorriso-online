// Projeto Sorriso Online V12.19 — sobreviver ou jogar campanha cooperativa.
// Não usa módulos externos, pode ser testado com Node.
export const IDS = ['solar','ritual','alvo','feras','lunar'];
export const STATS = {
 solar:{hp:190,speed:225,damage:84,rate:.85,skill:9},
 ritual:{hp:175,speed:218,damage:34,rate:.52,skill:10},
 alvo:{hp:240,speed:245,damage:72,rate:.49,skill:10},
 feras:{hp:250,speed:230,damage:15,rate:.63,skill:10},
 lunar:{hp:185,speed:228,damage:34,rate:.61,skill:12}
};
export const CARD_CHOICE_MS=10_000;
export const INTERACT_RADIUS=110; // Alcance mais justo para não interagir de longe demais.
export const SPRINT_FACTOR=1.64, SPRINT_DRAIN=35, SPRINT_REGEN=23;
export const PLAYER_CONTACT_RADIUS=14;
export function contactRadius(enemy){
 // O raio visual do boss (e.r) NÃO deve virar dano ao redor dele sem contato.
 const core=enemy.r*(BOSS_KINDS.includes(enemy.kind)?0.49:0.64);
 return PLAYER_CONTACT_RADIUS + Math.min(BOSS_KINDS.includes(enemy.kind)?39:29,core);
}

export const REWARD_WAIT_MS=3_000, ENERGY_INTRO_MS=4_800;
export const BOSS_KINDS=['sol','diretora','tv','energia','confessor','final'];
export const CYCLE_BOSSES=['sol','diretora','tv','energia'];
// Capítulo 1: coordenadas compartilhadas para objetos de investigação, lembranças e máscaras.
export const CAMPAIGN_STATIONS=Object.freeze([
 {id:'portao',x:755,y:740,label:'RECEPÇÃO',range:118,click:90},
 {id:'fita',x:320,y:405,label:'FITA VHS 03',range:98,click:68},
 {id:'arquivo',x:1142,y:382,label:'ARQUIVO 17',range:104,click:74},
 {id:'sandra',x:1048,y:691,label:'SANDRA',range:108,click:80},
 {id:'terminal',x:765,y:418,label:'ESTAÇÃO VHS',range:110,click:82},
 {id:'solar',x:350,y:515,label:'SOLAR',range:92,click:64},
 {id:'ritual',x:535,y:445,label:'RITUAL',range:92,click:64},
 {id:'alvo',x:765,y:407,label:'ALVO',range:92,click:64},
 {id:'feras',x:1110,y:520,label:'FERAS',range:92,click:64},
 {id:'lunar',x:970,y:735,label:'LUNAR',range:92,click:64},
 {id:'projetor',x:765,y:632,label:'PROJETOR 08',range:110,click:86},
 {id:'saida',x:1230,y:385,label:'SAÍDA DE EMERGÊNCIA',range:126,click:96}
]);
export const CAMPAIGN_MEMORY=Object.freeze({
 solar:'SOLAR • O adolescente sério mantinha os cinco unidos. Ele registrou que o apresentador Sol prometeu liberdade para o último sobrevivente. Sua essência acabaria presa na máscara solar.',
 ritual:'RITUAL • Página rasgada: o adolescente conhecia selos e lentes. Descobriu que cinco pessoas em frente às câmeras alimentariam uma transmissão que não deveria existir.',
 alvo:'ALVO • Bilhete manchado: ele se ofereceu para lutar primeiro para não entregar os amigos. Nas paredes da arena, alguém marcava cada derrota como um programa.',
 feras:'FERAS • Adolescente agressivo, mas protetor dos amigos. Quando Sol trancou todos na arena, ele tentou arrombar a porta. Seu último grito ficou retido na máscara de Feras.',
 lunar:'LUNAR • Diário da quinta amiga: nenhuma máscara é um objeto comum. A essência de cada adolescente foi gravada pelo ritual de Telópsia depois da arena. O sinal ainda os aprisiona.'
});
const storyState=()=>({chapter:1,stage:'entrance',evidence:[],memories:[],anchors:[],masks:[],sigils:[],eventSeq:0,shock:0,objective:'Encontrem a RECEPÇÃO. Aproxime-se e pressione E / INTERAGIR.',text:'2025. A TV Paulista está fechada, mas a transmissão nunca parou.',log:['Sandra: Não deixem as câmeras encontrarem Yuri.'],stalker:{x:765,y:380},huntCd:0,fear:0});
const setStory=(w,stage,objective,text,entry)=>{const st=w.story;st.stage=stage;st.objective=objective;st.text=text;w.message=text;if(entry){st.log.push(entry);if(st.log.length>28)st.log.shift();}};
const inCampaign=w=>w.mode==='campaign'&&w.story;
const engagedAgents=w=>Object.values(w.players).filter(p=>p.connected&&p.agent&&p.hp>0);
// Papéis individuais: somente quem coletou vê a folha automaticamente. A descoberta
// permanece no diário compartilhado, incluindo após reconexão.
const givePaper=(w,p,id,title,body)=>{
 const st=w.story;st.eventSeq=(st.eventSeq||0)+1;
 p.paper={id:`${w.code}-${st.eventSeq}-${id}`,title,body,category:id.startsWith('mem')?'MEMÓRIA':'DOCUMENTO'};
};
const storyShock=(w,text)=>{w.story.shock=(w.story.shock||0)+1;w.message=text;};
const storyGoTo=(w,arena,stage,objective,text,log)=>{
 w.arena=arena;
 for(const [i,p] of engagedAgents(w).entries()){
  p.x=520+i*100;p.y=825+(i%2)*9;
  p.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};
 }
 setStory(w,stage,objective,text,log);
};
// O caçador não pode ser eliminado: no passado fugimos, no presente os tiros
// apenas o atrasam. A simulação e os sustos são autoritativos no servidor.
const HUNT_STAGES=new Set(['flashback','basement','projector','adult_chase']);
// Fases da Reliquia: 100–70%, 70–32% e 32–0%.
export const ENERGY_PHASE_2_AT=.70, ENERGY_PHASE_3_AT=.32;
export const BETWEEN_WAVES_S=1;
// Pesadelo Implacável: mais perigo por inimigo, sem lotar a arena de objetos.
export const NIGHTMARE_RULES=Object.freeze({
 hpBase:1.95, hpFromCards:.055, hpCardBonusCap:.85,
 damageFactor:1.55, speedFactor:1.10, spawnMultiplier:1.16,
 firstSpawnDelay:.68, spawnDelayFactor:.80, bossPatternFactor:.78,
 enemyShootFactor:.78, bossShootFactor:.83,
 waveRecovery:.05, knockoutRecovery:.25, attackBonusCap:1.15,
 extraProjectileCap:2, shotgunExtraCap:4, coreHpFactor:1.8,
 maxHealthBonus:240, healthCardGain:25, healCardOverflow:20,
 healBonusCap:75, moveBonusCap:.55, meleeRangeCap:100
});
// Curas de chão recuperadas da V11, equilibradas para coop online.
export const HEAL_DROP_CHANCE=.12, HEAL_DROP_PV=25, BOSS_HEAL_PV=45, HEAL_DROP_DURATION=22;
const B={l:155,r:1380,t:310,b:900}, rnd=(a,b)=>a+Math.random()*(b-a), clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const stationRange=z=>z?.range||INTERACT_RADIUS;
const inStationRange=(p,z)=>d2(p,z)<=stationRange(z);
// Cenas compartilhadas com todos os jogadores, exibidas em tela cheia pelo cliente.
// A troca de linha ocorre no servidor para evitar diálogos diferentes no multiplayer.
export const FLASHBACK_INTRO_LINES=Object.freeze([
 {speaker:'NARRAÇÃO',line:'2008. Nos bastidores da TV Paulista, cinco crianças aguardam uma gravação. A porta do estúdio se fecha sozinha.',duration:3700,objective:'O passado desperta dentro da fita VHS.'},
 {speaker:'FERAS',line:'Vocês ouviram a porta? Disseram que seria um programa infantil... por que tem tantas câmeras?',duration:3400,objective:'Os cinco ainda estão nos bastidores da TV Paulista.'},
 {speaker:'SOLAR',line:'Olhem pra mim. Ninguém vai ficar sozinho aqui. A gente encontra uma saída juntos.',duration:3450,objective:'O jovem loiro tenta manter seus amigos calmos.'},
 {speaker:'LUNAR',line:'Você sempre ilumina o caminho dos outros... igual um sol. Vou te chamar de Solar!',duration:3600,objective:'Nasce o primeiro apelido: Solar.'},
 {speaker:'SOLAR',line:'Solar? Gostei. Mas só vale se cada um escolher um nome. Assim as câmeras não vão saber quem somos.',duration:3950,objective:'Os amigos decidem inventar nomes para se proteger.'},
 {speaker:'RITUAL',line:'Tem símbolos riscados debaixo da mesa. Isso parece um ritual, não um cenário de televisão.',duration:3500,objective:'Um dos garotos percebe algo paranormal.'},
 {speaker:'ALVO',line:'Então você é o Ritual! E aquele ali, que só quer bater em tudo, parece uma fera.',duration:3300,objective:'Ritual ganha seu nome e o próximo apelido começa.'},
 {speaker:'FERAS',line:'Feras, hein? Pode ser! E você sempre se coloca na frente dos outros... vai ser Alvo!',duration:3600,objective:'O grupo batiza Feras e Alvo.'},
 {speaker:'ALVO',line:'Alvo? Que nome horrível... Tá bom, eu aceito. Mas eu prometo proteger vocês.',duration:3550,objective:'Alvo esconde o medo com uma promessa.'},
 {speaker:'SOLAR',line:'Só falta você. Qual vai ser seu nome?',duration:2600,objective:'Solar se vira para a amiga mais quieta.'},
 {speaker:'LUNAR',line:'Lunar. A lua aparece até quando tudo fica escuro. Quero que vocês lembrem de mim assim.',duration:3850,objective:'Lunar escolhe o último apelido.'},
 {speaker:'SOLAR',line:'Solar, Ritual, Alvo, Feras e Lunar. Repitam. Se separarem a gente, esses nomes vão nos trazer de volta.',duration:4250,objective:'O pacto das cinco crianças está formado.'},
 {speaker:'APRESENTADOR',line:'Que emocionante, meus pequenos astros! Agora... todos para o palco. O nosso programa vai começar!',duration:3650,objective:'A voz de Sol Sorridente invade os alto-falantes.'},
 {speaker:'NARRAÇÃO',line:'A luz vermelha das câmeras acende. Os cinco correm para o corredor — e uma sombra começa a persegui-los.',duration:3500,objective:'A gravação termina. Prepare-se para escapar do perseguidor.'}
]);
const activeP=w=>Object.values(w.players).filter(p=>p.connected&&p.agent&&p.hp>0);
export function makeRoom(code,difficulty='normal',mode='survival'){return {code,difficulty:difficulty==='nightmare'?'nightmare':'normal',mode:mode==='campaign'?'campaign':'survival',story:null,host:null,phase:'lobby',wave:0,players:{}, enemies:[],shots:[],warnings:[],effects:[],pickups:[],toSpawn:0,spawnCd:0,between:0,bossKind:null,arena:'studio',gravity:null,introDeadline:0,rewardDeadline:0,ult:0,cardDeadline:0,seq:0,lastTime:Date.now(),message:'Esperando agentes',bossSeen:false};}
export function joinRoom(w,token,name){
 const old=w.players[token]; if(old){old.connected=true;return old;}
 if(w.phase!=='lobby')throw Error('PARTIDA_INICIADA');
 if(Object.keys(w.players).length>=5)throw Error('SALA_CHEIA');
 const p={token,name:String(name||'Agente').trim().slice(0,18)||'Agente',agent:null,ready:false,connected:true,
 x:700,y:620,hp:0,maxHp:0,shield:0,cd:0,skillCd:0,dashCd:0,inv:0,dir:0,fx:0,damage:0,speed:0,rate:1,skill:10,upgrades:[],choices:[],chosen:false,paper:null,attackBonus:0,moveBonus:0,healBonus:0,projectiles:0,crit:0,range:0,bleed:0,attackHolding:false,stamina:100,running:false,inp:{x:0,y:0,run:false,fire:false,aim:0,ts:0}};
 w.players[token]=p;if(!w.host)w.host=token;return p;
}
export function chooseAgent(w,token,agent){const p=w.players[token];if(!p||w.phase!=='lobby'||!IDS.includes(agent))return false;
 if(Object.values(w.players).some(o=>o!==p&&o.agent===agent))return false;
 p.agent=agent;p.ready=false;return true;
}
export function readyUp(w,token){const p=w.players[token];if(p&&w.phase==='lobby'&&p.agent)p.ready=!p.ready;}
export function disconnect(w,token){const p=w.players[token];if(!p)return;p.connected=false;p.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};
 if(w.phase==='lobby'){delete w.players[token];if(w.host===token)w.host=Object.keys(w.players)[0]||null;}else if(w.host===token){w.host=Object.values(w.players).find(q=>q.connected)?.token||token;}
}
export function launch(w,token){if(w.host!==token||w.phase!=='lobby')return false;const ps=Object.values(w.players);if(!ps.length||ps.some(p=>!p.agent||!p.connected||!p.ready))return false;
 ps.forEach((p,i)=>{const s=STATS[p.agent];Object.assign(p,{x:560+i*90,y:560+(i%2)*65,hp:s.hp,maxHp:s.hp,damage:s.damage,speed:s.speed,rate:s.rate,skill:s.skill,cd:0,skillCd:0,dashCd:0,inv:0,shield:0,fx:0,attackBonus:0,moveBonus:0,healBonus:0,projectiles:0,crit:0,range:0,bleed:0,stamina:100,running:false,upgrades:[],chosen:false,choices:[],difficulty:w.difficulty});});
 w.ult=0;w.wave=0;w.pickups=[];
 if(w.mode==='campaign'){
  w.story=storyState();w.phase='campaign';w.arena='archive';w.bossKind=null;w.message='CAPÍTULO 1 • SINAL PERDIDO';w.toSpawn=0;
  ps.forEach((p,i)=>{p.x=520+i*95;p.y=835+(i%2)*12;p.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};});
 }else startWave(w);return true;
}
function startWave(w){
 w.wave++;w.bossKind=w.wave%5===0?CYCLE_BOSSES[((w.wave/5)-1)%CYCLE_BOSSES.length]:null;
 w.arena=w.bossKind==='energia'?'void':'studio';w.gravity=null;w.bossSeen=false;
 w.phase=w.bossKind==='energia'?'boss_intro':'fight';
 w.introDeadline=w.phase==='boss_intro'?Date.now()+ENERGY_INTRO_MS:0;
 const harder=w.difficulty==='nightmare'?NIGHTMARE_RULES.spawnMultiplier:1;
 w.toSpawn=Math.ceil((w.bossKind?7+Math.floor(w.wave/4):8+Math.min(22,Math.floor(w.wave*2.1)))*harder);
 w.spawnCd=w.difficulty==='nightmare'?NIGHTMARE_RULES.firstSpawnDelay:.9;w.message=w.bossKind==='energia'?'RELIQUIA DE ENERGIA DESPERTA':w.bossKind?'O CHEFE ESTÁ NA TRANSMISSÃO':'ONDA '+String(w.wave).padStart(2,'0');
 w.warnings=[];w.shots=[];w.effects=[];
 if(w.bossKind==='energia'){
  Object.values(w.players).forEach((p,i)=>{if(!p.agent||p.hp<=0)return;p.x=575+(i%3)*160;p.y=675+Math.floor(i/3)*75;p.inp={x:0,y:0,run:false,fire:false,aim:0,ts:Date.now()};});
 }else if(w.bossKind)spawn(w,w.bossKind);
}
function spawn(w,kind){if(!kind){const r=Math.random();kind=w.difficulty==='nightmare'?(r<.16?'sangue':r<.26?'rastejante':r<.47?'monitor':r<.68?'cacador':r<.85?'bruto':'devoto'):(r<.30?'sangue':r<.50?'rastejante':r<.70?'monitor':r<.84?'cacador':r<.94?'bruto':'devoto')}
 const boss=BOSS_KINDS.includes(kind),types={sangue:[110,95,17,20],rastejante:[80,150,13,18],monitor:[160,78,19,24],cacador:[205,156,24,21],bruto:[340,80,31,28],devoto:[230,75,20,24],eco:[230,165,22,25],nucleo:[650,0,0,30],sol:[5700,90,33,58],diretora:[6600,105,34,56],tv:[8000,130,43,58],energia:[12800,171,46,72],confessor:[3400,105,29,53],final:[17200,140,53,74]};
 const [hp,speed,dmg,r]=types[kind],m=boss?1+Math.floor(w.wave/15)*.22:1+Math.max(0,w.wave-1)*.10;
 const nightmare=w.difficulty==='nightmare';
 const power=nightmare?Math.min(NIGHTMARE_RULES.hpCardBonusCap,Object.values(w.players).filter(p=>p.agent).reduce((a,p)=>a+p.upgrades.length,0)/Math.max(1,Object.values(w.players).filter(p=>p.agent).length)*NIGHTMARE_RULES.hpFromCards):0;
 const hpFactor=nightmare?(NIGHTMARE_RULES.hpBase+power):1,damageFactor=nightmare?NIGHTMARE_RULES.damageFactor:1;
 const edge=Math.floor(rnd(0,4));const x=edge===0?B.l:edge===1?B.r:rnd(B.l+50,B.r-50), y=edge===2?B.t:edge===3?B.b:rnd(B.t+50,B.b-50);
 w.enemies.push({id:++w.seq,kind,x:boss?765:x,y:boss?490:y,hp:Math.round(hp*m*hpFactor),maxHp:Math.round(hp*m*hpFactor),speed:speed*(boss?1:Math.min(1.5,1+w.wave*.012))*(nightmare?NIGHTMARE_RULES.speedFactor:1),dmg:Math.round((dmg+Math.floor(w.wave/5)*2)*damageFactor),r,cd:rnd(0,1),shoot:rnd(.4,2)*(nightmare?NIGHTMARE_RULES.enemyShootFactor:1),patternCd:boss?(nightmare?2.2*NIGHTMARE_RULES.bossPatternFactor:2.2):3,teleportCd:2,phase2:false,stage:1,shieldStages:0,pattern:0,bleed:0,bleedTick:.5,stun:0,armor:0,move:0});
}
function near(w,p,max=900){let target=null,best=max;const shielded=w.enemies.some(e=>e.kind==='nucleo'&&e.hp>0);for(const e of w.enemies){if(shielded&&e.kind!=='nucleo')continue;const d=d2(p,e);if(e.hp>0&&d<best){best=d;target=e}}return target;}
function addEffect(w,fx){w.effects.push({...fx,createdAt:Date.now()});if(w.effects.length>60)w.effects.splice(0,w.effects.length-60);}
function dmgEnemy(w,e,amount,p){if(!e||e.hp<=0)return;
 const boss=BOSS_KINDS.includes(e.kind);
 if(['energia','final'].includes(e.kind)&&w.enemies.some(q=>q.kind==='nucleo'&&q.hp>0))return;
 let d=amount*(e.armor>0?.66:1);
 if(boss)d=Math.min(d,210)*(e.phase2?.82:1);const before=e.hp;e.hp=Math.max(0,e.hp-d);
 if(p){w.ult=clamp(w.ult+Math.min(2,(before-e.hp)*.012),0,100)}
 if(e.hp===0){
  if(e.kind==='nucleo'){
   const guardian=w.enemies.find(q=>['energia','final'].includes(q.kind)&&q.hp>0);
   if(guardian&&!w.enemies.some(q=>q!==e&&q.kind==='nucleo'&&q.hp>0)){
    guardian.stun=2.8;guardian.armor=0;w.message='ESCUDO DE ENERGIA QUEBRADO';addEffect(w,{t:'shieldbreak',x:guardian.x,y:guardian.y,id:++w.seq});
   }
  }
  if(e.kind==='eco')warn(w,{type:'circle',x:e.x,y:e.y,r:54,dmg:Math.round(e.dmg*.7),duration:.75,color:'#b08aff'});
  w.ult=clamp(w.ult+(boss?16:2),0,100);
  addEffect(w,{t:'kill',x:e.x,y:e.y,id:++w.seq});
  // A morte e decidida pelo servidor. Todo cliente ve e disputa a mesma cura.
  const drops=w.pickups??=[];
  if(boss||(e.kind!=='nucleo'&&e.kind!=='eco'&&Math.random()<HEAL_DROP_CHANCE)){
   // O chefe deixa cura garantida; caso o chão esteja lotado, substitui a mais antiga.
   if(drops.length>=24&&boss)drops.shift();
   if(drops.length<24)drops.push({id:++w.seq,x:e.x,y:e.y,heal:boss?BOSS_HEAL_PV:HEAL_DROP_PV,life:HEAL_DROP_DURATION});
  }
 }
}
function hurt(p,d){if(p.hp<=0||p.inv>0)return;let amt=Math.max(0,d-(p.shield>0?0:0));if(p.shield>0){const s=Math.min(p.shield,amt);p.shield-=s;amt-=s;}p.hp=Math.max(0,p.hp-amt);p.inv=.35;}
function addShot(w,x,y,dx,dy,team,dmg,color,speed=550,life=1.5,r=8,owner=null,range=0){if(w.shots.length>=165)return;const m=Math.hypot(dx,dy)||1;w.shots.push({id:++w.seq,x,y,vx:dx/m*speed,vy:dy/m*speed,team,dmg,color,life,r,owner,range});}
function fire(w,p){const e=near(w,p,p.agent==='solar'?1020:630);if(!e)return;
 const a=Math.atan2(e.y-p.y,e.x-p.x);p.dir=a;p.cd=p.rate*(p.fx>0?.65:1);const bonus=1+p.attackBonus;
 if(p.agent==='alvo'){
  for(const q of w.enemies){if(q.hp<=0)continue;const d=d2(p,q),an=Math.atan2(q.y-p.y,q.x-p.x);if(d<112+p.range+q.r&&Math.cos(an-a)>.45){dmgEnemy(w,q,(p.damage*bonus)*(Math.random()<p.crit?1.75:1),p);q.bleed=Math.max(q.bleed,2+p.bleed);q.stun=.12;}}
  addEffect(w,{t:'axe',x:p.x,y:p.y,a,id:++w.seq});
 }else if(p.agent==='feras'){
  for(let i=0;i<7+p.projectiles;i++){const ang=a+(i-(6+p.projectiles)/2)*.11;addShot(w,p.x,p.y,Math.cos(ang),Math.sin(ang),'good',p.damage*bonus,'#ff7986',770,.43,5,p.token)}
 }else if(p.agent==='ritual'||p.agent==='lunar'){
  for(let i=0;i<1+p.projectiles;i++){const aa=a+(i-(p.projectiles)/2)*.12;addShot(w,p.x,p.y,Math.cos(aa),Math.sin(aa),'good',p.damage*bonus,p.agent==='ritual'?'#cf99ff':'#ffc3e9',580,1.4,9,p.token)}
 }else{for(let i=0;i<1+p.projectiles;i++){const aa=a+(i-p.projectiles/2)*.10;addShot(w,p.x,p.y,Math.cos(aa),Math.sin(aa),'good',p.damage*bonus,'#ffe2a1',1400,1.1,6,p.token)}}
 addEffect(w,{t:'muzzle',x:p.x,y:p.y,a,id:++w.seq});
}
function skill(w,p){if(p.skillCd>0||p.hp<=0)return;p.skillCd=p.skill;const e=near(w,p,850);p.fx=.35;
 if(p.agent==='solar'&&e){for(const q of w.enemies)if(q.hp>0&&d2(e,q)<175)dmgEnemy(w,q,210*(1+p.attackBonus),p);addEffect(w,{t:'laser',x:p.x,y:p.y,x2:e.x,y2:e.y,id:++w.seq});}
 if(p.agent==='ritual'&&e){for(const q of w.enemies)if(d2(e,q)<220){dmgEnemy(w,q,120*(1+p.attackBonus),p);q.stun=.65;}addEffect(w,{t:'ritual',x:e.x,y:e.y,id:++w.seq});}
 if(p.agent==='alvo'){for(const q of w.enemies)if(d2(p,q)<205){dmgEnemy(w,q,155*(1+p.attackBonus),p);q.bleed=4+p.bleed;}p.hp=Math.min(p.maxHp,p.hp+23+p.healBonus);addEffect(w,{t:'blood',x:p.x,y:p.y,id:++w.seq});}
 if(p.agent==='feras'){p.fx=5.4;p.shield=Math.min(100,p.shield+35);addEffect(w,{t:'rage',x:p.x,y:p.y,id:++w.seq});}
 if(p.agent==='lunar'){for(const q of Object.values(w.players))if(q.hp>0){q.hp=Math.min(q.maxHp,q.hp+q.maxHp*(p.difficulty==='nightmare'?.18+p.healBonus/360:.24+p.healBonus/300));q.shield=Math.min(105,q.shield+24);}addEffect(w,{t:'heal',x:p.x,y:p.y,id:++w.seq});}
}
function bossAttack(w,e){if(e.kind==='energia')return energyAttack(w,e);if(e.kind==='final')return finalAttack(w,e);const ps=activeP(w);if(!ps.length)return;const p=ps[Math.floor(Math.random()*ps.length)];const phase=e.phase2,kind=e.kind;
 if(kind==='tv'){
  const a=rnd(0,Math.PI*2);e.x=clamp(p.x+Math.cos(a)*160,B.l+90,B.r-90);e.y=clamp(p.y+Math.sin(a)*160,B.t+85,B.b-85);
  addEffect(w,{t:'warp',x:e.x,y:e.y,id:++w.seq});
  warn(w,{type:'circle',x:p.x,y:p.y,r:phase?130:103,dmg:phase?65:48,duration:.75,color:'#ff6b88'});
  if(phase)warn(w,{type:'circle',x:clamp(p.x+70,B.l+85,B.r-85),y:p.y,r:78,dmg:38,duration:1.0,color:'#ff6b88'});
 }else if(kind==='sol'){
  const a=Math.atan2(p.y-e.y,p.x-e.x);for(let i=-1;i<=1;i++)warn(w,{type:'beam',x:e.x,y:e.y,a:a+i*(phase?.32:.45),len:900,r:phase?38:29,dmg:phase?50:37,duration:.92,color:'#ffbd75'});
 }else{
  for(let i=0;i<(phase?6:4);i++){const q=ps[i%ps.length];warn(w,{type:'circle',x:clamp(q.x+rnd(-110,110),B.l+65,B.r-65),y:clamp(q.y+rnd(-100,100),B.t+60,B.b-60),r:phase?95:70,dmg:phase?44:32,duration:.83,color:'#bb8afc'});}
 }
 if(Math.random()<.28&&w.enemies.length<15)spawn(w,'cacador');
}
// Boss final da campanha: três fases, telegráficos amplos e cooperação.
function finalAttack(w,e){
 const ps=activeP(w);if(!ps.length)return;
 const stage=e.stage||1,n=e.pattern||0,p=ps[n%ps.length];e.pattern=n+1;e.lastFinalPattern=n%4;
 const dmg=e.dmg*(stage===3?1.2:1);
 if(n%4===0){
  for(const q of ps)warn(w,{type:'circle',x:q.x,y:q.y,r:stage===3?93:72,dmg,duration:stage===3?1.2:1.6,color:'#ff748d'});
  w.message='ÚLTIMO PROGRAMA • A PLATEIA ESCOLHEU SEUS ALVOS';
 }else if(n%4===1){
  const a=Math.atan2(p.y-e.y,p.x-e.x);
  for(let i=-1;i<=1;i++)warn(w,{type:'beam',x:e.x,y:e.y,a:a+i*.29,len:970,r:stage===3?38:27,dmg:dmg*1.12,duration:1.45,color:'#e0a5ff'});
  w.message='TELÓPSIA • FACHOS DO APRESENTADOR';
 }else if(n%4===2){
  const count=stage===3?14:stage===2?11:8;
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count+e.move*.25;addShot(w,e.x,e.y,Math.cos(a),Math.sin(a),'bad',dmg*.67,'#f27a98',stage===3?420:350,2.4,8);}
  w.message='O PÚBLICO APLAUDE • CHUVA DE ESTILHAÇOS';
 }else{
  const spots=stage===3?8:5;
  for(let i=0;i<spots;i++)warn(w,{type:'circle',x:rnd(B.l+90,B.r-90),y:rnd(B.t+75,B.b-75),r:stage===3?95:78,dmg,duration:1.65+i*.11,color:'#db8ca9'});
  w.message='CENÁRIO EM COLAPSO • BUSQUEM UM CORREDOR SEGURO';
 }
 if(stage>=2&&n%3===1&&w.enemies.length<13){spawn(w,'devoto');spawn(w,'monitor');}
}
function enterFinalStage(w,e,stage){
 e.stage=stage;e.phase2=stage>1;e.stun=1.35;e.armor=2.1;
 e.patternCd=stage===3?1.0:1.5;
 w.warnings=[];w.message=stage===2?'SEGUNDO ATO • NÃO HÁ MAIS PLATEIA':'TERCEIRO ATO • O SORRISO SE ROMPE';
 storyShock(w,w.message);addEffect(w,{t:'phase',stage,x:e.x,y:e.y,id:++w.seq});
 if(stage===3){
  // Somente três núcleos, para exigir divisão de tarefas sem lotar o celular.
  for(let i=0;i<3;i++){spawn(w,'nucleo');const q=w.enemies[w.enemies.length-1],a=i*2*Math.PI/3;q.x=clamp(e.x+Math.cos(a)*235,B.l+50,B.r-50);q.y=clamp(e.y+Math.sin(a)*175,B.t+50,B.b-50);q.hp=q.maxHp=w.difficulty==='nightmare'?1600:1050;}
 }
}
// Reliquia: tres fases DE VERDADE, com padroes diferentes e golpes anunciados.
// O servidor continua decidindo colisao/dano para todos os cinco jogadores.
function energyAttack(w,e){
 const ps=activeP(w);if(!ps.length)return;
 const p=ps[Math.floor(Math.random()*ps.length)],stage=e.stage||1;
 const patterns=stage===1?[0,1,2]:stage===2?[3,4,5,1,0,2]:[6,7,8,9,4,5,0,2];
 const pattern=patterns[(e.pattern||0)%patterns.length];e.pattern=(e.pattern||0)+1;e.lastEnergyPattern=pattern;
 const dmg=e.dmg*(stage===3?1.28:stage===2?1.13:1);
 if(pattern===0){ // Fase I: raios perseguidos; fases avancadas: zonas extras.
  for(const q of ps)warn(w,{type:'circle',x:clamp(q.x,B.l+70,B.r-70),y:clamp(q.y,B.t+70,B.b-70),r:stage===3?91:stage===2?78:69,dmg:dmg,duration:stage===3?1.05:1.18,color:'#ab6aff'});
  if(stage>1)for(let j=0;j<(stage===3?5:3);j++)warn(w,{type:'circle',x:rnd(B.l+85,B.r-85),y:rnd(B.t+85,B.b-85),r:stage===3?79:65,dmg:dmg*.83,duration:1.30+j*.11,color:'#67dfff'});
  w.message=stage===1?'TROVOES DE ENERGIA':'DESCARGA INCONTROLAVEL';
 }else if(pattern===1){ // Leque de lasers com tempo para esquivar.
  const a=Math.atan2(p.y-e.y,p.x-e.x),n=stage===3?2:1;
  for(let i=-n;i<=n;i++)warn(w,{type:'beam',x:e.x,y:e.y,a:a+i*(stage===3?.26:.38),len:1110,r:stage===3?30:25,dmg:dmg*1.16,duration:stage===3?1.08:1.24,color:'#7be8ff'});
  w.message='FEIXES DO CONDUTOR';
 }else if(pattern===2){ // Orbes radiais, com quantidade limitada para celular.
  const count=stage===3?18:stage===2?14:10;
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count+e.move*.4;addShot(w,e.x,e.y,Math.cos(a),Math.sin(a),'bad',dmg*.62,'#a576ff',stage>=3?395:stage===2?350:305,2.7,8);}
  w.message='TEMPESTADE DE ORBES';
 }else if(pattern===3){ // Fase II: prisao eletrica + marca interior.
  warn(w,{type:'ring',x:p.x,y:p.y,r:stage===3?130:116,band:stage===3?30:25,dmg:dmg,duration:1.55,color:'#8ee5ff'});
  const other=ps.find(q=>q!==p);if(other)warn(w,{type:'circle',x:other.x,y:other.y,r:61,dmg:dmg*.65,duration:1.65,color:'#b3a7ff'});
  w.message='FASE II • PRISAO ELETRICA';
 }else if(pattern===4){ // Fase II/III: magnetismo real na simulacao.
  w.gravity={x:e.x,y:e.y,pull:e.pattern%2===0,strength:stage===3?180:125,life:stage===3?2.6:2.3};
  w.message=w.gravity.pull?'CAMPO MAGNETICO • ATRACAO':'CAMPO MAGNETICO • REPULSAO';
  addEffect(w,{t:'magnet',x:e.x,y:e.y,id:++w.seq});
  // Os raios marcados combinam com o puxao; sao anunciados antes do dano.
  warn(w,{type:'ring',x:e.x,y:e.y,r:stage===3?180:153,band:27,dmg:dmg*.80,duration:1.55,color:'#a5eeff'});
 }else if(pattern===5){ // Fase II/III: clones explosivos destrutiveis.
  const count=stage===3?5:3;
  for(let i=0;i<count&&w.enemies.filter(q=>q.hp>0).length<22;i++){
   spawn(w,'eco');const echo=w.enemies[w.enemies.length-1],a=i*Math.PI*2/count;
   echo.x=clamp(e.x+Math.cos(a)*190,B.l+40,B.r-40);echo.y=clamp(e.y+Math.sin(a)*145,B.t+40,B.b-40);
  }
  w.message='ECOS INSTAVEIS • DESTRUAM AS COPIAS';
 }else if(pattern===6){ // Fase III: chuva em sequencia, previsivel no chao.
  for(let i=0;i<11;i++)warn(w,{type:'circle',x:rnd(B.l+95,B.r-95),y:rnd(B.t+90,B.b-90),r:76,dmg:dmg*.9,duration:1.12+i*.14,color:'#a35eff'});
  w.message='FASE III • CHUVA DO VAZIO';
 }else if(pattern===7){ // Fase III: DOIS refúgios, para cooperacao justa em cinco jogadores.
  warn(w,{type:'outside2',x:475,y:596,x2:1060,y2:596,r:202,dmg:dmg*1.65,duration:3.1,color:'#e6a6ff'});
  w.message='COLAPSO DIMENSIONAL • ENTRE EM UM DOS DOIS REFUGIOS';
  addEffect(w,{t:'collapse',x:e.x,y:e.y,id:++w.seq});
 }else if(pattern===8){ // Fase III: cruz de lasers, quatro golpes sequenciados.
  const a=e.move*.21;for(let i=0;i<4;i++)warn(w,{type:'beam',x:e.x,y:e.y,a:a+i*Math.PI/2,len:930,r:29,dmg:dmg*1.10,duration:1.05+i*.22,color:'#9edfff'});
  w.message='CRUZ DE DESCARGAS • DESVIE DAS LINHAS';
 }else { // Fase III: espiral de estilhacos eletricos.
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18+e.move*.67;addShot(w,e.x,e.y,Math.cos(a),Math.sin(a),'bad',dmg*.72,'#c9a0ff',440,2.4,7);}
  w.message='ESPIRAL DA EXTINCAO';
 }
 if(stage>=2&&(pattern===2||pattern===5)){
  const a=rnd(0,Math.PI*2);e.x=clamp(p.x+Math.cos(a)*220,B.l+100,B.r-100);e.y=clamp(p.y+Math.sin(a)*165,B.t+100,B.b-100);
  addEffect(w,{t:'warp',x:e.x,y:e.y,id:++w.seq});
 }
}
function enterEnergyStage(w,e,newStage){
 e.stage=newStage;e.phase2=newStage>=2;e.armor=newStage===3?2.9:2.4;e.stun=1.12;
 e.pattern=0;e.patternCd=newStage===3?1.35:1.65;e.shoot=1.1;
 w.gravity=null;w.warnings=[]; // Limpa ataques antigos na transicao cinematica.
 w.message=newStage===2?'FASE II • CATIVEIRO ELETRICO':'FASE III • COLAPSO DIMENSIONAL';
 const count=newStage===3?4:3;
 for(let i=0;i<count;i++){
  spawn(w,'nucleo');const core=w.enemies[w.enemies.length-1];const a=i*Math.PI*2/count+Math.PI/6;
  core.x=clamp(e.x+Math.cos(a)*240,B.l+45,B.r-45);
  core.y=clamp(e.y+Math.sin(a)*192,B.t+45,B.b-45);
  core.hp=core.maxHp=Math.round((newStage===3?1050:870)*(w.difficulty==='nightmare'?NIGHTMARE_RULES.coreHpFactor:1));
 }
 addEffect(w,{t:'shield',x:e.x,y:e.y,id:++w.seq});
 addEffect(w,{t:'phase',stage:newStage,x:e.x,y:e.y,id:++w.seq});
}
function warn(w,v){w.warnings.push({...v,id:++w.seq,life:v.duration});}
function segmentDistance(p,x,y,x2,y2){let vx=x2-x,vy=y2-y;const t=clamp(((p.x-x)*vx+(p.y-y)*vy)/(vx*vx+vy*vy||1),0,1);return Math.hypot(p.x-x-t*vx,p.y-y-t*vy);}
function resolveWarn(w,z){for(const p of activeP(w)){const radial=Math.hypot(p.x-z.x,p.y-z.y);// Checagem coincide com a area desenhada: sem uma margem invisivel de +15px ao redor dos golpes.
 const hit=z.type==='circle'?radial<z.r-3:z.type==='ring'?Math.abs(radial-z.r)<(z.band||20):z.type==='outside'?radial>z.r+3:z.type==='outside2'?Math.min(radial,Math.hypot(p.x-z.x2,p.y-z.y2))>z.r+3:segmentDistance(p,z.x,z.y,z.x+Math.cos(z.a)*z.len,z.y+Math.sin(z.a)*z.len)<z.r;if(hit)hurt(p,z.dmg);}addEffect(w,{t:'impact',x:z.x,y:z.y,id:++w.seq});}
const CARD_POOL={
 base:[['vigor','🛡️','Vitalidade','+40 de PV máximo','common'],['passos','👟','Passos Sombrios','+14% de velocidade','common'],['forca','⚔️','Precisão Mortal','+17% de dano','common'],['protege','🔰','Armadura Improvisada','+28 de escudo','rare'],['critico','💥','Golpe Crítico','+10% de chance crítica','rare'],['cura','💚','Primeiros Socorros','Cura 30 PV imediatamente','common']],
 solar:[['sniper','🎯','Projétil Solar','+30% de dano com sniper','rare'],['duplo','🔫','Tiro Gêmeo','+1 disparo por ataque','epic'],['critico','☀️','Olho do Sol','+10% de crítico','rare']],
 ritual:[['orbe','🔮','Runa Dupla','+1 orbe paranormal','epic'],['forca','📜','Conhecimento Profundo','+17% de dano ritual','rare'],['vigor','🌀','Mente Resistente','+40 de vida','common']],
 alvo:[['machado','🪓','Fúria Carmesim','+32% dano do machado','rare'],['alcance','🩸','Lâmina Ampliada','+25 alcance corpo a corpo','epic'],['sangue','🩸','Sangramento Ritual','+3s de sangramento','rare']],
 feras:[['chumbo','💣','Chumbo Duplo','+2 fragmentos da doze','epic'],['forca','🐺','Instinto da Matilha','+17% dano','common'],['passos','🔥','Corrida Selvagem','+14% velocidade','rare']],
 lunar:[['orbe','🌙','Ecos Lunares','+1 projétil paranormal','epic'],['heal','💗','Luz de Cura','+25 PV de cura ao usar especial','rare'],['proteger','🦋','Proteção Lunar','+28 de escudo','common']]
};
function rollChoices(p){const pool=[...CARD_POOL.base,...CARD_POOL[p.agent]];const out=[],used=new Set();while(out.length<3){let c=pool[Math.floor(Math.random()*pool.length)];if(p.difficulty==='nightmare'&&c[0]==='vigor')c=['vigor','🛡️','Tenacidade','+25 PV máximo (até limite); depois +20 PV de cura','common'];if(!used.has(c[1]+c[2])){used.add(c[1]+c[2]);out.push(c)}}return out;}
function applyCard(p,card){const t=card[0];if(t==='vigor'){if(p.difficulty==='nightmare'){const delta=Math.min(NIGHTMARE_RULES.healthCardGain,Math.max(0,STATS[p.agent].hp+NIGHTMARE_RULES.maxHealthBonus-p.maxHp));p.maxHp+=delta;p.hp=Math.min(p.maxHp,p.hp+(delta||NIGHTMARE_RULES.healCardOverflow));}else{p.maxHp+=40;p.hp+=40;}}else if(t==='passos')p.moveBonus=Math.min(p.difficulty==='nightmare'?NIGHTMARE_RULES.moveBonusCap:.9,p.moveBonus+.14);else if(['forca','sniper','machado'].includes(t))p.attackBonus=p.difficulty==='nightmare'?Math.min(NIGHTMARE_RULES.attackBonusCap,p.attackBonus+(t==='forca'?.17:t==='sniper'?.30:.32)):p.attackBonus+(t==='forca'?.17:t==='sniper'?.30:.32);
 else if(t==='protege'||t==='proteger')p.shield=Math.min(150,p.shield+28);else if(t==='critico')p.crit=Math.min(.65,p.crit+.10);else if(t==='cura')p.hp=Math.min(p.maxHp,p.hp+30);else if(t==='duplo'||t==='orbe')p.projectiles=Math.min(p.difficulty==='nightmare'?NIGHTMARE_RULES.extraProjectileCap:4,p.projectiles+1);else if(t==='alcance')p.range=p.difficulty==='nightmare'?Math.min(NIGHTMARE_RULES.meleeRangeCap,p.range+25):p.range+25;else if(t==='sangue')p.bleed+=3;else if(t==='chumbo')p.projectiles=Math.min(p.difficulty==='nightmare'?NIGHTMARE_RULES.shotgunExtraCap:7,p.projectiles+2);else if(t==='heal')p.healBonus=p.difficulty==='nightmare'?Math.min(NIGHTMARE_RULES.healBonusCap,p.healBonus+25):p.healBonus+25;
 p.upgrades.push({title:card[2],rarity:card[4]});}
export function pickCard(w,token,index){const p=w.players[token];if(!p||w.phase!=='cards'||p.chosen)return false;if(!Number.isInteger(index)||index<0||index>=p.choices.length)return false;
 applyCard(p,p.choices[index]);p.chosen=true;p.choices=[];checkCards(w);return true;}
function checkCards(w){if(Object.values(w.players).filter(p=>p.agent&&p.connected).every(p=>p.chosen)){w.phase='between';w.between=BETWEEN_WAVES_S;w.message='TODOS EQUIPADOS';}}
function finishWave(w){
 if(w.mode==='campaign'&&w.story?.stage==='guard'){
  w.phase='campaign';w.enemies=[];w.shots=[];w.warnings=[];w.toSpawn=0;w.spawnCd=0;
  for(const q of Object.values(w.players))if(q.agent){q.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};}
  for(const p of Object.values(w.players))if(p.agent&&p.hp>0)p.hp=Math.min(p.maxHp,p.hp+20);
  setStory(w,'investigation','Os guardas foram derrotados. Retomem a investigação (2/3).',
    'As criaturas se desfazem numa chuva de estática. A última pista ainda está escondida.','Corredor seguro • Continuem a procurar os documentos.');return;
 }
 if(w.mode==='campaign'&&w.story?.stage==='combat'){
  w.phase='campaign';w.enemies=[];w.shots=[];w.warnings=[];w.toSpawn=0;
  w.story.finaleAt=Date.now()+4600;
  setStory(w,'finale_intro','O CONFESSOR CAIU. A transmissão ainda não terminou...','As luzes da arena se apagam. Uma voz anuncia: “Agora, o ato final. Cinco rostos, um só espetáculo.”','ARQUIVO 00 • Sol preparou outro participante para a última transmissão.');
  storyShock(w,'APRESENTADOR • ÚLTIMO PROGRAMA');
  return;
 }
 if(w.mode==='campaign'&&w.story?.stage==='final_boss'){
  w.phase='victory';w.story.stage='done';w.story.objective='A transmissão terminou. Reunam os registros e retornem ao RPG de mesa.';
  w.story.text='Sandra: Elas inventaram suas máscaras para continuarem sendo amigas. Sol tentou apagar os cinco — mas vocês conservaram seus nomes.';
  w.story.log.push('ÚLTIMA TRANSMISSÃO • A arena do porão foi silenciada. A história prossegue no RPG de mesa.');
  w.message='O ÚLTIMO PROGRAMA TERMINOU';w.warnings=[];w.shots=[];w.enemies=[];return;
 }
 // Pausa visual verdadeira de 3 segundos ANTES da tela de cartas; prazo de 10s so comeca depois.
 w.phase='reward_wait';w.rewardDeadline=Date.now()+REWARD_WAIT_MS;w.cardDeadline=0;
 w.message='RECOMPENSA EM 3 SEGUNDOS';w.enemies=[];w.shots=[];w.warnings=[];w.gravity=null;
 for(const p of Object.values(w.players))if(p.agent){if(p.hp<=0)p.hp=p.maxHp*(w.difficulty==='nightmare'?NIGHTMARE_RULES.knockoutRecovery:.36);else p.hp=Math.min(p.maxHp,p.hp+p.maxHp*(w.difficulty==='nightmare'?NIGHTMARE_RULES.waveRecovery:.13));p.choices=[];p.chosen=!p.connected;}
}
function showCards(w,now){w.phase='cards';w.cardDeadline=now+CARD_CHOICE_MS;w.message='ESCOLHA UMA CARTA';for(const p of Object.values(w.players))if(p.agent){p.choices=rollChoices(p);p.chosen=!p.connected;}checkCards(w);}

export function setInput(w,token,v){const p=w.players[token];if(!p||!['fight','campaign'].includes(w.phase)||!p.connected)return;const x=Number(v.x)||0,y=Number(v.y)||0;p.inp={x:clamp(x,-1,1),y:clamp(y,-1,1),fire:!!v.fire,run:!!v.run,aim:clamp(Number(v.aim)||0,-Math.PI*4,Math.PI*4),ts:Date.now()};
 if(w.phase==='campaign'){
  const st=w.story,past=['flashback','basement','projector'].includes(st?.stage);
  if(st?.stage==='flashback_intro'){p.inp.x=0;p.inp.y=0;p.inp.fire=false;return;}
  if(v.dash&&p.dashCd<=0&&p.hp>0){const dir=Math.hypot(x,y)||1;p.x=clamp(p.x+x/dir*125,B.l+22,B.r-22);p.y=clamp(p.y+y/dir*125,B.t+22,B.b-22);p.dashCd=past?5.8:4.3;p.inv=.25;}
  if(v.fire&&!past&&st?.stage==='adult_chase'&&st.stalker&&p.cd<=0&&d2(p,st.stalker)<280){p.cd=1.25;st.huntSlow=Math.max(st.huntSlow||0,.75);w.message='O DISPARO ATRASOU O OCULTISTA • CORRAM';}
  return;
 }
 if(v.skill)skill(w,p);
 if(v.dash&&p.dashCd<=0&&p.hp>0){const d=Math.hypot(x,y)||1;p.x=clamp(p.x+(x/d)*155,B.l+22,B.r-22);p.y=clamp(p.y+(y/d)*155,B.t+22,B.b-22);p.dashCd=4.1;p.inv=.46;addEffect(w,{t:'dash',x:p.x,y:p.y,id:++w.seq});}
 if(v.ult&&w.ult>=100&&activeP(w).length){w.ult=0;w.message='TRANSMISSÃO ZERO!';addEffect(w,{t:'ultimate',x:760,y:540,id:++w.seq});for(const e of w.enemies)if(e.hp>0)dmgEnemy(w,e,BOSS_KINDS.includes(e.kind)?870:1400,p);for(const ally of activeP(w)){ally.hp=Math.min(ally.maxHp,ally.hp+35);ally.shield=Math.min(100,ally.shield+18);}}
}
export function campaignTargets(w,token){
 const st=w.story,p=w.players[token];if(!inCampaign(w)||!st||!p)return[];
 if(st.stage==='entrance')return CAMPAIGN_STATIONS.filter(z=>z.id==='portao');
 if(st.stage==='investigation')return CAMPAIGN_STATIONS.filter(z=>['fita','arquivo','sandra'].includes(z.id)&&!st.evidence.includes(z.id));
 if(st.stage==='terminal')return CAMPAIGN_STATIONS.filter(z=>z.id==='terminal');
 if(st.stage==='flashback')return CAMPAIGN_STATIONS.filter(z=>IDS.includes(z.id)&&!st.memories.includes(z.id));
 if(st.stage==='basement')return CAMPAIGN_STATIONS.filter(z=>z.id===p.agent&&!st.anchors?.includes(z.id));
 if(st.stage==='projector')return CAMPAIGN_STATIONS.filter(z=>z.id==='projetor');
 if(st.stage==='adult_chase')return CAMPAIGN_STATIONS.filter(z=>z.id==='saida');
 if(st.stage==='masks')return CAMPAIGN_STATIONS.filter(z=>z.id===p.agent&&!st.masks.includes(z.id));
 if(st.stage==='sigils')return CAMPAIGN_STATIONS.filter(z=>z.id===p.agent&&!st.sigils.includes(z.id));
 return [];
}
export function campaignInteract(w,token,targetId=null){
 const p=w.players[token],st=w.story;
 if(!inCampaign(w)||w.phase!=='campaign'||!p?.connected||!st)return false;
 const targets=campaignTargets(w,token);
 const z=targetId?targets.find(z=>z.id===targetId&&inStationRange(p,z)):targets.filter(z=>inStationRange(p,z)).sort((a,b)=>d2(a,p)-d2(b,p))[0];
 if(!z)return false;
 if(st.stage==='entrance'){
  w.arena='archive';setStory(w,'investigation','Investiguem FITA VHS 03, ARQUIVO 17 e SANDRA (0/3).','A recepção foi aberta. Há fitas, fichas e algo que respira por trás do vidro.','PORTA ABERTA • Entrada no estúdio proibido.');
 }else if(st.stage==='investigation'){
  st.evidence.push(z.id);
  const texts={
   fita:'FITA 03 • 2008. Cinco adolescentes riem juntos. O apresentador Sol interrompe: “Hoje a arena terá apenas um vencedor.”',
   arquivo:'ARQUIVO 17 • A TV Paulista encerrou atividades em 2008 após um suposto acidente elétrico. Relatórios ocultos descrevem câmeras, lentes e projeções ritualísticas.',
   sandra:'SANDRA • “Yuri descobriu a verdade. Eu fui usada numa transmissão e perdi as lembranças. Não confiem no apresentador Sol.”'
  };
  st.text=texts[z.id];w.message=st.text;st.log.push(st.text);givePaper(w,p,z.id,({fita:'FITA 03 • REGISTRO DE 2008',arquivo:'ARQUIVO 17 • TV PAULISTA',sandra:'DEPOIMENTO DE SANDRA'})[z.id],st.text);
  if(st.evidence.length===2){
   // Nunca inicia um combate enquanto a pessoa ainda está lendo a ficha.
   // O botão Guardar nas pistas adianta o início; o prazo evita travar a sala
   // se o jogador desconectar sem fechar o papel.
   st.guardAt=Date.now()+25000;st.guardReader=p.token;
   setStory(w,'guard_intro','Guardas se aproximam. Guardem a ficha e se preparem para o combate!','Um ruído de passos vem do corredor. Há alguns segundos para guardar as provas antes da invasão.','GUARDAS DA TV • O estúdio ainda está ocupado.');
  }
  if(st.evidence.length===3)setStory(w,'terminal','Três provas encontradas! Ativem a ESTAÇÃO VHS no centro da sala.','A estação de vídeo está pronta. Não existe senha: basta se aproximar e interagir para assistir à gravação.','Três provas reunidas • Estação VHS liberada.');
  else st.objective=`Investiguem FITA, ARQUIVO e SANDRA (${st.evidence.length}/3).`;
 }else if(st.stage==='terminal'){
  // A estação VHS agora abre uma pequena cutscene antes da perseguição.
  st.stalker=null;st.huntCd=0;st.huntSlow=0;st.flashbackStep=0;st.flashbackTotal=FLASHBACK_INTRO_LINES.length;st.flashbackNextAt=Date.now()+FLASHBACK_INTRO_LINES[0].duration;
  const line=FLASHBACK_INTRO_LINES[0];
  st.flashbackSpeaker=line.speaker;st.flashbackLine=line.line;setStory(w,'flashback_intro',line.objective,`${line.speaker}: “${line.line}”`,'INTRODUÇÃO 2008 • A fita revelou a conversa dos cinco amigos antes da arena.');storyShock(w,'A FITA REBOBINOU PARA 2008');
 }else if(st.stage==='projector'){
  // O projetor avanca com uma interacao simples: a pista está nos documentos.
  st.stalker={x:280,y:345};st.huntCd=1;st.huntSlow=0;
  storyGoTo(w,'archive','adult_chase','2025: CORRAM do ocultista e encontrem a SAÍDA DE EMERGÊNCIA.','O projetor cospe os agentes em 2025. O mesmo ocultista está vivo e conhece o caminho até eles. A saída de emergência é a única chance.','O MESMO PERSEGUIDOR • Aparece em 2008 e 2025. Os agentes podem atrasá-lo, mas não eliminá-lo.');storyShock(w,'ELE ESTÁ NO PRESENTE • FUJAM!');
 }else if(st.stage==='flashback'){
  if(d2(p,st.stalker)<96){st.text='O VIGIA ESTÁ PRÓXIMO! Fuja antes de ler esta memória.';w.message=st.text;return true;}
  st.memories.push(z.id);
  st.text=CAMPAIGN_MEMORY[z.id];st.log.push(st.text);w.message=st.text;
  givePaper(w,p,'mem-'+z.id,'MEMÓRIA • '+z.label,st.text);
  if(st.memories.length===5){
   st.anchors=[];st.stalker={x:765,y:380};st.huntSlow=0;st.huntCd=1.2;
   storyGoTo(w,'basement','basement','2008: encontrem seus postos na arena do porão. Não deixem o Vigia alcançar vocês.','As câmeras se acenderam. Sol anunciava para uma plateia invisível: “Só sai quem sobreviver.” Cada adolescente precisa deixar seu sinal junto ao palco.','ARENA DO PORÃO • Os cinco amigos foram forçados a lutar até a morte em um espetáculo clandestino.');storyShock(w,'A PLATEIA ESTÁ ASSISTINDO');
  }else st.objective=`Sobrevivam ao ocultista e recuperem as 5 memórias (${st.memories.length}/5).`;
 }else if(st.stage==='basement'){
  if(z.id!==p.agent||st.anchors?.includes(z.id))return false;
  st.anchors.push(z.id);
  givePaper(w,p,'basement-'+z.id,'BILHETE DO PORÃO',`${z.label}: “Se a gente não conseguir sair, que ninguém esqueça nossos nomes. Não somos personagens do programa. Somos amigos.”`);
  st.log.push(`${z.label} deixou seu último sinal na arena. A plateia aplaudiu do outro lado das câmeras.`);
  const party=engagedAgents(w);const done=party.filter(q=>st.anchors.includes(q.agent)).length;
  if(done===party.length){setStory(w,'projector','A arena foi registrada. Ativem o PROJETOR para tentar escapar.','Os cinco símbolos se alinham. O ocultista abre uma passagem pelo tempo — mas também a atravessa.','TELÓPSIA • O porão não pertence a uma única época.');storyShock(w,'O PROJETOR ABRIU UMA FENDA');}
  else st.objective=`ARENA DO PORÃO: cada adolescente precisa marcar seu posto (${done}/${party.length}).`;
 }else if(st.stage==='adult_chase'){
  st.stalker=null;
  storyGoTo(w,'mask_room','masks','Cada agente deve recuperar sua máscara. Aproximem-se dos pedestais.','Sandra encontra o grupo atrás de uma porta trancada. As máscaras que os adolescentes fizeram como brincadeira estão aqui, agora carregando suas essências.','SALA DAS MÁSCARAS • Um gesto de amizade transformado em aprisionamento ritual.');storyShock(w,'CINCO ESSÊNCIAS • CINCO MÁSCARAS');
 }else if(st.stage==='masks'){
  if(z.id!==p.agent)return false;
  st.masks.push(z.id);p.hp=Math.min(p.maxHp,p.hp+65);p.shield=Math.min(90,p.shield+30);st.text=`${z.label} • A máscara contém a essência do adolescente. Ao tocá-la, você vê cinco amigos tentando sobreviver à arena de Sol. Eles não se transformaram em máscaras: suas essências foram aprisionadas nelas pelo ritual de Telópsia.`;
  st.log.push(st.text);w.message=st.text;givePaper(w,p,'mask-'+z.id,'MÁSCARA • '+z.label,st.text);storyShock(w,'A ESSÊNCIA RECONHECEU '+z.label);
  const party=engagedAgents(w);if(party.length&&party.every(q=>st.masks.includes(q.agent))){
    st.sigils=[];
    setStory(w,'sigils',`RITUAL DE TELÓPSIA: cada um dos ${party.length} agentes deve ativar seu próprio selo (0/${party.length}).`,
     'Sandra: As máscaras guardam as essências dos cinco adolescentes. Se todos se lembrarem juntos, a transmissão falha. Procurem seus selos!','TELÓPSIA • Selos de cinco identidades. Cada pessoa ativa o seu.');
  }else st.objective=`Reúnam as máscaras dos agentes presentes (${party.filter(q=>st.masks.includes(q.agent)).length}/${party.length}).`;
 }else if(st.stage==='sigils'){
  if(z.id!==p.agent||st.sigils.includes(z.id))return false;
  st.sigils.push(z.id);
  st.text=`${z.label} ativou seu selo. O grupo ouviu a voz do adolescente daquela máscara. Sandra: “Não deixem que o apresentador apague essa lembrança.”`;
  st.log.push(st.text);w.message=st.text;
  const party=engagedAgents(w),need=party.filter(q=>!st.sigils.includes(q.agent));
  if(!need.length){
    setStory(w,'combat','Derrotem o Confessor para libertar as essências das máscaras.','Os cinco selos reagiram juntos. O Confessor materializou-se para impedir que a verdade fosse transmitida.','TELÓPSIA INTERROMPIDA • O Confessor despertou.');
    w.phase='fight';w.wave=1;w.bossKind='confessor';w.arena='mask_room';w.enemies=[];w.shots=[];w.warnings=[];w.effects=[];w.pickups=[];w.toSpawn=5;w.spawnCd=1.2;
    for(const q of party){q.x=570+(IDS.indexOf(q.agent))*105;q.y=780;q.inp={x:0,y:0,run:false,fire:false,aim:0,ts:Date.now()};}
    spawn(w,'confessor');
  }else st.objective=`TELÓPSIA: cada jogador deve tocar seu selo (${party.length-need.length}/${party.length}). A equipe compartilha o progresso.`;
 }
 st.log=st.log.slice(-28);return true;
}
// Confirma leitura individual, sem remover a descoberta do diário da equipe.
export function campaignAckPaper(w,token,id){
 const p=w.players[token];if(!p?.paper||p.paper.id!==id)return false;
 p.paper=null;
 if(w.story?.stage==='guard_intro'&&w.story.guardReader===token)
  w.story.guardAt=Math.min(w.story.guardAt||Infinity,Date.now()+2200);
 return true;
}
// Compatibilidade com clientes antigos: a senha foi removida para todos.
export function campaignCode(){return false;}
export function sprintMovement(p,dt,dx,dy,moveBonus=0){
 const moving=Math.hypot(dx,dy)>.12;
 const allowed=!!p.inp?.run&&moving&&p.stamina>2;
 const running=allowed;
 p.running=running;
 p.stamina=clamp((p.stamina??100)+(running?-SPRINT_DRAIN:SPRINT_REGEN)*dt,0,100);
 return (p.speed||220)*(1+moveBonus)*(running?SPRINT_FACTOR:1);
}
export function advance(w,now=Date.now()){  
 w.pickups??=[]; // Compatibilidade com salas salvas antes da atualizacao.
 const elapsed=Math.max(0,(now-w.lastTime)/1000);const dt=clamp(elapsed,0,.10);w.lastTime=now;
 if(w.phase==='lobby'||w.phase==='over'||w.phase==='victory')return;
 if(w.phase==='campaign'){
  if(w.story?.stage==='guard_intro'&&now>=(w.story.guardAt||Infinity)){
   setStory(w,'guard','Defendam-se dos guardas! O documento chamou a transmissão.','A porta se abre. Guardas da TV Paulista e criaturas saem das gravações antigas.','GUARDAS • Protejam as pistas.');
   w.phase='fight';w.arena='archive';w.bossKind=null;w.wave=1;w.enemies=[];w.shots=[];w.warnings=[];w.effects=[];
   w.toSpawn=6;w.spawnCd=.8;
   spawn(w,'monitor');spawn(w,'rastejante');spawn(w,'devoto');
   return;
  }
  if(w.story?.stage==='flashback_intro'){
   if(now>=(w.story.flashbackNextAt||Infinity)){
    const next=(w.story.flashbackStep||0)+1;
    if(next>=FLASHBACK_INTRO_LINES.length){
     w.story.memories=[];w.story.stalker={x:765,y:380};w.story.huntCd=2;w.story.huntSlow=0;
     w.arena='memory';
     for(const [i,q] of engagedAgents(w).entries()){q.x=570+i*100;q.y=826;q.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};}
     setStory(w,'flashback','2008: sobrevivam à perseguição e encontrem as cinco memórias.','Agora a gravação mostra as crianças já presas no passado. SOLAR tenta manter todos juntos; RITUAL observa os símbolos; ALVO finge coragem; FERAS reage primeiro; LUNAR percebe antes dos outros que algo está errado.','RETORNO A 2008 • Cinco apelidos, cinco amigos e uma lembrança prestes a ser apagada.');
     storyShock(w,'2008 • A GRAVAÇÃO GANHOU VIDA');
    }else{
     w.story.flashbackStep=next;w.story.flashbackTotal=FLASHBACK_INTRO_LINES.length;
     const line=FLASHBACK_INTRO_LINES[next];w.story.flashbackNextAt=now+line.duration;
     w.story.flashbackSpeaker=line.speaker;w.story.flashbackLine=line.line;
     w.story.objective=line.objective;w.story.text=`${line.speaker}: “${line.line}”`;w.message=w.story.text;
    }
   }
   return;
  }
  // O desfecho é uma arena própria, com uma introdução sincronizada aos cinco.
  if(w.story?.stage==='finale_intro'&&now>=(w.story.finaleAt||Infinity)){
   w.phase='fight';w.story.stage='final_boss';w.arena='basement';w.bossKind='final';w.wave=20;
   w.enemies=[];w.shots=[];w.warnings=[];w.toSpawn=9;w.spawnCd=1.6;
   for(const [i,p] of engagedAgents(w).entries()){p.x=565+i*96;p.y=785;p.hp=Math.min(p.maxHp,p.hp+55);p.inp={x:0,y:0,run:false,fire:false,aim:0,ts:0};}
   spawn(w,'final');w.message='O APRESENTADOR • A ÚLTIMA TRANSMISSÃO';
   return;
  }
  // Exploração leve a 10 Hz, sem simular hordas durante enigmas.
  if(HUNT_STAGES.has(w.story?.stage) && w.story.stalker){
   const stalk=w.story.stalker,ps=engagedAgents(w),nearby=ps.slice().sort((a,b)=>d2(a,stalk)-d2(b,stalk))[0];
   if(nearby){const dd=d2(stalk,nearby)||1;const sx=nearby.x-stalk.x,sy=nearby.y-stalk.y;stalk.facing=Math.abs(sx)>Math.abs(sy)?(sx>0?2:1):(sy>0?0:3);// O perseguidor corre mais que o passo normal do agente, mas a corrida com fôlego permite escapar.
   const pace=w.story.stage==='adult_chase'?270:w.story.stage==='basement'?250:242;const slow=w.story.huntSlow>0?.30:1;stalk.x=clamp(stalk.x+(nearby.x-stalk.x)/dd*pace*slow*dt,B.l+40,B.r-40);stalk.y=clamp(stalk.y+(nearby.y-stalk.y)/dd*pace*slow*dt,B.t+40,B.b-40);}
   w.story.huntCd=Math.max(0,(w.story.huntCd||0)-dt);w.story.huntSlow=Math.max(0,(w.story.huntSlow||0)-dt);
   if(nearby&&d2(nearby,stalk)<65&&w.story.huntCd<=0){
    // Jumpscare e grito são APENAS audiovisuais: não reduzem PV nem matam o grupo.
    // Afastar o personagem brevemente evita ficar preso dentro do sprite do caçador.
    w.story.huntCd=1.9;
    w.story.fear=Math.min(100,(w.story.fear||0)+12);
    const dd=d2(nearby,stalk)||1;
    nearby.x=clamp(nearby.x+(nearby.x-stalk.x)/dd*135,B.l+22,B.r-22);
    nearby.y=clamp(nearby.y+(nearby.y-stalk.y)/dd*135,B.t+22,B.b-22);
    w.message='O OCULTISTA ESTÁ AQUI • CORRAM!';
    storyShock(w,w.message);
   }
   // O medo serve de indicador de tensão, nunca de dano ou derrota.
   if(!nearby||d2(nearby,stalk)>160)w.story.fear=Math.max(0,(w.story.fear||0)-dt*5);
  }
  for(const p of Object.values(w.players)){
   if(!p.agent||!p.connected||p.hp<=0)continue;p.dashCd=Math.max(0,p.dashCd-dt);p.cd=Math.max(0,p.cd-dt);if(now-(p.inp?.ts||0)>550)continue;
   const dx=p.inp.x||0,dy=p.inp.y||0,len=Math.hypot(dx,dy);
   const pace=sprintMovement(p,dt,dx,dy,p.moveBonus);if(len>.12){p.x=clamp(p.x+dx/Math.max(1,len)*pace*dt,B.l+22,B.r-22);p.y=clamp(p.y+dy/Math.max(1,len)*pace*dt,B.t+22,B.b-22);p.dir=Math.atan2(dy,dx);}
  }return;
 }
 if(w.phase==='reward_wait'){if(now>=w.rewardDeadline)showCards(w,now);return;}
 if(w.phase==='boss_intro'){if(now>=w.introDeadline){spawn(w,'energia');w.phase='fight';w.message='A RELÍQUIA ABRIU O VAZIO';}return;}
 if(w.phase==='cards'){if(now>=w.cardDeadline){for(const p of Object.values(w.players))if(p.agent&&!p.chosen){applyCard(p,p.choices[0]);p.chosen=true;p.choices=[];}checkCards(w);}return;}
 if(w.phase==='between'){w.between-=elapsed;if(w.between<=0)startWave(w);return;}
 if(w.phase!=='fight')return;
 w.effects=w.effects.filter(fx=>now-fx.createdAt<420);
 const ps=activeP(w);
 if(w.gravity){w.gravity.life-=dt;if(w.gravity.life<=0)w.gravity=null;}
 if(ps.length===0){w.phase='over';w.message=w.mode==='campaign'?'CAPÍTULO 1 • ESQUADRÃO DERROTADO':'TRANSMISSÃO INTERROMPIDA';return;}
 for(const p of Object.values(w.players)){
  if(p.hp<=0||!p.agent)continue;p.cd=Math.max(0,p.cd-dt);p.skillCd=Math.max(0,p.skillCd-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);p.fx=Math.max(0,p.fx-dt);
  if(!p.connected||now-p.inp.ts>500)continue;const dx=p.inp.x,dy=p.inp.y,len=Math.hypot(dx,dy);const mult=sprintMovement(p,dt,dx,dy,p.moveBonus);if(len>.12){p.x=clamp(p.x+dx/Math.max(1,len)*mult*dt,B.l+22,B.r-22);p.y=clamp(p.y+dy/Math.max(1,len)*mult*dt,B.t+22,B.b-22);p.dir=Math.atan2(dy,dx);}
  if(w.gravity){const dir=Math.hypot(w.gravity.x-p.x,w.gravity.y-p.y)||1;const sign=w.gravity.pull?1:-1;p.x=clamp(p.x+sign*(w.gravity.x-p.x)/dir*w.gravity.strength*dt,B.l+22,B.r-22);p.y=clamp(p.y+sign*(w.gravity.y-p.y)/dir*w.gravity.strength*dt,B.t+22,B.b-22);}
  if(p.inp.fire&&p.cd<=0)fire(w,p);
 }
 w.spawnCd-=dt;if(w.toSpawn>0&&w.spawnCd<=0&&w.enemies.filter(e=>e.hp>0).length<18){spawn(w);w.toSpawn--;w.spawnCd=Math.max(.28,.88-w.wave*.012)*(w.difficulty==='nightmare'?NIGHTMARE_RULES.spawnDelayFactor:1);}
 for(const e of w.enemies){if(e.hp<=0)continue; e.cd-=dt;e.shoot-=dt;e.stun=Math.max(0,e.stun-dt);e.armor=Math.max(0,e.armor-dt);e.move+=dt;
 if(e.bleed>0){e.bleed=Math.max(0,e.bleed-dt);e.bleedTick-=dt;if(e.bleedTick<=0){e.bleedTick=.5;dmgEnemy(w,e,9,null);}}if(e.hp<=0)continue;
 let p=null,dist=1e9;for(const q of ps){const d=d2(e,q);if(d<dist){dist=d;p=q;}}if(!p)continue;
 const dx=p.x-e.x,dy=p.y-e.y,v=e.speed*(e.kind==='energia'?(e.stage===3?1.30:e.stage===2?1.12:1):e.phase2?1.21:1),r=contactRadius(e),boss=BOSS_KINDS.includes(e.kind);
 if(e.kind==='nucleo'){continue;}
 if(!boss&&e.stun<=0){if(dist>r){e.x+=dx/dist*v*dt;e.y+=dy/dist*v*dt;}if(dist<=r&&e.cd<=0){hurt(p,e.dmg);e.cd=e.kind==='cacador'?.75:1.0;}}
 if((e.kind==='monitor'||e.kind==='devoto')&&e.shoot<=0&&dist<700){e.shoot=(e.kind==='monitor'?2:2.6)*(w.difficulty==='nightmare'?NIGHTMARE_RULES.enemyShootFactor:1);addShot(w,e.x,e.y,dx,dy,'bad',e.dmg,'#a1e9e4',320,2.0,6);}
 if(boss){if(e.kind==='final'){const newStage=e.hp<=e.maxHp*.34?3:e.hp<=e.maxHp*.70?2:1;if(newStage>(e.stage||1))enterFinalStage(w,e,newStage);}
  if(e.kind==='energia'){
   const newStage=e.hp<=e.maxHp*ENERGY_PHASE_3_AT?3:e.hp<=e.maxHp*ENERGY_PHASE_2_AT?2:1;
   if(newStage>(e.stage||1))enterEnergyStage(w,e,newStage);
  }
  if(!['energia','final'].includes(e.kind)&&!e.phase2&&e.hp<e.maxHp*.5){e.phase2=true;e.armor=3.2;w.message='ATO II • O SINAL DESPERTOU';for(let i=0;i<3;i++)spawn(w,i%2?'cacador':'devoto');}
  if(e.stun<=0){if(dist>r+3){e.x+=dx/dist*v*.63*dt;e.y+=dy/dist*v*.63*dt;}if(dist<=r&&e.cd<=0){hurt(p,e.dmg);e.cd=.90;addEffect(w,{t:'contact',x:p.x,y:p.y,id:++w.seq});}}
  e.patternCd-=dt;if(e.patternCd<=0){bossAttack(w,e);e.patternCd=(e.kind==='energia'?(e.stage===3?(e.lastEnergyPattern===7?3.2:1.42):e.stage===2?2.05:2.75):e.kind==='final'?(e.stage===3?1.45:e.stage===2?1.85:2.55):e.phase2?2.2:3.35)*(w.difficulty==='nightmare'?NIGHTMARE_RULES.bossPatternFactor:1);}

  if(e.shoot<=0){e.shoot=(e.kind==='energia'?(e.stage===3?.95:e.stage===2?1.32:1.7):e.phase2?1.35:1.8)*(w.difficulty==='nightmare'?NIGHTMARE_RULES.bossShootFactor:1);const spread=e.kind==='energia'&&e.stage===3?2:1;for(let i=-spread;i<=spread;i++){const a=Math.atan2(dy,dx)+i*.20;addShot(w,e.x,e.y,Math.cos(a),Math.sin(a),'bad',e.dmg*(e.kind==='energia'&&e.stage===3?.69:.55),e.kind==='energia'?'#b184ff':'#ff8898',e.kind==='energia'?(e.stage===3?430:395):320,2.5,8);}}
 }
 e.x=clamp(e.x,B.l+30,B.r-30);e.y=clamp(e.y,B.t+30,B.b-30);
 }
 for(const s of w.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.x<B.l||s.x>B.r||s.y<B.t||s.y>B.b){s.life=0;continue;}if(s.team==='good'){for(const e of w.enemies){if(e.hp>0&&Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){dmgEnemy(w,e,s.dmg,w.players[s.owner]);s.life=0;break;}}}else{for(const p of ps)if(Math.hypot(s.x-p.x,s.y-p.y)<s.r+17){hurt(p,s.dmg);s.life=0;break;}}}
 w.shots=w.shots.filter(s=>s.life>0);
 // Somente jogadores vivos e feridos consomem a cura, sem desperdicio com PV cheio.
 // O tempo diminui durante as lutas; as pausas de cartas nao roubam segundos do item.
 for(const item of w.pickups){
  item.life-=dt;
  if(item.life<=0)continue;
  const ally=ps.find(p=>p.hp<p.maxHp&&d2(p,item)<35);
  if(ally){ally.hp=Math.min(ally.maxHp,ally.hp+item.heal);item.life=0;
   addEffect(w,{t:'heal',x:ally.x,y:ally.y,id:++w.seq});}
 }
 w.pickups=w.pickups.filter(i=>i.life>0);
 for(const z of w.warnings){z.life-=dt;if(z.life<=0)resolveWarn(w,z);}w.warnings=w.warnings.filter(z=>z.life>0);
 w.enemies=w.enemies.filter(e=>e.hp>0);
 if(w.toSpawn<=0&&!w.enemies.length)finishWave(w);
}
export function snapshot(w,token){const p=w.players[token];return {type:'state',code:w.code,phase:w.phase,mode:w.mode||'survival',story:w.story?{chapter:w.story.chapter,stage:w.story.stage,evidence:[...w.story.evidence],memories:[...(w.story.memories||[])],masks:[...(w.story.masks||[])],anchors:[...(w.story.anchors||[])],sigils:[...(w.story.sigils||[])],shock:w.story.shock||0,scare:w.story.stage==='adult_chase'||w.story.stage==='basement',stalker:w.story.stalker||null,fear:w.story.fear||0,objective:w.story.objective,text:w.story.text,log:[...w.story.log],stations:campaignTargets(w,token),paper:p?.paper||null,flashbackStep:w.story.flashbackStep||0,flashbackTotal:w.story.flashbackTotal||0,flashbackSpeaker:w.story.flashbackSpeaker||null,flashbackLine:w.story.flashbackLine||null,near:campaignTargets(w,token).filter(z=>p&&inStationRange(p,z)).sort((a,b)=>d2(p,a)-d2(p,b))[0]?.id||null}:null,host:w.host===token,you:token,wave:w.wave,bossKind:w.bossKind,ult:Math.round(w.ult),message:w.message,
 players:Object.values(w.players).map(p=>({token:p.token,name:p.name,agent:p.agent,ready:p.ready,connected:p.connected,x:Math.round(p.x),y:Math.round(p.y),speed:p.speed*(1+p.moveBonus)*(p.running?SPRINT_FACTOR:1),running:!!p.running,stamina:Math.round(p.stamina??100),hp:Math.ceil(p.hp),maxHp:p.maxHp,shield:Math.ceil(p.shield),cd:p.cd,skillCd:p.skillCd,dashCd:p.dashCd,upgrades:p.upgrades.length,chosen:p.chosen,fx:p.fx,dir:p.dir,move:p.inp.x||p.inp.y})),
 enemies:w.enemies.map(e=>({id:e.id,kind:e.kind,x:Math.round(e.x),y:Math.round(e.y),hp:Math.ceil(e.hp),maxHp:e.maxHp,r:e.r,phase2:e.phase2,stage:e.stage||1,move:e.move,armor:e.armor})),
 pickups:(w.pickups||[]).map(i=>({id:i.id,x:Math.round(i.x),y:Math.round(i.y),heal:i.heal,life:Math.round(i.life*10)/10})),
 shots:w.shots.map(s=>({id:s.id,x:Math.round(s.x),y:Math.round(s.y),vx:Math.round(s.vx),vy:Math.round(s.vy),team:s.team,r:s.r,color:s.color})),warnings:w.warnings.map(z=>({...z,life:Math.max(0,z.life)})),effects:w.effects,
 choices:p?.choices||[],chosen:!!p?.chosen,cardDeadline:w.phase==='cards'?w.cardDeadline:0,rewardDeadline:w.phase==='reward_wait'?w.rewardDeadline:0,introDeadline:w.phase==='boss_intro'?w.introDeadline:0,arena:w.arena||'studio',gravity:w.gravity||null,difficulty:w.difficulty||'normal'};}
