import {AGENTS,createArt,renderBoss} from './art.js';
import {RELIQUIA_OST,bossMusic,chooseMusic} from './music-policy.js';
const $=id=>document.getElementById(id), canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const BOSS_KINDS=['sol','diretora','tv','energia','confessor','final'];
const W=1536,H=1024,BOUND={l:155,r:1380,t:310,b:900}, HERO={solar:'🎯',ritual:'🔮',alvo:'🪓',feras:'🔫',lunar:'🌙'},NAME={solar:'SOLAR',ritual:'RITUAL',alvo:'ALVO',feras:'FERAS',lunar:'LUNAR'};
// Mapas pixelizados: baixa memoria e texturas no modo leve, HD so por escolha manual.
const ART=createArt(),bgLite=new Image(),bgEco=new Image(),bgHD=new Image(),energyArt=new Image();energyArt.src='/assets/reliquia-energia.jpg';
bgLite.decoding='async';bgEco.decoding='async';bgHD.decoding='async';bgLite.src='/assets/arena-lite.webp';
function mapForQuality(){
 if(ecoGraphics){if(!bgEco.getAttribute('src'))bgEco.src='/assets/arena-eco.webp';return bgEco.naturalWidth?bgEco:bgLite;}
 if(!lowGraphics){if(!bgHD.getAttribute('src'))bgHD.src='/assets/arena.jpg';return bgHD.naturalWidth?bgHD:bgLite;}
 return bgLite;
}
const portraits={};AGENTS.forEach(a=>{portraits[a.id]=new Image();portraits[a.id].src='/assets/'+a.id+'.jpg';});
const bossArt={};for(const kind of ['sol','diretora','tv','confessor']){const im=new Image();im.src='/assets/chefe-'+kind+'.png';bossArt[kind]=im;}
// Pixel art em baixa resolução, sem máscara, com retratos específicos dos 5 agentes.
const campaignSprite={},teenSprite={};for(const a of AGENTS){const img=new Image();img.src='/assets/campanha-'+a.id+'.png';campaignSprite[a.id]=img;const teen=new Image();teen.src='/assets/adolescente-'+a.id+'.png';teenSprite[a.id]=teen;}
const occultistImage=new Image();occultistImage.src='/assets/ocultista-temporal.png';
const occultistFrames=new Image();occultistFrames.src='/assets/ocultista-passos-4x4.png';
let lastStalker={x:765,y:380,dir:0,moving:false};
const masksArt={};for(const a of AGENTS){const im=new Image();im.src='/assets/mask-'+a.id+'.png';masksArt[a.id]=im;}
const walkAdult={},walkTeen={};for(const a of AGENTS){
 const adult=new Image(),teen=new Image();adult.src='/assets/walk-campanha-'+a.id+'.png';teen.src='/assets/walk-adolescente-'+a.id+'.png';walkAdult[a.id]=adult;walkTeen[a.id]=teen;
}
const campaignPortrait=id=>'/assets/'+id+'.jpg'; // Retratos originais fiéis às referências na seleção

let ws=null,world=null,roomCode='',me='',offline=false,retries=0,resizeW=0,resizeH=0,dpr=1,musicOn=true,lastMusic='',phaseOld='',messageOld='',choicesOld='',lastAt=0,shake=0,musicLockedUntil=0;
let lastEnergyStage=0,energyBannerTimer=null,lastPersonalPaper='',lastShock=0,pendingPaper=null,lastScareTime=0,walkToStation=null;
let lastStepSound=0,lastFireSound=0,runPointer=false;
// Qualidade reduzida por padrão em telas sensíveis ao toque: renderiza menos pixels e efeitos.
let lowGraphics=true; // Priorizar fluidez no PC e no celular; HD opcional no botão.
let ecoGraphics=false, lowFpsSeconds=0, lastQualityAdjust=0;
const framePositions=new Map(),netVelocity=new Map(),shotVisuals=new Map();
const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
function buildVoidMap(){
 const c=document.createElement('canvas');c.width=768;c.height=512;const g=c.getContext('2d');
 const gradient=g.createRadialGradient(384,292,22,384,292,500);gradient.addColorStop(0,'#291e50');gradient.addColorStop(.56,'#12112c');gradient.addColorStop(1,'#030511');g.fillStyle=gradient;g.fillRect(0,0,768,512);
 let seed=91827;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<180;i++){const x=rand()*768,y=rand()*512,sz=rand()<.8?1:2;g.fillStyle=rand()>.58?'#a2dcff':'#af7beb';g.globalAlpha=.17+rand()*.62;g.fillRect(x,y,sz,sz);}g.globalAlpha=1;
 const r=g.createRadialGradient(384,302,90,384,302,260);r.addColorStop(0,'#412c70');r.addColorStop(.77,'#1c1a48');r.addColorStop(1,'#080c20');g.beginPath();g.ellipse(384,302,315,199,0,0,Math.PI*2);g.fillStyle=r;g.fill();
 for(let i=0;i<5;i++){g.beginPath();g.ellipse(384,302,310-i*41,196-i*23,0,0,Math.PI*2);g.strokeStyle=i%2?'#6647a6aa':'#3fa0be5c';g.lineWidth=i===0?4:1.6;g.stroke();}
 for(let k=0;k<16;k++){const a=k*Math.PI*2/16;g.beginPath();g.moveTo(384+Math.cos(a)*190,302+Math.sin(a)*130);g.lineTo(384+Math.cos(a)*305,302+Math.sin(a)*192);g.strokeStyle=k%2?'#56ddf455':'#aa73ff77';g.lineWidth=2;g.stroke();}
 g.strokeStyle='#7d69be72';g.lineWidth=2;g.beginPath();g.moveTo(384,102);g.lineTo(650,302);g.lineTo(384,500);g.lineTo(118,302);g.closePath();g.stroke();return c;
}
const cosmicMap=buildVoidMap();


let hudLast=0,lobbyLast='',partyLast='',stateAt=performance.now(),pingMs=null,shownFps=0,framesSeen=0,fpsStart=performance.now(),snapCount=0,snapRate=0;

const keys=new Set(),touch={x:0,y:0,fire:false,run:false},pending={skill:false,dash:false,ult:false},visualPos=new Map(),audio=new Audio();audio.loop=true;audio.volume=.21;audio.preload='auto';
const urls={lobby:'lobby',fight:'waves',cards:'between',between:'between',over:'defeat'};
const randomCode=()=>{const alpha='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',arr=new Uint8Array(8);crypto.getRandomValues(arr);return [...arr].map(n=>alpha[n%alpha.length]).join('');};
const sending=v=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(v));};
function playMusic(track,state=world){
 track=chooseMusic(track,state);
 // A trilha da Relíquia ou de qualquer outro boss nunca é bloqueada por um ritual.
 if(Date.now()<musicLockedUntil&&track!=='ultimate'&&!bossMusic(state))return;
 if(lastMusic===track)return;
 lastMusic=track;
 audio.volume=track===RELIQUIA_OST?.14:track==='living-in-the-dark'?.065:track==='fuga-desesperada'?.13:track==='sangue-8bit'?.15:track==='gal-final-8bit'?.17:.11;
 audio.src='/audio/'+track+'.mp3';
 audio.loop=true;
 if(musicOn)audio.play().catch(()=>{});
}
const sfxScare=new Audio('/audio/grito-ocultista.wav'),sfxShot=new Audio('/audio/disparo-seco.wav');
sfxScare.preload='auto';sfxScare.volume=.47;sfxShot.preload='auto';sfxShot.volume=.38;
function playEffect(sound){try{sound.currentTime=0;sound.play().catch(()=>{});}catch{}}
function userGesture(){if(musicOn&&audio.paused)audio.play().catch(()=>{});}

function showStatus(t){$('entryStatus').textContent=t;}
function readPong(msg){if(typeof msg.t!=='number'||!Number.isFinite(msg.t))return;const raw=performance.now()-msg.t;if(raw<0||raw>30000)return;pingMs=pingMs===null?raw:pingMs*.75+raw*.25;}
function updateStats(ts){
 if(ts-fpsStart<1000)return;
 shownFps=Math.round(framesSeen*1000/Math.max(1,ts-fpsStart));framesSeen=0;fpsStart=ts;
 snapRate=snapCount;snapCount=0;
 const label=$('netStats');label.textContent=(pingMs===null?'PING —':'PING '+Math.round(pingMs)+'ms')+'  |  FPS '+(['fight','campaign'].includes(world?.phase)?shownFps:'—')+'  |  REDE '+snapRate+'/s'+(ecoGraphics?'  ECO':'');
 label.dataset.state=pingMs===null?'unknown':pingMs>180?'slow':'good';
 // Não travar todos os celulares em 30 FPS: reduzir pixels primeiro, FPS por último.
 if(world?.phase==='fight' && document.visibilityState==='visible'){
  if(shownFps<38)lowFpsSeconds++;else lowFpsSeconds=0;
  if(lowFpsSeconds>=3 && ts-lastQualityAdjust>5000){
   if(!lowGraphics){lowGraphics=true;ecoGraphics=false;showAnn('⚡ QUALIDADE LEVE AUTOMÁTICA');}
   else if(!ecoGraphics){ecoGraphics=true;showAnn('⚡ MODO ECONÔMICO ATIVADO');}
   lowFpsSeconds=0;lastQualityAdjust=ts;qualityLabel();scale();
  }
 }
}
setInterval(()=>{if(ws?.readyState===WebSocket.OPEN)sending({type:'ping',t:performance.now()});},3000);

