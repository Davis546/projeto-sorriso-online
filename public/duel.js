// YGGDRASIL v3.7 PvP — optimised shared online arena with locally predicted input.
// The host is the authority for damage, cooldowns, positions and the outcome.
const $ = id => document.getElementById(id);
const W=960,H=576,MAP_W=1920,MAP_H=1400,HP=11200,ROUND_TIME=180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const nfmt=n=>Math.max(0,Math.round(n)).toLocaleString('pt-BR');
// v3.5 — shared rules of the same skills in campaign/co-op and X1.
const heroes={loid:{name:'LOID',dmg:128,speed:175,attack:.37,range:46,crit:.09,skill:9,second:20,dash:2.4,color:'#cda4f2'},kris:{name:'KRIS',dmg:158,speed:157,attack:.43,range:109,crit:.08,skill:14,second:8.5,dash:2.8,color:'#6dbbff'},cross:{name:'XANS',dmg:137,speed:174,attack:.40,range:98,crit:.26,skill:6.5,second:9,dash:2.55,color:'#bb74ff'},eve:{name:'EVE LOREY',dmg:175,speed:197,attack:.34,range:113,crit:.15,skill:21,second:18,dash:2.2,color:'#916aff'},kali:{name:'KALI',dmg:113,speed:162,attack:.44,range:157,crit:.08,skill:20,second:18,dash:2.6,color:'#dfaafa'}};
const cards={
  heart:['Coração da Raiz','+1.100 de vida máxima.'],blade:['Fio da Ruína','+12% de dano.'],fast:['Dança das Lâminas','+10% de rapidez de ataque.'],speed:['Passos Leves','+8% velocidade de movimento.'],armor:['Casca Ancestral','9% menos dano recebido.'],reach:['Alcance da Raiz','+10% alcance (máximo 25%).'],dodge:['Reflexos Antigos','Esquiva recarrega mais rápido.'],critical:['Olho do Predador','+8% chance de crítico.'],arc:['Corte Crescente','Aumenta o arco do ataque.'],echo:['Eco da Lâmina','12% chance de segundo golpe.'],ancient:['Herança de Yggdrasil','+6% vida, dano e velocidade.'],shadowblade:['Lâmina Sombria','Loid: +14% de dano.'],shadowdash:['Passo Sombrio','Loid: esquiva 18% mais rápida.'],darkburst:['Abismo Desperto','Loid: aura mais forte.'],black:['Fúria Negra','Kris: +25% dano transformado.'],form:['Forma Perfeita','Kris: +3s de transformação.'],awakening:['Despertar','Kris: Q recarrega mais rápido.'],bloodmoon:['Lua do Abismo','Kris: corte transformado causa mais dano.'],mirror:['Reflexo Duplo','Kali: +12% de dano de ilusão.'],mirrorguard:['Espelho Protetor','Kali: defesa ilusória dura mais.'],voidblade:['Espada Voraz','Eve: +12% dano da espada.'],timeward:['Tempo Dilatado','Eve: área de tempo mais duradoura.']
};
const $arena=$('arena'),g=$arena.getContext('2d',{alpha:false});
const isMobile=matchMedia('(pointer:coarse)').matches;
let DUEL_SCALE=Math.min(isMobile?1.35:1.85,Math.max(.85,window.devicePixelRatio||1));
let qualityMode='auto',lastQualityShift=0,slowFpsTime=0;
function resizeArena(){const ratio=DUEL_SCALE;$arena.width=Math.round(W*ratio);$arena.height=Math.round(H*ratio);g.imageSmoothingEnabled=false;}
resizeArena();let duelCamera={x:0,y:0};

const arena=new Image();arena.src='assets/japanese_arena.webp?v=32';
const mirrorAsset=new Image();mirrorAsset.src='assets/effects/mirror_projectile.png?v=32';
const portalFrames=Array.from({length:4},(_,i)=>{let im=new Image();im.src=`assets/effects/void_portal_${i}.png?v=32`;return im;});

const slashPalette={loid:'#d2adff',kris:'#7cbaff',cross:'#cba2ff',eve:'#ab8dff',kali:'#f4c3fe'};
const sprites={};for(const h of Object.keys(heroes)){let im=new Image();im.src=`assets/heroes/${h}_sheet.png?v=33`;sprites[h]=im;}
// A return to the original understated controls: symbol + small key label.
// Character abilities remain EXACTLY as defined by the actual gameplay code.
let duelIconHero='';
let serverDuel=false;
function showSkillArt(hero){
 if(!hero||!heroes[hero])return;duelIconHero=hero;
 const sigils={q:'✦',e:'✧',r:'✶'};
 for(const key of ['q','e','r']){
  const btn=document.querySelector(`#touchControls .skills [data-act="${key}"]`);
  if(!btn)continue;
  btn.replaceChildren();
  const sigil=document.createElement('span');sigil.textContent=sigils[key];sigil.className='skill-sigil';
  const label=document.createElement('span');label.textContent=key.toUpperCase();label.className='skill-key';
  btn.append(sigil,label);
 }
}
const shadowSprite=new Image();shadowSprite.src='assets/heroes/loid_shadow_sheet.png?v=32';
const skullAsset=new Image();skullAsset.src='assets/effects/gaster_skull.png';
// Distinct lightweight feedback SFX. Initialized only after a user gesture.
let sfxCtx=null,sfxLast=0,nextBasicSfx=0;
function duelSfx(kind){
 const now=performance.now();if(now-sfxLast<55)return;sfxLast=now;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  sfxCtx=sfxCtx||new AC();if(sfxCtx.state==='suspended')sfxCtx.resume().catch(()=>{});
  const f={portal:[1000,110,.31],mirror:[920,430,.21],slash:[420,135,.11],cast:[650,180,.27],dash:[1200,260,.14],hit:[160,70,.14],ultimate:[180,760,.36]}[kind]||[450,200,.14];
  const osc=sfxCtx.createOscillator(),vol=sfxCtx.createGain();osc.type=kind==='mirror'?'triangle':kind==='slash'?'sawtooth':'sine';
  osc.frequency.setValueAtTime(f[0],sfxCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(f[1],sfxCtx.currentTime+f[2]);
  vol.gain.setValueAtTime(.0001,sfxCtx.currentTime);vol.gain.exponentialRampToValueAtTime(.045,sfxCtx.currentTime+.012);vol.gain.exponentialRampToValueAtTime(.0001,sfxCtx.currentTime+f[2]);
  osc.connect(vol).connect(sfxCtx.destination);osc.start();osc.stop(sfxCtx.currentTime+f[2]+.01);
 }catch(_){/* sound not supported */}
}
const state={id:null,host:null,code:'',role:'fighter',members:[],offer:[],picks:[],selectedHero:'',started:false,finished:false,scene:'entry',ping:0,online:false};

// Duel soundtrack: the user-supplied OST plays only while an X1 match is active.
// Mobile browsers may require the user to tap ACTIVATE OST before they allow playback.
const duelMusic=document.getElementById('duelMusic');
const duelMusicButton=document.getElementById('duelMusicToggle');
const duelMusicVolume=document.getElementById('duelMusicVolume');
let duelMusicEnabled=false;
duelMusic.volume=.26;
function duelMusicUI(){duelMusicButton.textContent=duelMusicEnabled?'♫ OST LIGADA · DESLIGAR':'♫ ATIVAR OST DO X1';duelMusicButton.setAttribute('aria-pressed',String(duelMusicEnabled));}
function stopDuelMusic(){duelMusic.pause();duelMusic.currentTime=0;}
async function playDuelMusic(){
 if(!duelMusicEnabled || state.scene!=='battle'||state.finished)return;
 try{await duelMusic.play()}catch(e){duelMusicButton.textContent='▶ TOQUE PARA OUVIR A OST';}
}
duelMusicButton.addEventListener('click',()=>{
 duelMusicEnabled=!duelMusicEnabled;
 if(!duelMusicEnabled){stopDuelMusic();}else{playDuelMusic();}
 duelMusicUI();
});
duelMusicVolume.addEventListener('input',()=>{duelMusic.volume=Number(duelMusicVolume.value)/100;});
window.addEventListener('pagehide',()=>{duelMusic.pause();closeDirect();});