function connect(create){const name=$('nickname').value.trim().slice(0,18)||'Agente';const code=(create?randomCode():$('roomInput').value.trim().toUpperCase());
 if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)){showStatus('Digite um código de sala com 8 letras/números.');return;}
 roomCode=code;history.replaceState(null,'','?sala='+code);let token=sessionStorage.getItem('sorriso_token_'+code);if(!token){token=crypto.randomUUID();sessionStorage.setItem('sorriso_token_'+code,token);}me=token;
 const params=new URLSearchParams({code,token,name});if(create){params.set('create','1');params.set('difficulty',document.querySelector('input[name=challenge]:checked')?.value==='nightmare'?'nightmare':'normal');params.set('mode',document.querySelector('input[name=playmode]:checked')?.value==='survival'?'survival':'campaign');}const scheme=location.protocol==='https:'?'wss':'ws';
 try{ws=new WebSocket(scheme+'://'+location.host+'/api/ws?'+params.toString());}catch{showStatus('Não foi possível abrir a conexão. Publique o projeto com servidor WebSocket.');return;}
 showStatus('Conectando à transmissão...');offline=false;
 ws.onopen=()=>{retries=0;showStatus('Conectado!');userGesture();};
 ws.onmessage=ev=>{let data;try{data=JSON.parse(ev.data)}catch{return;}if(data.type==='state')consume(data);else if(data.type==='chat')addChat(data.name,data.text);else if(data.type==='pong')readPong(data);else if(data.type==='interaction_hint')showAnn(data.text);};
 ws.onerror=()=>{if(!world)showStatus('A sala não abriu. Verifique o código e o servidor.');};
 ws.onclose=e=>{if(offline)return;if(!world){showStatus('Conexão recusada. A sala pode não existir, estar cheia ou já ter começado.');return;}
  showAnn('CONEXÃO PERDIDA • RECONECTANDO');if(++retries<9)setTimeout(()=>{if(!offline){let p=new URLSearchParams({code,token,name});const scheme=location.protocol==='https:'?'wss':'ws';ws=new WebSocket(scheme+'://'+location.host+'/api/ws?'+p);const old=ws;ws.onopen=()=>{retries=0;showAnn('RECONEXÃO CONCLUÍDA');};ws.onmessage=ev=>{try{const d=JSON.parse(ev.data);if(d.type==='state')consume(d);else if(d.type==='chat')addChat(d.name,d.text);else if(d.type==='pong')readPong(d);else if(d.type==='interaction_hint')showAnn(d.text)}catch{}};ws.onclose=()=>{if(!offline)connectReconnect(name,code,token)};ws.onerror=()=>{};}},1800);
 };
}
function connectReconnect(name,code,token){if(offline||retries>=9)return;retries++;setTimeout(()=>{const p=new URLSearchParams({code,token,name}),scheme=location.protocol==='https:'?'wss':'ws';try{ws=new WebSocket(scheme+'://'+location.host+'/api/ws?'+p);}catch{return;}ws.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.type==='state')consume(d);else if(d.type==='chat')addChat(d.name,d.text);else if(d.type==='pong')readPong(d);else if(d.type==='interaction_hint')showAnn(d.text)}catch{}};ws.onopen=()=>{retries=0;showAnn('DE VOLTA AO SINAL!');};ws.onclose=()=>connectReconnect(name,code,token);},1900);}
function announceIfChanged(w){if(w.phase!==phaseOld){phaseOld=w.phase;const labels={lobby:'SALA ABERTA',fight:'GRAVAÇÃO INICIADA',reward_wait:'ONDA VENCIDA!',boss_intro:'TRANSMISSÃO ANÔMALA',cards:'ESCOLHA UMA CARTA',between:'PRÓXIMA ONDA',campaign:'INVESTIGAÇÃO INICIADA',victory:'CAPÍTULO CONCLUÍDO',over:'SINAL PERDIDO'};showAnn(labels[w.phase]);}
 if(w.message!==messageOld&&w.phase==='fight'){messageOld=w.message;showAnn(w.message);}
 for(const effect of w.effects||[]){if(effect.t==='ultimate'&&effect.id!==lastAt){lastAt=effect.id;showAnn('★ TRANSMISSÃO ZERO ★');shake=18;
  if(bossMusic(w)){playMusic(bossMusic(w),w);}// Efeitos do ritual ficam; a musica exclusiva do chefe continua.
  else {musicLockedUntil=Date.now()+2600;playMusic('ultimate',w);setTimeout(()=>{musicLockedUntil=0;if(world)playMusic(bossMusic(world)||'waves',world);},2700);}
 }}
}
function showEnergyPhase(stage){
 const banner=$('energyPhaseBanner');if(!banner)return;
 $('energyPhaseTitle').textContent=stage===2?'FASE II · CATIVEIRO ELETRICO':'FASE III · COLAPSO DIMENSIONAL';
 $('energyPhaseHint').textContent=stage===2?'DESTRUAM OS 3 NUCLEOS PARA QUEBRAR O ESCUDO':'DESTRUAM OS 4 NUCLEOS E BUSQUEM AS ZONAS SEGURAS';
 banner.hidden=false;shake=Math.max(shake,stage===3?17:10);
 clearTimeout(energyBannerTimer);energyBannerTimer=setTimeout(()=>{banner.hidden=true;},2500);
}
let annTimeout=null;function showAnn(t){const el=$('flashAnnouncement');el.textContent=t;el.classList.add('show');clearTimeout(annTimeout);annTimeout=setTimeout(()=>el.classList.remove('show'),2300);}
let lastPrune=0;
function consume(w){
 const now=performance.now();snapCount++;
 // Calcular velocidade usando duas fotos do servidor; apenas para desenhar entre pacotes.
 if(world?.phase==='fight'&&w.phase==='fight'){
  const elapsed=limit((now-stateAt)/1000,.045,.40);
  const old=new Map([...world.players,...world.enemies].map(o=>[o.token??o.id,o]));
  for(const o of [...w.players,...w.enemies]){
   const key=o.token??o.id,prev=old.get(key);if(!prev)continue;
   const dx=o.x-prev.x,dy=o.y-prev.y,dist=Math.hypot(dx,dy);
   if(dist>125){netVelocity.delete(key);continue;}
   const former=netVelocity.get(key),rawX=limit(dx/elapsed,-480,480),rawY=limit(dy/elapsed,-480,480);
   const blended=former?{vx:former.vx*.2+rawX*.8,vy:former.vy*.2+rawY*.8}:{vx:rawX,vy:rawY};
   netVelocity.set(key,blended);
  }
 }

 // Sincronizar posição local apenas quando chega um novo pacote, preservando movimento imediato.
 const myself=w.players?.find(p=>p.token===me);
 const predicted=visualPos.get(me);
 if(w.phase==='fight'&&myself&&myself.hp>0&&predicted){
  const m=getMove(),speed=limit(Number(myself.speed)||220,0,700);
  const latency=limit((pingMs??90)/2000+.015,.02,.13);
  const targetX=limit(myself.x+m.x*speed*latency,BOUND.l+22,BOUND.r-22);
  const targetY=limit(myself.y+m.y*speed*latency,BOUND.t+22,BOUND.b-22);
  const dx=targetX-predicted.x,dy=targetY-predicted.y;
  if(Math.hypot(dx,dy)>110){predicted.x=targetX;predicted.y=targetY;predicted.corrX=predicted.corrY=0;}
  else {predicted.corrX=dx;predicted.corrY=dy;}
 }
 if(now-lastPrune>3500){
  const live=new Set([...(w.players||[]).map(p=>p.token),...(w.enemies||[]).map(e=>e.id)]);
  for(const id of visualPos.keys())if(!live.has(id)){visualPos.delete(id);netVelocity.delete(id);}
  lastPrune=now;
 }
 const previousPhase=world?.phase;
 if(previousPhase==='fight'&&w.phase==='campaign'){
  touch.fire=false;pending.skill=pending.ult=pending.dash=false;
  $('storyJournal').hidden=true;visualPos.clear();
 }
 world=w;stateAt=now;roomCode=w.code;
 const paper=w.story?.paper;
 if(paper?.id&&paper.id!==lastPersonalPaper){
  lastPersonalPaper=paper.id;
  if(paper.id.includes('mask-')){pendingPaper=paper;const a=w.players.find(q=>q.token===me)?.agent;showMaskReveal(a,paper);}
  else showPersonalPaper(paper);
 }
 if(w.story?.shock&&w.story.shock!==lastShock){
  lastShock=w.story.shock;if(w.story.stage!=='masks'&&w.story.stage!=='sigils')horrorEvent(w.message);
 }
 announceIfChanged(w);
 const energyBoss=w.phase==='fight'?w.enemies.find(e=>e.kind==='energia'):null;
 if(energyBoss){const stage=energyBoss.stage||1;if(stage>lastEnergyStage&&lastEnergyStage>0)showEnergyPhase(stage);lastEnergyStage=stage;}
 else if(w.phase!=='fight'||w.bossKind!=='energia')lastEnergyStage=0;
 $('entry').hidden=true;
 const lobby=w.phase==='lobby',cards=w.phase==='cards',over=['over','victory'].includes(w.phase),exploring=w.mode==='campaign'&&w.phase==='campaign';const memoryPlaying=exploring&&w.story?.stage==='flashback_intro';$('lobby').hidden=!lobby;$('cards').hidden=!cards;$('end').hidden=!over;$('hud').hidden=lobby||over;$('controls').hidden=lobby||cards||over||w.phase==='between'||w.phase==='reward_wait'||w.phase==='boss_intro';$('gameChat').hidden=lobby||over;document.body.classList.toggle('campaign-explore',exploring);$('interactAction').hidden=!exploring;$('storyPanel').hidden=w.mode!=='campaign'||lobby||w.phase==='fight';updateStoryPanel(w);
 updateMemoryCutscene(w);
 if(memoryPlaying){$('hud').hidden=true;$('controls').hidden=true;$('gameChat').hidden=true;$('storyPanel').hidden=true;$('storyJournal').hidden=true;$('personalPaper').hidden=true;$('maskReveal').hidden=true;}
 $('rewardWait').hidden=w.phase!=='reward_wait';$('bossIntro').hidden=w.phase!=='boss_intro';
 const intro=w.mode==='campaign'&&w.story?.stage==='finale_intro'&&w.phase==='campaign';$('finalIntro').hidden=!intro;
 const inChase=w.mode==='campaign'&&w.phase==='campaign'&&['flashback','basement','projector','adult_chase'].includes(w.story?.stage);
 $('vignette').classList.toggle('hunt-vignette',inChase);$('fire').hidden=exploring&&w.story?.stage!=='adult_chase';
 $('fire').querySelector('small').textContent=exploring?'ATRASAR':'ATACAR';
 $('skill').hidden=exploring;$('ult').hidden=exploring;
 if(w.mode==='campaign'&&!exploring){$('storyJournal').hidden=true;}

 if(lobby){const sig=JSON.stringify([w.host,w.mode,w.players.map(p=>[p.token,p.agent,p.ready,p.connected])]);if(sig!==lobbyLast){lobbyLast=sig;renderLobby(w);}playMusic('lobby',w);}else if(cards){renderCards(w);playMusic('between',w);}else if(over){$('endSummary').textContent=w.phase==='victory'?'Capítulo 1 concluído! As cinco essências foram reconhecidas, o espetáculo do porão terminou e a investigação pode continuar no RPG de mesa.':'O esquadrão '+(w.mode==='campaign'?'foi derrotado durante a investigação.':'chegou até a onda '+w.wave+'.')+' Podem tentar novamente.';$('again').hidden=!w.host;playMusic('defeat',w);}
 else {if(performance.now()-hudLast>190 || w.phase!==phaseOld){hudLast=performance.now();renderHud(w);}const b=w.enemies.find(e=>BOSS_KINDS.includes(e.kind));if(w.mode==='campaign'&&w.phase==='campaign'){
   const ch=w.story?.stage;
   playMusic(['flashback','basement','projector','adult_chase'].includes(ch)?'fuga-desesperada':ch==='finale_intro'?'gal-final-8bit':'living-in-the-dark',w);
  }else if(w.phase==='between'||w.phase==='reward_wait')playMusic('between',w);
  else if(w.phase==='boss_intro'||b?.kind==='energia')playMusic(RELIQUIA_OST,w);
  else if(w.mode==='campaign'&&w.story?.stage==='guard')playMusic('sangue-8bit',w);
  else playMusic(b?b.kind==='final'?'gal-final-8bit':b.kind==='tv'?'alvo':b.kind:'sangue-8bit',w);}
}
function renderLobby(w){$('code').textContent=w.code;$('start').hidden=!w.host;
 const mine=w.players.find(p=>p.token===me);$('ready').textContent=mine?.ready?'✓ PRONTO — CANCELAR':'ESTOU PRONTO';$('ready').disabled=!mine?.agent;
 const everyone=w.players.filter(p=>p.connected);$('start').disabled=!everyone.length||everyone.some(p=>!p.agent||!p.ready);
 $('lobbyStatus').textContent=(w.mode==='campaign'?'📺 CAMPANHA · ':'⚔️ ONDAS · ')+(w.difficulty==='nightmare'?'💀 PESADELO · ':'🛡️ NORMAL · ')+everyone.length+'/5 agentes conectados · '+(everyone.every(p=>p.ready)?'Tudo pronto para entrar!':'Aguardando escolha e confirmação');
 const slots=$('slots');slots.replaceChildren();for(let i=0;i<5;i++){const p=everyone[i];const el=document.createElement('div');el.className='slot';if(p){if(p.agent){const img=new Image();img.src=w.mode==='campaign'?campaignPortrait(p.agent):'/assets/'+p.agent+'.jpg';img.style.imageRendering='pixelated';el.append(img);}const b=document.createElement('b');b.textContent=p.name+(p.token===me?' (você)':'');const s=document.createElement('small');s.className=p.ready?'ready':'';s.textContent=(p.agent?NAME[p.agent]:'Escolhendo...')+' · '+(p.ready?'PRONTO':'NÃO PRONTO');el.append(b,s);}else el.textContent='AGUARDANDO AGENTE';slots.append(el);}
 const selector=$('heroSelect');selector.replaceChildren();for(const a of AGENTS){const other=everyone.some(p=>p.agent===a.id&&p.token!==me),btn=document.createElement('button');btn.className='hero-btn'+(mine?.agent===a.id?' on':'');btn.disabled=other;const img=new Image();img.src=w.mode==='campaign'?campaignPortrait(a.id):'/assets/'+a.id+'.jpg';img.style.imageRendering='pixelated';const title=document.createElement('strong');title.textContent=NAME[a.id];const role=document.createElement('small');role.textContent=other?'OCUPADO':{solar:'SNIPER',ritual:'OCULTISTA',alvo:'MACHADO DE SANGUE',feras:'ESCOPETA',lunar:'SUPORTE'}[a.id];btn.append(img,title,role);btn.addEventListener('click',()=>{userGesture();sending({type:'choose',agent:a.id});});selector.append(btn);}
}
function updateCardCountdown(){
 if(!world||world.phase!=='cards')return;
 const timer=$('cardTimer');if(!timer)return;
 const seconds=Math.max(0,Math.ceil((world.cardDeadline-Date.now())/1000));
 const message=seconds>0?'⏱ '+seconds+'s para escolher':'⏱ Tempo encerrado · aplicando carta automática...';
 if(timer.textContent!==message)timer.textContent=message;
}
function updatePhaseCountdown(){
 if(!world)return;
 if(world.phase==='reward_wait')$('rewardClock').textContent='CARTAS EM '+Math.max(0,Math.ceil((world.rewardDeadline-Date.now())/1000))+'s';
 if(world.phase==='boss_intro')$('introClock').textContent='INICIANDO EM '+Math.max(0,Math.ceil((world.introDeadline-Date.now())/1000))+'s';
}
setInterval(()=>{updateCardCountdown();updatePhaseCountdown();},150);
function renderCards(w){updateCardCountdown();const c=JSON.stringify(w.choices)+'|'+w.chosen;if(choicesOld===c)return;choicesOld=c;const list=$('cardOptions');list.replaceChildren();$('cardStatus').textContent=w.chosen?'Você escolheu. Esperando os outros agentes...':'Escolha uma das três cartas para continuar.';
 for(const [i,card] of (w.choices||[]).entries()){const btn=document.createElement('button');btn.className='card';const em=document.createElement('span');em.className='emoji';em.textContent=card[1];const b=document.createElement('b');b.textContent=card[2];const d=document.createElement('p');d.textContent=card[3];const r=document.createElement('span');r.className='rarity '+card[4];r.textContent=({common:'COMUM',rare:'RARA',epic:'ÉPICA',legendary:'LENDÁRIA'})[card[4]]||'COMUM';btn.append(em,b,d,r);btn.onclick=()=>{userGesture();sending({type:'card',index:i});btn.disabled=true;};list.append(btn);}
}
function renderHud(w){const p=w.players.find(p=>p.token===me);if(!p)return;const health=Math.max(0,100*p.hp/(p.maxHp||1));const portraitSrc='/assets/'+p.agent+'.jpg';if(!$('myPortrait').src.endsWith(portraitSrc))$('myPortrait').src=portraitSrc;$('myName').textContent=NAME[p.agent];$('myLife').textContent=Math.ceil(p.hp)+' / '+p.maxHp+' PV'+(p.shield?' +'+p.shield+' escudo':'');$('myHealth').style.width=health+'%';$('waveLabel').textContent=w.mode==='campaign'?(w.phase==='fight'?'CHEFE · CAP. 1':'CAPÍTULO 01'):'ONDA '+String(w.wave).padStart(2,'0')+(w.difficulty==='nightmare'?' 💀':'');$('enemyLabel').textContent=w.mode==='campaign'?(w.story?.stage==='combat'?'PROTEJAM YURI':'TV PAULISTA · 2025'):w.enemies.length+' CRIATURAS';$('ultFill').style.width=w.ult+'%';$('ultText').textContent=w.ult+'%';$('ult').disabled=w.ult<100;
 const party=$('party'),mates=w.players.filter(a=>a.token!==me&&a.agent),pSig=mates.map(a=>[a.token,a.agent,a.name,a.connected,Math.round(100*a.hp/(a.maxHp||1))].join(':')).join('|');if(pSig!==partyLast){partyLast=pSig;party.replaceChildren();for(const a of mates){const el=document.createElement('div');el.className='p';const name=document.createElement('b');name.textContent=HERO[a.agent]+' '+a.name+(a.connected?'':' (OFF)');const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('div');fill.className='fill';fill.style.width=Math.max(0,100*a.hp/(a.maxHp||1))+'%';bar.append(fill);el.append(name,bar);party.append(el);}}
 const boss=w.enemies.find(e=>BOSS_KINDS.includes(e.kind));$('bossBar').hidden=!boss;if(boss){$('bossTitle').textContent=({sol:'☀ SOL SORRIDENTE',diretora:'📺 A DIRETORA',tv:'📺 O OBSERVADOR — TV',energia:'⚡ RELÍQUIA DE ENERGIA',confessor:'📼 O CONFESSOR',final:'🎭 O APRESENTADOR • ÚLTIMO PROGRAMA'})[boss.kind]+(['energia','final'].includes(boss.kind)?' · FASE '+(boss.stage||1)+'/3 '+(boss.kind==='final'?(['• INÍCIO','• SACRIFÍCIO','• O ÚLTIMO SORRISO'][(boss.stage||1)-1]||''):(['• TROVOES','• CATIVEIRO','• COLAPSO'][(boss.stage||1)-1]||'')):' · ATO '+(boss.phase2?'II':'I'))+(w.enemies.some(e=>e.kind==='nucleo'&&e.hp>0)?' · ESCUDO '+w.enemies.filter(e=>e.kind==='nucleo'&&e.hp>0).length+' NUCLEOS':'');$('bossHealth').style.width=Math.max(0,100*boss.hp/boss.maxHp)+'%';}
 $('runAction').querySelector('small').textContent=(p.stamina??100)<6?'SEM FÔLEGO':Math.round(p.stamina??100)+'%';$('runAction').classList.toggle('out-of-stamina',(p.stamina??100)<6);$('skill').querySelector('small').textContent=p.skillCd>0?Math.ceil(p.skillCd)+'s':'RITUAL';$('dash').querySelector('small').textContent=p.dashCd>0?Math.ceil(p.dashCd)+'s':'ESQUIVA';}