let ws, battle=null, view=null, rendered=new Map(), gameTime=0,last=performance.now(),lastSend=0,lastSnapshot=0, fps=60, frames=0,fpsTime=0;
let latestSeq=-1,hostSeq=0,lastSnapAt=0,previousSnapAt=0,localTravelFx=[],networkJitter=0,networkGap=0;
let lastHudAt=0,lastMotionSent=0,motionSeq=0,lastMotionSeq=-1,lastViewStamp=-1;
// v3.5: optional direct peer-to-peer transport for the two X1 fighters.
// The Durable Object only exchanges ICE/SDP; the ordinary WebSocket remains a
// fully functional fallback for restrictive NATs and browsers without WebRTC.
let directPeer=null, directFast=null, directEvents=null, directPeerId=null;
let directStatus='cloud', directRtt=0, directCandidates=[], directRemoteDescription=false;
let lastCloudSnapshot=0, directLastActive=0, directFailed=false;
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
function directActive(){return directPeer?.connectionState==='connected' && directFast?.readyState==='open' && directEvents?.readyState==='open';}
function closeDirect(){
 try{directFast?.close();directEvents?.close();directPeer?.close();}catch(_){}
 directPeer=directFast=directEvents=null;directPeerId=null;directStatus='cloud';
 directCandidates=[];directRemoteDescription=false;directRtt=0;
}
function bindDirectChannel(ch){
 if(ch.label==='fast') directFast=ch;
 if(ch.label==='events') directEvents=ch;
 ch.onopen=()=>{if(directActive()){directStatus='direct';directLastActive=performance.now();note('X1 conectado diretamente. Controles em tempo real; Cloudflare de reserva.');}};
 ch.onclose=()=>{directStatus='cloud';};
 ch.onerror=()=>{directStatus='cloud';};
 ch.onmessage=e=>{
  let msg;try{msg=JSON.parse(e.data);}catch(_){return;}
  if(!['pvpInput','pvpAction','pvpSnapshot'].includes(msg?.t))return;
  // IDs are fixed by the match and never accepted from untrusted packets.
  if(msg.t==='pvpInput'||msg.t==='pvpAction'){
   if(!battle?.host||!battle.players?.some(p=>p.id===directPeerId))return;
   handleMessage({...msg,id:directPeerId});
  }else if(!battle?.host){handleMessage(msg);}
 };
}
function startDirect(peerId,isOfferer){
 if(!('RTCPeerConnection' in window)||!peerId||state.role!=='fighter'||directFailed)return;
 if(directPeer&&directPeerId===peerId)return;
 closeDirect();directPeerId=peerId;
 try{
  const pc=new RTCPeerConnection(rtcConfig);directPeer=pc;directStatus='connecting';
  pc.onicecandidate=e=>{if(e.candidate)send({t:'pvpSignal',to:peerId,data:{type:'candidate',candidate:e.candidate.toJSON()}});};
  pc.ondatachannel=e=>bindDirectChannel(e.channel);
  pc.onconnectionstatechange=()=>{
   if(pc.connectionState==='failed'||pc.connectionState==='closed'){
     directStatus='cloud';
     // Do not close the peer here: leave the remote side free to recover.
   }else if(pc.connectionState==='connected'&&directActive())directStatus='direct';
  };
  if(isOfferer){
   bindDirectChannel(pc.createDataChannel('fast',{ordered:false,maxRetransmits:0}));
   bindDirectChannel(pc.createDataChannel('events',{ordered:true}));
   (async()=>{const offer=await pc.createOffer();await pc.setLocalDescription(offer);
    send({t:'pvpSignal',to:peerId,data:{type:'offer',sdp:pc.localDescription.sdp}});
   })().catch(()=>{directStatus='cloud';});
  }
 }catch(_){directStatus='cloud';directFailed=true;closeDirect();}
}
async function acceptDirectSignal(m){
 if(!state.started||state.role!=='fighter'||!m?.from||!m.data)return;
 const opponent=battle?.players?.find(p=>p.id!==state.id)?.id;
 if(!opponent||opponent!==m.from)return;
 try{
  if(!directPeer||directPeerId!==opponent)startDirect(opponent,false);
  const pc=directPeer;if(!pc)return;
  const d=m.data;
  if(d.type==='offer'){
   if(pc.signalingState!=='stable')return;
   await pc.setRemoteDescription({type:'offer',sdp:d.sdp});directRemoteDescription=true;
   const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
   send({t:'pvpSignal',to:opponent,data:{type:'answer',sdp:pc.localDescription.sdp}});
  }else if(d.type==='answer'){
   if(pc.signalingState!=='have-local-offer')return;
   await pc.setRemoteDescription({type:'answer',sdp:d.sdp});directRemoteDescription=true;
  }else if(d.type==='candidate'){
   if(!d.candidate)return;
   if(!pc.remoteDescription){directCandidates.push(d.candidate);return;}
   await pc.addIceCandidate(d.candidate).catch(()=>{});
  }
  if(directRemoteDescription&&directCandidates.length){
   const pending=directCandidates.splice(0);
   for(const candidate of pending)await pc.addIceCandidate(candidate).catch(()=>{});
  }
 }catch(_){directStatus='cloud';}
}
function directSend(channel,msg,limit=18000){
 if(!directActive()||!channel||channel.readyState!=='open'||channel.bufferedAmount>limit)return false;
 try{channel.send(JSON.stringify(msg));directLastActive=performance.now();return true;}catch(_){return false;}
}
function sendDuelInput(msg){
 if(serverDuel){send(msg);return;}
 if(!directSend(directFast,msg,9000))send(msg);
 else if(performance.now()-lastInputCloudFallback>700){
  // Low-frequency cloud backup so a disrupted peer path never permanently locks controls.
  send(msg);lastInputCloudFallback=performance.now();
 }
}
function sendDuelAction(msg){if(serverDuel){send(msg);return;}if(!directSend(directEvents,msg,12000))send(msg);}
let lastInputCloudFallback=0,inputSequence=0;