// Cinemática visível na tela de todos os jogadores (também no Android).
// Apenas o servidor escolhe a fala atual; o cliente nunca adianta a história sozinho.
let memoryLastStep=-1;
function updateMemoryCutscene(w){
 const cut=w.mode==='campaign'&&w.phase==='campaign'&&w.story?.stage==='flashback_intro';
 const modal=$('memoryCutscene');modal.hidden=!cut;
 if(!cut){memoryLastStep=-1;return;}
 const st=w.story,step=st.flashbackStep||0,total=Math.max(1,st.flashbackTotal||1);
 const speaker=String(st.flashbackSpeaker||'NARRAÇÃO').toUpperCase();
 const key=speaker.toLowerCase();
 $('memoryCounter').textContent=`CENA ${String(step+1).padStart(2,'0')}/${String(total).padStart(2,'0')}`;
 $('memorySpeaker').textContent=speaker==='APRESENTADOR'?'☀ O APRESENTADOR':speaker;
 $('memoryLine').textContent=st.flashbackLine||st.text||'A gravação está começando...';
 $('memoryPresenter').hidden=speaker!=='APRESENTADOR';
 $('memoryStage').dataset.scene=speaker==='APRESENTADOR'?'presenter':speaker==='NARRAÇÃO'?'memory':'children';
 for(const actor of $('memoryActors').querySelectorAll('.memory-actor')){
  const active=actor.dataset.actor===key;
  actor.classList.toggle('speaking',active);
  actor.classList.toggle('muted',speaker!=='NARRAÇÃO'&&speaker!=='APRESENTADOR'&&!active);
 }
 if(memoryLastStep!==step){
  memoryLastStep=step;
  const bar=$('memoryProgress');bar.replaceChildren();
  for(let i=0;i<total;i++){const mark=document.createElement('span');mark.className=i<step?'finished':i===step?'current':'';bar.append(mark);}
 }
}
function addChat(name,text){const el=document.createElement('div');el.textContent=name+': '+text;$('chatLines').append(el);while($('chatLines').children.length>5)$('chatLines').firstElementChild.remove();}
function scale(){
 resizeW=canvas.clientWidth;resizeH=canvas.clientHeight;
 const maxDpr=ecoGraphics?.85:lowGraphics?1.15:1.5;
 const pxBudget=ecoGraphics?210000:lowGraphics?370000:1100000;
 dpr=Math.min(devicePixelRatio||1,maxDpr,Math.sqrt(pxBudget/Math.max(1,resizeW*resizeH)));
 canvas.width=Math.max(1,Math.round(resizeW*dpr));canvas.height=Math.max(1,Math.round(resizeH*dpr));
 canvas.style.imageRendering=lowGraphics?'pixelated':'auto';
}
window.addEventListener('resize',scale);scale();
function posFor(o,dt){
 const key=o.token??o.id;
 if(framePositions.has(key))return framePositions.get(key);
 let p=visualPos.get(key);
 if(!p){p={x:o.x,y:o.y,corrX:0,corrY:0};visualPos.set(key,p);}
 if(o.token===me&&['fight','campaign'].includes(world?.phase)&&o.hp>0){
  // Predição visual: o próprio personagem responde a cada frame, sem aguardar WebSocket.
  const m=getMove(),speed=limit(Number(o.speed)||220,0,700);
  p.x=limit(p.x+m.x*speed*dt,BOUND.l+22,BOUND.r-22);
  p.y=limit(p.y+m.y*speed*dt,BOUND.t+22,BOUND.b-22);
  // Pequena correção suave ao receber a posição definitiva do servidor.
  const alpha=Math.min(1,dt*9);
  const changeX=(p.corrX||0)*alpha,changeY=(p.corrY||0)*alpha;
  p.x=limit(p.x+changeX,BOUND.l+22,BOUND.r-22);
  p.y=limit(p.y+changeY,BOUND.t+22,BOUND.b-22);
  p.corrX=(p.corrX||0)-changeX;p.corrY=(p.corrY||0)-changeY;
 }else{
  const velocity=netVelocity.get(key),age=limit((performance.now()-stateAt)/1000,0,.12);
  const projectedX=limit(o.x+(velocity?.vx||0)*age,BOUND.l,BOUND.r);
  const projectedY=limit(o.y+(velocity?.vy||0)*age,BOUND.t,BOUND.b);
  const distance=Math.hypot(projectedX-p.x,projectedY-p.y);
  if(distance>135){p.x=projectedX;p.y=projectedY;}
  else {const alpha=1-Math.exp(-dt*17);p.x+=(projectedX-p.x)*alpha;p.y+=(projectedY-p.y)*alpha;}
 }
 framePositions.set(key,p);return p;
}
// Chefes pré-renderizados no modo leve: preserva a arte e evita centenas de traços por frame.
const bossSprites=new Map();
function bossSprite(e){
 const illustrated=bossArt[e.kind];if(illustrated?.complete&&illustrated.naturalWidth)return illustrated;
 const key=e.kind+(e.phase2?'2':'1');if(bossSprites.has(key))return bossSprites.get(key);
 const c=document.createElement('canvas');c.width=240;c.height=300;
 const g=c.getContext('2d');g.translate(120,170);
 renderBoss(g,{kind:e.kind,x:0,y:0,phase2:!!e.phase2},0);
 bossSprites.set(key,c);return c;
}
function visualShot(s,dt,age){
 if(s.id==null)return{x:s.x,y:s.y};
 let v=shotVisuals.get(s.id);
 const tx=s.x+(s.vx||0)*age,ty=s.y+(s.vy||0)*age;
 if(!v){v={x:tx,y:ty};shotVisuals.set(s.id,v);return v;}
 v.x+=(s.vx||0)*dt;v.y+=(s.vy||0)*dt;
 const distance=Math.hypot(tx-v.x,ty-v.y);
 if(distance>160){v.x=tx;v.y=ty;}
 else {const a=Math.min(1,dt*18);v.x+=(tx-v.x)*a;v.y+=(ty-v.y)*a;}
 return v;
}
let lastShotPrune=0;
// Mapa fixo pré-renderizado: desenhar uma vez, sem imagens pesadas ou efeitos por frame.
function buildCampaignMap(mode){
 const c=document.createElement('canvas');c.width=768;c.height=512;const g=c.getContext('2d');g.scale(.5,.5);
 const past=mode==='memory',masks=mode==='mask_room';g.fillStyle=past?'#121125':masks?'#151321':'#171c23';g.fillRect(0,0,1536,1024);
 g.fillStyle=past?'#242039':masks?'#282236':'#2a3039';g.fillRect(135,284,1267,645);
 for(let x=145;x<1385;x+=48)for(let y=300;y<916;y+=48){g.strokeStyle=past?'#3d2f4b':'#39424c';g.lineWidth=1;g.strokeRect(x,y,48,48);}
 g.strokeStyle=past?'#714567':masks?'#6b527e':'#5e727f';g.lineWidth=17;g.strokeRect(145,293,1240,619);
 g.lineWidth=6;g.strokeStyle='#070b15';g.strokeRect(149,297,1232,611);
 // Arquivos, cadeiras, projeção e armários representados por quadriláteros simples.
 const furniture=(x,y,w,h,color)=>{g.fillStyle='#060b12';g.fillRect(x+8,y+9,w,h);g.fillStyle=color;g.fillRect(x,y,w,h);g.fillStyle='#e4d9c02c';g.fillRect(x+5,y+5,w-10,3);};
 furniture(230,380,170,45,past?'#47354c':'#4a555b');furniture(1040,355,205,48,'#49505b');
 furniture(660,385,210,54,past?'#563a60':'#3a535e');furniture(650,600,235,62,'#393844');
 furniture(962,666,170,58,'#354049');furniture(280,655,140,50,'#3f414b');
 // Câmeras e fitas; baixo custo gráfico no Android.
 for(const [x,y] of [[220,300],[1305,300],[222,880],[1304,880]]){g.fillStyle='#7d1e34';g.fillRect(x-13,y-11,26,22);g.fillStyle='#ef9b9f';g.fillRect(x-3,y-5,12,10);}
 if(past){g.fillStyle='#842c4860';for(let k=0;k<10;k++)g.fillRect(160+k*120,305+(k%3)*191,55,4);}
 if(masks){for(let i=0;i<5;i++){const pedestals=[[350,515],[535,445],[765,407],[1110,520],[970,735]];const [x,y]=pedestals[i];g.fillStyle='#6d506a';g.fillRect(x-27,y-23,54,46);g.strokeStyle='#d1a8cf';g.strokeRect(x-27,y-23,54,46);}}
 return c;
}
const campaignMaps={archive:buildCampaignMap('archive'),memory:buildCampaignMap('memory'),mask_room:buildCampaignMap('mask_room'),basement:buildCampaignMap('memory')};
const campaignMapImages={};for(const scene of ['archive','memory','mask_room','basement']){const img=new Image();img.src='/assets/mapa-'+scene+'.webp?v=1214';campaignMapImages[scene]=img;}
function drawCampaignWorld(g,w,t){
 const st=w.story;if(!st)return;
 if(st.stalker&&['flashback','basement','projector','adult_chase'].includes(st.stage)){
  const v=st.stalker;
  const dx=v.x-lastStalker.x,dy=v.y-lastStalker.y;
  if(Math.hypot(dx,dy)>1){lastStalker.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?2:1):(dy>0?0:3);lastStalker.movingUntil=t+.26;}
  lastStalker.x=v.x;lastStalker.y=v.y;
  lastStalker.renderX??=v.x;lastStalker.renderY??=v.y;
  // O servidor atualiza a posição em intervalos; o desenho interpola todos os quadros.
  lastStalker.renderX+=(v.x-lastStalker.renderX)*.22;
  lastStalker.renderY+=(v.y-lastStalker.renderY)*.22;
  g.save();g.translate(lastStalker.renderX,lastStalker.renderY);
  if(occultistFrames.complete&&occultistFrames.naturalWidth){
    const frame=t<(lastStalker.movingUntil||0)?Math.floor(t*8)%4:0;
    const fw=occultistFrames.naturalWidth/4,fh=occultistFrames.naturalHeight/4;
    g.imageSmoothingEnabled=false;
    g.drawImage(occultistFrames,frame*fw,lastStalker.dir*fh,fw,fh,-51,-115,102,135);
   }else if(occultistImage.complete&&occultistImage.naturalWidth){g.drawImage(occultistImage,-51,-110,102,134);}
  else {g.fillStyle='#160d24';g.beginPath();g.ellipse(0,0,37,61,0,0,Math.PI*2);g.fill();g.fillStyle='#ff5588';g.fillRect(-16,-34,31,5);}
  g.restore();
 }
 for(const z of st.stations||[]){
  const active=z.id===st.near,sz=active?29:23,hit=Math.max(22,Math.round((z.click||64)*.34));g.save();g.translate(z.x,z.y);g.strokeStyle=active?'#9cf2ee':'#8fb0d6';g.lineWidth=active?3:1.5;g.setLineDash([6,5]);g.beginPath();g.arc(0,0,hit,0,Math.PI*2);g.stroke();g.setLineDash([]);g.fillStyle=active?'#9cf2ee38':'#a6cce72a';g.beginPath();g.arc(0,0,sz+14,0,Math.PI*2);g.fill();g.strokeStyle=active?'#b8fff2':'#b6acda';g.lineWidth=active?4:2;g.beginPath();g.arc(0,0,sz+Math.sin(t*2)*2,0,Math.PI*2);g.stroke();g.fillStyle='#0e1220';g.fillRect(-19,-19,38,38);g.fillStyle=active?'#b6ffdb':'#ecd1b8';g.font='900 23px monospace';g.textAlign='center';const icon=st.stage==='masks'?'◈':st.stage==='sigils'?'✥':['flashback','basement'].includes(st.stage)?'✦':z.id==='sandra'?'✧':z.id==='arquivo'?'▤':z.id==='fita'?'▣':z.id==='terminal'?'▣':z.id==='projetor'?'▶':'⌂';g.fillText(icon,0,8);g.font='bold 12px monospace';g.lineWidth=3;g.strokeStyle='#080710';g.strokeText(z.label,0,-38);g.fillStyle='#fbead9';g.fillText(z.label,0,-38);g.restore();
 }
}
let storySig='',lastStoryStage='',cameraView=null,lastInteract=0;function updateStoryPanel(w){
 if(w.mode!=='campaign'||!w.story)return;
 const st=w.story,stage=st.stage,near=st.near,cutscene=stage==='flashback_intro';
 const past=['flashback','basement','projector','flashback_intro'].includes(stage);
 $('storyChapter').textContent='CAPÍTULO 1 · '+(past?'2008 · MEMÓRIAS':'2025 · TV PAULISTA');
 const part=stage==='investigation'?`PISTAS ${st.evidence?.length||0}/3`:stage==='flashback_intro'?`CUTSCENE ${Math.min((st.flashbackStep||0)+1,Math.max(1,st.flashbackTotal||1))}/${Math.max(1,st.flashbackTotal||1)}`:stage==='flashback'?`MEMÓRIAS ${st.memories?.length||0}/5`:stage==='basement'?`POSTOS ${st.anchors?.length||0}/5`:stage==='adult_chase'?'CORRAM DO OCULTISTA':stage==='masks'?`MÁSCARAS ${st.masks?.length||0}/5`:stage==='sigils'?`SELOS ${st.sigils?.length||0}/${Math.max(1,w.players.filter(p=>p.agent&&p.connected).length)}`:stage==='terminal'||stage==='projector'?'TRANSMISSÃO PRONTA':'INVESTIGAÇÃO';
 $('storyProgress').textContent=part+(['flashback','basement','projector','adult_chase'].includes(stage)?` · MEDO ${Math.round(st.fear||0)}%`:'');
 $('storyObjective').textContent=st.objective;
 if(cutscene){
  $('storyHint').textContent='🎬 CENA DE MEMÓRIA · AGUARDE';
  $('interactAction').disabled=true;
  $('interactAction').querySelector('small').textContent='AGUARDE';
  $('storyAction').textContent=st.text||'A gravação está rebobinando...';
 }else{
  $('storyHint').textContent=near?'✋ '+near.toUpperCase()+' · TOQUE EM INTERAGIR':'TOQUE NAS PISTAS OU EM INTERAGIR PARA SE APROXIMAR';
  $('interactAction').disabled=false; // O servidor valida a distância; nunca bloqueia o botão por atraso de rede.
  $('interactAction').querySelector('small').textContent=near?'USAR':'INTERAGIR';
  $('storyAction').textContent=near?'📍 PERTO DE '+(st.stations?.find(z=>z.id===near)?.label||near).toUpperCase()+' — TOQUE OU CLIQUE':'TOQUE NOS OBJETOS BRILHANTES / APROXIME-SE';
 }
 if(lastStoryStage!==stage){lastStoryStage=stage;storySig='';walkToStation=null;}
 const sig=JSON.stringify(st.log);
 if(sig!==storySig){storySig=sig;const box=$('storyLog');box.replaceChildren();for(const [i,item] of (st.log||[]).entries()){
   const line=document.createElement('article');line.className='story-document';
   const head=document.createElement('b');const tag=/SANDRA/i.test(item)?'DEPOIMENTO':/FITA|VHS/i.test(item)?'GRAVAÇÃO':/ARQUIVO|RELATÓRIO/i.test(item)?'RELATÓRIO':/MÁSCARAS|ESSÊNCIA|TELÓPSIA/i.test(item)?'DOSSIÊ':/YURI/i.test(item)?'TESTEMUNHO':'REGISTRO';head.textContent=tag+' · '+String(i+1).padStart(2,'0');
   const content=document.createElement('p');content.textContent=item;line.append(head,content);box.append(line);
  }
  $('storyLogCount').textContent=(st.log||[]).length+' registros compartilhados';
 }
}
// O papel fica no dispositivo de quem coletou; o texto já está no diário coletivo.
function showPersonalPaper(paper){
 if(!paper)return;
 const modal=$('personalPaper');$('paperCategory').textContent=paper.category||'DOCUMENTO';
 $('paperTitle').textContent=paper.title||'REGISTRO ENCONTRADO';
 $('paperBody').textContent=paper.body||'';
 modal.hidden=false;userGesture();
}
function closePersonalPaper(){
 if(!world?.story?.paper)return $('personalPaper').hidden=true;
 sending({type:'paper_ack',id:world.story.paper.id});
 $('personalPaper').hidden=true;
 if(pendingPaper){const paper=pendingPaper;pendingPaper=null;showPersonalPaper(paper);}
}
$('paperKeep').onclick=closePersonalPaper;
$('personalPaper').addEventListener('pointerdown',e=>{if(e.target===$('personalPaper'))closePersonalPaper();});
let maskTimer=null;
function showMaskReveal(agent,paper){
 if(!agent)return showPersonalPaper(paper);
 const modal=$('maskReveal');$('maskOwner').textContent=NAME[agent]+' • A ESSÊNCIA DESPERTOU';
 $('maskAgent').src='/assets/campanha-'+agent+'.png';$('maskArtifact').src='/assets/mask-'+agent+'.png';
 modal.hidden=false;modal.classList.remove('mask-animation');void modal.offsetWidth;modal.classList.add('mask-animation');
 clearTimeout(maskTimer);maskTimer=setTimeout(closeMaskReveal,3900);
}
function closeMaskReveal(){clearTimeout(maskTimer);$('maskReveal').hidden=true;if(pendingPaper){const p=pendingPaper;pendingPaper=null;showPersonalPaper(p);}}
$('maskSkip').onclick=closeMaskReveal;
let scareTimer=null;
function horrorEvent(text){
 const now=performance.now();if(now-lastScareTime<2200)return;
 lastScareTime=now;
 if(['flashback','basement','adult_chase','projector'].includes(world?.story?.stage))playEffect(sfxScare);
 const scare=$('horrorScare');$('scareText').textContent=text||'ALGO OBSERVA VOCÊ';
 scare.hidden=false;clearTimeout(scareTimer);scareTimer=setTimeout(()=>scare.hidden=true,580);
}
function toggleJournal(force){const el=$('storyJournal'),show=typeof force==='boolean'?force:el.hidden;el.hidden=!show;}
function render(ts){const minInterval=['fight','campaign'].includes(world?.phase)?(ecoGraphics?31.5:15.5):150;if(render.prev&&ts-render.prev<minInterval){requestAnimationFrame(render);return;}const dt=Math.min(.05,(ts-(render.prev||ts))/1000);render.prev=ts;framePositions.clear();framesSeen++;updateStats(ts);const secs=ts/1000;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#08060e';ctx.fillRect(0,0,resizeW,resizeH);
 if(!world||world.phase==='lobby'){const map=mapForQuality();if(map.naturalWidth){ctx.globalAlpha=.48;const z=Math.max(resizeW/W,resizeH/H);ctx.imageSmoothingEnabled=!lowGraphics;ctx.drawImage(map,(resizeW-W*z)/2,(resizeH-H*z)/2,W*z,H*z);ctx.globalAlpha=1;}requestAnimationFrame(render);return;}
 const focus=world.players.find(p=>p.token===me)||world.players[0],fp=focus?posFor(focus,dt):{x:750,y:550};const zoom=Math.max(.31,Math.min(resizeW/990,resizeH/570));const hx=resizeW/(2*zoom),hy=resizeH/(2*zoom);const cx=hx*2>=W?W/2:Math.max(hx,Math.min(W-hx,fp.x));const cy=hy*2>=H?H/2:Math.max(hy,Math.min(H-hy,fp.y));
 cameraView={cx,cy,zoom,resizeW,resizeH};ctx.save();if(shake>0){shake*=.91;if(shake<.5)shake=0;ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);}ctx.translate(resizeW/2,resizeH/2);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
 const inVoid=world.arena==='void';const campaignArena=['archive','memory','mask_room','basement'].includes(world.arena);const map=campaignArena?(campaignMapImages[world.arena]?.naturalWidth?campaignMapImages[world.arena]:campaignMaps[world.arena]):inVoid?cosmicMap:mapForQuality();
 ctx.imageSmoothingEnabled=!lowGraphics;
 if(inVoid||campaignArena||map.naturalWidth){ctx.drawImage(map,0,0,W,H);}else{ctx.fillStyle='#241923';ctx.fillRect(0,0,W,H);}
 if(inVoid){ctx.save();ctx.strokeStyle='#8859e455';ctx.lineWidth=3;const glow=0.35+0.2*Math.sin(secs*2);ctx.globalAlpha=glow;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(765,600,600+i*7,370+i*5,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
 ctx.imageSmoothingEnabled=false;
 const seen=(x,y,r=75)=>x+r>=cx-hx&&x-r<=cx+hx&&y+r>=cy-hy&&y-r<=cy+hy;
 for(const z of world.warnings){
  if(!['beam','outside','outside2'].includes(z.type)&&!seen(z.x,z.y,z.r+60))continue;
  ctx.save();const blink=.36+.26*Math.sin(secs*21)**2;
  ctx.strokeStyle=z.color||'#ff9e92';ctx.globalAlpha=.48+blink;ctx.lineWidth=5;
  if(z.type==='circle'){ctx.fillStyle='#a8343640';ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(z.x,z.y,Math.max(0,z.r*(1-z.life/z.duration)),0,Math.PI*2);ctx.stroke();}
  else if(z.type==='ring'){ctx.lineWidth=(z.band||20)*2;ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#fff8';ctx.beginPath();ctx.arc(z.x,z.y,z.r+25,0,Math.PI*2);ctx.stroke();}
  else if(z.type==='outside'||z.type==='outside2'){
   ctx.fillStyle='#9c29da45';ctx.beginPath();ctx.rect(BOUND.l,BOUND.t,BOUND.r-BOUND.l,BOUND.b-BOUND.t);
   ctx.moveTo(z.x+z.r,z.y);ctx.arc(z.x,z.y,z.r,0,Math.PI*2,true);
   if(z.type==='outside2'){ctx.moveTo(z.x2+z.r,z.y2);ctx.arc(z.x2,z.y2,z.r,0,Math.PI*2,true);}
   ctx.fill('evenodd');ctx.lineWidth=7;ctx.strokeStyle='#bff9ff';
   for(const safe of (z.type==='outside2'?[{x:z.x,y:z.y},{x:z.x2,y:z.y2}]:[{x:z.x,y:z.y}])){
    ctx.beginPath();ctx.arc(safe.x,safe.y,z.r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#c7fffa';ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.fillText('ZONA SEGURA',safe.x,safe.y);
   }
  }
  else {ctx.beginPath();ctx.moveTo(z.x,z.y);ctx.lineTo(z.x+Math.cos(z.a)*z.len,z.y+Math.sin(z.a)*z.len);ctx.lineWidth=z.r*2;ctx.stroke();}
  ctx.restore();
 }
 if(world.gravity){ctx.save();ctx.strokeStyle='#94dfff70';ctx.lineWidth=2;const g=world.gravity;for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(g.x,g.y,80+i*54+Math.sin(secs*5+i)*8,0,Math.PI*2);ctx.stroke();}ctx.restore();}
 // Kits de vida verdes no chao: desenhar antes dos personagens para nao cobrir os sprites.
 for(const item of world.pickups||[]){
  if(!seen(item.x,item.y,35))continue;
  const wobble=Math.sin(secs*4+item.id)*2;
  ctx.save();ctx.translate(item.x,item.y+wobble);
  // Simbolo simples e rapido, visivel mesmo com qualidade ECO/pixelizada.
  ctx.fillStyle='#082a21';ctx.fillRect(-13,-13,26,26);
  ctx.fillStyle=item.heal>=40?'#89ffd4':'#45ef9d';ctx.fillRect(-10,-10,20,20);
  ctx.fillStyle='#effff4';ctx.fillRect(-3,-8,6,16);ctx.fillRect(-8,-3,16,6);
  if(item.life<5){ctx.globalAlpha=.35+.6*(.5+.5*Math.sin(secs*13));ctx.strokeStyle='#b8ffdb';ctx.strokeRect(-13,-13,26,26);}
  ctx.restore();
 }
 if(world.mode==='campaign'&&world.phase==='campaign')drawCampaignWorld(ctx,world,secs);
 const all=[...world.players.filter(p=>p.agent).map(p=>({kind:'player',data:p})),...world.enemies.map(e=>({kind:'enemy',data:e}))].filter(item=>seen(item.data.x,item.data.y,130)).sort((a,b)=>a.data.y-b.data.y);
 for(const obj of all){const o=obj.data,v=posFor(o,dt);ctx.save();ctx.translate(v.x,v.y);ctx.fillStyle='#05040a99';ctx.beginPath();ctx.ellipse(0,23,22,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
  if(obj.kind==='player'){const i=AGENTS.findIndex(a=>a.id===o.agent);if(i<0)continue;let frame=o.fx>0?3:o.move?(Math.floor(secs*9+i)%2?1:2):0;ctx.globalAlpha=o.hp<=0?.36:!o.connected?.56:1;{const teen=world.mode==='campaign'&&['flashback','basement','projector'].includes(world.story?.stage);const unmasked=world.mode==='campaign'&&!world.story?.masks?.includes(o.agent);const ww=teen?57:62,hh=teen?73:81;const asset=teen?teenSprite[o.agent]:unmasked?campaignSprite[o.agent]:null;const sprite=asset?.complete&&asset.naturalWidth?asset:(unmasked?ART.heroesUnmasked:ART.heroes)[i][frame];
    const walking=!!o.move,step=walking?Math.sin(secs*(o.running?18:11)+i)*3.4:0;
    ctx.save();ctx.translate(v.x,v.y-hh+25+step);if(asset?.naturalWidth&&walking){ctx.rotate(Math.sin(secs*(o.running?17:11)+i)*.035);ctx.scale(1+Math.sin(secs*13+i)*.022,1-Math.sin(secs*13+i)*.02);}
    const walkSheet=teen?walkTeen[o.agent]:unmasked?walkAdult[o.agent]:null;
    if(walkSheet?.complete&&walkSheet.naturalWidth){
     const frameIndex=walking?Math.floor(secs*(o.running?12:8)+i)%4:0;
     const fw=walkSheet.naturalWidth/4,fh=walkSheet.naturalHeight;
     ctx.drawImage(walkSheet,fw*frameIndex,0,fw,fh,-ww/2,0,ww,hh);
    }else ctx.drawImage(sprite,-ww/2,0,ww,hh);
    ctx.restore();}ctx.globalAlpha=1;
   ctx.save();ctx.translate(v.x,v.y+3);ctx.rotate(o.dir||0);if(world.phase==='campaign'){ctx.globalAlpha=.25;}if(o.agent==='alvo'){ctx.fillStyle='#642037';ctx.fillRect(10,-3,44,7);ctx.fillStyle='#f55c74';ctx.fillRect(46,-18,18,36);ctx.fillStyle='#dba7b1';ctx.fillRect(60,-10,7,21);ctx.fillStyle='#ffb3b8';ctx.fillRect(50,-15,11,7);}else if(o.agent==='solar'){ctx.fillStyle='#2b2427';ctx.fillRect(4,-4,59,9);ctx.fillStyle='#eac078';ctx.fillRect(37,-6,24,3);}else if(o.agent==='feras'){ctx.fillStyle='#271d22';ctx.fillRect(5,-6,37,14);ctx.fillStyle='#e7b0a1';ctx.fillRect(17,-7,10,3);}else{ctx.strokeStyle=AGENTS[i].accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(31,0,14,0,Math.PI*2);ctx.stroke();}ctx.restore();
   if(o.token===me){ctx.strokeStyle='#f3dca8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y+20,27,0,Math.PI*2);ctx.stroke();}
   const label=(o.token===me?'VOCÊ • ':'')+o.name;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#0e080c';ctx.strokeText(label,v.x,v.y-83);ctx.fillStyle=o.connected?'#f8e9db':'#b5aab0';ctx.fillText(label,v.x,v.y-83);
   ctx.fillStyle='#27141c';ctx.fillRect(v.x-23,v.y-77,46,5);ctx.fillStyle=AGENTS[i].accent;ctx.fillRect(v.x-22,v.y-76,44*Math.max(0,o.hp/(o.maxHp||1)),3);
  }else{const e=o;ctx.save();ctx.translate(v.x-e.x,v.y-e.y);if(BOSS_KINDS.includes(e.kind)){
    if(e.kind==='energia'){
     const float=Math.sin(secs*3.1)*7,scale=e.stage===3?1.12:1;
     ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.90;
     if(energyArt.complete&&energyArt.naturalWidth)ctx.drawImage(energyArt,e.x-169*scale,e.y-224*scale+float,338*scale,420*scale);
     else {ctx.fillStyle='#9e72ef';ctx.beginPath();ctx.arc(e.x,e.y-48,62,0,Math.PI*2);ctx.fill();}
     ctx.restore();
     if(world.enemies.some(q=>q.kind==='nucleo'&&q.hp>0)){ctx.save();ctx.strokeStyle='#a6eaffbb';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(e.x,e.y,120,148,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    }else if(bossArt[e.kind]?.complete&&bossArt[e.kind].naturalWidth){ctx.drawImage(bossArt[e.kind],e.x-117,e.y-174,234,292);}else if(lowGraphics)ctx.drawImage(bossSprite(e),e.x-120,e.y-170);else renderBoss(ctx,e,secs);
   }else if(e.kind==='nucleo'){
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(secs*.8);ctx.fillStyle='#84dfff';ctx.fillRect(-24,-24,48,48);ctx.fillStyle='#663cae';ctx.fillRect(-15,-15,30,30);ctx.fillStyle='#e6c5ff';ctx.fillRect(-8,-8,16,16);ctx.restore();
   }else if(e.kind==='eco'){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.64;if(energyArt.complete&&energyArt.naturalWidth)ctx.drawImage(energyArt,e.x-52,e.y-70,104,140);else {ctx.fillStyle='#a57bff';ctx.fillRect(e.x-30,e.y-35,60,70);}ctx.restore();
   }else{const frames=ART.monsters[e.kind]||ART.monsters.sangue,fr=Math.floor(secs*(e.kind==='rastejante'?11:7))%3,s=e.kind==='bruto'?70:e.kind==='cacador'?64:53;ctx.drawImage(frames[fr],e.x-s/2,e.y-s/2,s,s);}ctx.restore();
   ctx.fillStyle='#160e15bb';ctx.fillRect(v.x-e.r,v.y-e.r-21,e.r*2,6);ctx.fillStyle=e.kind==='energia'||e.kind==='nucleo'?'#9deaff':BOSS_KINDS.includes(e.kind)?'#ffc07d':'#e65771';ctx.fillRect(v.x-e.r+1,v.y-e.r-20,Math.max(0,(e.r*2-2)*e.hp/e.maxHp),4);
  }
 }
 const shotAge=limit((performance.now()-stateAt)/1000,0,.135);
 for(const s of world.shots){const a=visualShot(s,dt,shotAge);if(!seen(a.x,a.y,25))continue;ctx.save();ctx.fillStyle=s.color;if(!lowGraphics){ctx.shadowColor=s.color;ctx.shadowBlur=8;}ctx.beginPath();ctx.arc(a.x,a.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();}
 if(ts-lastShotPrune>1000){const live=new Set(world.shots.map(s=>s.id));for(const id of shotVisuals.keys())if(!live.has(id))shotVisuals.delete(id);lastShotPrune=ts;}
 for(const fx of world.effects||[]){if(!seen(fx.x,fx.y,400))continue;if(fx.t==='ultimate'){ctx.fillStyle='#ffe5b33b';ctx.beginPath();ctx.arc(fx.x,fx.y,350,0,Math.PI*2);ctx.fill();}else if(['blood','ritual','heal','warp','rage'].includes(fx.t)){ctx.strokeStyle=fx.t==='blood'?'#ff4268':fx.t==='heal'?'#ffc3eb':'#c08dff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(fx.x,fx.y,70+Math.sin(secs*10)*10,0,Math.PI*2);ctx.stroke();}else if(fx.t==='axe'){ctx.strokeStyle='#fb526d';ctx.lineWidth=13;ctx.beginPath();ctx.arc(fx.x,fx.y,85,fx.a-.95,fx.a+.95);ctx.stroke();}else if(fx.t==='laser'){ctx.strokeStyle='#ffdf9b';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(fx.x,fx.y);ctx.lineTo(fx.x2,fx.y2);ctx.stroke();}}
 ctx.restore();if(!lowGraphics){ctx.fillStyle='#00000013';for(let y=0;y<resizeH;y+=5)ctx.fillRect(0,y,resizeW,1);}requestAnimationFrame(render);
}requestAnimationFrame(render);
const getMove=()=>{
 const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+touch.x;
 const y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+touch.y;
 if(Math.hypot(x,y)>.18){walkToStation=null;const len=Math.hypot(x,y)||1;return{x:x/Math.max(1,len),y:y/Math.max(1,len)};}
 if(walkToStation&&world?.phase==='campaign'){
  const station=world.story?.stations?.find(z=>z.id===walkToStation);
  const mine=visualPos.get(me)||world.players.find(z=>z.token===me);
  if(!station||!mine){walkToStation=null;return{x:0,y:0};}
  const dx=station.x-mine.x,dy=station.y-mine.y,len=Math.hypot(dx,dy);
  if(len<140){tryInteract(station.id);return{x:0,y:0};}
  return{x:dx/len,y:dy/len};
 }
 return{x:0,y:0};
};
setInterval(()=>{if(world&&['cards','between','reward_wait','boss_intro'].includes(world.phase))sending({type:'tick'});},250);
let lastInputSent=0;
function sendInput(){if(!world||!['fight','campaign'].includes(world.phase)||ws?.readyState!==WebSocket.OPEN)return;
 const m=getMove(),firing=touch.fire||keys.has(' ')||keys.has('j');if(firing&&world.phase==='fight'&&performance.now()-lastFireSound>480){lastFireSound=performance.now();playEffect(sfxShot);}sending({type:'input',x:m.x,y:m.y,fire:firing,run:touch.run||keys.has('shift'),skill:pending.skill,dash:pending.dash,ult:pending.ult});
 pending.skill=false;pending.dash=false;pending.ult=false;lastInputSent=performance.now();
}
function fastInput(){if(performance.now()-lastInputSent>=35)sendInput();}
setInterval(sendInput,100);
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!$('storyJournal').hidden&&k!=='escape')return;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&document.activeElement?.tagName!=='INPUT')e.preventDefault();if(document.activeElement?.tagName==='INPUT')return;keys.add(k);if(k==='e'&&world?.phase==='campaign'&&!e.repeat)tryInteract();else if(k==='q'||(k==='e'&&world?.phase!=='campaign'))pending.skill=true;if(k==='j'&&!e.repeat&&world?.mode==='campaign')toggleJournal();if(k==='k')pending.dash=true;if(k==='f')pending.ult=true;if(!e.repeat)fastInput();});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());fastInput();});window.addEventListener('blur',()=>{keys.clear();touch.fire=false;touch.run=false;touch.x=touch.y=0;knob.style.transform='translate(0,0)';});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();touch.fire=false;touch.run=false;touch.x=touch.y=0;}});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&world?.phase==='fight'){touch.fire=true;fastInput();}});window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'){touch.fire=false;fastInput();}});
const stick=$('joystick'),knob=$('knob');let pointer=null;function onStick(e){const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,len=Math.hypot(x,y)||1,max=r.width*.33;touch.x=x/Math.max(len,max);touch.y=y/Math.max(len,max);knob.style.transform=`translate(${touch.x*max}px,${touch.y*max}px)`;}
stick.addEventListener('pointerdown',e=>{pointer=e.pointerId;stick.setPointerCapture(e.pointerId);onStick(e);fastInput();});stick.addEventListener('pointermove',e=>{if(pointer===e.pointerId){onStick(e);fastInput();}});function resetStick(e){if(pointer===e.pointerId){pointer=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)';fastInput();}}stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
const runButton=$('runAction');
runButton.addEventListener('pointerdown',e=>{e.preventDefault();runPointer=true;touch.run=true;runButton.classList.add('pressed');runButton.setPointerCapture(e.pointerId);fastInput();userGesture();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])runButton.addEventListener(event,()=>{runPointer=false;touch.run=false;runButton.classList.remove('pressed');fastInput();});
for(const id of ['fire','skill','dash','ult']){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.classList.add('pressed');el.setPointerCapture(e.pointerId);if(id==='fire'){touch.fire=true;if(performance.now()-lastFireSound>190){lastFireSound=performance.now();playEffect(sfxShot);}}else pending[id]=true;fastInput();userGesture();});const stop=()=>{el.classList.remove('pressed');if(id==='fire'){touch.fire=false;fastInput();}};el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);}
$('create').onclick=()=>{userGesture();connect(true)};$('join').onclick=()=>{userGesture();connect(false)};$('ready').onclick=()=>sending({type:'ready'});$('start').onclick=()=>{userGesture();sending({type:'start'});};$('again').onclick=()=>sending({type:'restart'});
$('copy').onclick=async()=>{const link=location.origin+'/?sala='+roomCode;try{await navigator.clipboard.writeText(link);$('copy').textContent='✓ LINK COPIADO';}catch{window.prompt('Copie o link da sala:',link);}};
function tryInteract(target){
 if(world?.phase!=='campaign')return;
 const now=performance.now();if(now-lastInteract<180)return;lastInteract=now;
 const station=world.story?.stations?.find(z=>z.id===target) || world.story?.stations?.find(z=>z.id===world.story?.near);
 sending({type:'interact',target:station?.id||target||null});
}
$('interactAction').onclick=e=>{
 e.preventDefault();
 const mine=visualPos.get(me)||world?.players?.find(z=>z.token===me);
 const stations=world?.story?.stations||[];
 if(world?.phase==='campaign'&&mine&&stations.length){
  const target=stations.slice().sort((a,b)=>Math.hypot(a.x-mine.x,a.y-mine.y)-Math.hypot(b.x-mine.x,b.y-mine.y))[0];
  if(target){const distance=Math.hypot(target.x-mine.x,target.y-mine.y),reach=(target.range||110)+22;if(distance>reach){walkToStation=target.id;showAnn('INDO ATÉ '+target.label);return;}tryInteract(target.id);return;}
 }
 tryInteract();
};
// Clique ou toque diretamente numa pista do mapa: suporta mouse e touchscreen.
canvas.addEventListener('pointerdown',e=>{
 if(world?.phase!=='campaign'||world?.story?.stage==='flashback_intro'||!cameraView||!world.story?.stations?.length)return;
 const box=canvas.getBoundingClientRect(),px=(e.clientX-box.left)*resizeW/box.width,py=(e.clientY-box.top)*resizeH/box.height;
 const {cx,cy,zoom,resizeW:vw,resizeH:vh}=cameraView;
 const x=cx+(px-vw/2)/zoom,y=cy+(py-vh/2)/zoom;
 const target=world.story.stations.filter(z=>Math.hypot(x-z.x,y-z.y)<Math.max((z.click||72),42/zoom)).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
 if(target){e.preventDefault();walkToStation=target.id;tryInteract(target.id);showAnn('INDO ATÉ '+target.label);}
});