let authoritativePrevious=new Map(),authoritativeVelocity=new Map(),smoothPacketCount=0;
let lastImmediateSnapshot=0;
function sendAuthoritativeSnapshot(force=false){
 if(!battle?.host||!state.started||state.finished)return;
 const now=performance.now();if(now-lastImmediateSnapshot<(force?24:43))return;
 // One authoritative tick creates one sequential frame; obsolete unreliable
 // direct frames may be dropped instead of building a retransmission backlog.
 const data=snapshot(),msg={t:'pvpSnapshot',data};view=data;
 const liveDirect=directActive();
 const sentDirect=liveDirect&&directSend(directFast,msg,22000);
 const spectatorOnline=state.members.some(m=>m.role==='spectator');
 const cloudInterval=liveDirect?(spectatorOnline?110:400):120;
 if((!sentDirect||now-lastCloudSnapshot>=cloudInterval)&&ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<20000){
   send(msg);lastCloudSnapshot=now;
 }
 lastSnapshot=now;lastImmediateSnapshot=now;
}
const controls={x:0,y:0,aim:0,attack:false};let lastInputSent={x:0,y:0,aim:0,attack:false},lastInputHeartbeat=0;const keySet=new Set();let touchX=0,touchY=0,dragging=false,stickId=null,stickStart={x:0,y:0};
const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
const note=text=>{$('notice').textContent=text;};
const send=m=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
function connect(){let proto=location.protocol==='https:'?'wss':'ws';ws=new WebSocket(`${proto}://${location.host}/ws`);
 ws.onopen=()=>{state.online=true;note('Conectado ao Yggdrasil · Crie uma sala X1 ou entre por código.');};
 ws.onclose=()=>{state.online=false;closeDirect();note('Conexão encerrada. Recarregue a página para reconectar.');};
 ws.onerror=()=>note('Não foi possível conectar ao servidor. Confirme que o jogo está publicado no Cloudflare.');
 ws.onmessage=event=>{let m;try{m=JSON.parse(event.data)}catch{return}handleMessage(m);};
}
function handleMessage(m){
 if(m.t==='pong'){state.ping=Math.round(Math.max(0,Date.now()-m.ts));return;}
 if(m.t==='error'){note('⚠ '+m.message);return;}
 if(m.t==='closed'){closeDirect();stopDuelMusic();battle=null;view=null;state.started=false;state.finished=false;state.scene='entry';showScene('entry');note(m.message||'A sala foi fechada.');return;}
 if(m.t==='pvpWelcome'){
   Object.assign(state,{id:m.id,host:m.host,code:m.code,role:m.role,offer:m.offer||[],picks:[],members:m.members||[],started:m.started,finished:m.finished||false});
   $('codeLabel').textContent=state.code;showScene(m.started?'battle':'lobby');refreshLobby();note(m.role==='spectator'?'Modo espectador: você verá o mesmo duelo dos jogadores.':'Você entrou na sala X1. Escolha seu personagem e três cartas.');
   return;
 }
 if(m.t==='pvpLobby'){
   if(m.code!==state.code)return;state.members=m.members;state.started=m.started;state.finished=m.finished||false;
   if(state.scene==='lobby')refreshLobby();return;
 }
 if(m.t==='pvpDraft'){state.picks=m.picks||[];state.offer=m.offer||state.offer;renderDraft();refreshLobby();return;}
 if(m.t==='pvpBegin'){
   serverDuel=m.authority==='server';
   closeDirect();directFailed=false;inputSequence=0;lastCloudSnapshot=0;
   state.started=true;state.finished=false;
   if(!state.id)return;
   battle={host:!serverDuel&&state.id===m.host,fighters:m.fighters,players:[],particles:[],projectiles:[],fx:[],clones:[],clock:0,remaining:ROUND_TIME,starting:3,resultSent:false};latestSeq=-1;hostSeq=0;lastMotionSeq=-1;lastViewStamp=-1;motionSeq=0;lastMotionSent=0;lastSnapAt=0;authoritativePrevious.clear();authoritativeVelocity.clear();smoothPacketCount=0;lastInputHeartbeat=0;lastInputSent={x:0,y:0,aim:0,attack:false};rendered.clear();
   for(let i=0;i<m.fighters.length;i++)battle.players.push(makeActor(m.fighters[i],i));
   view=null;rendered.clear();showScene('battle');show('resultOverlay',false);showSkillArt(m.fighters.find(p=>p.id===state.id)?.hero||'');
   show('spectatorMark',state.role==='spectator');show('touchControls',state.role==='fighter');
   $('roundCountdown').textContent='3';playDuelMusic();
   if(!serverDuel&&state.role==='fighter'&&m.fighters?.length===2){
    const other=m.fighters.find(x=>x.id!==state.id);
    if(other&&battle.host)startDirect(other.id,true);
   }note(state.role==='spectator'?'Espectando o X1.':'Duelo iniciado!');return;
 }
 if(m.t==='pvpSignal'){acceptDirectSignal(m);return;}
 if(m.t==='pvpInput'&&battle?.host){
  const a=battle.players.find(x=>x.id===m.id);
  if(a && a.id!==state.id){
   const seq=Number.isFinite(m.seq)?m.seq:0;
   if(seq && seq<=(a.inputSeq||0))return;
   if(seq)a.inputSeq=seq;
   a.input={...m.data,x:clamp(Number(m.data?.x)||0,-1,1),y:clamp(Number(m.data?.y)||0,-1,1),aim:Number(m.data?.aim)||0,attack:!!m.data?.attack};
   a.inputAt=performance.now();
  }
  return;
 }
 if(m.t==='pvpAction'&&battle?.host){const a=battle.players.find(x=>x.id===m.id);
  if(a){
    if(Number.isFinite(m.aim))a.input.aim=m.aim;
    if(Number.isFinite(m.x))a.input.x=clamp(m.x,-1,1);
    if(Number.isFinite(m.y))a.input.y=clamp(m.y,-1,1);
    a.inputAt=performance.now();
    act(a,m.action,m.variant);sendAuthoritativeSnapshot(true);
  }return;}

 if(m.t==='pvpSnapshot'&&!battle?.host){
   if(!m.data?.players || m.data.players.length!==2)return;
   const seq=Number.isFinite(m.data.seq)?m.data.seq:latestSeq+1;
   if(seq<=latestSeq || (Number.isFinite(m.data.stamp)&&m.data.stamp<lastViewStamp))return;
   if(Number.isFinite(m.data.stamp))lastViewStamp=m.data.stamp;
   latestSeq=seq;
   const now=performance.now();const delta=lastSnapAt?Math.max(24,now-lastSnapAt):65;
   if(lastSnapAt){networkJitter=networkJitter*.84+Math.abs(delta-62)*.16;networkGap=delta;}
   previousSnapAt=lastSnapAt;lastSnapAt=now;smoothPacketCount++;
   // Dead reckoning only for visual remote actors. Damage stays host authoritative.
   for(const p of m.data.players){const old=authoritativePrevious.get(p.id);
    if(old&&delta<600){const elapsed=Math.max(18,now-(old.at||now-delta));const vx=clamp((p.x-old.x)/elapsed*1000,-440,440),vy=clamp((p.y-old.y)/elapsed*1000,-440,440);
     const prior=authoritativeVelocity.get(p.id)||{x:0,y:0};
     authoritativeVelocity.set(p.id,{x:prior.x*.35+vx*.65,y:prior.y*.35+vy*.65});
    }
    authoritativePrevious.set(p.id,{x:p.x,y:p.y,at:now});
   }
   view=m.data;
   if(!battle){battle={host:false,players:[],fighters:[],clock:0,remaining:ROUND_TIME,starting:0};showScene('battle');}
   if(view?.players){for(const p of view.players){const old=rendered.get(p.id);if(!old)rendered.set(p.id,{...p});
     else if(Math.hypot(old.x-p.x,old.y-p.y)>260){old.x=p.x;old.y=p.y;}
     // Reconciliation runs gently in renderGuests instead of resetting movement on every packet.
   }}
   return;
 }
 if(m.t==='pvpMotion'&&!battle?.host&&view?.players){
   const d=m.data;
   if(!d||!Array.isArray(d.players)||d.players.length!==2||!Number.isFinite(d.seq))return;
   if(d.seq<=lastMotionSeq||d.stamp<lastViewStamp)return;
   lastMotionSeq=d.seq;lastViewStamp=d.stamp;
   const now=performance.now(),delta=lastSnapAt?Math.max(24,now-lastSnapAt):50;
   if(lastSnapAt){networkJitter=networkJitter*.85+Math.abs(delta-48)*.15;networkGap=delta;}
   lastSnapAt=now;smoothPacketCount++;
   for(const incoming of d.players){
     const p=view.players.find(p=>p.id===incoming.id);if(!p)continue;
     const prev=authoritativePrevious.get(p.id);
     if(prev&&delta<500){const elapsed=Math.max(18,now-(prev.at||now-delta));const vx=clamp((incoming.x-prev.x)/elapsed*1000,-440,440),vy=clamp((incoming.y-prev.y)/elapsed*1000,-440,440);
       const v=authoritativeVelocity.get(p.id)||{x:0,y:0};
       authoritativeVelocity.set(p.id,{x:v.x*.35+vx*.65,y:v.y*.35+vy*.65});
     }
     authoritativePrevious.set(p.id,{x:incoming.x,y:incoming.y,at:now});
     p.x=incoming.x;p.y=incoming.y;p.face=incoming.face;p.step=incoming.step;p.aim=incoming.aim;
   }
   if(Number.isFinite(d.time))view.time=d.time;
   if(Number.isFinite(d.starting))view.starting=d.starting;
   return;
 }
 if(m.t==='pvpResult'){
   closeDirect();stopDuelMusic();state.finished=true;const winner=state.members.find(x=>x.id===m.winner);
   $('winnerTitle').textContent=winner?`VITÓRIA DE ${heroes[winner.hero]?.name||'LUTADOR'}!`:'EMPATE!';
   $('winnerNote').textContent=m.reason==='Oponente desconectado'?'O oponente saiu da partida.':'A luta terminou. Vocês podem jogar novamente na mesma sala.';
   show('resultOverlay',true);$('rematch').hidden=state.id!==state.host;
   $('backLobby').hidden=state.id!==state.host;
   return;
 }
 if(m.t==='pvpReset'){
   serverDuel=false;
   closeDirect();stopDuelMusic();state.started=false;state.finished=false;state.offer=m.offer||[];state.picks=[];
   battle=null;view=null;rendered.clear();showScene('lobby');renderDraft();refreshLobby();note('Nova disputa: escolham três cartas para a revanche!');return;
 }
}
function showScene(which){state.scene=which;show('entry',which==='entry');show('lobby',which==='lobby');show('battle',which==='battle');}
function refreshLobby(){
 const people=state.members||[];$('codeLabel').textContent=state.code;
 $('participants').replaceChildren(...people.map(p=>{
 const a=document.createElement('div');a.className='person';
 a.textContent=`${p.id===state.id?'VOCÊ · ':''}${p.role==='spectator'?'👁 ESPECTADOR':p.hero?heroes[p.hero]?.name:'ESCOLHENDO'} · ${p.role==='spectator'?'ASSISTINDO':p.ready?'PRONTO ✓':`${p.chosen}/3 CARTAS`}`;return a;
 }));
 const spectator=state.role==='spectator';show('selectArea',!spectator);
 $('roleHint').textContent=spectator?'Você está como espectador. Os dois jogadores escolhem suas cartas antes do início.':'Cada lutador escolhe 1 personagem e 3 cartas entre 6 sorteadas. Os personagens não podem se repetir.';
 const mine=people.find(p=>p.id===state.id);state.selectedHero=mine?.hero||'';showSkillArt(state.selectedHero);
 for(const b of document.querySelectorAll('[data-hero]')){
   b.classList.toggle('chosen',b.dataset.hero===mine?.hero);b.classList.toggle('selected',b.dataset.hero===mine?.hero);
   b.disabled=spectator||people.some(p=>p.id!==state.id&&p.role==='fighter'&&p.hero===b.dataset.hero);
 }
 renderDraft();
 const fighters=people.filter(p=>p.role==='fighter');const ready=fighters.length===2&&fighters.every(p=>p.ready)&&fighters[0].hero!==fighters[1].hero;
 $('begin').hidden=state.host!==state.id;$('begin').disabled=!ready;
 $('waitText').textContent=ready?'Ambos prontos! O anfitrião pode começar.':`Lutadores prontos: ${fighters.filter(p=>p.ready).length} / 2 · Espectadores: ${people.filter(p=>p.role==='spectator').length}`;
}
function renderDraft(){let root=$('draftCards');root.replaceChildren();$('chosenCount').textContent=`(${state.picks.length}/3)`;
 for(const id of state.offer){const item=cards[id];if(!item)continue;
  const b=document.createElement('button');b.className='card illustrated-card '+(state.picks.includes(id)?' chosen':'');b.dataset.rarity=['ancient','black','bloodmoon','timeward','mirror'].includes(id)?'epic':['heart','blade','shadowblade','voidblade','critical'].includes(id)?'rare':'common';
  const im=document.createElement('img');im.className='card-art';im.src=`assets/cards/pvp/${id}.webp?v=32`;im.alt='Arte de '+item[0];const title=document.createElement('strong');title.textContent=item[0];const sub=document.createElement('small');sub.textContent=item[1];const glow=document.createElement('i');glow.className='card-art-glow';b.append(glow,im,title,sub);
  b.disabled=state.picks.includes(id)||state.picks.length>=3||!state.selectedHero;
  b.onclick=()=>send({t:'pvpPick',card:id});root.append(b);
 }
}
function makeActor(p,i){const def=heroes[p.hero]||heroes.loid;
 const a={id:p.id,hero:p.hero,x:i?1160:760,y:710,face:i?'left':'right',step:0,hp:HP,maxHp:HP,damage:def.dmg,speed:def.speed,attackDelay:def.attack,reach:def.range,crit:def.crit,armor:0,echo:0,dashDelay:def.dash,skillDelay:def.skill,eDelay:def.second,extraArc:0,shape:0,aim:i?Math.PI:0,attackCd:0,dashCd:0,qCd:0,eCd:0,invuln:0,dashTime:0,dx:0,dy:0,charge:0,ultCharge:0,ultTimer:0,ultMode:'',aura:0,auraTick:0,shadows:0,shadowsTick:0,corruption:0,slow:0,burn:0,attackFx:0,hitFx:0,blink:0,teleports:[],skullFx:0,transform:0,transAmp:1.5,transDuration:6,defend:0,ultBuff:0,burst:0,stun:0,energy:0,energyCd:0,input:{x:0,y:0,aim:i?Math.PI:0,attack:false},moving:false,orbit:0,mirrorGuard:0,temporalField:0,temporalRadius:0,portalEcho:0,voidUlt:0,voidUltHit:false,fieldX:0,fieldY:0,fieldRadius:105,fieldDuration:5,mirrorImages:0,dodgeChance:p.hero==='cross'?.12:p.hero==='eve'?.15:0};
 for(const id of p.cards||[]){switch(id){case 'heart':a.maxHp+=1100;a.hp+=1100;break;case 'blade':a.damage*=1.12;break;case 'fast':a.attackDelay*=.9;break;case 'speed':a.speed*=1.08;break;case 'armor':a.armor=1-(1-a.armor)*.91;break;case 'reach':a.reach=Math.min(a.reach*1.1,def.range*1.25);break;case 'dodge':a.dashDelay*=.88;break;case 'critical':a.crit=Math.min(.45,a.crit+.08);break;case 'arc':a.extraArc+=.15;break;case 'echo':a.echo+=.12;break;case 'ancient':a.maxHp=Math.ceil(a.maxHp*1.06);a.hp=a.maxHp;a.damage*=1.06;a.speed*=1.06;break;case 'shadowblade':a.damage*=1.14;break;case 'shadowdash':a.dashDelay*=.82;break;case 'darkburst':a.shape+=.18;break;case 'black':a.transAmp+=.25;break;case 'form':a.transDuration+=3;break;case 'awakening':a.skillDelay*=.85;break;case 'bloodmoon':a.burst+=.25;break;case 'mirror':a.damage*=1.12;break;case 'mirrorguard':a.shape+=.18;break;case 'voidblade':a.damage*=1.12;break;case 'timeward':a.fieldDuration+=1;break;}}
 return a;
}
function enemyOf(a){return battle?.players.find(x=>x.id!==a.id);}
function drawFx(x,y,type,t=0.4,r=25,color='#cf92fc',ex=0,ey=0){if(!battle?.fx)return;battle.fx.push({x,y,type,t,max:t,r,color,ex,ey});if(battle.fx.length>26)battle.fx.shift();}
// Guest-only cosmetic feedback; damage and cooldown are always decided by the host.
function guestFx(x,y,type,t=.3,r=40,color='#bf8bf7',ex=0,ey=0){
  if(localTravelFx.length>18)localTravelFx.shift();
  localTravelFx.push({x,y,type,t,max:t,r,color,ex,ey});
}
function previewGuestAction(name){
 if(battle?.host||state.role!=='fighter')return;
 const me=rendered.get(state.id)||view?.players?.find(x=>x.id===state.id);
 if(!me)return;
 const direction=Number.isFinite(controls.aim)?controls.aim:0;
 if(name==='dash'&&me.hero==='eve'){
   guestFx(me.x,me.y,'portal',1.20,94);
   guestFx(clamp(me.x+Math.cos(direction)*215,55,MAP_W-55),clamp(me.y+Math.sin(direction)*215,75,MAP_H-55),'portal',1.20,94);
 }else if(name==='dash')guestFx(me.x,me.y,'ring',.25,26,heroes[me.hero]?.color||'#ae8cfa');
 else if(name==='q'&&me.hero==='eve'){guestFx(me.x,me.y,'voidBurst',.82,85);}
 else if(name==='e')guestFx(me.x,me.y,me.hero==='eve'?'ring':me.hero==='kali'?'mirrorcast':'ring',.65,me.hero==='eve'?170:70,'#bcaaff');
 else if(name==='r')guestFx(me.x,me.y,'ring',.62,130,'#deb9ff');
}
function hit(a,b,amount,from='hit'){
 if(!b||b.hp<=0||a.hp<=0||b.invuln>0||b.defend>0)return 0; if(b.mirrorGuard>0&&Math.random()<.5){drawFx(b.x,b.y,'ring',.26,25,'#ddbbff');return 0;}if(b.dodgeChance>0&&Math.random()<b.dodgeChance){drawFx(b.x,b.y,'ring',.28,21,'#a2bcff');return 0;}
 let dealt=amount*(1-b.armor);
 const crit=Math.random()<Math.min(.75,a.crit+(a.ultMode==='xans'&&a.ultTimer>0?.27:0));if(crit&&from==='hit')dealt*=1.7;
 if(a.ultMode==='xans'&&a.ultTimer>0)dealt*=1.35;
 if(a.ultMode==='fight'&&a.ultTimer>0&&from==='hit')dealt*=2;
 if(a.transform>0&&from==='hit')dealt*=a.transAmp;
 if(b.corruption>0)dealt*=1.16;
 dealt=Math.round(dealt);
 b.hp=Math.max(0,b.hp-dealt);b.hitFx=.18;
 a.ultCharge=Math.min(100,a.ultCharge+(a.hero==='eve'?3.2:from==='hit'?9:Math.min(9,Math.max(2,Math.round(dealt/135)))));
 drawFx(b.x,b.y-38,'text',.55,0,crit?'#ffdf81':'#ffe2f4',dealt,0);
 if(a.hero==='cross'&&b.hp<=b.maxHp*.5&&b.hp>0){b.corruption=Math.max(b.corruption,4);b.slow=Math.max(b.slow,1.3);}
 if(b.hp<=0)finish(a.id);
 return dealt;
}
function finish(id){if(!battle||battle.resultSent)return;battle.resultSent=true;state.finished=true;send({t:'pvpResult',winner:id});}
function basic(a){if(a.hp<=0||a.stun>0||a.attackCd>0||battle?.starting>0||battle?.resultSent)return;
 const b=enemyOf(a),angle=a.input.aim;a.aim=angle;a.attackCd=a.attackDelay;
 a.attackFx=.15;a.attackAngle=angle;
 if(a.hero==='kali'){battle.projectiles.push({x:a.x,y:a.y-10,vx:Math.cos(angle)*410,vy:Math.sin(angle)*410,damage:a.damage,color:'#e4bfff',from:a.id,life:1.1,kind:3,spin:0});drawFx(a.x,a.y-12,'mirrorcast',.30,20,'#e4bfff');return;}const slashReach=a.hero==='loid'?Math.min(49,a.reach+3):a.reach;
 drawFx(a.x+Math.cos(angle)*slashReach*.36,a.y+Math.sin(angle)*slashReach*.36,'slash',.23,slashReach,heroes[a.hero].color,angle,0);
 if(!b||b.hp<=0)return;
 const reach=a.reach;let theta=Math.atan2(b.y-a.y,b.x-a.x),diff=Math.atan2(Math.sin(theta-angle),Math.cos(theta-angle));
 if(dist(a,b)<reach+21&&Math.abs(diff)<.8+a.extraArc){hit(a,b,a.damage,'hit');if(a.echo>0&&Math.random()<a.echo)hit(a,b,a.damage*.5,'hit');if(a.ultMode==='itens'&&a.ultTimer>0)hit(a,b,a.damage*.6,'hit');}
}
function act(a,action,variant){if(!battle?.host||!a||a.hp<=0||a.stun>0||battle.starting>0||battle.resultSent)return;
 const b=enemyOf(a);if(action==='dash'){
  if(a.dashCd>0)return;const ang=Math.atan2(a.input.y,a.input.x)||a.aim;
  a.dx=Math.cos(ang);a.dy=Math.sin(ang);a.dashTime=.22;a.dashCd=a.hero==='loid'&&a.ultMode==='loid'&&a.ultTimer>0?.07:a.dashDelay;
  a.invuln=.32;if(a.hero==='eve'){
     // Instant void-portal travel. Host is the authority; clients display both portals.
     const fromX=a.x,fromY=a.y;
     a.dashTime=0;a.x=clamp(a.x+a.dx*232,55,MAP_W-55);a.y=clamp(a.y+a.dy*232,75,MAP_H-55);
     drawFx(fromX,fromY,'portal',1.25,100,'#9e75ff');drawFx(fromX,fromY,'voidBurst',.6,78,'#7e57cf');
     drawFx(a.x,a.y,'portal',1.25,100,'#b78aff');drawFx(a.x,a.y,'voidBurst',.6,78,'#b78aff');
     a.blink=.32;
   }else drawFx(a.x,a.y,'ring',.35,25,heroes[a.hero].color);return;
 }
 if(action==='q'){
  if(a.qCd>0)return;a.qCd=a.skillDelay;
  if(a.hero==='loid'){a.aura=4.1;a.auraTick=0;drawFx(a.x,a.y,'ring',.65,112,'#33204d');}
  else if(a.hero==='kris'){a.transform=a.transDuration;drawFx(a.x,a.y,'ring',.6,70,'#6967fa');}
  else if(a.hero==='eve'){
   // Same 45px desintegration zone used in the co-op campaign. PvP opponents
   // count as bosses, so they take damage instead of being instant-killed.
   const nearby=b&&b.hp>0&&dist(a,b)<155;
   const cx=nearby?b.x:a.x+Math.cos(a.aim)*68;
   const cy=nearby?b.y:a.y+Math.sin(a.aim)*68;
   drawFx(cx,cy,'voidBurst',.95,50,'#4a1a88');drawFx(cx,cy,'ring',.9,48,'#b187ff');
   if(b&&b.hp>0&&Math.hypot(b.x-cx,b.y-cy)<65)hit(a,b,b.maxHp*.065,'skill');
  }

  else if(a.hero==='kali'){a.mirrorGuard=4+a.shape;drawFx(a.x,a.y,'ring',1,145,'#e0b6fa');}
  else if(a.hero==='cross'&&b&&b.hp>0){
   const ox=a.x,oy=a.y;a.x=b.x-42*Math.cos(a.aim);a.y=b.y-42*Math.sin(a.aim);
   drawFx(ox,oy,'ring',.5,30,'#ac7fff');drawFx(a.x,a.y,'ring',.5,38,'#bb8dff');
   hit(a,b,a.damage*3.1,'skill');b.stun=Math.max(b.stun,2);a.x=ox;a.y=oy;a.blink=.4;
   drawFx(ox,oy,'ring',.4,26,'#aa6afa');
  }return;
 }
 if(action==='eDown'&&a.hero==='kris'){if(a.eCd<=0)a.energy=.03;return;}
 if(action==='eUp'&&a.hero==='kris'){
  if(a.eCd>0||a.energy<=0)return;
  const fraction=clamp(a.energy/1.6,0,1);const damage=a.damage*(1.1+5.7*fraction); a.eCd=a.eDelay;
  drawFx(a.x,a.y,'dimensional',.68,315,'#c5b3ff',a.aim,0);
  if(b&&dist(a,b)<330&&Math.abs(Math.atan2(Math.sin(Math.atan2(b.y-a.y,b.x-a.x)-a.aim),Math.cos(Math.atan2(b.y-a.y,b.x-a.x)-a.aim)))<.5)hit(a,b,damage,'skill');
  a.energy=0;return;
 }
 if(action==='e'){
  if(a.eCd>0)return;a.eCd=a.eDelay;
  if(a.hero==='loid'){
    a.shadows=8;a.shadowsTick=.1;
    battle.clones=(battle.clones||[]).filter(c=>c.owner!==a.id);
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2+Math.PI/4;
      battle.clones.push({owner:a.id,id:a.id+'-shade-'+i,x:a.x+Math.cos(angle)*28,y:a.y+Math.sin(angle)*28,offset:angle,face:'down',step:i*.6,life:8,attackCd:.16+i*.15});
    }
    drawFx(a.x,a.y,'shadowBurst',.9,84,'#66358e');
   }
  else if(a.hero==='eve'){
   a.temporalField=a.fieldDuration;
   a.fieldRadius=105;a.fieldX=a.x+Math.cos(a.aim)*85;a.fieldY=a.y+Math.sin(a.aim)*85;
   drawFx(a.fieldX,a.fieldY,'ring',.8,105,'#84abff');
  }

  else if(a.hero==='kali'){a.mirrorImages=6;drawFx(a.x,a.y,'ring',.8,170,'#d7b6ff');}
  else if(a.hero==='cross'){
   for(let i=0;i<9;i++){const angle=a.aim+(i-4)*.083;const c=['#eae9ff','#77aafe','#ffb36d'][i%3];
    battle.projectiles.push({x:a.x+Math.cos(angle)*20,y:a.y+Math.sin(angle)*20,vx:Math.cos(angle)*405,vy:Math.sin(angle)*405,r:6,damage:89,color:c,from:a.id,life:1.5,kind:i%3});}
  }return;
 }
 if(action==='r'){
  if(a.ultCharge<100||a.ultTimer>0)return;
  if(a.hero==='kris'&&!['fight','defesa','itens','piedade'].includes(variant))return;
  a.ultCharge=0;a.ultMode=a.hero==='kris'?variant:a.hero;a.ultTimer=a.hero==='loid'?5:a.hero==='eve'?2.5:a.hero==='kali'?6:8;
  if(a.hero==='loid'){a.dashCd=0;drawFx(a.x,a.y,'ring',1,230,'#110b23');}
  if(a.hero==='eve'){
   a.voidUlt=2.5;a.voidUltHit=false;a.invuln=Math.max(a.invuln,2.5);
   drawFx(a.x,a.y,'ring',2.5,275,'#6234aa');
   drawFx(a.x,a.y,'voidBurst',1.6,240,'#b38aff');
   // The damage occurs at the dramatic collapse, never invisibly at cast time.
  }

  if(a.hero==='kali'){a.mirrorGuard=6;a.mirrorImages=6;drawFx(a.x,a.y,'ring',2,275,'#dcabff');}
  if(a.hero==='kris'){
   a.ultTimer={fight:9,defesa:3,itens:11,piedade:9}[variant]||8;
   if(variant==='defesa')a.defend=3;
   if(variant==='piedade'){a.hp=a.maxHp;}
  }

  if(a.hero==='cross'&&b&&b.hp>0){
    for(let i=0;i<5;i++){let theta=i*Math.PI*2/5,px=a.x+Math.cos(theta)*53,py=a.y+Math.sin(theta)*53;
      drawFx(px,py,'skull',.9,24,'#dfd7ff',b.x,b.y);hit(a,b,205,'skill');}
  }return;
 }
}
function sim(dt){if(!battle?.host||battle.resultSent)return;
 battle.clock+=dt; if(battle.starting>0){battle.starting=Math.max(0,battle.starting-dt);return;}
 battle.remaining=Math.max(0,battle.remaining-dt);
 for(const a of battle.players){
  // A lost or sleeping guest must not keep walking or attacking forever.
  if(a.id!==state.id&&a.inputAt&&performance.now()-a.inputAt>450){
    a.input={...a.input,x:0,y:0,attack:false};
  }
  const dec=['attackCd','dashCd','qCd','eCd','invuln','aura','shadows','corruption','slow','burn','attackFx','hitFx','blink','transform','defend','ultTimer','stun','mirrorGuard','temporalField','voidUlt','mirrorImages'];for(const k of dec)a[k]=Math.max(0,a[k]-dt);
  if(a.hp<=0)continue;
  if(a.hero==='eve'&&a.voidUlt>0&&a.voidUlt<=1.10&&!a.voidUltHit){
    a.voidUltHit=true;
    const victim=enemyOf(a);
    drawFx(a.x,a.y,'voidBurst',.9,260,'#dab6ff');
    if(victim&&victim.hp>0){
      drawFx(victim.x,victim.y,'disintegrate',1.15,95,'#c3a1ff');
      hit(a,victim,victim.maxHp*.20,'void');
    }
  }
  if(a.stun>0){a.input.attack=false;a.moving=false;continue;}
  a.aim=Number.isFinite(a.input.aim)?a.input.aim:a.aim;
  const mx=clamp(a.input.x,-1,1),my=clamp(a.input.y,-1,1),len=Math.hypot(mx,my),foe=enemyOf(a);
  const inTimeZone=foe?.temporalField>0&&Math.hypot(a.x-foe.fieldX,a.y-foe.fieldY)<foe.fieldRadius;
  const timeSlow=inTimeZone?.30:1;
  const v=a.speed*(a.slow>0?.75:1)*timeSlow;
  a.moving=len>.08;
  if(a.dashTime>0){a.dashTime=Math.max(0,a.dashTime-dt);a.x+=a.dx*(a.hero==='eve'?790:580)*dt;a.y+=a.dy*(a.hero==='eve'?790:580)*dt;
   if(a.hero==='loid')drawFx(a.x,a.y,'shadow',.24,20,'#44205b');
  }else if(len>.08){a.x+=mx/Math.max(len,1)*v*dt;a.y+=my/Math.max(len,1)*v*dt;}
  a.x=clamp(a.x,55,MAP_W-55);a.y=clamp(a.y,75,MAP_H-55);
  if(len>.08){a.step=(a.step+dt*8)%3; a.face=Math.abs(mx)>Math.abs(my)?mx>0?'right':'left':my>0?'down':'up';}
  if(a.input.attack)basic(a);
  if(a.hero==='kris'&&a.energy>0)a.energy=Math.min(1.6,a.energy+dt);
  const b=enemyOf(a);
  if(b&&b.hp>0){
   if(a.aura>0&&dist(a,b)<120){a.auraTick-=dt;if(a.auraTick<=0){a.auraTick=.35;hit(a,b,94*(1+a.shape),'skill');}}
   if(a.hero==='kali'&&a.mirrorImages>0&&dist(a,b)<220){a.shadowsTick-=dt;if(a.shadowsTick<=0){a.shadowsTick=.85;hit(a,b,62,'skill');}}
   // Shadow damage is now handled by updateShadows: one hit per actual moving clone.
   if(a.ultTimer>0&&a.ultMode==='loid'&&dist(a,b)<230){a.auraTick-=dt;if(a.auraTick<=0){a.auraTick=.32;hit(a,b,160,'skill');}}
   if(a.burn>0&&a.burn%0.7<dt)hit(b,a,70,'burn');
  }
 }
 updateShadows(dt);
 for(const p of battle.projectiles){let speedMult=1;for(const a of battle.players)if(a.temporalField>0&&a.id!==p.from&&Math.hypot(p.x-a.fieldX,p.y-a.fieldY)<a.fieldRadius)speedMult=.25;p.x+=p.vx*dt*speedMult;p.y+=p.vy*dt*speedMult;p.life-=dt;let attacker=battle.players.find(a=>a.id===p.from);let defender=attacker&&enemyOf(attacker);
  if(attacker&&defender&&defender.hp>0&&Math.hypot(defender.x-p.x,defender.y-p.y)<26){hit(attacker,defender,p.damage,'skill');if(p.kind===3)drawFx(p.x,p.y,'mirrorShatter',.48,37,'#f5bbff');if(p.kind===1)defender.slow=Math.max(defender.slow,1.3);if(p.kind===2)defender.burn=Math.max(defender.burn,1.7);p.life=0;}
 }
 battle.projectiles=battle.projectiles.filter(p=>p.life>0&&p.x>0&&p.x<MAP_W&&p.y>0&&p.y<MAP_H);
 battle.fx=battle.fx.filter(f=>(f.t-=dt)>0);
 if(battle.remaining<=0){let a=battle.players[0],b=battle.players[1];finish(a.hp/a.maxHp>b.hp/b.maxHp?a.id:b.hp/b.maxHp>a.hp/a.maxHp?b.id:null);}
}
// Shared simulation: the four real shadow copies follow Loid, chase a nearby foe
// and strike only on the host. Guests draw the same positions from snapshots.
function updateShadows(dt){
 if(!battle?.clones)return;
 for(const shade of battle.clones){
  const owner=battle.players.find(p=>p.id===shade.owner);
  if(!owner||owner.hp<=0||owner.shadows<=0){shade.life=0;continue;}
  shade.life=Math.min(shade.life-dt,owner.shadows);
  shade.attackCd-=dt;shade.step=(shade.step+dt*9)%3;
  const foe=enemyOf(owner);
  const distance=foe&&foe.hp>0?Math.hypot(foe.x-shade.x,foe.y-shade.y):Infinity;
  // Remain with Loid if the foe is too far away, so shadows never seem abandoned.
  const chase=foe&&foe.hp>0&&Math.hypot(foe.x-owner.x,foe.y-owner.y)<385;
  const destination=chase?foe:{x:owner.x+Math.cos(shade.offset+battle.clock*.8)*40,y:owner.y+Math.sin(shade.offset+battle.clock*.8)*34};
  const dx=destination.x-shade.x,dy=destination.y-shade.y,span=Math.hypot(dx,dy)||1;
  const speed=chase?214:178;
  if(span>(chase?34:9)){
   const step=Math.min(span-(chase?31:6),speed*dt);
   shade.x+=dx/span*step;shade.y+=dy/span*step;
  }
  shade.x=clamp(shade.x,55,MAP_W-55);shade.y=clamp(shade.y,75,MAP_H-55);
  shade.face=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  if(chase&&distance<52&&shade.attackCd<=0){
   shade.attackCd=.70+(Number(shade.id.slice(-1))||0)*.06;
   drawFx(shade.x+dx/span*18,shade.y+dy/span*18,'slash',.18,27,'#8b55c8',Math.atan2(dy,dx));
   hit(owner,foe,owner.damage*.34,'shadow');
  }
 }
 battle.clones=battle.clones.filter(c=>c.life>0);
}
function drawShadowCopy(shade){
 const pic=shadowSprite.complete&&shadowSprite.naturalWidth?shadowSprite:sprites.loid;
 if(!pic?.naturalWidth)return;
 const row={down:0,left:1,right:2,up:3}[shade.face]||0;
 const frame=Math.floor(shade.step||0)%3;
 const size=47;
 g.save();g.globalAlpha=Math.min(.77,shade.life*.45);g.imageSmoothingEnabled=false;
 g.drawImage(pic,frame*112,row*112,112,112,shade.x-size/2,shade.y-size*.75,size,size);
 g.restore();
}
function snapshot(forNetwork=true){if(!battle?.host)return null;
 return {seq:forNetwork?++hostSeq:hostSeq,stamp:+battle.clock.toFixed(3),time:battle.remaining,starting:battle.starting,players:battle.players.map(a=>({id:a.id,hero:a.hero,x:+a.x.toFixed(2),y:+a.y.toFixed(2),face:a.face,step:+a.step.toFixed(2),aim:+a.aim.toFixed(3),hp:Math.ceil(a.hp),maxHp:Math.ceil(a.maxHp),ult:Math.round(a.ultCharge),qCd:+a.qCd.toFixed(1),eCd:+a.eCd.toFixed(1),dashCd:+a.dashCd.toFixed(1),aura:+a.aura.toFixed(2),shadows:+a.shadows.toFixed(2),transform:+a.transform.toFixed(2),defend:+a.defend.toFixed(2),ultTimer:+a.ultTimer.toFixed(2),ultMode:a.ultMode,mirrorGuard:+a.mirrorGuard.toFixed(2),temporalField:+a.temporalField.toFixed(2),voidUlt:+a.voidUlt.toFixed(2),fieldX:Math.round(a.fieldX),fieldY:Math.round(a.fieldY),fieldRadius:a.fieldRadius,stun:+a.stun.toFixed(1),mirrorImages:+a.mirrorImages.toFixed(2),atkFx:+a.attackFx.toFixed(2),atkAngle:a.attackAngle||a.aim,hitFx:+a.hitFx.toFixed(2),blink:+a.blink.toFixed(2),corruption:+a.corruption.toFixed(2)})),
  clones:(battle.clones||[]).map(c=>({owner:c.owner,id:c.id,x:Math.round(c.x),y:Math.round(c.y),face:c.face,step:+c.step.toFixed(2),life:+c.life.toFixed(1)})),projectiles:battle.projectiles.map(p=>({x:Math.round(p.x),y:Math.round(p.y),color:p.color,kind:p.kind||0})),fx:battle.fx.slice(-18).map(f=>({...f,t:+f.t.toFixed(2)}))};
}
// Tiny positional packets for Cloudflare fallback: about 250 bytes instead of
// forwarding the entire VFX/projectile state 20 times each second.
function sendCloudMotion(now){
 if(!battle?.host||directActive()||ws?.readyState!==WebSocket.OPEN||ws.bufferedAmount>8000)return;
 if(now-lastMotionSent<44)return;
 lastMotionSent=now;
 const players=battle.players.map(p=>({id:p.id,x:+p.x.toFixed(1),y:+p.y.toFixed(1),face:p.face,step:+p.step.toFixed(2),aim:+p.aim.toFixed(2)}));
 send({t:'pvpMotion',data:{seq:++motionSeq,stamp:+battle.clock.toFixed(3),time:battle.remaining,starting:battle.starting,players}});
}
function drawSprite(p){const img=sprites[p.hero];const row={down:0,left:1,right:2,up:3}[p.face]||0;let frame=Math.floor((p.step||0))%3;
 g.save();if(p.defend>0){g.shadowColor='#a9c4ff';g.shadowBlur=15;}if(p.blink>0)g.globalAlpha=.65;
 if(img?.complete&&img.naturalWidth){
   const sc=p.hero==='eve'?1.30:p.hero==='kali'?1.19:1;
   const sz=58*sc;
   // Small attack anticipation/recoil animation without replacing any character sprite.
   const phase=clamp((p.atkFx||0)/.16,0,1);
   const lunge=Math.sin((1-phase)*Math.PI)*7;
   const px=p.x+Math.cos(p.atkAngle||p.aim||0)*lunge;
   const py=p.y+Math.sin(p.atkAngle||p.aim||0)*lunge;
   g.drawImage(img,frame*112,row*112,112,112,px-sz/2,py-41*sc,sz,sz);
  }
 else{g.fillStyle=heroes[p.hero].color;g.beginPath();g.arc(p.x,p.y-13,20,0,Math.PI*2);g.fill();}g.restore();
 g.save();g.fillStyle='#0e0914';g.fillRect(p.x-23,p.y-46,46,5);g.fillStyle=p.hp>0?'#db6683':'#777';g.fillRect(p.x-22,p.y-45,44*clamp(p.hp/p.maxHp,0,1),4);g.font='bold 11px system-ui';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#160b25';g.strokeText(heroes[p.hero]?.name||'JOGADOR',p.x,p.y-52);g.fillStyle='#fff0d8';g.fillText(heroes[p.hero]?.name||'JOGADOR',p.x,p.y-52);g.restore();
 if(p.temporalField>0){g.save();
   const rr=p.fieldRadius||105,centerX=p.fieldX||p.x,centerY=p.fieldY||p.y;
   g.fillStyle='#4b6bbb28';g.strokeStyle='#98baff';g.lineWidth=2;
   g.beginPath();g.arc(centerX,centerY,rr,0,Math.PI*2);g.fill();g.stroke();
   g.strokeStyle='#cfdbffb8';g.lineWidth=2;
   for(let j=0;j<12;j++){const a=j*Math.PI/6+gameTime*.08;g.beginPath();g.moveTo(centerX+Math.cos(a)*(rr-8),centerY+Math.sin(a)*(rr-8));g.lineTo(centerX+Math.cos(a)*(rr-21-(j%3)*4),centerY+Math.sin(a)*(rr-21-(j%3)*4));g.stroke();}
   for(let j=0;j<6;j++){const a=j*Math.PI/3-gameTime*.3;
     const x=centerX+Math.cos(a)*(rr*.72),y=centerY+Math.sin(a)*(rr*.72);
     g.save();g.translate(x,y);g.rotate(a);g.fillStyle='#bdcfff';g.fillRect(-3,-7,6,14);g.fillStyle='#fff';g.fillRect(-2,-9,4,4);g.restore();}
   g.restore();}
  if(p.mirrorGuard>0){g.save();g.strokeStyle='#e7b7ff';g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,65,0,Math.PI*2);g.stroke();
  if(mirrorAsset.complete&&mirrorAsset.naturalWidth){for(let k=0;k<3;k++){const a=k*2.094+gameTime*.8;const x=p.x+Math.cos(a)*52,y=p.y+Math.sin(a)*35;g.save();g.translate(x,y);g.rotate(a);g.drawImage(mirrorAsset,-11,-13,22,26);g.restore();}}
  g.restore();}
  // The global void eclipse is rendered once in paint(), before both heroes.
 if(p.mirrorImages>0){ // Kali's illusions actually move and mimic her gestures.
  const source=sprites.kali;
  if(source?.naturalWidth){for(let i=0;i<3;i++){
   const spin=gameTime*(.88+i*.08)+i*Math.PI*2/3;
   const x=p.x+Math.cos(spin)*(65+(i%2)*13),y=p.y+Math.sin(spin)*(41+(i%2)*8);
   const row={down:0,left:1,right:2,up:3}[p.face]||0;
   g.save();g.globalAlpha=.34;g.drawImage(source,(Math.floor(gameTime*7+i)%3)*112,row*112,112,112,x-25,y-33,50,50);g.restore();
  }}
 }
 if(p.atkFx>0&&p.hero!=='kali'){
  const phase=clamp(p.atkFx/.16,0,1),radius=p.hero==='loid'?26+(1-phase)*10:45+(1-phase)*20,ang=p.atkAngle||0;
  g.save();g.lineCap='round';g.globalAlpha=.4+phase*.6;
  g.strokeStyle='#180d2c';g.lineWidth=12;g.beginPath();g.arc(p.x,p.y-9,radius,ang-1.02,ang+.66);g.stroke();
  g.strokeStyle=slashPalette[p.hero];g.lineWidth=6;g.beginPath();g.arc(p.x,p.y-9,radius,ang-1.0,ang+.68);g.stroke();
  g.strokeStyle='#fff0fd';g.lineWidth=2;g.beginPath();g.arc(p.x,p.y-9,radius+2,ang-.65,ang+.54);g.stroke();
  for(let i=0;i<4;i++){const a=ang-.8+i*.4;g.fillStyle=i%2?'#fff4ff':slashPalette[p.hero];g.fillRect(p.x+Math.cos(a)*radius-2,p.y-9+Math.sin(a)*radius-2,4,4);}
  g.restore();
 }
 if(p.hitFx>0){g.save();g.globalAlpha=.45;g.fillStyle='#ffe4f2';g.beginPath();g.arc(p.x,p.y-15,25,0,Math.PI*2);g.fill();g.restore();}
}
function paint(s,dt){
 g.save();g.setTransform(DUEL_SCALE,0,0,DUEL_SCALE,0,0);g.clearRect(0,0,W,H);g.fillStyle='#211a29';g.fillRect(0,0,W,H);
 const fighters=s?.players||[];
 const focus=fighters.find(p=>p.id===state.id)||(fighters.length?{x:fighters.reduce((n,p)=>n+p.x,0)/fighters.length,y:fighters.reduce((n,p)=>n+p.y,0)/fighters.length}: {x:MAP_W/2,y:MAP_H/2});
 const targetX=clamp(focus.x-W/2,0,MAP_W-W),targetY=clamp(focus.y-H/2,0,MAP_H-H);
 const smooth=Math.min(1,dt*9);duelCamera.x+=(targetX-duelCamera.x)*smooth;duelCamera.y+=(targetY-duelCamera.y)*smooth;
 g.save();g.translate(-Math.round(duelCamera.x),-Math.round(duelCamera.y));
 // Large Japanese arena, tiled at native detail rather than stretching one blurry image.
 if(arena.complete&&arena.naturalWidth){
  // Draw only the VISIBLE rectangle. Avoid re-scaling a giant 1920x1400 image every frame.
  const aw=arena.naturalWidth,ah=arena.naturalHeight;
  const sx=duelCamera.x/MAP_W*aw,sy=duelCamera.y/MAP_H*ah;
  const sw=Math.min(aw-sx,W/MAP_W*aw),sh=Math.min(ah-sy,H/MAP_H*ah);
  g.imageSmoothingEnabled=qualityMode==='high';
  if(sw>0&&sh>0)g.drawImage(arena,sx,sy,sw,sh,duelCamera.x,duelCamera.y,W,H);
  g.imageSmoothingEnabled=false;
 }
 g.strokeStyle='#e2b88d60';g.lineWidth=5;g.strokeRect(12,12,MAP_W-24,MAP_H-24);
 // Eve Lorey's entire-map void, synchronised on both clients and spectators.
 // Render it underneath actors, with an unmistakable eclipse and countdown.
 const eclipse=(s?.players||[]).find(p=>p.hero==='eve'&&p.voidUlt>0);
 if(eclipse){
  const u=clamp(eclipse.voidUlt/2.5,0,1);
  g.save();g.fillStyle=`rgba(4,0,15,${.73+(1-u)*.16})`;
  g.fillRect(duelCamera.x,duelCamera.y,W,H);
  const radius=280+(1-u)*750;
  g.strokeStyle='#bb8bff';g.lineWidth=6;
  g.beginPath();g.arc(eclipse.x,eclipse.y,radius,0,Math.PI*2);g.stroke();
  g.strokeStyle='#65419e';g.lineWidth=2;
  for(let j=0;j<14;j++){
    const ang=j*Math.PI*2/14-gameTime*.45;
    const r=clamp(radius-45,55,700);
    g.beginPath();g.moveTo(eclipse.x+Math.cos(ang)*r,eclipse.y+Math.sin(ang)*r);
    g.lineTo(eclipse.x+Math.cos(ang+0.12)*(r+28),eclipse.y+Math.sin(ang+0.12)*(r+28));g.stroke();
  }
  g.restore();
 }
 // Original Loid darkness should sit UNDER the fighters, never obscure his sprite.
 for(const p of s?.players||[]){if(!(p.aura>0||p.ultMode==='loid'&&p.ultTimer>0))continue;
   const ultimate=p.ultMode==='loid'&&p.ultTimer>0,rad=ultimate?220:112;
   g.save();
   const field=g.createRadialGradient(p.x,p.y,12,p.x,p.y,rad);
   field.addColorStop(0,'#070411b8');field.addColorStop(.67,ultimate?'#140a2cc9':'#180c2b99');field.addColorStop(1,'#200c3100');
   g.fillStyle=field;g.beginPath();g.arc(p.x,p.y,rad,0,Math.PI*2);g.fill();
   g.strokeStyle=ultimate?'#bc85ff':'#7846ae';g.lineWidth=ultimate?4:3;g.globalAlpha=.7;
   for(let j=0;j<2;j++){g.beginPath();g.arc(p.x,p.y,rad*(.87+j*.1),gameTime*(j?-.45:.36),gameTime*(j?-.45:.36)+Math.PI*1.8);g.stroke();}
   g.restore();
 }
 for(const fx of [...(s?.fx||[]),...localTravelFx]){const alpha=clamp(fx.t/(fx.max||.5),0,1);g.save();g.globalAlpha=alpha;
  if(fx.type==='ring'||fx.type==='shadow'){g.strokeStyle=fx.color;g.lineWidth=fx.type==='shadow'?11:4;g.beginPath();g.arc(fx.x,fx.y,fx.r*(1.35-alpha*.35),0,Math.PI*2);g.stroke();}
  if(fx.type==='slash'){g.strokeStyle=fx.color;g.lineWidth=5;g.beginPath();g.arc(fx.x,fx.y,fx.r/1.6,fx.ex-.85,fx.ex+.85);g.stroke();}
  if(fx.type==='mirrorcast'){g.strokeStyle='#f6d2ff';g.lineWidth=2;for(let i=0;i<8;i++){let a=i*Math.PI/4+gameTime*2;g.beginPath();g.moveTo(fx.x+Math.cos(a)*7,fx.y+Math.sin(a)*7);g.lineTo(fx.x+Math.cos(a)*fx.r*alpha,fx.y+Math.sin(a)*fx.r*alpha);g.stroke();}}
  if(fx.type==='mirrorShatter'){for(let i=0;i<8;i++){let a=i*Math.PI/4;let rr=fx.r*(1-alpha);g.fillStyle=i%2?'#a6e8ff':'#ffe3ff';g.save();g.translate(fx.x+Math.cos(a)*rr,fx.y+Math.sin(a)*rr);g.rotate(a);g.fillRect(-2,-7,4,14);g.restore();}}
  if(fx.type==='dimensional'){
    // Charged sword tears the air with a bright, tapered arc, not a plain black bar.
    const angle=fx.ex,dx=Math.cos(angle),dy=Math.sin(angle),perpX=-dy,perpY=dx;
    const tipX=fx.x+dx*fx.r,tipY=fx.y+dy*fx.r;
    const width=19+18*alpha;
    g.save();g.globalAlpha=Math.min(.96,alpha+.15);g.lineCap='round';
    g.strokeStyle='#100623';g.lineWidth=width*3;
    g.beginPath();g.moveTo(fx.x,fx.y);g.lineTo(tipX,tipY);g.stroke();
    g.strokeStyle='#7543d3';g.lineWidth=width*1.8;g.stroke();
    g.strokeStyle='#c5a4ff';g.lineWidth=width*.8;g.stroke();
    g.strokeStyle='#f9f4ff';g.lineWidth=4;g.stroke();
    for(let j=0;j<7;j++){
      const t=(j+.7)/8*fx.r,offset=(j%2?1:-1)*(width*.9+8);
      g.strokeStyle=j%2?'#9b73f1':'#d8cbff';g.lineWidth=2+((j+1)%3);
      g.beginPath();g.moveTo(fx.x+dx*t+perpX*offset,fx.y+dy*t+perpY*offset);
      g.lineTo(fx.x+dx*(t+13)+perpX*offset*.4,fx.y+dy*(t+13)+perpY*offset*.4);g.stroke();
    }
    g.restore();
  }
  if(fx.type==='disintegrate'){
    const dissolve=1-alpha;
    g.save();g.globalAlpha=alpha;
    g.fillStyle='#13071baa';g.beginPath();g.arc(fx.x,fx.y,fx.r*(.35+dissolve*.8),0,Math.PI*2);g.fill();
    for(let i=0;i<18;i++){
      const a=i*Math.PI*2/18+gameTime*.23;
      const rr=fx.r*(.2+dissolve*.9)*(1+(i%3)*.1);
      g.fillStyle=i%3?'#8f5bd9':'#efe3ff';
      g.fillRect(fx.x+Math.cos(a)*rr-3,fx.y+Math.sin(a)*rr-3,5+(i%3)*2,5+(i%3)*2);
    }
    g.restore();
  }
  if(fx.type==='shadowBurst'||fx.type==='voidBurst'){
    g.save();g.globalAlpha=alpha;g.strokeStyle=fx.color;g.lineWidth=3;
    for(let j=0;j<8;j++){const a=j*Math.PI/4+gameTime*.5,r=fx.r*(1-alpha);
       g.beginPath();g.moveTo(fx.x+Math.cos(a)*r*.3,fx.y+Math.sin(a)*r*.3);
       g.lineTo(fx.x+Math.cos(a)*r,fx.y+Math.sin(a)*r);g.stroke();}
    g.restore();
  }
  if(fx.type==='beam'){g.strokeStyle=fx.color;g.lineWidth=18;g.beginPath();g.moveTo(fx.x,fx.y);g.lineTo(fx.x+Math.cos(fx.ex)*fx.r,fx.y+Math.sin(fx.ex)*fx.r);g.stroke();}
  if(fx.type==='portal'){
    const progress=1-alpha;
    // Strong opening / fully open / closing sequence, anchored in world coordinates.
    const frame=progress<.18?0:progress<.37?1:progress<.80?2:3;
    const pic=portalFrames[frame];
    const pulse=1+Math.sin(gameTime*21)*.04;
    const size=(fx.r||90)*1.62*pulse;
    g.save();g.globalAlpha=Math.min(1,alpha*1.35+.15);
    if(pic.complete&&pic.naturalWidth)g.drawImage(pic,fx.x-size/2,fx.y-size/2,size,size);
    else{g.fillStyle='#3d136fb0';g.beginPath();g.ellipse(fx.x,fx.y,size*.3,size*.4,0,0,6.283);g.fill();}
    g.strokeStyle='#d5b5ff';g.lineWidth=2.5;g.globalAlpha*=.84;
    g.beginPath();g.ellipse(fx.x,fx.y,size*.32,size*.39,gameTime*.6,0,Math.PI*2);g.stroke();
    g.restore();
   }
   if(fx.type==='skull'){
    if(skullAsset.complete&&skullAsset.naturalWidth){g.drawImage(skullAsset,fx.x-24,fx.y-29,48,50);}
    else{g.fillStyle='#ece0ff';g.font='bold 28px system-ui';g.fillText('☠',fx.x-14,fx.y+7);}
    g.lineCap='round';g.strokeStyle='#4b2081';g.lineWidth=17;g.beginPath();g.moveTo(fx.x,fx.y);g.lineTo(fx.ex,fx.ey);g.stroke();
    g.strokeStyle='#ecdeff';g.lineWidth=7;g.stroke();
   }
  if(fx.type==='text'){g.textAlign='center';g.font='bold 18px system-ui';g.fillStyle=fx.color;g.strokeStyle='#170b22';g.lineWidth=3;g.strokeText('-'+nfmt(fx.ex),fx.x,fx.y-20*(1-alpha));g.fillText('-'+nfmt(fx.ex),fx.x,fx.y-20*(1-alpha));}
  g.restore();}
 for(const p of s?.projectiles||[]){
  if(p.kind===3&&mirrorAsset.complete&&mirrorAsset.naturalWidth){
    g.save();g.translate(p.x,p.y);g.rotate(gameTime*11);g.globalAlpha=.32;g.fillStyle='#b67ae9';g.beginPath();g.ellipse(-10,0,17,6,0,0,Math.PI*2);g.fill();g.globalAlpha=1;
    g.drawImage(mirrorAsset,-18,-22,36,44);
    g.globalAlpha=.28;g.drawImage(mirrorAsset,-36,-18,18,24);g.restore();
  }else{g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,5,0,Math.PI*2);g.fill();}
 }
 for(const shade of s?.clones||[])drawShadowCopy(shade);
 for(const p of s?.players||[])drawSprite(p);
 // The portal must remain visible even if the character and sword overlap it.
 for(const fx of [...(s?.fx||[]),...localTravelFx])if(fx.type==='portal'&&fx.t>0){
   const alpha=clamp(fx.t/(fx.max||1),0,1);const progress=1-alpha;
   const frame=progress<.2?0:progress<.4?1:progress<.8?2:3;
   const pic=portalFrames[frame];const size=150+Math.sin(gameTime*13)*9;
   if(pic?.complete&&pic.naturalWidth){g.save();g.globalAlpha=Math.min(.58,alpha*.65);g.drawImage(pic,fx.x-size/2,fx.y-size/2,size,size);g.restore();}
 }
 g.restore();g.fillStyle='#120f23bb';g.fillRect(0,0,W,64);g.fillRect(0,H-25,W,25);
 if(s?.starting>0){g.fillStyle='#0e0a1baa';g.fillRect(0,0,W,H);g.textAlign='center';g.font='bold 74px Georgia';g.fillStyle='#ffe4b6';g.fillText(Math.ceil(s.starting),W/2,H/2);}
 g.restore();
}
function renderHud(s){if(!s||!s.players?.length)return;
 for(let i=0;i<2;i++){const p=s.players[i];if(!p)continue;$(i?'rightName':'leftName').textContent=heroes[p.hero]?.name||'LUTADOR';$(i?'rightHp':'leftHp').style.width=(clamp(p.hp/p.maxHp,0,1)*100)+'%';$(i?'rightNum':'leftNum').textContent=`${nfmt(p.hp)} / ${nfmt(p.maxHp)} · ULT ${p.ult|0}%`;}
 let remain=Math.max(0,s.time||0),secs=Math.ceil(remain);$('timer').textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
 $('netInfo').textContent=`${fps} FPS · ${serverDuel?'SERVIDOR':directActive()?'DIRETO P2P':'CLOUDFLARE'} · ${directRtt>0&&directActive()?Math.round(directRtt):state.ping}ms · jitter ${Math.round(networkJitter)}ms`;
 $('roundCountdown').textContent=s.starting>0?String(Math.ceil(s.starting)):s.players.some(p=>p.hero==='eve'&&p.voidUlt>0)?'EXPANSÃO DO VAZIO':'';
}
function renderGuests(dt){
 if(!view)return null;
 const age=lastSnapAt?Math.min(180,Math.max(0,performance.now()-lastSnapAt)):0;
 return {...view,players:view.players.map(p=>{
   let smooth=rendered.get(p.id);
   if(!smooth){smooth={...p};rendered.set(p.id,smooth);}
   const mine=p.id===state.id&&state.role==='fighter';
   let targetX=p.x,targetY=p.y;
   if(mine){
     const length=Math.hypot(controls.x,controls.y),speed=heroes[p.hero].speed;
     const moving=length>.08&&view.starting<=0;
     if(moving){
       smooth.x+=controls.x/Math.max(length,1)*speed*dt;
       smooth.y+=controls.y/Math.max(length,1)*speed*dt;
       smooth.step=(smooth.step+dt*8)%3;
       smooth.face=Math.abs(controls.x)>Math.abs(controls.y)?controls.x>0?'right':'left':controls.y>0?'down':'up';
       // Account for packets in flight. Never pull the guest back to a stale host position.
       const horizon=Math.min(.22,(age+state.ping*.5+35)/1000);
       targetX+=controls.x/Math.max(length,1)*speed*horizon;
       targetY+=controls.y/Math.max(length,1)*speed*horizon;
     }
     const distance=Math.hypot(smooth.x-targetX,smooth.y-targetY);
     const settle=distance>130?Math.min(1,dt*11):distance>18?Math.min(1,dt*3.5):Math.min(1,dt*1.5);
     smooth.x+=(targetX-smooth.x)*settle;
     smooth.y+=(targetY-smooth.y)*settle;
   }else{
     const vel=authoritativeVelocity.get(p.id)||{x:0,y:0};
     const horizon=age/1000;
     targetX+=vel.x*horizon;targetY+=vel.y*horizon;
     const gap=Math.hypot(targetX-smooth.x,targetY-smooth.y);
     const blend=Math.min(1,dt*(gap>140?19:11));
     smooth.x+=(targetX-smooth.x)*blend;
     smooth.y+=(targetY-smooth.y)*blend;
   }
   smooth.x=clamp(smooth.x,55,MAP_W-55);smooth.y=clamp(smooth.y,75,MAP_H-55);
   for(const k of Object.keys(p))if(k!=='x'&&k!=='y'&&!(mine&&(k==='step'||k==='face')))smooth[k]=p[k];
   return smooth;
 })};
}
function getControls(){let x=0,y=0;if(keySet.has('w')||keySet.has('arrowup'))y--;if(keySet.has('s')||keySet.has('arrowdown'))y++;if(keySet.has('a')||keySet.has('arrowleft'))x--;if(keySet.has('d')||keySet.has('arrowright'))x++;
 controls.x=clamp(x+touchX,-1,1);controls.y=clamp(y+touchY,-1,1);
 if(keySet.has('j')||keySet.has('mouse'))controls.attack=true;
 else if(!isMobile)controls.attack=false;
 if((navigator.maxTouchPoints>0||'ontouchstart' in window)&&controls.attack){
  const pp=battle?.host?battle.players:view?.players;const me=pp?.find(p=>p.id===state.id),other=pp?.find(p=>p.id!==state.id);
  if(me&&other)controls.aim=Math.atan2(other.y-me.y,other.x-me.x);
 } }
function tick(ms){let dt=clamp((ms-last)/1000,0,.045);last=ms;gameTime+=dt;fpsTime+=dt;frames++;if(fpsTime>=1){fps=Math.round(frames/fpsTime);frames=0;fpsTime=0;
   if(qualityMode==='auto'&&isMobile&&performance.now()-lastQualityShift>4500){
    if(fps<37){slowFpsTime++;if(slowFpsTime>=2&&DUEL_SCALE>0.88){DUEL_SCALE=Math.max(.85,DUEL_SCALE-.22);resizeArena();lastQualityShift=performance.now();slowFpsTime=0;}}
    else {slowFpsTime=0;if(fps>57&&DUEL_SCALE<1.25){DUEL_SCALE=Math.min(1.25,DUEL_SCALE+.12);resizeArena();lastQualityShift=performance.now();}}
   }}
 if(battle){getControls();if(state.role==='fighter'&&controls.attack&&gameTime>=nextBasicSfx){
    const self=(battle.host?battle.players:view?.players)?.find(p=>p.id===state.id);
    duelSfx(self?.hero==='kali'?'mirror':'slash');nextBasicSfx=gameTime+.39;
    if(!battle.host&&self){guestFx(self.x+Math.cos(controls.aim)*48,self.y+Math.sin(controls.aim)*48,self.hero==='kali'?'mirrorcast':'slash',.23,self.hero==='kali'?22:70,heroes[self.hero]?.color||'#dcaaff',controls.aim,0);}
   }if(state.role==='fighter'){
   if(battle.host){const a=battle.players.find(p=>p.id===state.id);if(a)a.input={...controls};}
   else if(performance.now()-lastSend>45){
    const now=performance.now();
    const changed=Math.abs(controls.x-lastInputSent.x)>.06||Math.abs(controls.y-lastInputSent.y)>.06||Math.abs(Math.atan2(Math.sin(controls.aim-lastInputSent.aim),Math.cos(controls.aim-lastInputSent.aim)))>.13||controls.attack!==lastInputSent.attack;
    if(ws?.bufferedAmount<12000&&(changed||now-lastInputHeartbeat>(serverDuel?90:140))){
      sendDuelInput({t:'pvpInput',seq:++inputSequence,...controls});lastInputSent={...controls};lastInputHeartbeat=now;
    }
    lastSend=now;
   }
  }
  if(battle.host&&!state.finished){sim(dt);sendCloudMotion(ms);if(ms-lastSnapshot>(directActive()?53:123))sendAuthoritativeSnapshot();}
  const s=battle.host?snapshot(false):renderGuests(dt);
  if(state.scene==='battle'){paint(s,dt);if(ms-lastHudAt>82){renderHud(s);lastHudAt=ms;}}
  localTravelFx=localTravelFx.filter(f=>(f.t-=dt)>0);
 }requestAnimationFrame(tick);
}
function action(name,variant){if(state.role!=='fighter'||!state.started||state.finished||!battle)return;
 if(name==='r'){
  const p=(battle.host?battle.players:view?.players)?.find(a=>a.id===state.id);
  if(p?.hero==='kris'&&(p.ultCharge??p.ult??0)>=100){show('krisChoices',true);return;}
 }
 const mine=(battle?.host?battle.players:view?.players)?.find(p=>p.id===state.id);
 duelSfx(name==='dash'&&mine?.hero==='eve'?'portal':name==='dash'?'dash':name==='r'?'ultimate':name==='q'||name==='e'?'cast':'slash');
 previewGuestAction(name);executeAction(name,variant);
}
function executeAction(name,variant){if(battle?.host){const a=battle.players.find(x=>x.id===state.id);if(a)act(a,name,variant)}else{sendDuelAction({t:'pvpAction',action:name,variant:variant||'',aim:controls.aim,x:controls.x,y:controls.y});}}
function keyAction(e,down){const k=e.key.toLowerCase();if([' ','arrowdown','arrowup','arrowleft','arrowright'].includes(k))e.preventDefault();if(down&&!keySet.has(k)){
 if(k===' '){action('dash');}if(k==='q'||k==='r')action(k);if(k==='e'){const own=(battle?.host?battle.players:view?.players)?.find(a=>a.id===state.id);if(own?.hero==='kris')executeAction('eDown');else action('e');}}
 if(!down&&k==='e'){const own=(battle?.host?battle.players:view?.players)?.find(a=>a.id===state.id);if(own?.hero==='kris')executeAction('eUp');}
 if(down)keySet.add(k);else keySet.delete(k);
}
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if([' ','q','e','r','j','w','a','s','d'].includes(e.key.toLowerCase()))e.preventDefault();keyAction(e,true);});window.addEventListener('keyup',e=>keyAction(e,false));
$arena.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const rect=$arena.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*W+duelCamera.x,y=(e.clientY-rect.top)/rect.height*H+duelCamera.y;const me=(battle?.host?battle.players:view?.players)?.find(a=>a.id===state.id);if(me)controls.aim=Math.atan2(y-me.y,x-me.x);}});
$arena.addEventListener('pointerdown',e=>{if(state.role!=='fighter'||e.pointerType==='touch')return;keySet.add('mouse');});window.addEventListener('pointerup',()=>keySet.delete('mouse'));
const stick=$('moveStick');
function moveStick(e){let rect=stick.getBoundingClientRect(),x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2),r=rect.width*.32,l=Math.hypot(x,y)||1;touchX=clamp(x/r,-1,1);touchY=clamp(y/r,-1,1);if(l>r){touchX=x/l;touchY=y/l;}let px=touchX*r,py=touchY*r;$('moveKnob').style.transform=`translate(calc(-50% + ${px}px),calc(-50% + ${py}px))`;}
stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);stickId=e.pointerId;moveStick(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});function endStick(e){if(e.pointerId!==stickId)return;stickId=null;touchX=touchY=0;$('moveKnob').style.transform='translate(-50%,-50%)';}stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
for(const b of document.querySelectorAll('[data-act]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const a=b.dataset.act;
 if(a==='attack'){controls.attack=true;const me=(battle?.host?battle.players:view?.players)?.find(x=>x.id===state.id),en=(battle?.host?battle.players:view?.players)?.find(x=>x.id!==state.id);
 if(me&&en)controls.aim=Math.atan2(en.y-me.y,en.x-me.x);
 }else if(a==='e'){const own=(battle?.host?battle.players:view?.players)?.find(x=>x.id===state.id);if(own?.hero==='kris')executeAction('eDown');else action('e');}
 else action(a);
 });b.addEventListener('pointerup',e=>{if(b.dataset.act==='attack')controls.attack=false;if(b.dataset.act==='e'){const own=(battle?.host?battle.players:view?.players)?.find(x=>x.id===state.id);if(own?.hero==='kris')executeAction('eUp');}});b.addEventListener('pointercancel',()=>{if(b.dataset.act==='attack')controls.attack=false;});
}
$('create').onclick=()=>send({t:'pvpCreate'});$('joinFighter').onclick=()=>send({t:'pvpJoin',code:$('roomCode').value,role:'fighter'});$('joinSpectator').onclick=()=>send({t:'pvpJoin',code:$('roomCode').value,role:'spectator'});
for(const b of document.querySelectorAll('[data-hero]'))b.onclick=()=>send({t:'pvpChoose',hero:b.dataset.hero});
$('begin').onclick=()=>send({t:'pvpBegin'});$('leave').onclick=()=>{stopDuelMusic();send({t:'pvpLeave'});state.scene='entry';state.code='';showScene('entry');note('Você saiu da sala.');};
const qualitySelect=$('duelQuality');if(qualitySelect){qualitySelect.value=qualityMode;qualitySelect.addEventListener('change',()=>{
 qualityMode=qualitySelect.value;
 DUEL_SCALE=qualityMode==='performance'?.8:qualityMode==='light'?1:qualityMode==='high'?Math.min(2,window.devicePixelRatio||2):Math.min(isMobile?1.35:1.85,window.devicePixelRatio||1);
 resizeArena();note(qualityMode==='high'?'Nitidez máxima ativa.':'Qualidade de X1 ajustada: '+qualityMode);
});}
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(state.code);note('Código da sala copiado.')}catch{note('Código: '+state.code)}};
$('rematch').onclick=()=>send({t:'pvpRematch'});$('backLobby').onclick=()=>send({t:'pvpRematch'});
// Kris's ultimate has four original choices; do not replace them with a fixed buff.
const modal=document.createElement('div');modal.id='krisChoices';modal.className='game-over hidden';modal.innerHTML='<div class="panel"><div class="tag">◆ SUPREMO DE KRIS ◆</div><h2>Escolha um poder</h2><div class="flex" style="justify-content:center"><button data-ult="fight">⚔ FIGHT<br><small>+100% dano básico</small></button><button data-ult="defesa">🛡 DEFESA<br><small>3s de imunidade</small></button><button data-ult="itens">⚔⚔ ITENS<br><small>duas espadas</small></button><button data-ult="piedade">💚 PIEDADE<br><small>cura total + rapidez</small></button></div><button id="cancelUlt">CANCELAR</button></div>';
document.querySelector('.arena-shell').append(modal);
for(const b of modal.querySelectorAll('[data-ult]'))b.onclick=()=>{show('krisChoices',false);executeAction('r',b.dataset.ult)};
modal.querySelector('#cancelUlt').onclick=()=>show('krisChoices',false);
setInterval(()=>{if(state.online)send({t:'ping',ts:Date.now()});},4000);
setInterval(async()=>{
 if(!directActive()||!directPeer)return;
 try{const stats=await directPeer.getStats();for(const v of stats.values()){
  if(v.type==='candidate-pair'&&v.state==='succeeded'&&v.nominated&&Number.isFinite(v.currentRoundTripTime)){
   directRtt=v.currentRoundTripTime*1000;break;
  }
 }}catch(_){/* unsupported browser stats */}
},3200);
if(new URLSearchParams(location.search).has('debug'))window.YGG_DEBUG={snapshot:()=>view,actor:()=>rendered.get(state.id),host:()=>battle?.host,actors:()=>battle?.players};
window.addEventListener('blur',()=>{keySet.clear();touchX=touchY=0;controls.x=controls.y=0;controls.attack=false;sendDuelInput({t:'pvpInput',seq:++inputSequence,x:0,y:0,aim:controls.aim,attack:false});});
connect();requestAnimationFrame(tick);