$('storyLogButton').onclick=()=>toggleJournal();$('closeJournal').onclick=()=>toggleJournal(false);
$('storyJournal').addEventListener('pointerdown',e=>{if(e.target===$('storyJournal'))toggleJournal(false);});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('personalPaper').hidden)closePersonalPaper();if(!$('maskReveal').hidden)closeMaskReveal();if(!$('storyJournal').hidden)toggleJournal(false);}});
const leave=()=>{offline=true;try{ws?.close();}catch{}history.replaceState(null,'',location.pathname);location.reload();};$('exitLobby').onclick=leave;$('back').onclick=leave;
$('chatForm').onsubmit=e=>{e.preventDefault();const t=$('chatInput').value.trim();if(t)sending({type:'chat',text:t});$('chatInput').value='';};$('soundBtn').onclick=()=>{musicOn=!musicOn;audio.muted=!musicOn;$('soundBtn').textContent=musicOn?'♫':'×';if(musicOn)userGesture();};const qualityBtn=$('qualityBtn');function qualityLabel(){
 qualityBtn.textContent=ecoGraphics?'ECO':lowGraphics?'⚡':'HD';
 qualityBtn.title=ecoGraphics?'Modo econômico (30 FPS). Toque para HD.':lowGraphics?'Modo leve (até 60 FPS). Toque para econômico.':'HD (até 60 FPS). Toque para leve.';
}
qualityBtn.onclick=()=>{
 if(ecoGraphics){ecoGraphics=false;lowGraphics=false;}
 else if(lowGraphics){ecoGraphics=true;}
 else {lowGraphics=true;}
 lowFpsSeconds=0;lastQualityAdjust=performance.now();qualityLabel();scale();
};qualityLabel();
const code=new URLSearchParams(location.search).get('sala');if(code){$('roomInput').value=code.toUpperCase();$('entryStatus').textContent='Sala do convite detectada. Escreva seu nome e toque em ENTRAR COM CÓDIGO.';}

// Reiniciar contadores ao voltar do segundo plano, evitando FPS falso.
document.addEventListener('visibilitychange',()=>{fpsStart=performance.now();framesSeen=0;lowFpsSeconds=0;render.prev=0;});
