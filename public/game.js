
'use strict';
const touchUI=window.matchMedia('(pointer:coarse)').matches || (navigator.maxTouchPoints>0 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)); document.body.classList.toggle('touch-ui',touchUI); let W=(touchUI&&window.innerWidth>window.innerHeight)?Math.round(288*window.innerWidth/window.innerHeight):480,H=touchUI?(window.innerWidth>window.innerHeight?288:720):288;const WORLD_W=1448,WORLD_H=1086,canvas=document.getElementById('game');let ctx=canvas.getContext('2d',{alpha:false});let RENDER_SCALE=touchUI?1.20:1.5;let renderMode="auto",lastRenderAdjust=0,slowSeconds=0,fastSeconds=0;canvas.width=Math.round(W*RENDER_SCALE);canvas.height=Math.round(H*RENDER_SCALE);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
const $=id=>document.getElementById(id),rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), norm=(x,y)=>{let l=Math.hypot(x,y)||1;return {x:x/l,y:y/l}}, TAU=Math.PI*2;
let phase='title',player=null,enemies=[],projectiles=[],particles=[],slashes=[],rings=[],dashShadows=[],stage=1,essence=0,last=0,elapsed=0,shake=0,flash=0,mouseAim=null,pointerDown=false,attackMobile=false,mobileMove={x:0,y:0},opts=[],nextEnemyId=1,camera={x:0,y:0},shadowClones=[],waveIntro=0,domainFade=0,waveClearTimer=-1,dashGhostTimer=0,footstepClock=0,eclipseTime=0,healthDrops=[],damageFloats=[],xansBlasters=[],timeFields=[],mirrorIllusions=[],voidCollapse=0,evePortals=[];
// v2.4: dynamic *visual* budget. All damage, collisions, dash timing and network ticks
// remain unchanged even when the canvas renders fewer/cheaper frames.
const weakMobileHint=touchUI&&((Number(navigator.deviceMemory)||8)<=4||(Number(navigator.hardwareConcurrency)||8)<=4);
let autoFxTier=weakMobileHint?1:0,drawnFrames=0,callbackFps=60;
const lowFx=()=>renderMode==='desempenho'||renderMode==='leve'||(renderMode==='auto'&&autoFxTier>=1);
const minimalFx=()=>renderMode==='desempenho'||(renderMode==='auto'&&autoFxTier>=2);
if(weakMobileHint){RENDER_SCALE=1.0;canvas.width=Math.round(W*RENDER_SCALE);canvas.height=Math.round(H*RENDER_SCALE);}
const keys=new Set();
let perfFrames=0,perfStart=0,netPingStart=0,netRtt=null,visibleFps=60,netJitter=0,lastStateArrival=0;
const coop={lastMotion:0,motionSeq:0,lastMotionSeq:0,networkRx:0,lastMotionArrival:0,networkExpected:50,active:false,host:false,id:null,hostId:null,room:null,socket:null,members:[],allies:new Map(),actorId:null,executing:false,chosen:false,choices:new Set(),lastSnapshot:0,lastInput:0,lastStateStage:0,lastStatePhase:null,selectingUltimate:false,remoteStarted:false,frameAt:0,targetLocal:null,targetAllies:new Map(),lastStage:0,lastStateSeq:0,stateSeq:0,remoteEvents:0,lastCombatPacket:0,enemyTargets:new Map(), projectileTargets:new Map(),serverFeedback:null,hostAvatar:null,guestVisibleHp:null};
function coopSend(data){
 const socket=coop.socket;
 if(!socket||socket.readyState!==WebSocket.OPEN)return;
 // Drop expendable visual updates instead of queueing stale frames behind a slow connection.
 if((data.t==='state'||data.t==='motion')&&socket.bufferedAmount>24000)return;
 try{socket.send(JSON.stringify(data));}catch(e){console.warn('Yggdrasil: falha de rede',e);}
}
function coopNote(message){const n=$('coopNotice');if(n)n.textContent=message;}


const HERO={loid:new Image(),kris:new Image(),cross:new Image(),eve:new Image(),kali:new Image()};
const EVE_PORTAL_FRAMES=Array.from({length:4},(_,i)=>{const a=new Image();a.src=`assets/effects/void_portal_${i}.png?v=32`;return a;});
const MIRROR_SPRITE=new Image();MIRROR_SPRITE.src='assets/effects/mirror_projectile.png?v=32';
const SKILL_HEROES=new Set(['loid','kris','cross','eve','kali']);let lastSkillArt='';
function syncSkillArt(type){if(!SKILL_HEROES.has(type)||lastSkillArt===type)return;lastSkillArt=type; /* Keep original ✦ ✧ ✺ buttons; ability art does not replace their symbols. */}

HERO.loid.src='assets/heroes/loid_sheet.png';
HERO.kris.src='assets/heroes/kris_sheet.png';
HERO.cross.src='assets/heroes/cross_sheet.png';
HERO.eve.src='assets/heroes/eve_sheet.png?v=33';
HERO.kali.src='assets/heroes/kali_sheet.png?v=33';
const ENEMY_URLS={walker:'assets/enemies/oni_walker.png',runner:'assets/enemies/oni_runner.png',caster:'assets/enemies/oni_caster.png',boss:'assets/enemies/samurai_sheet.png',reuni:'assets/enemies/reuni_sheet.png',tsukuomi:'assets/enemies/tsukuomi_sheet.png',ghost:'assets/enemies/ghost_sheet.png',yokai:'assets/enemies/yokai_sheet.png',beast:'assets/enemies/beast_sheet.png',pecado:'assets/enemies/pecado_sheet.png',draugr:'assets/enemies/nordic_draugr_sheet.png',frostwolf:'assets/enemies/nordic_frostwolf_sheet.png',berserker:'assets/enemies/nordic_berserker_sheet.png',runewitch:'assets/enemies/nordic_runewitch_sheet.png',frostjarl:'assets/enemies/jarl_v39_atlas.png?v=39',nameless:'assets/nordic/nameless_knight.png?v=41',runeSeal:'assets/nordic/nameless_knight.png?v=41'};
const FROG=new Image();FROG.src='assets/heroes/kris_frog_sheet.png';
const ARENA=new Image(); ARENA.src='assets/japanese_arena.webp';
const NORDIC_ARENA=new Image();NORDIC_ARENA.src='assets/nordic/frozen_arena.webp?v=37';
const isNordic=()=>stage>=21;const localNordicWave=()=>Math.max(1,stage-20);
let selectedCampaign='japan',activeCampaign='japan';
const isCampaignFinalWave=()=>activeCampaign==='nordic'?stage===35:stage===20;
const DRAGON_ART=new Image();DRAGON_ART.src='assets/nordic/ancient_dragon.png?v=41';
const JARL_BOSS_ART=new Image();JARL_BOSS_ART.src='assets/nordic/jarl_boss_v38.webp?v=38';
const SAMURAI_BOSS_ART=new Image();SAMURAI_BOSS_ART.src='assets/ui/samurai_boss_v38.webp?v=38';
const NORDIC_VFX={};for(const n of ['ice','rune','rage']){NORDIC_VFX[n]=new Image();NORDIC_VFX[n].src='assets/nordic/vfx_'+n+'.png';}

let testBossMode=false, hazards=[],frostBursts=[],bossMessage='',bossMessageTimer=0,difficulty='normal',selectedBoss=null,bonusBeam=null;
const isPecador=()=>difficulty==='pecador';
const isBossEnemy=e=>['boss','reuni','tsukuomi','pecado','frostjarl','nameless'].includes(e.type);
const CARD_IMAGES={heart:'assets/cards/heart.png',blade:'assets/cards/blade.png',fast:'assets/cards/fast.png',speed:'assets/cards/speed.png',armor:'assets/cards/armor.png',reach:'assets/cards/reach.png',dodge:'assets/cards/dodge.png',heal:'assets/cards/heal.png',critical:'assets/cards/critical.png',arc:'assets/cards/arc.png',vigor:'assets/cards/vigor.png',echo:'assets/cards/echo.png',shadowblade:'assets/cards/shadowblade.png',shadowdash:'assets/cards/shadowdash.png',darkburst:'assets/cards/darkburst.png',living:'assets/cards/living.png',black:'assets/cards/black.png',form:'assets/cards/form.png',awakening:'assets/cards/awakening.png',bloodmoon:'assets/cards/bloodmoon.png',ancient:'assets/cards/ancient.png',dragonPact:'assets/nordic/nameless_knight.png?v=41',frog:'assets/cards/frog.png',gaster:'assets/cards/gaster.png',granita:'assets/cards/granita.png',mirror:'assets/cards/arc.png',mirrorguard:'assets/cards/armor.png',voidblade:'assets/cards/blade.png',timeward:'assets/cards/fast.png'};
const ENEMY_ART={};
for(const name of Object.keys(ENEMY_URLS)) {ENEMY_ART[name]=new Image();ENEMY_ART[name].src=ENEMY_URLS[name];}
let movingNow=false;

const THEMES=[{name:'RAIZ DA MEMÓRIA',floor:'#252337',wall:'#171729',accent:'#9383dc',danger:'#8b70bb'},{name:'RAIZ DA MORTE',floor:'#2b2430',wall:'#1a151f',accent:'#b064a8',danger:'#be668b'},{name:'RAIZ DO TEMPO',floor:'#222e38',wall:'#101f2b',accent:'#6bc3d1',danger:'#66b2e4'},{name:'RAIZ DA VIDA',floor:'#273229',wall:'#18261a',accent:'#8bc078',danger:'#89bf65'},{name:'RAIZ DA VONTADE',floor:'#382924',wall:'#291a17',accent:'#e4a36d',danger:'#d78a72'},{name:'RAIZ DA ESPERANÇA',floor:'#34313a',wall:'#201d2c',accent:'#e5be89',danger:'#f0c994'},{name:'RAIZ DA ALMA',floor:'#282e41',wall:'#161d2d',accent:'#89a7f8',danger:'#a18fed'}];
const cards=[
{id:'heart',name:'Coração da Raiz',desc:'+30 de vida máxima e recupera 30 de vida.',icon:'♥',rarity:'common',effect:p=>{p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+30)}},
{id:'blade',name:'Fio da Ruína',desc:'+12% de dano (limite +65%).',icon:'⚔',rarity:'common',effect:p=>p.damage=Math.min(p.baseDamage*1.65,p.damage*1.12)},
{id:'fast',name:'Dança das Lâminas',desc:'+10% na velocidade de ataque (limite).',icon:'✧',rarity:'common',effect:p=>p.attackDelay=Math.max(p.baseAttackDelay*.7,p.attackDelay*.90)},
{id:'speed',name:'Passos Leves',desc:'+8% de velocidade de movimento.',icon:'➤',rarity:'common',effect:p=>p.speed=Math.min(p.baseSpeed*1.35,p.speed*1.08)},
{id:'armor',name:'Casca Ancestral',desc:'Recebe 9% menos dano (máximo 40%).',icon:'⬡',rarity:'common',effect:p=>p.armor=Math.min(.4,1-(1-p.armor)*.91)},
{id:'reach',name:'Alcance da Raiz',desc:'+10% de alcance (máximo +25%).',icon:'⟡',rarity:'common',effect:p=>p.reach=Math.min(p.baseReach*1.25,p.reach*1.10)},
{id:'dodge',name:'Reflexos Antigos',desc:'Esquiva recarrega 12% mais rápido.',icon:'↝',rarity:'common',effect:p=>p.dashDelay=Math.max(p.baseDashDelay*.7,p.dashDelay*.88)},
{id:'heal',name:'Seiva Vital',desc:'Recupera 2 de vida ao derrotar inimigos (máximo 6).',icon:'✚',rarity:'rare',effect:p=>p.onKillHeal=Math.min(6,p.onKillHeal+2)},
{id:'critical',name:'Olho do Predador',desc:'+8% de chance de golpe crítico (máximo 45%).',icon:'◉',rarity:'rare',effect:p=>p.crit=Math.min(.45,p.crit+.08)},
{id:'arc',name:'Corte Crescente',desc:'Seus golpes ganham +0,2 de arco (limitado).',icon:'☾',rarity:'rare',effect:p=>p.arc=Math.min(2.65,p.arc+.2)},
{id:'vigor',name:'Vigor de Guerra',desc:'Recupera +8 de vida ao terminar cada fase.',icon:'✦',rarity:'rare',effect:p=>p.betweenHeal=Math.min(27,p.betweenHeal+8)},
{id:'echo',name:'Eco da Lâmina',desc:'12% de chance de causar dano extra.',icon:'❖',rarity:'rare',effect:p=>p.echo=Math.min(.35,p.echo+.12)},
{id:'shadowblade',name:'Lâmina Sombria',desc:'A adaga de Loid causa +14% de dano (limite +65%).',icon:'☽',rarity:'rare',hero:'loid',effect:p=>p.damage=Math.min(p.baseDamage*1.65,p.damage*1.12)},
{id:'shadowdash',name:'Passo Sombrio',desc:'Esquivas 18% mais rápidas e deixam rastros.',icon:'◈',rarity:'rare',hero:'loid',effect:p=>{p.dashDelay=Math.max(p.baseDashDelay*.7,p.dashDelay*.82);p.shadowDash=true}},
{id:'darkburst',name:'Abismo Desperto',desc:'A aura de escuridão dura mais e causa mais dano.',icon:'✹',rarity:'rare',hero:'loid',effect:p=>{p.skillAmp=Math.min(1.5,p.skillAmp*1.2);p.skillDelay=Math.max(6,p.skillDelay*.93);p.darkAuraDuration=Math.min(5.3,(p.darkAuraDuration||4.1)+.6)}},
{id:'living',name:'Sombra Viva',desc:'Um espírito sombrio ataca inimigos próximos.',icon:'♟',rarity:'legendary',hero:'loid',effect:p=>{p.orbiters++;p.orbitTimer=0}},
{id:'black',name:'Fúria Negra',desc:'Kris causa +25% de dano transformado.',icon:'♜',rarity:'rare',hero:'kris',effect:p=>p.transformAmp=Math.min(1.1,p.transformAmp+.25)},
{id:'form',name:'Forma Perfeita',desc:'A transformação dura mais 3 segundos.',icon:'◆',rarity:'rare',hero:'kris',effect:p=>p.transformDuration+=3},
{id:'awakening',name:'Despertar',desc:'Transformação recarrega 15% mais rápido.',icon:'♛',rarity:'rare',hero:'kris',effect:p=>p.skillDelay=Math.max(9,p.skillDelay*.85)},
{id:'bloodmoon',name:'Lua do Abismo',desc:'Ataques transformados geram ondas de energia.',icon:'☯',rarity:'legendary',hero:'kris',effect:p=>p.waveAttack=true},
{id:'frog',name:'Forma do Sapo',desc:'Q TEMPORÁRIO (1x): após o salto, Q volta à transformação normal. Salto elimina Onis e yokais; tira 25% da vida máxima de chefes.',icon:'♠',rarity:'legendary',hero:'kris',effect:p=>{p.frogSkill=true;p.frogUsed=false;p.frogTime=0;p.transformTime=0;p.skillCd=0}},
{id:'gaster',name:'Gaster Blaster',desc:'XANS · Carta exclusiva: invoque uma caveira colossal que dispara um feixe devastador. F = uso único por partida.',icon:'☠',rarity:'legendary',hero:'cross',effect:p=>{p.cardPower='gaster';p.cardPowerUsed=false;}},
{id:'mirror',name:'Reflexo Duplo',desc:'Kali: estilhaços causam +15% de dano.',icon:'◇',rarity:'rare',hero:'kali',effect:p=>p.mirrorAmp=(p.mirrorAmp||1)*1.15},
{id:'mirrorguard',name:'Espelho Protetor',desc:'Kali: Q dura 1 segundo a mais.',icon:'✧',rarity:'rare',hero:'kali',effect:p=>p.mirrorDuration=(p.mirrorDuration||4)+1},
{id:'voidblade',name:'Espada Voraz',desc:'Eve: +12% de dano da espada do Vazio.',icon:'✦',rarity:'rare',hero:'eve',effect:p=>p.damage=Math.min(p.baseDamage*1.65,p.damage*1.12)},
{id:'timeward',name:'Tempo Dilatado',desc:'Eve: Campo Temporal dura mais 1 segundo.',icon:'◷',rarity:'rare',hero:'eve',effect:p=>p.timeDuration=(p.timeDuration||5)+1},
{id:'granita',name:'Descarga de Granita',desc:'LOID · Carta exclusiva: raio branco-negro ampliado, mais dano contra chefes. Consome 50% do Supremo. F = uso único.',icon:'ϟ',rarity:'legendary',hero:'loid',effect:p=>{p.cardPower='granita';p.cardPowerUsed=false;}},
{id:'ancient',name:'Herança de Yggdrasil',desc:'+8% de vida e +5% de dano, velocidade e alcance (com limites).',icon:'♧',rarity:'legendary',effect:p=>{p.maxHp=Math.ceil(p.maxHp*1.08);p.hp=Math.min(p.maxHp,p.hp+12);p.damage=Math.min(p.baseDamage*1.65,p.damage*1.05);p.speed=Math.min(p.baseSpeed*1.35,p.speed*1.05);p.reach=Math.min(p.baseReach*1.25,p.reach*1.05)}},
];

// v4.0: baralho exclusivo do Reino Nórdico, independente das cartas do Japão.
// Cada nova jornada concede exatamente 20 cartas aleatórias e sem repetição.
const NORDIC_LIMITS={hp:3.5,damage:2.85,attackDelay:.52,speed:1.75,reach:1.65,armor:.58,crit:.60,echo:.48,dodge:.44,dashDelay:.50,skillDelay:.59,secondaryDelay:.57};
function nordicClamp(p){
 p.maxHp=Math.min(p.baseMaxHp*NORDIC_LIMITS.hp, p.maxHp);
 p.hp=Math.min(p.maxHp,p.hp);
 p.damage=Math.min(p.baseDamage*NORDIC_LIMITS.damage,p.damage);
 p.attackDelay=Math.max(p.baseAttackDelay*NORDIC_LIMITS.attackDelay,p.attackDelay);
 p.speed=Math.min(p.baseSpeed*NORDIC_LIMITS.speed,p.speed);
 p.reach=Math.min(p.baseReach*NORDIC_LIMITS.reach,p.reach);
 p.armor=Math.min(NORDIC_LIMITS.armor,p.armor);
 p.crit=Math.min(NORDIC_LIMITS.crit,p.crit);
 p.echo=Math.min(NORDIC_LIMITS.echo,p.echo);
 p.dodgeChance=Math.min(NORDIC_LIMITS.dodge,p.dodgeChance);
 p.dashDelay=Math.max(p.baseDashDelay*NORDIC_LIMITS.dashDelay,p.dashDelay);
 p.skillDelay=Math.max(p.baseSkillDelay*NORDIC_LIMITS.skillDelay,p.skillDelay);
 p.secondaryDelay=Math.max(p.baseSecondaryDelay*NORDIC_LIMITS.secondaryDelay,p.secondaryDelay);
 p.onKillHeal=Math.min(15,p.onKillHeal);p.betweenHeal=Math.min(65,p.betweenHeal);
 p.arc=Math.min(3.15,p.arc);p.skillAmp=Math.min(1.85,p.skillAmp);
 p.timeDuration=Math.min(9,p.timeDuration);p.mirrorDuration=Math.min(9,p.mirrorDuration);
 p.transformDuration=Math.min(13,p.transformDuration);p.transformAmp=Math.min(1.4,p.transformAmp);
}
const nCard=(id,name,desc,icon,rarity,effect)=>({id:'n_'+id,name,desc,icon,rarity,effect});
const nordicCards=[
 nCard('mjolnir','Martelo de Thor','Dano +26% (respeita o limite nórdico).','ϟ','legendary',p=>p.damage*=1.26),
 nCard('odin_eye','Olho de Odin','Crítico +16% e amplificação de poder +15%.','◉','legendary',p=>{p.crit+=.16;p.skillAmp*=1.15}),
 nCard('valhalla','Juramento de Valhalla','Vida máxima +85 e cura 85.','ᛉ','legendary',p=>{p.maxHp+=85;p.hp+=85}),
 nCard('fenrir','Presas de Fenrir','Dano +18% e crítico +8%.','ᚠ','rare',p=>{p.damage*=1.18;p.crit+=.08}),
 nCard('freya','Benção de Freyja','Vida máxima +65 e cura 65.','✿','rare',p=>{p.maxHp+=65;p.hp+=65}),
 nCard('bifrost','Caminho de Bifröst','Alcance +27% e velocidade +8%.','◇','rare',p=>{p.reach*=1.27;p.speed*=1.08}),
 nCard('tyr','Pacto de Týr','Dano +16% e proteção +12%.','ᛏ','legendary',p=>{p.damage*=1.16;p.armor=1-(1-p.armor)*.88}),
 nCard('skadi','Passos de Skaði','Velocidade +22%.','❄','rare',p=>p.speed*=1.22),
 nCard('heimdall','Vigília de Heimdall','Crítico +14% e esquiva +8%.','✧','rare',p=>{p.crit+=.14;p.dodgeChance+=.08}),
 nCard('mimir','Sabedoria de Mímir','Tempo de recarga de Q -23%.','ᛗ','legendary',p=>p.skillDelay*=.77),
 nCard('runeclock','Cronorruna de Niflheim','Recarga do poder E -22%.','⌛','rare',p=>p.secondaryDelay*=.78),
 nCard('valkyrie','Asas de Valquíria','Esquiva +15% e recarga da esquiva -20%.','ᛦ','legendary',p=>{p.dodgeChance+=.15;p.dashDelay*=.80}),
 nCard('jormungandr','Espiral de Jörmungandr','Arco de ataque +0,45 e alcance +13%.','◎','rare',p=>{p.arc+=.45;p.reach*=1.13}),
 nCard('berserk','Frenesi Berserker','Ataques 20% mais rápidos e crítico +7%.','⚔','rare',p=>{p.attackDelay*=.80;p.crit+=.07}),
 nCard('ragnarok','Brasa do Ragnarök','Dano +21% e vida máxima +35.','🔥','legendary',p=>{p.damage*=1.21;p.maxHp+=35;p.hp+=35}),
 nCard('huginn','Corvo Hugin','Velocidade +12% e chance de dano extra +16%.','◆','rare',p=>{p.speed*=1.12;p.echo+=.16}),
 nCard('muninn','Corvo Munin','Crítico +10% e esquiva +10%.','◈','rare',p=>{p.crit+=.10;p.dodgeChance+=.10}),
 nCard('ys','Escudo Glacial','Proteção +20% e vida máxima +45.','⬡','legendary',p=>{p.armor=1-(1-p.armor)*.80;p.maxHp+=45;p.hp+=45}),
 nCard('norn','Fios das Nornas','Chance de dano extra +23%.','✶','rare',p=>p.echo+=.23),
 nCard('seidr','Selo Seiðr','Amplifica Q em +25% e reduz sua recarga em 12%.','ᛟ','rare',p=>{p.skillAmp*=1.25;p.skillDelay*=.88}),
 nCard('worldtree','Sangue de Yggdrasil','Vida máxima +26% e cura proporcional.','♧','legendary',p=>{const add=Math.ceil(p.maxHp*.26);p.maxHp+=add;p.hp+=add}),
 nCard('mead','Hidromel dos Einherjar','Cura +7 por abate e +20 entre ondas.','✚','rare',p=>{p.onKillHeal+=7;p.betweenHeal+=20}),
 nCard('storm','Peregrino das Tempestades','Velocidade +14% e recarga da esquiva -20%.','☇','rare',p=>{p.speed*=1.14;p.dashDelay*=.80}),
 nCard('dvergr','Forja dos Anões','Vida máxima +50 e dano +13%.','⚒','rare',p=>{p.maxHp+=50;p.hp+=50;p.damage*=1.13}),
 nCard('runeedge','Lâmina Rúnica','Dano +18% e alcance +15%.','⟡','rare',p=>{p.damage*=1.18;p.reach*=1.15}),
 nCard('nifl','Geada de Niflheim','Proteção +15% e esquiva +8%.','✳','rare',p=>{p.armor=1-(1-p.armor)*.85;p.dodgeChance+=.08}),
 nCard('muspel','Coração de Muspelheim','Ataques 16% mais rápidos e dano +12%.','☀','legendary',p=>{p.attackDelay*=.84;p.damage*=1.12}),
 nCard('fimbul','Fimbulvetr','Vida máxima +60 e proteção +12%.','❅','rare',p=>{p.maxHp+=60;p.hp+=60;p.armor=1-(1-p.armor)*.88}),
 nCard('garm','Fúria de Garmr','Chance de dano extra +17% e crítico +9%.','ᚷ','rare',p=>{p.echo+=.17;p.crit+=.09}),
 nCard('runes','Alma das Runas','Poder Q +20% e recarga E -17%.','ᚱ','legendary',p=>{p.skillAmp*=1.20;p.secondaryDelay*=.83})
];
for(const c of nordicCards)CARD_IMAGES[c.id]=`assets/cards/nordic/${c.id}.svg?v=40`;
function awardCard(p,c){c.effect(p);p.cards.push(c.id);if(c.id.startsWith('n_'))nordicClamp(p);}
function grantNordicStarter(p){
 if(p.nordicStarterGranted)return p.cards;
 const bag=nordicCards.filter(c=>!c.hero||c.hero===p.type).slice();
 for(let i=0;i<20;i++){
  const index=Math.floor(Math.random()*bag.length),c=bag.splice(index,1)[0];
  awardCard(p,c);
 }
 p.nordicStarterGranted=true;p.hp=p.maxHp;
 return p.cards;
}

function createPlayer(type){const loid=type==='loid',cross=type==='cross',eve=type==='eve',kali=type==='kali';return {type,x:WORLD_W/2,y:WORLD_H/2+120,face:'down',aim:-Math.PI/2,hp:loid?110:cross?118:eve?115:kali?120:135,maxHp:loid?110:cross?118:eve?115:kali?120:135,damage:loid?26:cross?29:eve?42:kali?23:34,attackDelay:loid?.29:cross?.34:eve?.31:kali?.40:.43,atkTime:0,speed:loid?105:cross?106:eve?125:kali?96:91,reach:loid?33:cross?38:eve?53:kali?85:43,arc:loid?1.85:cross?1.95:2.15,armor:0,crit:cross?.26:eve?.13:.07,echo:0,onKillHeal:0,betweenHeal:11,dashDelay:loid?2.4:cross?2.55:eve?2.2:2.8,dashCd:0,dashTime:0,dashV:{x:0,y:0},invuln:0,skillDelay:loid?9:cross?6.5:eve?17.5:kali?20:14,skillCd:0,skillAmp:1,darkAuraTime:0,darkAuraTick:0,secondaryCd:0,secondaryDelay:loid?20:cross?9:eve?15:kali?18:8.5,secondaryCharging:false,secondaryCharge:0,transformDuration:6,transformAmp:.55,transformTime:0,shadowDash:false,orbiters:0,orbitTimer:0,waveAttack:false,cardPower:'',cardPowerUsed:false,frogSkill:false,frogUsed:false,frogTime:0,ghost:false,dodgeChance:(cross?.12:eve?.15:0),mirrorGuard:0,mirrorAmp:1,mirrorDuration:4,timeDuration:5,voidField:0,voidTick:0,voidUltimate:0,voidUltTick:0,crossChain:null,curseTime:0,frostTime:0,attackCount:0,ultimateCharge:0,ultimateTime:0,ultimateTick:0,ultimateBuff:'',ultimateBuffTime:0,step:0,cards:[],kills:0};}
const originalCreatePlayer=createPlayer;createPlayer=function(type){const p=originalCreatePlayer(type);p.baseMaxHp=p.maxHp;p.baseSkillDelay=p.skillDelay;p.baseSecondaryDelay=p.secondaryDelay;p.baseDamage=p.damage;p.baseAttackDelay=p.attackDelay;p.baseSpeed=p.speed;p.baseReach=p.reach;p.baseDashDelay=p.dashDelay;return p;};
function theme(){if(isNordic())return {name:'REINO NÓRDICO · INVERNO ETERNO',floor:'#142934',wall:'#102032',accent:'#b5f0fc',danger:'#9fc4ff'};return stage===20?{name:'TRONO DO PECADO',floor:'#3a0810',wall:'#160408',accent:'#ff253f',danger:'#de1228'}:stage===15?{name:'DOMÍNIO DA LUA',floor:'#1b1730',wall:'#0c0920',accent:'#b98dff',danger:'#995ac8'}:THEMES[Math.min(THEMES.length-1,Math.floor((stage-1)/4))]}
const MOB_STATS={walker:{hp:44,speed:47,radius:10},runner:{hp:31,speed:69,radius:10},caster:{hp:54,speed:32,radius:11},ghost:{hp:42,speed:66,radius:10},yokai:{hp:62,speed:46,radius:11},beast:{hp:88,speed:83,radius:13},draugr:{hp:125,speed:49,radius:12},frostwolf:{hp:78,speed:92,radius:12},berserker:{hp:180,speed:72,radius:14},runewitch:{hp:107,speed:44,radius:12}};
function waveName(n){if(n>=21)return n===35?'O CAVALEIRO INOMINÁVEL · PACTO DRACÔNICO':n===30?'JARL DO GELO · RETORNO DO INVERNO':n===25?'JARL DO GELO · FÚRIA DA TEMPESTADE':['','FLORESTA DOS DRAUGRS','CAÇADA DOS LOBOS GLACIAIS','BERSERKERS AMALDIÇOADOS','RITUAL DAS FEITICEIRAS'][Math.min(4,n-20)]||'INVERNO ETERNO';if(n===20)return 'PECADO · O DEVORADOR DAS RAÍZES';if(n===15)return 'TSUKUOMI · SENHORA DO ECLIPSE';if(n===10)return 'REUNI · SENHOR DO SANGUE';if(n%5===0)return 'O SAMURAI ONI DESPERTA';const m=n%5;return m===4?'ONDA DOS ESPÍRITOS':m===3?'INVASÃO YOKAI':m===2?'CAÇADA DAS BESTAS':'INVASÃO ONI';}
function randEnemyType(){
 const r=Math.random();
 if(isNordic()){if(localNordicWave()===1)return r<.67?'draugr':'frostwolf';if(localNordicWave()===2)return r<.50?'frostwolf':r<.80?'draugr':'berserker';if(localNordicWave()===3)return r<.42?'berserker':r<.70?'draugr':'runewitch';return r<.35?'runewitch':r<.64?'frostwolf':r<.86?'berserker':'draugr';}
 if(stage<=2)return r<.68?'walker':'runner';
 if(stage<=4)return r<.5?'walker':r<.8?'runner':'caster';
 if(stage<=6)return r<.43?'walker':r<.66?'runner':r<.84?'ghost':'caster';
 if(stage<=9){const m=stage%5;return m===3?(r<.53?'yokai':r<.8?'ghost':'caster'):m===4?(r<.53?'ghost':r<.8?'yokai':'beast'):r<.27?'walker':r<.52?'runner':r<.78?'ghost':'beast';}
 if(stage%5===4)return r<.34?'ghost':r<.67?'yokai':'beast';
 if(stage%5===3)return r<.38?'yokai':r<.64?'caster':r<.84?'ghost':'beast';
 return r<.17?'walker':r<.32?'runner':r<.50?'caster':r<.68?'ghost':r<.84?'beast':'yokai';
}
function addMob(type,x,y,elite=false,bossSummon=false){
 const base=MOB_STATS[type]||MOB_STATS.walker;
 const factor=isNordic()?(2.15+(localNordicWave()-1)*.16):(1+(stage-1)*.19);let hp=base.hp*factor*(isPecador()?1.5:1)*(elite?1.72:1)*(bossSummon?.66:1);
 const e={id:nextEnemyId++,type,x,y,hp,maxHp:hp,elite,bossSummon,
  speed:base.speed*(1+(isNordic()?.09*localNordicWave():Math.min(stage,24)*.019))*(isPecador()?1.16:1)*(elite?1.12:1),radius:base.radius+(elite?1:0),attack:rand(.85,2.15),hurt:0,step:rand(0,6),face:'down',windup:0,chargeTime:0,chargeDir:{x:0,y:1},hitCharge:false,phase:rand(0,6)};
 enemies.push(e);return e;
}
function spawnStage(){
 enemies=[];projectiles=[];slashes=[];rings=[];particles=[];dashShadows=[];shadowClones=[];hazards=[];frostBursts=[];healthDrops=[];bonusBeam=null;xansBlasters=[],timeFields=[],mirrorIllusions=[],voidCollapse=0;bossMessage='';bossMessageTimer=0;waveClearTimer=-1;dashGhostTimer=0;eclipseTime=0;
 phase='play';damageFloats=[];$('fallenScreen').classList.add('hidden');$('rewardScreen').classList.add('hidden');$('waitingCards').classList.add('hidden');$('gameOverScreen').classList.add('hidden');
 player.x=WORLD_W/2;player.y=WORLD_H/2+120;
 player.dashTime=0;player.darkAuraTime=0;player.ultimateTime=0;player.ultimateBuffTime=0;player.ultimateBuff='';player.frogTime=0;player.curseTime=0;player.invuln=2;
 player.hp=player.hp<=0?Math.ceil(player.maxHp*.5):Math.min(player.maxHp,player.hp+player.betweenHeal);player.ghost=false;
 if(coop.active&&coop.host){let teamIndex=0;const allyCount=coop.allies.size;for(const [aid,a] of coop.allies){const angle=(teamIndex+++.5)*Math.PI*2/Math.max(allyCount,1);a.x=player.x+Math.cos(angle)*62;a.y=player.y+Math.sin(angle)*62;a.hp=a.hp<=0?Math.ceil(a.maxHp*.5):Math.min(a.maxHp,a.hp+a.betweenHeal);a.ghost=false;a.invuln=2;a.skillCd=0;a.dashCd=0;a.darkAuraTime=0;a.ultimateTime=0;a.ultimateBuffTime=0;a.curseTime=0;a.secondaryCharging=false;}}
 camera.x=clamp(player.x-W/2,0,WORLD_W-W);camera.y=clamp(player.y-H/2,0,WORLD_H-H);
 waveIntro=2.3;YG_AUDIO.play('waveStart',.8);
 const isBoss=stage%5===0;const bossType=stage===35?'nameless':(stage===25||stage===30)?'frostjarl':stage===20?'pecado':stage===15?'tsukuomi':stage===10?'reuni':'boss';
 const total=testBossMode?0:isNordic()?(isBoss?5:Math.min(isPecador()?19:14,5+localNordicWave()+(isPecador()?3:0))):isBoss?(stage===20?12:stage===15?2:stage===10?4:3):Math.min(isPecador()?23:18,3+Math.floor(stage*1.02)+(isPecador()?3:0));
 for(let i=0;i<total;i++){
  const pos=spawnAroundPlayer(120,270);
  const type=isBoss&&stage===15?(i%2?'beast':'ghost'):randEnemyType();
  const elite=!isBoss&&stage>=7&&Math.random()<Math.min(.33,.06+stage*.014);
  addMob(type,pos.x,pos.y,elite);
 }
 if(isBoss){
  YG_AUDIO.play('bossWarning',1.1);
  let pos=spawnAroundPlayer(120,170);
  if(bossType==='frostjarl'){
   const side=Math.random()<.5?-1:1;
   pos={x:clamp(player.x+side*105,110,WORLD_W-110),y:clamp(player.y+55,180,WORLD_H-110)};
  }
  const hp=(bossType==='nameless'?7200:bossType==='frostjarl'?(stage===30?9500:8200):bossType==='pecado'?11200:bossType==='tsukuomi'?5100:bossType==='reuni'?3600:1500+stage*120)*(isPecador()?1.65:1)*(coop.active&&coop.host?1+0.68*(coop.allies.size):1);
  const e={id:nextEnemyId++,type:bossType,x:pos.x,y:pos.y,hp,maxHp:hp,
   speed:(bossType==='nameless'?93:bossType==='frostjarl'?65:bossType==='pecado'?86:bossType==='tsukuomi'?77:bossType==='reuni'?100:38+stage*.8)*(isPecador()?1.14:1),
   radius:bossType==='nameless'?28:bossType==='frostjarl'?32:bossType==='pecado'?25:bossType==='tsukuomi'?19:bossType==='reuni'?20:23,attack:bossType==='nameless'?1.3:bossType==='frostjarl'?1.2:bossType==='pecado'?1.05:bossType==='tsukuomi'?1.12:bossType==='reuni'?1.0:1.35,
   hurt:0,step:0,phase:0,walking:false,attackPose:0,face:'down',mode:'walk',specialIndex:0,rage:false,guardTime:0,
   chargeTime:0,chargeDir:{x:0,y:1},counterCd:0,summonTimer:bossType==='pecado'?4.8:bossType==='tsukuomi'?5.5:4.1,windup:0,corruptionPhase:0};
  enemies.push(e);
  bossMessage=bossType==='nameless'?'O CAVALEIRO CUJO NOME NÃO PODE SER MENCIONADO':bossType==='frostjarl'?'JARL DO GELO · O REI DA TEMPESTADE':bossType==='pecado'?'PECADO · O FIM DAS SETE RAÍZES':bossType==='tsukuomi'?'TSUKUOMI · A VOZ DA LUA':bossType==='reuni'?'REUNI · SENHOR DO SANGUE':'DAIMYŌ ONI · SENHOR DOS ONIS';
  bossMessageTimer=3;
 }
 updateHud();
}
function spawnAroundPlayer(minD,maxD){
 let x,y;for(let tries=0;tries<65;tries++){
  let a=rand(0,TAU),d=rand(minD,maxD);
  x=clamp(player.x+Math.cos(a)*d,100,WORLD_W-100);
  y=clamp(player.y+Math.sin(a)*d,160,WORLD_H-105);
  if(Math.hypot(x-player.x,y-player.y)>=minD*.8)break;
 }
 return {x,y};
}
function start(type, bossTest=false, frogTest=false){selectedBoss=null;activeCampaign=bossTest==='nordic'||bossTest==='frostjarl'||bossTest==='nameless'?'nordic':bossTest&&bossTest!=='japan'?'japan':selectedCampaign;testBossMode=!!bossTest&&!['nordic','japan'].includes(bossTest);player=createPlayer(type);if(activeCampaign==='nordic')grantNordicStarter(player);if(coop.active&&coop.host)coop.hostAvatar=player;if(type==='kris'&&frogTest){player.frogSkill=true;player.cards.push('frog');}stage=bossTest==='nordic'?21:bossTest==='frostjarl'?25:bossTest==='nameless'?35:bossTest==='pecado'?20:bossTest==='tsukuomi'?15:(bossTest==='reuni'?10:(bossTest==='samurai'?5:(activeCampaign==='nordic'?21:1)));essence=0;elapsed=0;flash=0;mouseAim=null;keys.clear();$('titleScreen').classList.add('hidden');$('selectScreen').classList.add('hidden');$('bossScreen').classList.add('hidden');$('supremeScreen').classList.add('hidden');$('bossScreen').classList.add('hidden');$('gameOverScreen').classList.add('hidden');$('hud').style.display='flex';$('mobileControls').style.display='';document.body.classList.add('is-playing');adaptViewport();YG_AUDIO.play('choose');if(coop.active&&coop.host)coopInitAllies();
 if(coop.active&&!coop.host){
   phase='play';enemies=[];projectiles=[];hazards=[];healthDrops=[];shadowClones=[];slashes=[];rings=[];
   camera.x=clamp(player.x-W/2,0,WORLD_W-W);camera.y=clamp(player.y-H/2,0,WORLD_H-H);
   waveIntro=0;updateHud();
 }else {spawnStage();if(activeCampaign==='nordic'&&stage===21){bossMessage='20 CARTAS RÚNICAS SORTEADAS · PODER NÓRDICO ATIVO';bossMessageTimer=4.2;}}}
function makeParticles(x,y,color,n=8,force=1){
 const cap=minimalFx()?45:lowFx()?100:220;if(particles.length>=cap)return;
 n=Math.min(n,minimalFx()?3:lowFx()?7:22,cap-particles.length);
 for(let i=0;i<n;i++){let a=rand(0,TAU),s=rand(18,64)*force;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.65),max:.65,size:rand(1,3),color});}
}
// Damage numbers are pooled per target and positioned IN THE WORLD, close to
// the damaged actor. They are never screen-centered or allowed to pile up.
function textPop(x,y,str,color='#fff',targetId=null){
 const value=String(str),m=/^([+-]?)(\d+)(!)?$/.exec(value);
 if(m){
  const key=targetId===null?`at:${Math.round(x/19)}:${Math.round(y/19)}`:`target:${targetId}`;
  const now=performance.now(),number=(m[1]==='-'?-1:1)*Number(m[2]);
  let old=damageFloats.find(p=>p.key===key&&now-p.at<145);
  if(old){old.amount+=number;old.crit ||= !!m[3];old.color=color;old.at=now;
   old.life=Math.min(.8,old.life+.07);old.x=x;old.y=y;return;}
  if(damageFloats.length>=18)damageFloats.shift();
  damageFloats.push({key,x,y,dx:rand(-15,15),amount:number,crit:!!m[3],color,life:.72,max:.72,at:now});return;
 }
 if(particles.length<240)particles.push({x,y,vx:rand(-7,7),vy:-27,life:.65,max:.65,text:value,color});
}
function updateDamageFloats(dt){for(let i=damageFloats.length-1;i>=0;i--){damageFloats[i].life-=dt;if(damageFloats[i].life<=0)damageFloats.splice(i,1);}}
function drawDamageFloats(){
 ctx.save();ctx.textAlign='center';ctx.font='bold 10px system-ui';ctx.lineWidth=2.6;ctx.strokeStyle='#130b20';
 for(const n of damageFloats){
  if(n.x<camera.x-30||n.x>camera.x+W+30||n.y<camera.y-45||n.y>camera.y+H+20)continue;
  ctx.globalAlpha=Math.min(1,n.life*2.2);
  const x=n.x+n.dx,y=n.y-(1-n.life/n.max)*26;
  const value=(n.amount<0?'-':'')+Math.round(Math.abs(n.amount))+(n.crit?'!':'');
  ctx.strokeText(value,x,y);ctx.fillStyle=n.color;ctx.fillText(value,x,y);
 }
 ctx.restore();
}
// The host keeps its real avatar even while temporarily resolving a guest's attack.
function coopLivingHeroes(){
 if(!coop.active||!coop.host)return player&&player.hp>0?[player]:[];
 const roster=[coop.hostAvatar||player,...coop.allies.values()];
 return roster.filter(p=>p&&p.hp>0);
}
function nearestLivingHero(e){
 const alive=coopLivingHeroes();let target=null,nearest=Infinity;
 for(const p of alive){const d=(e.x-p.x)**2+(e.y-p.y)**2;if(d<nearest){nearest=d;target=p;}}
 return target;
}
function slash(x,y,ang,r,color){slashes.push({x,y,ang,r,color,life:.15,max:.15});shake=Math.max(shake,1.5)}
function ring(x,y,r,color){rings.push({x,y,r,life:.44,max:.44,color})}
function hitEnemy(e,dmg,chargesSupreme=false,trueDamage=false){if(e.hp<=0)return;if(e.type==='nameless'&&(e.dragonIntro||0)>0)return;let isCrit=!trueDamage&&Math.random()<Math.min(.95,player.crit+(player.type==='cross'&&player.ultimateBuff==='cross'&&player.ultimateBuffTime>0?.27:0)),amount=dmg*(isCrit?1.7:1)*(player.curseTime>0&&!trueDamage?.62:1)*(player.dragonPact&&player.ultimateBuffTime>0?1.18:1)*(e.corruptTime>0&&!trueDamage?1.16:1)*(player.type==='cross'&&player.ultimateBuff==='cross'&&player.ultimateBuffTime>0?1.35:1);if(!trueDamage&&Math.random()<player.echo)amount*=1.6;if(isBossEnemy(e)&&!trueDamage)amount=Math.min(amount,e.maxHp*.04);if(!trueDamage&&e.type==='boss'&&e.mode==='guard'&&e.guardTime>0){amount*=.3;if(e.counterCd<=0&&dist(e,player)<62){e.counterCd=1.25;ring(e.x,e.y,60,'#ff5374');bossMessage='CONTRA-ATAQUE DO SHOGUN';bossMessageTimer=.8;hurtPlayer(e.rage?25:18);}}if(e.type==='nameless'&&(e.pactBroken||0)>0)amount*=1.2;e.hp-=amount;e.hurt=.14;if(player.type==='cross'&&e.hp>0&&e.hp<=e.maxHp*.5&&!e.corruptTime){e.corruptTime=5.5;e.slow=Math.max(e.slow||0,1.2);textPop(e.x,e.y-28,'CORROMPIDO','#c89cff');ring(e.x,e.y,27,'#8344af');}YG_AUDIO.play(isBossEnemy(e)?'heavyHit':'hit',isCrit?1.2:.82);if(chargesSupreme&&player.ultimateTime<=0&&player.ultimateBuffTime<=0)player.ultimateCharge=Math.min(100,player.ultimateCharge+(player.type==='eve'?(isBossEnemy(e)?4.5:3.0):(isBossEnemy(e)?12:9)));textPop(e.x,e.y-12,Math.round(amount)+(isCrit?'!':''),isCrit?'#ffd67b':'#f0ccdc',e.id);makeParticles(e.x,e.y,player.type==='loid'?'#ae7de3':player.type==='cross'?'#b167ef':'#709cff',4);if(e.hp<=0){if(e.type==='runeSeal'){const boss=enemies.find(n=>n.type==='nameless'&&n.hp>0);if(boss){boss.sealsBroken=(boss.sealsBroken||0)+1;if(boss.sealsBroken>=3){boss.pactBroken=5;boss.stunTime=5;boss.sealsBroken=0;bossMessage='PACTO QUEBRADO · DRAGÃO SILENCIADO!';bossMessageTimer=3;}}}YG_AUDIO.play(isBossEnemy(e)?'bossDefeat':'oniDeath',e.type==='boss'?1.2:.65);player.kills++;essence+=isBossEnemy(e)?150:10;makeParticles(e.x,e.y,isBossEnemy(e)?'#e4b7ff':'#b1519d',18,1.3);player.hp=Math.min(player.maxHp,player.hp+player.onKillHeal);if(!isBossEnemy(e)&&Math.random()<.05&&healthDrops.length<35){healthDrops.push({x:e.x,y:e.y,amount:12,life:16,phase:Math.random()*6.28});}if(isBossEnemy(e)){if(e.type==='nameless'&&!player.cards.includes('dragonPact')){player.cards.push('dragonPact');player.dragonPact=true;bossMessage='CARTA LENDÁRIA · PACTO DO DRAGÃO';bossMessageTimer=4;}player.hp=player.maxHp;if(coop.active&&coop.host){const host=coop.hostAvatar||player;host.hp=host.maxHp;host.ghost=false;for(const ally of coop.allies.values()){ally.hp=ally.maxHp;ally.ghost=false;}}textPop(player.x,player.y-31,'VIDA RESTAURADA!','#b5ffad');hazards=[];eclipseTime=0;for(const add of enemies){if(add!==e&&!isBossEnemy(add))add.hp=0;}bossMessage=e.type==='nameless'?'CAVALEIRO INOMINÁVEL DERROTADO!':e.type==='frostjarl'?'JARL DO GELO DERROTADO!':e.type==='pecado'?'PECADO DERROTADO!':e.type==='tsukuomi'?'TSUKUOMI DERROTADA!':e.type==='reuni'?'REUNI DERROTADO!':'DAIMYŌ ONI DERROTADO!';bossMessageTimer=2.4;}}}

// Card-exclusive, one-use frog form: the next attack performs a shadow-frog leap.
function frogSmash(){
 if(!player||player.type!=='kris'||player.frogTime<=0)return;
 player.frogTime=0;player.frogSkill=false;player.skillCd=0;player.atkTime=.7;player.invuln=Math.max(player.invuln,.62);
 const a=player.aim;player.x+=Math.cos(a)*58;player.y+=Math.sin(a)*58;applyBoundaries(player,8);
 ring(player.x,player.y,76,'#83ff9c');makeParticles(player.x,player.y,'#62d9a8',40,1.25);
 slash(player.x,player.y,a,72,'#8dffb0');YG_AUDIO.play('bossEclipse',1.2);
 let strikes=0;
 for(const e of enemies){if(e.hp<=0||dist(e,player)>82+e.radius)continue;
  if(isBossEnemy(e))hitEnemy(e,e.maxHp*.25,false,true);
  else hitEnemy(e,e.hp+10000,false,true);
  strikes++;
 }
 bossMessage=strikes?'SALTO DO SAPO · IMPACTO ABSOLUTO':'SALTO DO SAPO · USADO';bossMessageTimer=2.1;
 updateHud();
}

function attack(){if(coop.active&&!coop.host&&!coop.executing){
  if(!player||player.hp<=0||phase!=='play'||player.atkTime>0)return;
  // Local prediction draws ONLY the swing: damage, buffs, charges and kills stay on host.
  player.atkTime=player.attackDelay;
  slash(player.x+Math.cos(player.aim)*player.reach*.55,player.y+Math.sin(player.aim)*player.reach*.55,player.aim,player.reach,player.type==='cross'?'#b97aff':player.type==='loid'?'#d9a4ff':'#7592ff');
  coopAction('attack');YG_AUDIO.play('hit',.55);return;
 }if(!player||player.hp<=0||phase!=='play'||player.atkTime>0)return;if(player.type==='kris'&&player.frogTime>0){frogSmash();return;}player.atkTime=player.attackDelay;player.attackCount++;let amp=(player.transformTime>0?1+player.transformAmp:1)*(player.ultimateBuffTime>0&&player.ultimateBuff==='fight'?2:1);let a=player.aim,range=player.reach*(player.transformTime>0?1.18:1),cx=player.x+Math.cos(a)*range*.55,cy=player.y+Math.sin(a)*range*.55;
if(player.type!=='kali')slash(cx,cy,a,range,player.type==='loid'?'#d9a4ff':player.type==='cross'?'#b97aff':player.transformTime>0?'#ff73ec':'#7592ff');YG_AUDIO.play(player.type==='loid'?'loidSlash':'krisSlash',.95);let struck=0;for(const e of enemies){if(e.hp<=0)continue;let dx=e.x-player.x,dy=e.y-player.y,ed=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(angle-a),Math.cos(angle-a));if(player.type!=='kali'&&ed<range+e.radius&&Math.abs(diff)<player.arc/2+e.radius/Math.max(20,ed)){hitEnemy(e,player.damage*amp,true);struck++;}}
if(player.type==='kali'){const vec={x:Math.cos(a),y:Math.sin(a)};projectiles.push({x:player.x+vec.x*15,y:player.y+vec.y*15-9,vx:vec.x*300,vy:vec.y*300,damage:player.damage*(player.mirrorAmp||1),from:'player',r:9,life:.86,color:'#e7c4ff',mirror:true,ownerId:coop.active?coop.id:null});YG_AUDIO.play('mirrorCast',.76);makeParticles(player.x+vec.x*20,player.y+vec.y*20-9,'#efc4ff',6,.55);}if(player.type==='kris'&&player.transformTime>0&&player.waveAttack){let vec={x:Math.cos(a),y:Math.sin(a)};projectiles.push({x:player.x+vec.x*15,y:player.y+vec.y*15,vx:vec.x*170,vy:vec.y*170,damage:player.damage*.65,from:'player',r:5,life:1.1,color:'#b572ff'})}
if(player.ultimateBuffTime>0&&player.ultimateBuff==='itens'&&player.type==='kris'){
 // A second synchronized black sword: actual hit registration and an additional visual slash.
 slash(cx+Math.cos(a+1.3)*9,cy+Math.sin(a+1.3)*9,a+.16,range*.95,'#b76fff');
 for(const e of enemies){if(e.hp<=0)continue;let dx=e.x-player.x,dy=e.y-player.y,ed=Math.hypot(dx,dy),diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));if(ed<range+e.radius&&Math.abs(diff)<player.arc/2+e.radius/Math.max(20,ed))hitEnemy(e,player.damage*amp*.75,true);}
 }
 if(player.type==='loid'&&struck)makeParticles(cx,cy,'#924ac8',3);}
function dash(){if(coop.active&&!coop.host&&!coop.executing){
   if(!player||player.hp<=0||phase!=='play'||player.dashCd>0)return;
   const mv=getMove(),a=Math.hypot(mv.x,mv.y)>.1?Math.atan2(mv.y,mv.x):player.aim;
   player.dashV={x:Math.cos(a),y:Math.sin(a)};player.dashTime=.22;
   player.dashCd=player.type==='loid'&&player.ultimateTime>0?.07:player.dashDelay;
   player.invuln=.36;if(player.type==='eve'){const tx=clamp(player.x+Math.cos(a)*129,48,WORLD_W-48),ty=clamp(player.y+Math.sin(a)*129,48,WORLD_H-48);evePortals.push({ox:player.x,oy:player.y,tx,ty,life:1.25,max:1.25});}coopAction('dash');YG_AUDIO.play('dash',.65);return;
 }if(phase!=='play'||player.hp<=0||player.dashCd>0)return;YG_AUDIO.play('dash');let mv=getMove();let v=Math.hypot(mv.x,mv.y)>.1?norm(mv.x,mv.y):{x:Math.cos(player.aim),y:Math.sin(player.aim)};player.dashV=v;player.dashTime=.22;player.dashCd=player.type==='loid'&&player.ultimateTime>0?.07:player.dashDelay;player.invuln=.36;if(player.type==='eve'){const ox=player.x,oy=player.y,tx=clamp(ox+v.x*129,48,WORLD_W-48),ty=clamp(oy+v.y*129,48,WORLD_H-48);evePortals.push({ox,oy,tx,ty,life:1.25,max:1.25});ring(ox,oy,27,'#7145ba');ring(tx,ty,27,'#b285ff');}if(player.type==='loid'){dashGhostTimer=0;dashShadows.push({x:player.x,y:player.y,face:player.face,step:player.step,life:.34,max:.34});}makeParticles(player.x,player.y,player.type==='loid'?'#27112f':'#518cff',16);}
// Xans Q: TRUE blink. Stay at origin, instantly appear at the target, hit,
// then instantly return. No dash interpolation. Clients receive the same phases.
function crossTeleport(){
 const targets=enemies.filter(e=>e.hp>0&&e.x>camera.x-15&&e.x<camera.x+W+15&&e.y>camera.y-15&&e.y<camera.y+H+15);
 if(!targets.length){bossMessage='NENHUM INIMIGO À VISTA';bossMessageTimer=1;return false;}
 targets.sort((a,b)=>(isBossEnemy(b)?100000:0)+b.maxHp-(isBossEnemy(a)?100000:0)-a.maxHp);
 const target=targets[0],ox=player.x,oy=player.y;
 const v=norm(target.x-ox,target.y-oy);
 const tx=clamp(target.x-v.x*(target.radius+20),108,WORLD_W-108);
 const ty=clamp(target.y-v.y*(target.radius+20),163,WORLD_H-111);
 player.crossTp={ox,oy,tx,ty,elapsed:0,total:.42,targetId:target.id,hit:false};
 player.invuln=Math.max(player.invuln,.47);
 ring(ox,oy,24,'#a36bff');ring(tx,ty,24,'#a36bff');
 makeParticles(ox,oy,'#9a66e8',9);
 bossMessage='Q · TELEPORTE CORRUPTO';bossMessageTimer=1;
 return true;
}
function updateCrossTeleport(p,dt){
 const t=p.crossTp;if(!t)return false;
 const was=t.elapsed;
 t.elapsed=Math.min(t.total,t.elapsed+dt);
 const k=t.elapsed;
 // Position snaps, never travels across the intervening distance.
 if(k<.09){p.x=t.ox;p.y=t.oy;}
 else if(k<.27){p.x=t.tx;p.y=t.ty;}
 else{p.x=t.ox;p.y=t.oy;}
 if(was<.09&&k>=.09){makeParticles(t.tx,t.ty,'#aa65ed',10);ring(t.tx,t.ty,22,'#b67fff');}
 if(k>=.09&&!t.hit){
   t.hit=true;
   const e=enemies.find(e=>e.id===t.targetId);
   if(e&&e.hp>0){const prev=player;player=p;
    p.aim=Math.atan2(e.y-p.y,e.x-p.x);
    slash(p.x,p.y,p.aim,65,'#cc80ff');hitEnemy(e,p.damage*2.9,true);if(!p.crossChain||p.crossChain.used.length<=1)e.stunTime=Math.max(e.stunTime||0,isBossEnemy(e)?.8:2);
    player=prev;ring(e.x,e.y,39,'#ae68ff');makeParticles(e.x,e.y,'#c989ff',13);
   }
   YG_AUDIO.play('loidSlash',1.25);
 }
 if(was<.27&&k>=.27){makeParticles(t.ox,t.oy,'#9a66e8',10);ring(t.ox,t.oy,25,'#b67fff');}
 if(k>=t.total){p.x=t.ox;p.y=t.oy;p.crossTp=null;}
 return true;
}
function drawEvePortals(){
 if(!evePortals.length)return;
 evePortals=evePortals.filter(f=>(f.life-=1/Math.max(24,visibleFps||60))>0);
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const fx of evePortals){const prog=1-fx.life/fx.max,frame=prog<.2?0:prog<.4?1:prog<.8?2:3;const art=EVE_PORTAL_FRAMES[frame];
   const size=76+Math.sin(elapsed*12)*5;
   ctx.globalAlpha=Math.min(.92,fx.life/.18);
   for(const [x,y] of [[fx.ox,fx.oy],[fx.tx,fx.ty]]){
    if(art?.complete&&art.naturalWidth)ctx.drawImage(art,x-size/2,y-size/2,size,size);
    else{ctx.strokeStyle='#a679ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,size*.28,size*.39,0,0,TAU);ctx.stroke();}
   }
 }
 ctx.restore();
}
function drawXansPortals(){
 const actors=coop.active?[player,...coop.allies.values()]:[player];
 for(const a of actors){if(!a||a.type!=='cross'||!a.crossTp)continue;
  const t=a.crossTp,alpha=Math.min(1,Math.max(0,Math.min(t.elapsed/.08,(t.total-t.elapsed)/.1)));
  ctx.save();ctx.globalAlpha=alpha*.8;
  for(const pos of [[t.ox,t.oy],[t.tx,t.ty]]){
   ctx.strokeStyle='#bd7bff';ctx.lineWidth=2.5;ctx.shadowColor='#8b40d9';ctx.shadowBlur=lowFx()?0:8;
   ctx.beginPath();ctx.ellipse(pos[0],pos[1]-12,16+Math.sin(elapsed*14)*2,21,0,0,TAU);ctx.stroke();
   ctx.beginPath();ctx.ellipse(pos[0],pos[1]-12,7,13,0,0,TAU);ctx.stroke();
  }
  ctx.restore();
 }
}
const CROSS_BONES=[
 {name:'branco',color:'#fff9ec',mult:.62},
 {name:'azul',color:'#6acbff',mult:.48},
 {name:'laranja',color:'#ff9b4b',mult:.54}
];
function crossBone(){
 let angle=player.aim;
 const visible=enemies.filter(e=>e.hp>0&&e.x>camera.x-30&&e.x<camera.x+W+30&&e.y>camera.y-30&&e.y<camera.y+H+30);
 if(visible.length&&!mouseAim){visible.sort((a,b)=>dist(a,player)-dist(b,player));angle=Math.atan2(visible[0].y-player.y,visible[0].x-player.x);}
 // Nine bones are spawned over time, instead of one enormous instantaneous effect.
 player.boneVolley={left:9,next:0,index:0,angle};
 makeParticles(player.x,player.y,'#ac76ff',12);YG_AUDIO.play('oniCast',.95);
 bossMessage='E · CHUVA DE OSSOS';bossMessageTimer=1.1;
}
function updateCrossBones(p,dt,ownerId=coop.id){
 const v=p.boneVolley;if(!v)return;
 v.next-=dt;
 while(v.left>0&&v.next<=0){
  const bone=CROSS_BONES[Math.floor(Math.random()*CROSS_BONES.length)];
  const offset=(v.index-4)*.075+(Math.random()-.5)*.065;
  const a=v.angle+offset;
  const vx=Math.cos(a),vy=Math.sin(a),speed=235+Math.random()*40;
  projectiles.push({x:p.x+vx*13,y:p.y+vy*13-9,vx:vx*speed,vy:vy*speed,damage:p.damage*bone.mult,from:'player',ownerId,bone:bone.name,r:5,life:1.65,color:bone.color});
  v.index++;v.left--;v.next+=.072;
  if(v.index%3===1)makeParticles(p.x,p.y,'#b88af9',3,.6);
 }
 if(v.left<=0)p.boneVolley=null;
}
function cardPower(){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('f');return;}
 if(!player||phase!=='play'||!player.cardPower||player.cardPowerUsed)return;
 if(player.cardPower==='granita'&&player.ultimateCharge<50){bossMessage='GRANITA · PRECISA DE 50% DE ENERGIA';bossMessageTimer=1.5;return;}
 player.cardPowerUsed=true;
 const power=player.cardPower;
 const target=enemies.filter(e=>e.hp>0&&e.x>camera.x-15&&e.x<camera.x+W+15&&e.y>camera.y-15&&e.y<camera.y+H+15).sort((a,b)=>dist(a,player)-dist(b,player))[0];
 const aim=mouseAim?Math.atan2(mouseAim.y-player.y,mouseAim.x-player.x):target?Math.atan2(target.y-player.y,target.x-player.x):player.aim;
 if(power==='granita')player.ultimateCharge-=50;
 const length=power==='gaster'?470:420,width=power==='gaster'?44:63;
 // Gaster has a visible skull summoning phase and a separate beam firing phase.
 bonusBeam={x:player.x,y:player.y,a:aim,length,width,life:power==='gaster'?1.72:1.05,max:power==='gaster'?1.72:1.05,kind:power,ownerId:coop.actorId||coop.id,applied:false,windup:power==='gaster'?.40:.09};
 YG_AUDIO.play('bossEclipse',1.3);ring(player.x,player.y,88,power==='gaster'?'#b8a0ff':'#f8f8ff');shake=7;
 bossMessage=power==='gaster'?'GASTER BLASTER · CAVEIRA INVOCADA':'F · DESCARGA DE GRANITA';bossMessageTimer=2.2;
 updateHud();
}
function updateCardBeam(dt){
 if(!bonusBeam)return;
 const b=bonusBeam;
 b.life=Math.max(0,b.life-dt);
 if(!b.applied&&b.max-b.life>=b.windup){
  b.applied=true;
  const previous=player;if(coop.active&&coop.host&&b.ownerId&&b.ownerId!==coop.id)player=coop.allies.get(b.ownerId)||player;
  const dx=Math.cos(b.a),dy=Math.sin(b.a);
  for(const e of enemies){if(e.hp<=0)continue;
   const ex=e.x-b.x,ey=e.y-b.y,along=ex*dx+ey*dy,side=Math.abs(ex*dy-ey*dx);
   if(along>=-25&&along<=b.length+e.radius&&side<b.width+e.radius){
    hitEnemy(e,isBossEnemy(e)?Math.max(player.damage*8,e.maxHp*(b.kind==='gaster'?.18:.23)):e.hp+500,false,true);
   }
  }
  player=previous;
  makeParticles(b.x,b.y,b.kind==='gaster'?'#d1a8ff':'#fafafa',20,1.1);
  shake=8;
 }
 if(b.life<=0)bonusBeam=null;
}
const GASTER_SKULL=new Image();GASTER_SKULL.src='assets/effects/gaster_skull.png';
function drawCardBeam(){
 if(!bonusBeam)return;
 const b=bonusBeam,age=b.max-b.life,fire=age>=b.windup;
 const f=Math.min(1,b.life/.35),pulse=.92+Math.sin(elapsed*28)*.08;
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);
 // Skull spawns BEHIND Cross and remains visible throughout the attack.
 const skullSize=b.kind==='gaster'?95:0;
 if(b.kind==='gaster'){
  ctx.save();ctx.translate(-43,-23);
  ctx.globalAlpha=Math.min(1,age/.17)*Math.min(1,b.life/.23);
  ctx.shadowColor='#b25dff';ctx.shadowBlur=9;
  if(GASTER_SKULL.complete&&GASTER_SKULL.naturalWidth)ctx.drawImage(GASTER_SKULL,-skullSize/2,-skullSize/2,skullSize,skullSize);
  ctx.restore();
 }
 if(fire){
  ctx.globalAlpha=f;
  ctx.shadowColor=b.kind==='gaster'?'#ab68ff':'#eeeaff';ctx.shadowBlur=15;
  ctx.fillStyle=b.kind==='gaster'?'#6130a0':'#17101c';
  ctx.fillRect(10,-b.width*.82,b.length,b.width*1.64);
  ctx.fillStyle=b.kind==='gaster'?'#d5b6ff':'#f4f4fb';
  ctx.fillRect(12,-b.width*.44,b.length-3,b.width*.88*pulse);
  ctx.fillStyle='#ffffff';ctx.fillRect(14,-b.width*.16,b.length-8,b.width*.32);
  ctx.shadowBlur=0;
  for(let j=0;j<9;j++){const pos=(j/9*b.length+elapsed*195)%b.length;
   ctx.fillStyle=j%2?'#d1aaff':'#f6f1ff';ctx.fillRect(20+pos,-b.width*.52+(j%3)*b.width*.5,7,3);
  }
 }else if(b.kind==='gaster'){
  ctx.globalAlpha=.6;ctx.strokeStyle='#b386fd';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(-15,0,32+Math.sin(elapsed*20)*4,0,TAU);ctx.stroke();
 }
 ctx.restore();
}

// V26: World-affecting abilities are calculated on the authoritative host.
function applyTimeFields(dt){
 for(let i=timeFields.length-1;i>=0;i--){const t=timeFields[i];t.life-=dt;if(t.life<=0){timeFields.splice(i,1);continue;}
  t.tick=(t.tick??.65)-dt;
  const pulse=t.tick<=0;if(pulse)t.tick+=.9;
  for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-t.x,e.y-t.y)<t.radius){
   e.timeSlow=Math.max(e.timeSlow||0,0.10);
   if(pulse){const prev=player;player=(coop.active&&coop.host&&t.ownerId&&t.ownerId!==coop.id)?(coop.allies.get(t.ownerId)||player):player;hitEnemy(e,Math.min(6,player.damage*.12),false,true);player=prev;}
  }
  for(const p of projectiles)if(p.from==='enemy'&&Math.hypot(p.x-t.x,p.y-t.y)<t.radius){p.timeSlow=0.25;}
 }
 for(const e of enemies)if(e.timeSlow!==undefined){e.timeSlow=Math.max(0,e.timeSlow-dt*0.8);}
 for(const p of projectiles)if(p.timeSlow!==undefined){p.timeSlow=Math.min(1,(p.timeSlow||0)+dt*0.8);}
}
function updateMirrorIllusions(dt){for(let i=mirrorIllusions.length-1;i>=0;i--){let v=mirrorIllusions[i];v.life-=dt;v.attackCd-=dt;
 if(v.life<=0){mirrorIllusions.splice(i,1);continue;}
 const target=enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y))[0];
 if(target&&v.attackCd<=0&&Math.hypot(target.x-v.x,target.y-v.y)<205){v.attackCd=.8;const prev=player;player=v.owner||player;hitEnemy(target,player.damage*.35,true);player=prev;ring(target.x,target.y,14,'#f8a6f5');}
 }}
function kaliMirrorAttack(){const visible=enemies.filter(e=>e.hp>0&&dist(e,player)<210).sort((a,b)=>dist(a,player)-dist(b,player));
 const e=visible[0];if(e){hitEnemy(e,player.damage*(player.mirrorAmp||1),true);slash(e.x,e.y,Math.atan2(e.y-player.y,e.x-player.x),36,'#dfbaff');}
}
function eveVoidCast(){const near=enemies.filter(e=>e.hp>0&&dist(e,player)<155).sort((a,b)=>dist(a,player)-dist(b,player))[0];
 const cx=near?near.x:player.x+Math.cos(player.aim)*68,cy=near?near.y:player.y+Math.sin(player.aim)*68;
 ring(cx,cy,42,'#3a1769');for(const e of enemies){if(e.hp<=0||Math.hypot(e.x-cx,e.y-cy)>45+e.radius)continue;
 if(isBossEnemy(e)){hitEnemy(e,Math.min(e.maxHp*.065,player.damage*23),true,true);}else{hitEnemy(e,e.hp+5,true,true);}}
 makeParticles(cx,cy,'#8b43e9',minimalFx()?3:16);
}
function castEveUltimate(){player.voidUltimate=2.5;player.voidUltTick=0;player.invuln=2.5;voidCollapse=2.5;
 bossMessage='EXPANSÃO DO VAZIO · O MUNDO DESAPARECE';bossMessageTimer=3.0;
 YG_AUDIO.play('bossEclipse',.92);shake=Math.max(shake,4);
 ring(player.x,player.y,230,'#27113a');makeParticles(player.x,player.y,'#9e6aff',minimalFx()?7:28,.85);}

function tickEveUltimate(dt){if(!player||player.type!=='eve'||player.voidUltimate<=0)return;
 player.voidUltimate=Math.max(0,player.voidUltimate-dt);
 if(player.voidUltimate>0&&player.voidUltimate<1.1&&!player.voidUltTick){player.voidUltTick=1;
 let removed=0;
 for(const e of enemies){if(e.hp<=0)continue;
   if(isBossEnemy(e))hitEnemy(e,e.maxHp*.20,true,true);
   else{removed++;makeParticles(e.x,e.y,'#9d69ee',minimalFx()?3:10,.9);hitEnemy(e,e.hp+1,true,true);}
 }
 bossMessage=removed?`EXPANSÃO DO VAZIO · ${removed} CRIATURAS DESINTEGRADAS`:'EXPANSÃO DO VAZIO · IMPACTO NO CHEFE';
 bossMessageTimer=2.2;YG_AUDIO.play('bossDefeat',.6);

 }}
function crossMultiStrike(){const c=player.crossChain;if(!c||c.remaining<=0)return false;
 const targets=enemies.filter(e=>e.hp>0&&!c.used.includes(e.id)).sort((a,b)=>dist(a,player)-dist(b,player));
 if(!targets.length){player.crossChain=null;return false;}
 const e=targets[0],old={x:player.x,y:player.y};if(c.used.length===1){const first=enemies.find(t=>t.id===c.used[0]);if(first)first.stunTime=0;}
 ring(old.x,old.y,14,'#ac7fff');player.x=e.x-18;player.y=e.y-7;
 hitEnemy(e,player.damage*1.15,true);c.used.push(e.id);ring(e.x,e.y,18,'#aa68ff');
 player.x=c.x;player.y=c.y;c.remaining--;c.time=.65;if(!c.remaining)player.crossChain=null;
 return true;
}
function skill(){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('q');return;}if(!player||player.hp<=0||phase!=='play'||(player.skillCd>0&&!(player.type==='cross'&&player.crossChain&&player.crossChain.time>0)))return;
 if(player.type==='cross'){if(player.crossChain&&player.crossChain.time>0){crossMultiStrike();updateHud();return;}if(crossTeleport()){player.skillCd=player.skillDelay;player.crossChain={x:player.x,y:player.y,remaining:5,used:player.crossTp?[player.crossTp.targetId]:[],time:1.2};updateHud();}return;}
 if(player.type==='kali'){player.skillCd=player.skillDelay;const actors=coop.active&&coop.host?[player,...coop.allies.values()]:[player];for(const p of actors){if(dist(p,player)<180)p.mirrorGuard=player.mirrorDuration||4;}ring(player.x,player.y,170,'#e0b8ff');return;}
 if(player.type==='eve'){player.skillCd=player.skillDelay;eveVoidCast();return;}
 if(player.type==='kris'&&player.frogSkill){if(player.frogUsed)return;player.frogUsed=true;player.frogTime=12;player.transformTime=0;player.invuln=.6;ring(player.x,player.y,52,'#8dffa0');makeParticles(player.x,player.y,'#9df6bd',28);bossMessage='FORMA DO SAPO · ATAQUE J PARA SALTAR';bossMessageTimer=2.6;updateHud();return;}
 player.skillCd=player.skillDelay;YG_AUDIO.play(player.type==='loid'?'loidAura':'krisForm',1.13);
 if(player.type==='loid'){
  player.darkAuraTime=player.darkAuraDuration||4.1;player.darkAuraTick=0;
  player.invuln=.55;ring(player.x,player.y,70,'#160c25');
  makeParticles(player.x,player.y,'#33213c',24,.9);
 }else{
  player.transformTime=player.transformDuration;player.invuln=.5;
  makeParticles(player.x,player.y,'#7872ff',32,1.4);ring(player.x,player.y,45,'#8969ff');
 }
 updateHud();
}

// E — Loid summons exactly four hostile dark duplicates. Kris holds E to charge a long-range dimensional slash.
function secondaryDown(){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('eDown');return;}if(!player||player.hp<=0||phase!=='play'||player.secondaryCd>0)return;
 if(player.type==='cross'){player.secondaryCd=player.secondaryDelay;crossBone();}
 else if(player.type==='eve'){player.secondaryCd=player.secondaryDelay;timeFields.push({x:player.x+Math.cos(player.aim)*85,y:player.y+Math.sin(player.aim)*85,radius:105,life:player.timeDuration||5,tick:.65,ownerId:coop.actorId||coop.id});ring(player.x,player.y,120,'#65baff');}
 else if(player.type==='kali'){player.secondaryCd=player.secondaryDelay;const actors=coop.active&&coop.host?[player,...coop.allies.values()]:[player];for(let i=0;i<3;i++){const own=actors[i%actors.length];mirrorIllusions.push({owner:own,x:own.x+Math.cos(i*2.1)*28,y:own.y+Math.sin(i*2.1)*28,life:6,attackCd:.2+i*.12});}ring(player.x,player.y,110,'#d8b5ff');}
 else if(player.type==='loid'){
   player.secondaryCd=player.secondaryDelay;shadowClones=[];
   for(let i=0;i<4;i++){
     const a=TAU*i/4+Math.PI/4;
     shadowClones.push({ownerId:coop.actorId||coop.id,x:clamp(player.x+Math.cos(a)*24,110,WORLD_W-110),y:clamp(player.y+Math.sin(a)*24,161,WORLD_H-108),angle:a,step:0,face:'down',time:8,attackCd:.16+i*.13});
   }
   ring(player.x,player.y,68,'#7c43bb');makeParticles(player.x,player.y,'#412156',30,1.1);
   bossMessage='E · QUATRO SOMBRAS INVOCADAS';bossMessageTimer=1.6;
   YG_AUDIO.play('loidAura',.9);
 }else if(!player.secondaryCharging){
   player.secondaryCharging=true;player.secondaryCharge=0;
   bossMessage='SEGURE E · CORTE DIMENSIONAL';bossMessageTimer=1.1;
 }
 updateHud();
}
function secondaryUp(){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('eUp');return;}if(!player||player.type!=='kris'||!player.secondaryCharging)return;
 const fraction=clamp(player.secondaryCharge/1.6,0,1);
 player.secondaryCharging=false;player.secondaryCharge=0;
 if(phase!=='play'||fraction<.09)return;
 player.secondaryCd=player.secondaryDelay;
 player.atkTime=Math.max(player.atkTime,.34);
 const a=player.aim,length=92+132*fraction,width=17+15*fraction;
 const dirx=Math.cos(a),diry=Math.sin(a);
 let hits=0;
 for(const e of enemies){
   if(e.hp<=0)continue;
   const dx=e.x-player.x,dy=e.y-player.y;
   const along=dx*dirx+dy*diry,perp=Math.abs(dx*diry-dy*dirx);
   if(along>=-4&&along<=length+e.radius&&perp<=width+e.radius){
     hitEnemy(e,player.damage*(1.1+5.7*fraction),true);
     hits++;
   }
 }
 slash(player.x+dirx*length*.58,player.y+diry*length*.58,a,length,'#9bc8ff');
 ring(player.x+dirx*length,player.y+diry*length,width+8,'#b57df5');
 for(let i=0;i<Math.min(50,24+fraction*30);i++){
   let t=rand(0,length), side=rand(-width,width);
   makeParticles(player.x+dirx*t-diry*side,player.y+diry*t+dirx*side,'#9a74fa',1,.9);
 }
 player.invuln=Math.max(player.invuln,.17);
 shake=Math.max(shake,4+fraction*3);YG_AUDIO.play('bossEclipse',1.13);
 bossMessage=hits?`CORTE DIMENSIONAL · ${hits} ALVO(S)`:'CORTE DIMENSIONAL';bossMessageTimer=1.4;
 updateHud();
}
function updateClones(dt){
 for(let i=shadowClones.length-1;i>=0;i--){
   const s=shadowClones[i];const originalPlayer=player;const cloneOwner=coop.active&&coop.host&&s.ownerId!==coop.id?coop.allies.get(s.ownerId):null;if(cloneOwner)player=cloneOwner;s.time-=dt;
   if(s.time<=0){shadowClones.splice(i,1);player=originalPlayer;continue;}
   s.attackCd-=dt;s.step+=dt*10;
   let closest=null,near=Infinity;
   for(const e of enemies){const d=Math.hypot(e.x-s.x,e.y-s.y);if(e.hp>0&&d<near){near=d;closest=e;}}
   if(closest){
     const v=norm(closest.x-s.x,closest.y-s.y);
     if(near>22){s.x+=v.x*158*dt;s.y+=v.y*158*dt;}
     s.face=Math.abs(v.x)>Math.abs(v.y)?(v.x<0?'left':'right'):(v.y<0?'up':'down');
     if(near<36&&s.attackCd<=0){
       s.attackCd=.72+Math.random()*.18;
       slash(s.x+v.x*12,s.y+v.y*12,Math.atan2(v.y,v.x),25,'#7c3aaa');
       hitEnemy(closest,player.damage*.52,true);makeParticles(closest.x,closest.y,'#6a3a9d',3);
     }
   }else{
     const follow={x:player.x+Math.cos(s.angle+elapsed*.8)*38,y:player.y+Math.sin(s.angle+elapsed*.8)*32};
     const v=norm(follow.x-s.x,follow.y-s.y);
     if(Math.hypot(follow.x-s.x,follow.y-s.y)>8){s.x+=v.x*100*dt;s.y+=v.y*100*dt;}
   }
   applyBoundaries(s,8);player=originalPlayer;
 }
}
function drawShadowClone(s){
 const im=HERO.loid;if(!im.complete||!im.naturalWidth)return;
 const row={down:0,left:1,right:2,up:3}[s.face]??0,col=[1,0,1,2][Math.floor(s.step)%4];
 ctx.save();ctx.translate(Math.round(s.x),Math.round(s.y));
 ctx.globalAlpha=Math.min(.82,s.time*.45);
 ctx.shadowBlur=8;ctx.shadowColor='#6f32a7';
 ctx.filter='brightness(0.17) sepia(1) saturate(2) hue-rotate(218deg)';
 ctx.drawImage(im,col*112,row*112,112,112,-20,-34,40,40);
 ctx.restore();
 ctx.save();ctx.strokeStyle='#7d50ad88';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.x,s.y-16,15+Math.sin(elapsed*5+s.angle)*2,0,TAU);ctx.stroke();ctx.restore();
}
function drawDimensionalCharge(){
 if(!player||player.type!=='kris'||!player.secondaryCharging)return;
 let f=clamp(player.secondaryCharge/1.6,0,1),a=player.aim,len=94+130*f;
 ctx.save();ctx.translate(player.x,player.y);
 ctx.strokeStyle=f>=1?'#c5eeff':'#9f84ee';ctx.lineWidth=3+4*f;
 ctx.shadowColor='#7a76ff';ctx.shadowBlur=9+14*f;
 ctx.setLineDash([9,3]);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len-8);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.strokeStyle='#fff1fc';ctx.lineWidth=2;ctx.arc(0,-13,22,-Math.PI/2,-Math.PI/2+TAU*f);ctx.stroke();ctx.restore();
}
// Responsive renderer: mobile portrait stays tall; landscape gets the correct wide camera and buttons.
function adaptViewport(force=false){
 const scene=document.querySelector('.scene');
 const rect=scene.getBoundingClientRect();
 const wide=touchUI&&window.innerWidth>window.innerHeight;
 // Logical viewport follows the scene's actual aspect ratio; no canvas stretch in portrait.
 const displayW=Math.max(1,rect.width||window.innerWidth);
 const displayH=Math.max(1,rect.height||(wide?window.innerHeight*.85:window.innerHeight*.72));
 const nextH=touchUI?(wide?300:Math.min(720,Math.max(420,Math.round(480*displayH/displayW)))):288;
 const nextW=touchUI?Math.min(860,Math.max(240,Math.round(nextH*displayW/displayH))):480;
 if(force||W!==nextW||H!==nextH){
   W=nextW;H=nextH;canvas.width=Math.round(W*RENDER_SCALE);canvas.height=Math.round(H*RENDER_SCALE);
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   if(player){camera.x=clamp(player.x-W/2,0,Math.max(0,WORLD_W-W));camera.y=clamp(player.y-H/2,0,Math.max(0,WORLD_H-H));}
 }
 document.body.classList.toggle('landscape',wide);
}
window.addEventListener('resize',adaptViewport,{passive:true});
window.addEventListener('orientationchange',()=>requestAnimationFrame(adaptViewport));

// Xans ultimate: 5 skulls surround him, lock on to the strongest living enemy,
// and fire together. Damage is computed by the host only and replicated to all peers.
function summonXansSkulls(){
 const targets=enemies.filter(e=>e.hp>0);
 targets.sort((a,b)=>(isBossEnemy(b)?100000:0)+b.maxHp-(isBossEnemy(a)?100000:0)-a.maxHp);
 const target=targets[0];
 xansBlasters.push({ownerId:coop.actorId||coop.id,ox:player.x,oy:player.y,
   targetId:target?.id??null,tx:target?.x??player.x+Math.cos(player.aim)*230,
   ty:target?.y??player.y+Math.sin(player.aim)*230,
   life:1.85,max:1.85,windup:.55,applied:false});
 if(xansBlasters.length>4)xansBlasters.shift();
 ring(player.x,player.y,72,'#b36dff');
 makeParticles(player.x,player.y,'#ae72f3',renderMode==='desempenho'?8:18);
}
function updateXansSkulls(dt){
 for(let i=xansBlasters.length-1;i>=0;i--){
  const v=xansBlasters[i];v.life=Math.max(0,v.life-dt);
  const target=enemies.find(e=>e.id===v.targetId&&e.hp>0);
  if(target){v.tx=target.x;v.ty=target.y;}
  if(!v.applied&&v.max-v.life>=v.windup){
    v.applied=true;
    const owner=coop.active&&coop.host&&v.ownerId!==coop.id?coop.allies.get(v.ownerId):player;
    if(target&&owner&&owner.hp>0){const prior=player;player=owner;
      for(let b=0;b<5&&target.hp>0;b++){
        hitEnemy(target,isBossEnemy(target)?target.maxHp*.013:owner.damage*1.05,false,true);
      }
      player=prior;
    }
    makeParticles(v.tx,v.ty,'#d4b0ff',renderMode==='desempenho'?8:22);
    ring(v.tx,v.ty,45,'#af67ff');
  }
  if(v.life<=0)xansBlasters.splice(i,1);
 }
}
function drawXansSkulls(){
 for(const v of xansBlasters){
  const age=v.max-v.life,firing=age>=v.windup;
  const fade=Math.min(1,age/.2,v.life/.22);
  if(fade<=0)continue;
  ctx.save();ctx.globalAlpha=fade;
  for(let i=0;i<5;i++){
   const theta=(i/5)*TAU-Math.PI/2;
   const sx=v.ox+Math.cos(theta)*42,sy=v.oy-15+Math.sin(theta)*31;
   const angle=Math.atan2(v.ty-sy,v.tx-sx),range=Math.hypot(v.tx-sx,v.ty-sy);
   if(firing){ctx.save();ctx.translate(sx,sy);ctx.rotate(angle);
    ctx.strokeStyle='#9d56ff';ctx.lineWidth=8;ctx.globalAlpha=fade*.64;
    ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(range,0);ctx.stroke();
    ctx.strokeStyle='#f5eaff';ctx.lineWidth=3;ctx.globalAlpha=fade;
    ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(range,0);ctx.stroke();ctx.restore();}
   ctx.save();ctx.translate(sx,sy);ctx.rotate(firing?angle+Math.PI/2:0);
   if(GASTER_SKULL.complete&&GASTER_SKULL.naturalWidth){
     ctx.drawImage(GASTER_SKULL,-18,-19,36,36);
   }else{ctx.fillStyle='#e7dcff';ctx.fillRect(-10,-12,20,22);ctx.fillStyle='#52208f';ctx.fillRect(-5,-4,4,5);ctx.fillRect(3,-4,4,5);}
   ctx.restore();
  }
  ctx.restore();
 }
}
function ultimate(){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('ultimate');return;}if(!player||player.hp<=0||phase!=='play'||player.ultimateCharge<100)return;
 player.ultimateCharge=0;YG_AUDIO.play('ultimate',1.24);
 if(player.type==='eve'){castEveUltimate();}
 else if(player.type==='kali'){player.ultimateTime=6;player.invuln=.6;player.mirrorGuard=6;const actors=coop.active&&coop.host?[player,...coop.allies.values()]:[player];for(let i=0;i<Math.min(5,actors.length*2);i++){const own=actors[i%actors.length];mirrorIllusions.push({owner:own,x:own.x+Math.cos(i*1.3)*44,y:own.y+Math.sin(i*1.3)*44,life:6,attackCd:.25});}ring(player.x,player.y,200,'#c8b1fb');}
 else if(player.type==='cross'){player.ultimateBuff='cross';player.ultimateBuffTime=8;player.invuln=.4;makeParticles(player.x,player.y,'#bb79fa',20,1.5);summonXansSkulls();bossMessage='SUPREMO · RUPTURA CORRUPTA · 5 CAVEIRAS';bossMessageTimer=2.2;}
 else if(player.type==='loid'){
  player.ultimateTime=5;player.ultimateTick=0;player.invuln=.65;domainFade=1;
  ring(player.x,player.y,184,'#5b347c');makeParticles(player.x,player.y,'#6c3987',32,1.6);
  bossMessage='SUPREMO · DOMÍNIO DA ESCURIDÃO';bossMessageTimer=1.9;
 }else{
  phase='ultimate';keys.clear();attackMobile=false;pointerDown=false;
  $('supremeScreen').classList.remove('hidden');
 }
 updateHud();
}
function chooseUltimate(kind){
 if(coop.active&&!coop.host&&!coop.executing){coopAction('ultimateChoice',kind);coop.selectingUltimate=false;$('supremeScreen').classList.add('hidden');phase='play';return;}if(!player||player.type!=='kris'||phase!=='ultimate')return;
 const effects={fight:9,defesa:3,itens:11,piedade:9};
 if(!(kind in effects))return;
 player.ultimateBuff=kind;player.ultimateBuffTime=effects[kind];YG_AUDIO.play('krisForm',1.18);
 if(kind==='piedade'){player.hp=player.maxHp;makeParticles(player.x,player.y,'#94ffce',28,1.2);}
 if(kind==='defesa'){player.invuln=Math.max(player.invuln,.45);ring(player.x,player.y,35,'#7edcff');}
 if(kind==='itens'){makeParticles(player.x,player.y,'#b871ff',27,1.2);}
 if(kind==='fight'){makeParticles(player.x,player.y,'#ff5d7f',28,1.2);}
 bossMessage='SUPREMO · '+({fight:'FIGHT',defesa:'DEFESA',itens:'ITENS',piedade:'PIEDADE'}[kind]);bossMessageTimer=1.5;
 $('supremeScreen').classList.add('hidden');phase='play';updateHud();
}
function hurtPlayer(d){
 // Dead co-op heroes are spectators. Damage can ONLY affect alive bodies.
 if(player&&player.mirrorGuard>0&&Math.random()<.5){textPop(player.x,player.y-25,'REFLEXO','#dfbbff');return;}
 if(player&&player.dodgeChance>0&&Math.random()<player.dodgeChance){textPop(player.x,player.y-25,'DODGE','#b4eeff');return;}

 if(phase!=='play'||!player||player.hp<=0||player.invuln>0||
   (player.type==='loid'&&player.dashTime>0)||
   (player.ultimateBuff==='defesa'&&player.ultimateBuffTime>0))return;
 d=Math.max(1,d*(isPecador()?1.38:1)*(1-player.armor));
 const team=coop.active&&coop.host?[coop.hostAvatar||player,...coop.allies.values()]:[player];
 if(team.some(a=>a&&a.type==='kali'&&a.ultimateTime>0&&Math.hypot(a.x-player.x,a.y-player.y)<250))d*=.70;
 player.hp=Math.max(0,player.hp-d);
 YG_AUDIO.play('hurt');player.invuln=.76;
 // Never flash the host's camera for an attack on a distant guest.
 if(!coop.active||!coop.host||player===(coop.hostAvatar||player)){shake=4;flash=.12;}
 textPop(player.x,player.y-20,'-'+Math.ceil(d),'#ff738c','hero:'+ (coop.actorId||player.type));
 makeParticles(player.x,player.y,'#f2597e',8);
 if(player.hp<=0){
  player.hp=0;player.ghost=true;player.crossTp=null;player.dashTime=0;
  player.secondaryCharging=false;player.frogTime=0;player.darkAuraTime=0;
  player.ultimateTime=0;
  if(coop.active&&coop.host&&coopLivingHeroes().length>0){
   player.invuln=0;
   bossMessage='HERÓI CAÍDO · AGORA É FANTASMA';bossMessageTimer=1.7;
   if(player===coop.hostAvatar)updateHud();return;
  }
  YG_AUDIO.play('defeat');phase='over';
  $('endTitle').textContent='A RAIZ RESISTE';
  $('endText').textContent=`${coop.active?'A equipe':player.type==='loid'?'Loid':player.type==='cross'?'Xans':'Kris'} chegou à onda ${stage}. Uma nova tentativa pode começar.`;
  $('gameOverScreen').classList.remove('hidden');
 }
 if(!coop.active||!coop.host||player===coop.hostAvatar)updateHud();
}
function getMove(){if(coop.active&&coop.host&&coop.actorId){const a=coop.allies.get(coop.actorId);return a?norm(a.input.x,a.input.y):{x:0,y:0};}let x=mobileMove.x,y=mobileMove.y;if(keys.has('w')||keys.has('arrowup'))y-=1;if(keys.has('s')||keys.has('arrowdown'))y+=1;if(keys.has('a')||keys.has('arrowleft'))x-=1;if(keys.has('d')||keys.has('arrowright'))x+=1;return norm(x,y)}
function applyBoundaries(o,r=9){o.x=clamp(o.x,90+r,WORLD_W-90-r);o.y=clamp(o.y,148+r,WORLD_H-95-r)}
function update(dt){elapsed+=dt;waveIntro=Math.max(0,waveIntro-dt);bossMessageTimer=Math.max(0,bossMessageTimer-dt);for(let i=frostBursts.length-1;i>=0;i--){frostBursts[i].life-=dt;if(frostBursts[i].life<=0)frostBursts.splice(i,1);}eclipseTime=Math.max(0,eclipseTime-dt);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*14);
for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;if(p.life<=0)particles.splice(i,1)}for(let i=slashes.length-1;i>=0;i--){slashes[i].life-=dt;if(slashes[i].life<=0)slashes.splice(i,1)}for(let i=rings.length-1;i>=0;i--){rings[i].life-=dt;if(rings[i].life<=0)rings.splice(i,1)}
for(let i=dashShadows.length-1;i>=0;i--){dashShadows[i].life-=dt;if(dashShadows[i].life<=0)dashShadows.splice(i,1)}
updateDamageFloats(dt);
if(phase!=='play')return;
updateCardBeam(dt);updateXansSkulls(dt);applyTimeFields(dt);updateMirrorIllusions(dt);tickEveUltimate(dt);voidCollapse=Math.max(0,voidCollapse-dt);if(player.crossChain){player.crossChain.time-=dt;if(player.crossChain.time<=0)player.crossChain=null;}player.mirrorGuard=Math.max(0,(player.mirrorGuard||0)-dt);player.frogTime=Math.max(0,player.frogTime-dt);if(player.type==='kris'&&player.frogSkill&&player.frogUsed&&player.frogTime<=0){player.frogSkill=false;player.skillCd=0;}player.curseTime=Math.max(0,player.curseTime-dt);player.frostTime=Math.max(0,(player.frostTime||0)-dt);player.atkTime=Math.max(0,player.atkTime-dt);player.dashCd=Math.max(0,player.dashCd-dt);player.skillCd=Math.max(0,player.skillCd-dt);player.secondaryCd=Math.max(0,player.secondaryCd-dt);if(player.type==='kris'&&player.secondaryCharging)player.secondaryCharge=Math.min(1.6,player.secondaryCharge+dt);if(player.type==='cross')updateCrossBones(player,dt,coop.id);player.ultimateTime=Math.max(0,player.ultimateTime-dt);player.ultimateBuffTime=Math.max(0,player.ultimateBuffTime-dt);player.invuln=Math.max(0,player.invuln-dt);player.transformTime=Math.max(0,player.transformTime-dt);player.darkAuraTime=Math.max(0,player.darkAuraTime-dt);
let m=getMove(),moving=!!(mobileMove.x||mobileMove.y||['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].some(k=>keys.has(k)));
movingNow=moving||player.dashTime>0;footstepClock-=dt;if(moving&&player.dashTime<=0&&footstepClock<=0){footstepClock=.33;YG_AUDIO.play('footstep',.32);}
if(player.type==='cross'&&player.crossTp){updateCrossTeleport(player,dt);}
else if(player.dashTime>0){player.dashTime=Math.max(0,player.dashTime-dt);player.x+=player.dashV.x*(player.type==='eve'?590:340)*dt;player.y+=player.dashV.y*(player.type==='eve'?590:340)*dt;if(player.type==='loid'){dashGhostTimer-=dt;if(dashGhostTimer<=0){dashGhostTimer=.035;if(dashShadows.length>18)dashShadows.shift();dashShadows.push({x:player.x,y:player.y,face:player.face,step:player.step,life:.30,max:.30});}if(Math.random()<.75)makeParticles(player.x+rand(-6,6),player.y+rand(-8,4),'#301739',2,.5);}else if(player.shadowDash&&Math.random()<.5)makeParticles(player.x,player.y,'#ab6bf2',2)}else if(moving&&(player.hp>0||(coop.active&&coop.host))){let haste=player.type==='loid'&&player.ultimateTime>0?1.65:player.ultimateBuff==='piedade'&&player.ultimateBuffTime>0?1.5:1;const moveSpeed=player.hp<=0?116:player.speed*haste*(player.curseTime>0?.78:1)*(player.frostTime>0?.72:1);player.x+=m.x*moveSpeed*dt;player.y+=m.y*moveSpeed*dt;player.step+=dt*11;player.aim=Math.atan2(m.y,m.x);}
if(moving){if(Math.abs(m.x)>Math.abs(m.y))player.face=m.x<0?'left':'right';else player.face=m.y<0?'up':'down';}
if(touchUI&&attackMobile&&!attackManualAim)mobileAutoAim(false);
if(mouseAim){player.aim=Math.atan2(mouseAim.y-player.y,mouseAim.x-player.x);}
applyBoundaries(player,8);camera.x+=((clamp(player.x-W/2,0,WORLD_W-W))-camera.x)*Math.min(1,dt*9);camera.y+=((clamp(player.y-H/2,0,WORLD_H-H))-camera.y)*Math.min(1,dt*9);
if(player.hp>0&&!player.crossTp&&(keys.has('j')||pointerDown||attackMobile))attack();
if(coop.active&&coop.host){for(const a of coop.allies.values())a.mirrorGuard=Math.max(0,(a.mirrorGuard||0)-dt);coopAdvance(dt);}
if(shadowClones.length)updateClones(dt);
if(player.hp>0&&player.type==='loid'&&player.darkAuraTime>0){
 player.darkAuraTick-=dt;
 if(player.darkAuraTick<=0){player.darkAuraTick=.47;
  for(const e of enemies){if(e.hp>0&&dist(e,player)<77+e.radius){hitEnemy(e,player.damage*.55*player.skillAmp);e.slow=Math.max(e.slow||0,.65);}}
  if(Math.random()<.6)makeParticles(player.x,player.y,'#30203e',4,.6);
 }
}
if(player.hp>0&&player.type==='loid'&&player.ultimateTime>0){
 player.ultimateTick-=dt;
 if(player.ultimateTick<=0){player.ultimateTick=.24;
  for(const e of enemies){if(e.hp>0&&dist(e,player)<185+e.radius){hitEnemy(e,player.damage*1.18*player.skillAmp);e.slow=Math.max(e.slow||0,.23);}}
  if(Math.random()<.45)makeParticles(player.x+rand(-90,90),player.y+rand(-60,60),'#21142e',2,.6);
 }
}
player.orbitTimer+=dt;if(player.hp>0&&player.orbiters>0&&player.orbitTimer>1.25){player.orbitTimer=0;let targets=enemies.filter(e=>e.hp>0&&dist(e,player)<98).sort((a,b)=>dist(a,player)-dist(b,player));for(let i=0;i<Math.min(player.orbiters,targets.length);i++){hitEnemy(targets[i],player.damage*.8);ring(targets[i].x,targets[i].y,13,'#a872f7');}}
for(const e of enemies){if(e.hp<=0)continue;const previousX=e.x,previousY=e.y;const __hostPlayer=player;const liveTarget=nearestLivingHero(e);if(!liveTarget)continue;player=liveTarget;e.hurt=Math.max(0,e.hurt-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.corruptTime=Math.max(0,(e.corruptTime||0)-dt);e.burnTime=Math.max(0,(e.burnTime||0)-dt);if(e.burnTime>0){e.burnTick=(e.burnTick||0)-dt;if(e.burnTick<=0){e.burnTick=.65;hitEnemy(e,player.damage*.23);}}if(e.hp<=0){player=__hostPlayer;continue;}e.attack-=dt;if(e.stunTime>0){e.stunTime-=dt;player=__hostPlayer;continue;}let dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,dir={x:dx/d,y:dy/d},spd=e.speed*(e.slow>0?.4:e.corruptTime>0?.68:1)*(e.timeSlow>0?(isBossEnemy(e)?.7:.3):1);if(!Number.isFinite(e.step))e.step=0;if(!Number.isFinite(e.phase))e.phase=0;if(isBossEnemy(e))e.attackPose=Math.max(0,(e.attackPose||0)-dt);if(isBossEnemy(e)&&e.mode!=='charge'){e.face=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
e.face=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');if(e.type==='caster'){if(d>100){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt}else if(d<75){e.x-=dir.x*spd*dt}if(e.attack<=0){e.attack=rand(1.7,2.55);shoot(e,dir,85+stage*.9,13+stage*1.1,'#c586ff')}}
else if(e.type==='boss'){updateSamurai(e,dt,d,dir,spd);}
else if(e.type==='reuni'){updateReuni(e,dt,d,dir,spd);}
else if(e.type==='tsukuomi'){updateTsukuomi(e,dt,d,dir,spd);}
else if(e.type==='pecado'){updatePecado(e,dt,d,dir,spd);}
else if(e.type==='frostjarl'){updateFrostJarl(e,dt,d,dir,spd);}
else if(e.type==='nameless'){updateNameless(e,dt,d,dir,spd);}
else if(e.type==='runeSeal'){e.attack=999;e.speed=0;}
else if(e.type==='runewitch'){if(d>145){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}else if(d<96){e.x-=dir.x*spd*.7*dt;e.y-=dir.y*spd*.7*dt;}if(e.attack<=0){e.attack=rand(1.7,2.6);const a=Math.atan2(dir.y,dir.x);for(const da of [-.26,0,.26])shoot(e,{x:Math.cos(a+da),y:Math.sin(a+da)},100+localNordicWave()*7,13+localNordicWave()*1.6,'#a5e7ff');ring(e.x,e.y,24,'#9bbfff');}}
else if(e.type==='frostwolf'){if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.chargeTime=.24;e.chargeDir=dir;e.hitCharge=false;}}else if(e.chargeTime>0){e.chargeTime-=dt;e.x+=e.chargeDir.x*spd*3.25*dt;e.y+=e.chargeDir.y*spd*3.25*dt;if(!e.hitCharge&&d<e.radius+12){e.hitCharge=true;hurtPlayer(17+localNordicWave()*1.9);}}else{if(d>32){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}if(e.attack<=0&&d<165){e.attack=1.8;e.windup=.43;ring(e.x,e.y,18,'#a6e8ff');}}}
else if(e.type==='berserker'){let furious=e.hp/e.maxHp<.47;if(furious)spd*=1.33;if(d>e.radius+10){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}if(d<e.radius+17&&e.attack<=0){e.attack=furious?.6:1.05;slash(e.x,e.y,Math.atan2(dir.y,dir.x),39,'#ff7665');hurtPlayer((furious?27:21)+localNordicWave()*2);}}
else if(e.type==='draugr'){if(d>e.radius+9){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}if(d<e.radius+15&&e.attack<=0){e.attack=1.48;e.windup=.14;slash(e.x,e.y,Math.atan2(dir.y,dir.x),32,'#c6eafb');hurtPlayer(16+localNordicWave()*1.5);}}
else if(e.type==='ghost'){
 // Ghosts glide through obstacles, retreat while shooting and appear/disappear subtly.
 const sway=Math.sin(elapsed*2.1+e.phase)*.42;
 if(d>77){e.x+=(dir.x-dir.y*sway)*spd*dt;e.y+=(dir.y+dir.x*sway)*spd*dt;}
 else if(d<54){e.x-=dir.x*spd*.6*dt;e.y-=dir.y*spd*.6*dt;}
 if(e.attack<=0){e.attack=rand(1.7,2.4);shoot(e,dir,110+stage,11+stage*.58,'#b28dff');}
}
else if(e.type==='yokai'){
 const side=Math.sin(elapsed*1.25+e.phase);
 if(d>98){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}
 else if(d<75){e.x-=dir.x*spd*.65*dt;e.y-=dir.y*spd*.65*dt;}
 e.x+=-dir.y*side*spd*.36*dt;e.y+=dir.x*side*spd*.36*dt;
 if(e.attack<=0){e.attack=rand(2.25,3.0);const ang=Math.atan2(dir.y,dir.x);for(const off of [-.21,0,.21])shoot(e,{x:Math.cos(ang+off),y:Math.sin(ang+off)},93+stage*.8,10+stage*.55,'#ef78dc');}
}
else if(e.type==='beast'){
 if(e.chargeTime>0){e.chargeTime-=dt;e.x+=e.chargeDir.x*spd*3.5*dt;e.y+=e.chargeDir.y*spd*3.5*dt;if(!e.hitCharge&&d<e.radius+12){e.hitCharge=true;hurtPlayer(14+stage*.75+(e.elite?7:0));}}
 else if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.chargeDir=dir;e.chargeTime=.26;e.hitCharge=false;ring(e.x,e.y,19,'#ae4bb8');}}
 else{if(d>27){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}if(e.attack<=0&&d<175){e.attack=rand(1.9,2.6);e.windup=.52;ring(e.x,e.y,21,'#a85ac7');}}
}
else{if(d>e.radius+8){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt}if(d<e.radius+12&&e.attack<=0){e.attack=e.type==='runner'?.95:1.3;hurtPlayer((e.type==='runner'?9+stage*.65:12+stage*.7)*(e.elite?1.4:1))}}
applyBoundaries(e,e.radius);const moved=Math.hypot(e.x-previousX,e.y-previousY);e.walking=moved>.12;if(e.walking)e.step+=Math.min(moved,10)*.24;player=__hostPlayer;}
updateBossHazards(dt);for(let i=0;i<enemies.length;i++){let a=enemies[i];if(a.hp<=0)continue;for(let j=i+1;j<enemies.length;j++){let b=enemies[j];if(b.hp<=0)continue;let dx=b.x-a.x,dy=b.y-a.y,min=a.radius+b.radius+1;if(Math.abs(dx)>=min||Math.abs(dy)>=min)continue;let d=Math.hypot(dx,dy)||1;if(d<min){let push=(min-d)*.15;a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push}}}
for(let i=projectiles.length-1;i>=0;i--){let b=projectiles[i];const td=b.from==='enemy'?(b.timeSlow??1):1;b.x+=b.vx*dt*td;b.y+=b.vy*dt*td;b.life-=dt;if(b.life<0||b.x<92||b.x>WORLD_W-92||b.y<148||b.y>WORLD_H-97){projectiles.splice(i,1);continue}if(b.from==='enemy'&&player.hp>0&&Math.hypot(b.x-player.x,b.y-player.y)<b.r+7){if(isNordic()&&b.color==='#a5e7ff'||isNordic()&&b.color==='#98eaff')player.frostTime=Math.max(player.frostTime||0,1.7);hurtPlayer(b.damage);makeParticles(b.x,b.y,b.color,7);projectiles.splice(i,1)}else if(b.from==='enemy'&&coop.active&&coop.host){const target=[...coop.allies.values()].find(p=>p.hp>0&&Math.hypot(b.x-p.x,b.y-p.y)<b.r+7);if(target){const old=player;player=target;if(isNordic()&&(b.color==='#98eaff'||b.color==='#a5e7ff'))target.frostTime=Math.max(target.frostTime||0,1.7);hurtPlayer(b.damage);player=old;makeParticles(b.x,b.y,b.color,7);projectiles.splice(i,1);}}else if(b.from==='player'){let hit=enemies.find(e=>e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.radius);if(hit){const prior=player;if(coop.active&&coop.host&&b.ownerId&&b.ownerId!==coop.id){player=coop.allies.get(b.ownerId)||player;}hitEnemy(hit,b.damage,true);player=prior;if(b.mirror){YG_AUDIO.play('mirrorHit',.85);ring(b.x,b.y,28,'#e7c9ff');makeParticles(b.x,b.y,'#c8a2f4',12,.65);makeParticles(b.x,b.y,'#f7e7ff',6,.45);}if(b.bone==='azul'){hit.slow=Math.max(hit.slow||0,1.9);}if(b.bone==='laranja'){hit.burnTime=3.3;hit.burnTick=.3;}if(b.bone){makeParticles(hit.x,hit.y,b.color,12);ring(hit.x,hit.y,22,b.color);}projectiles.splice(i,1)}}}
enemies=enemies.filter(e=>e.hp>0);
for(let i=healthDrops.length-1;i>=0;i--){const h=healthDrops[i];h.life-=dt;if(h.life<=0){healthDrops.splice(i,1);continue;}const target=(coop.active&&coop.host?[player,...coop.allies.values()]:[player]).find(p=>p.hp>0&&Math.hypot(h.x-p.x,h.y-p.y)<16);if(target){let gain=Math.min(h.amount,target.maxHp-target.hp);target.hp+=gain;if(gain>0){textPop(target.x,target.y-22,'+'+Math.round(gain)+' VIDA','#9af8a7');YG_AUDIO.play('card',.5);}healthDrops.splice(i,1);}}
// After killing the final Oni the player can explore for three real seconds.
// No countdown overlay appears; projectiles/hazards are removed for safety.
if(enemies.length===0&&phase==='play'){
 if(waveClearTimer<0){waveClearTimer=3;projectiles=[];hazards=[];}
 else {waveClearTimer=Math.max(0,waveClearTimer-dt);if(waveClearTimer===0){waveClearTimer=-1;if(isCampaignFinalWave()){phase='over';player.hp=player.maxHp;$('endTitle').textContent=activeCampaign==='nordic'?'REINO NÓRDICO CONQUISTADO!':'JAPÃO CONQUISTADO!';$('endText').textContent=activeCampaign==='nordic'?'Você derrotou o Cavaleiro Inominável e seu dragão ancestral! Carta lendária: Pacto do Dragão Sem Nome.':'Você derrotou Pecado e concluiu a campanha do Japão! Escolha o Reino Nórdico pelo menu para outra jornada.';$('gameOverScreen').classList.remove('hidden');}else{phase='reward';showRewards();}}}
}
updateHud();}
// Boss state machine. Boss damages only when the visible warning resolves and the hitbox connects.
function startSamuraiMove(e){
 const moves=['eclipse','oni','blades','guard']; const type=moves[e.specialIndex++%moves.length];
 e.mode='windup';e.move=type;e.windup=e.rage?.58:.82;e.attack=e.rage?1.25:1.85;
 e.lockX=player.x;e.lockY=player.y;e.angle=Math.atan2(e.lockY-e.y,e.lockX-e.x);
 const labels={eclipse:'CORTE DO ECLIPSE',oni:'INVESTIDA ONI',blades:'CHUVA DE LÂMINAS',guard:'POSTURA DO SHOGUN'};
 bossMessage=labels[type];bossMessageTimer=1.4;YG_AUDIO.play('bossWarning',.95);
 if(type==='blades'){
  const spots=[{x:player.x,y:player.y},{x:player.x-46,y:player.y+19},{x:player.x+43,y:player.y-20},{x:player.x+12,y:player.y+49}];
  if(e.rage)spots.push({x:player.x-45,y:player.y-45},{x:player.x+49,y:player.y+39});
  for(const s of spots)hazards.push({type:'blade',x:clamp(s.x,100,WORLD_W-100),y:clamp(s.y,148,WORLD_H-100),r:e.rage?21:19,delay:e.windup,active:.33,done:false});
 }
 if(type==='guard'){YG_AUDIO.play('bossGuard');e.mode='guard';e.guardTime=e.rage?1.15:1.55; e.attack=e.guardTime+1.4;}
}
function updateSamurai(e,dt,d,dir,spd){
 if(!e.rage&&e.hp<e.maxHp*.49){e.rage=true;e.speed*=1.28;YG_AUDIO.play('bossRage',1.22);bossMessage='SEGUNDA FASE · IRA DO DAIMYŌ';bossMessageTimer=2.4;ring(e.x,e.y,57,'#ff396d');makeParticles(e.x,e.y,'#f34b87',38,1.5)}
 e.counterCd=Math.max(0,e.counterCd-dt);
 if(e.mode==='guard'){e.guardTime-=dt;if(e.guardTime<=0){e.mode='walk';e.attack=1.0;}return;}
 if(e.mode==='windup'){
  e.windup-=dt;
  if(e.windup<=0){
   if(e.move==='eclipse'){YG_AUDIO.play('bossEclipse',1.22);
    const dx=player.x-e.x,dy=player.y-e.y,distp=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(ang-e.angle),Math.cos(ang-e.angle));
    slash(e.x+Math.cos(e.angle)*21,e.y+Math.sin(e.angle)*21,e.angle,e.rage?84:71,'#ff3d67');ring(e.x,e.y,23,'#cf3d64');
    if(distp<(e.rage?86:75)&&Math.abs(diff)<1.02)hurtPlayer(e.rage?27:20);
    e.mode='walk';e.attack=.95;
   }else if(e.move==='oni'){YG_AUDIO.play('bossCharge',1.13);
    e.mode='charge';e.chargeTime=e.rage?.38:.32;e.chargeDir={x:Math.cos(e.angle),y:Math.sin(e.angle)};e.hitCharge=false;
   }else if(e.move==='blades'){YG_AUDIO.play('bossRain',1.12);e.mode='walk';e.attack=e.rage?1.1:1.4;}
  }
  return;
 }
 if(e.mode==='charge'){
  e.chargeTime-=dt;
  const travel=(e.rage?365:310)*dt;
  e.x+=e.chargeDir.x*travel;e.y+=e.chargeDir.y*travel;
  if(Math.hypot(player.x-e.x,player.y-e.y)<e.radius+8&&!e.hitCharge){e.hitCharge=true;hurtPlayer(e.rage?28:20)}
  if(Math.random()<.8)makeParticles(e.x,e.y,'#d73b70',1,1);
  if(e.chargeTime<=0){e.mode='walk';e.attack=1.05;ring(e.x,e.y,15,'#dc648c');}
  return;
 }
 if(d>47){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt}
 if(e.attack<=0)startSamuraiMove(e);
}

// REUNI: wave 10 unique blood boss. Fully deterministic behavior on main thread, capped summon count.
function spawnReuniOnis(e,count){
 let alive=enemies.filter(x=>x.hp>0&&['walker','runner','caster'].includes(x.type)).length;
 let free=Math.min(count,(isPecador()?13:9)-alive);if(free<=0)return;
 for(let i=0;i<free;i++){
  const ang=TAU*(i+.32)/Math.max(1,free)+elapsed*.18;
  const x=clamp(e.x+Math.cos(ang)*(39+i%3*9),104,WORLD_W-104);
  const y=clamp(e.y+Math.sin(ang)*(34+i%3*8),160,WORLD_H-106);
  const type=(i%4===3)?'caster':(i%2?'runner':'walker');
  const hp=(type==='runner'?38:type==='caster'?57:66)*(isPecador()?1.38:1);
  enemies.push({id:nextEnemyId++,type,x,y,hp,maxHp:hp,
   speed:(type==='runner'?84:type==='caster'?38:55)*(isPecador()?1.2:1),radius:11,
   attack:1.2+Math.random()*.7,hurt:0,step:0,face:'down'});
  ring(x,y,22,'#ed4164');makeParticles(x,y,'#db304f',7,.75);
 }
 YG_AUDIO.play('bossRage',.82);
}
function beginReuniAttack(e){
 const attacks=['claws','dash','rain','summon'];
 const type=attacks[e.specialIndex++%attacks.length];
 e.move=type;e.mode='windup';e.windup=e.rage?.42:.62;
 e.angle=Math.atan2(player.y-e.y,player.x-e.x);
 e.attack=e.rage?.8:1.28;
 const labels={claws:'GARRAS DE SANGUE',dash:'PERSEGUIÇÃO CARMESIM',rain:'DILÚVIO RUBRO',summon:'INVOCAÇÃO ONI'};
 bossMessage='REUNI · '+labels[type];bossMessageTimer=1.25;
 YG_AUDIO.play('bossWarning',1.0);
 if(type==='rain'){
  const targets=[{x:player.x,y:player.y}];
  const n=e.rage?(isPecador()?9:7):(isPecador()?6:4);
  for(let i=1;i<n;i++){
   const a=(i/n)*TAU+elapsed*.5,r=27+(i%3)*23;
   targets.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r});
  }
  for(const p of targets)hazards.push({type:'blood',x:clamp(p.x,103,WORLD_W-103),y:clamp(p.y,160,WORLD_H-106),r:e.rage?22:19,delay:e.windup+.22+(Math.random()*.17),active:.28,done:false});
 }
}
function updateReuni(e,dt,d,dir,spd){
 if(!e.rage&&e.hp<e.maxHp*.48){
  e.rage=true;e.speed*=1.27;
  bossMessage='REUNI · FASE 2 — FÚRIA RUBRA';bossMessageTimer=3.0;
  ring(e.x,e.y,85,'#fa2346');makeParticles(e.x,e.y,'#ed234b',48,1.5);
  YG_AUDIO.play('bossRage',1.4);spawnReuniOnis(e,isPecador()?5:3);
 }
 e.summonTimer-=dt;
 if(e.summonTimer<=0){e.summonTimer=e.rage?(isPecador()?5.1:6.3):(isPecador()?6.3:8.0);spawnReuniOnis(e,e.rage?(isPecador()?4:3):2);}
 if(e.mode==='windup'){
  e.windup-=dt;
  // The marked attack does not hurt the player before the visible warning finishes.
  if(e.windup<=0){
   if(e.move==='claws'){
    YG_AUDIO.play('bossEclipse',1.15);
    let ang=e.angle,r=e.rage?71:59;
    slash(e.x+Math.cos(ang)*22,e.y+Math.sin(ang)*22,ang,r,'#f93155');
    ring(e.x,e.y,22,'#c61d43');
    let diff=Math.atan2(Math.sin(Math.atan2(player.y-e.y,player.x-e.x)-ang),Math.cos(Math.atan2(player.y-e.y,player.x-e.x)-ang));
    if(d<r+9&&Math.abs(diff)<.9)hurtPlayer(e.rage?26:20);
    e.mode='walk';e.attack=e.rage?.5:.78;
   }else if(e.move==='dash'){
    e.mode='charge';e.chargeTime=e.rage?.47:.37;
    e.chargeDir={x:Math.cos(e.angle),y:Math.sin(e.angle)};e.hitCharge=false;YG_AUDIO.play('bossCharge',1.2);
   }else if(e.move==='rain'){
    e.mode='walk';e.attack=.9;YG_AUDIO.play('bossRain',1.15);
   }else if(e.move==='summon'){
    spawnReuniOnis(e,e.rage?(isPecador()?5:4):(isPecador()?4:3));
    e.mode='walk';e.attack=e.rage?.55:.9;
   }
  }
  return;
 }
 if(e.mode==='charge'){
  e.chargeTime-=dt;
  const step=(e.rage?430:355)*(isPecador()?1.12:1)*dt;
  e.x+=e.chargeDir.x*step;e.y+=e.chargeDir.y*step;
  if(Math.random()<.8)makeParticles(e.x,e.y,'#e72a56',2,.8);
  if(Math.hypot(player.x-e.x,player.y-e.y)<e.radius+8&&!e.hitCharge){e.hitCharge=true;hurtPlayer(e.rage?32:24);}
  if(e.chargeTime<=0){e.mode='walk';e.attack=.65;ring(e.x,e.y,17,'#f43f62');}
  return;
 }
 // He constantly pursues the player; there is no passive stationary phase.
 if(d>34){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}
 if(e.attack<=0)beginReuniAttack(e);
}


// TSUKUOMI — wave 15. Her lethal spells are always telegraphed; summons are capped.
function summonTsukuomi(e,n){
 const alive=enemies.filter(a=>a.hp>0&&!isBossEnemy(a)).length;
 const maxSummons=isPecador()?11:8;
 const num=Math.min(n,Math.max(0,maxSummons-alive));
 for(let i=0;i<num;i++){
  const a=TAU*(i+.2)/Math.max(1,num)+elapsed*.4;
  const x=clamp(e.x+Math.cos(a)*(51+(i%2)*22),100,WORLD_W-100);
  const y=clamp(e.y+Math.sin(a)*(48+(i%2)*19),155,WORLD_H-100);
  addMob(i%3===0?'beast':i%2?'yokai':'ghost',x,y,false,true);
  ring(x,y,28,'#bb83f9');makeParticles(x,y,'#a761e7',8,.85);
 }
}
function beginTsukuomiAttack(e){
 const choices=['gaze','void','summon','eclipse'];
 const move=choices[e.specialIndex++%choices.length];
 e.move=move;e.mode='windup';e.windup=e.rage?.57:.85;
 e.angle=Math.atan2(player.y-e.y,player.x-e.x);
 e.attack=e.rage?.9:1.6;
 bossMessage='TSUKUOMI · '+({gaze:'OLHAR DO VAZIO',void:'LUAS ABISSAIS',summon:'CORO FANTASMA',eclipse:'MANTO NOTURNO'}[move]);
 bossMessageTimer=1.6;YG_AUDIO.play('bossWarning',1);
 if(move==='void'){
  const n=e.rage?(isPecador()?10:7):(isPecador()?7:5);
  for(let i=0;i<n;i++){
   let angle=TAU*i/n+elapsed*.5;
   let r=i===0?0:33+(i%3)*24;
   hazards.push({type:'void',x:clamp(player.x+Math.cos(angle)*r,104,WORLD_W-104),y:clamp(player.y+Math.sin(angle)*r,155,WORLD_H-100),r:e.rage?24:20,delay:e.windup+i*.085,active:.34,done:false});
  }
 }
}
function updateTsukuomi(e,dt,d,dir,spd){
 if(!e.rage&&e.hp<e.maxHp*.5){
  e.rage=true;e.speed*=1.24;
  bossMessage='TSUKUOMI · FASE 2 — LUA ETERNA';bossMessageTimer=3;
  eclipseTime=5;ring(e.x,e.y,120,'#ac64ff');makeParticles(e.x,e.y,'#cda7ff',40,1.5);YG_AUDIO.play('bossRage',1.35);
  summonTsukuomi(e,isPecador()?5:3);
 }
 e.summonTimer-=dt;
 if(e.summonTimer<=0){e.summonTimer=e.rage?(isPecador()?7:9):(isPecador()?10:12);summonTsukuomi(e,e.rage?3:2);}
 if(e.mode==='windup'){
  e.windup-=dt;
  if(e.windup<=0){
   if(e.move==='gaze'){
    const spread=e.rage?7:5;
    for(let i=0;i<spread;i++){
     const angle=e.angle+(i-(spread-1)/2)*(e.rage?.17:.21);
     shoot(e,{x:Math.cos(angle),y:Math.sin(angle)},(e.rage?168:145)*(isPecador()?1.08:1),e.rage?21:16,'#be83fd');
    }
    ring(e.x,e.y,52,'#bb73fb');
   }else if(e.move==='summon'){summonTsukuomi(e,e.rage?4:3);}
   else if(e.move==='eclipse'){
    eclipseTime=e.rage?6.2:4.7;
    for(let i=0;i<(e.rage?5:3);i++){
     const a=TAU*i/(e.rage?5:3)+elapsed;
     const x=clamp(player.x+Math.cos(a)*55,105,WORLD_W-105);
     const y=clamp(player.y+Math.sin(a)*50,155,WORLD_H-100);
     hazards.push({type:'void',x,y,r:23,delay:.55+i*.13,active:.35,done:false});
    }
   }
   e.mode='walk';e.attack=e.rage?.65:1.05;
  }
  return;
 }
 // Floats, retreats when too close and occasionally teleports a short distance.
 if(d>103){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}
 else if(d<75){e.x-=dir.x*spd*.68*dt;e.y-=dir.y*spd*.68*dt;}
 e.x+=(-dir.y)*Math.sin(elapsed*1.3)*spd*.28*dt;
 e.y+=(dir.x)*Math.sin(elapsed*1.3)*spd*.28*dt;
 if(e.attack<=0)beginTsukuomiAttack(e);
}


// PECADO — final wave 20; curses can reduce player damage & movement for 6s.
function applyCurse(seconds=6){if(player.invuln>0||(player.type==='loid'&&player.dashTime>0)||(player.ultimateBuff==='defesa'&&player.ultimateBuffTime>0))return;
 player.curseTime=Math.max(player.curseTime,seconds);textPop(player.x,player.y-40,'FRAQUEZA','#ff4a68');YG_AUDIO.play('bossWarning',.8);}
function pecadoSummon(e,n){
 const count=enemies.filter(x=>x.hp>0&&!isBossEnemy(x)).length,cap=isPecador()?18:14;
 n=Math.max(0,Math.min(n,cap-count));
 for(let i=0;i<n;i++){
  let a=TAU*(i+.45)/Math.max(n,1)+elapsed*.3;
  const x=clamp(e.x+Math.cos(a)*(65+(i%2)*25),104,WORLD_W-106);
  const y=clamp(e.y+Math.sin(a)*(61+(i%2)*23),160,WORLD_H-105);
  addMob(i%3===0?'beast':i%3===1?'ghost':'yokai',x,y,i%5===0,true);
  ring(x,y,31,'#f13b48');
 }
}
function pecadoMove(e){
 const cycle=['curse','bloodstorm','spear','summon','doom'];
 e.move=cycle[e.specialIndex++%cycle.length];e.mode='windup';e.windup=e.corruptionPhase===2?.48:e.corruptionPhase===1?.64:.85;
 e.angle=Math.atan2(player.y-e.y,player.x-e.x);e.attack=e.corruptionPhase===2?.5:.85;
 bossMessage='PECADO · '+({curse:'MALDIÇÃO DA FRAQUEZA',bloodstorm:'SANGUE CORROMPIDO',spear:'LANÇAS DO PECADO',summon:'SERVOS AMALDIÇOADOS',doom:'JUÍZO FINAL'}[e.move]);bossMessageTimer=1.8;YG_AUDIO.play('bossWarning',1.2);
 if(e.move==='bloodstorm'||e.move==='doom'){
  const n=e.move==='doom'?12:8;
  for(let i=0;i<n;i++){
   const a=TAU*i/n+(elapsed*.33),rad=i===0?0:36+(i%3)*29;
   hazards.push({type:'sin',x:clamp(player.x+Math.cos(a)*rad,110,WORLD_W-106),y:clamp(player.y+Math.sin(a)*rad,160,WORLD_H-104),r:e.move==='doom'?26:23,delay:e.windup+.08*i,active:.34,done:false});
  }
 }
}
function updatePecado(e,dt,d,dir,spd){
 const ratio=e.hp/e.maxHp;
 if(e.corruptionPhase<1&&ratio<=.70){e.corruptionPhase=1;e.speed*=1.18;e.rage=true;bossMessage='PECADO · SEGUNDA FASE · CORRUPÇÃO';bossMessageTimer=3;makeParticles(e.x,e.y,'#ff243e',55,1.9);ring(e.x,e.y,142,'#ff143d');YG_AUDIO.play('bossRage',1.4);pecadoSummon(e,isPecador()?7:5);}
 if(e.corruptionPhase<2&&ratio<=.35){e.corruptionPhase=2;e.speed*=1.24;bossMessage='PECADO · FASE FINAL · FIM DAS RAÍZES';bossMessageTimer=3.5;makeParticles(e.x,e.y,'#fd173b',70,2.2);ring(e.x,e.y,174,'#ff122f');YG_AUDIO.play('bossRage',1.55);pecadoSummon(e,isPecador()?10:7);}
 e.summonTimer-=dt;
 if(e.summonTimer<=0){e.summonTimer=e.corruptionPhase===2?5.5:e.corruptionPhase===1?7.5:10.5;pecadoSummon(e,e.corruptionPhase===2?5:3);}
 if(e.mode==='windup'){
  e.windup-=dt;
  if(e.windup<=0){
   if(e.move==='curse'){
    let diff=Math.atan2(Math.sin(Math.atan2(player.y-e.y,player.x-e.x)-e.angle),Math.cos(Math.atan2(player.y-e.y,player.x-e.x)-e.angle));
    if(d<210&&Math.abs(diff)<.58){applyCurse(6.8);hurtPlayer(e.corruptionPhase===2?29:18);}
    for(let j=-2;j<=2;j++){let a=e.angle+j*.23;shoot(e,{x:Math.cos(a),y:Math.sin(a)},155+e.corruptionPhase*23,16+e.corruptionPhase*4,'#ff2146');}
   }else if(e.move==='spear'){
    const count=e.corruptionPhase===2?14:e.corruptionPhase===1?11:8;
    for(let j=0;j<count;j++){const a=TAU*j/count+(elapsed*.2);shoot(e,{x:Math.cos(a),y:Math.sin(a)},155+e.corruptionPhase*20,14+e.corruptionPhase*3,'#e32044');}
   }else if(e.move==='summon')pecadoSummon(e,e.corruptionPhase===2?8:5);
   else if(e.move==='doom'){const a=e.angle;slash(e.x+Math.cos(a)*40,e.y+Math.sin(a)*40,a,134,'#ff1737');if(d<130){applyCurse(8);hurtPlayer(26+e.corruptionPhase*10);}}
   e.mode='walk';e.attack=e.corruptionPhase===2?.45:.82;
  }
  return;
 }
 const s=Math.sin(elapsed*2+e.step);
 if(d>112){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}else if(d<73){e.x-=dir.x*spd*.54*dt;e.y-=dir.y*spd*.54*dt;}
 e.x-=dir.y*s*spd*.22*dt;e.y+=dir.x*s*spd*.22*dt;
 if(e.attack<=0)pecadoMove(e);
}

// NORDIC WAVE 15 (internal stage 35) — The Nameless Knight and his ancestral dragon.
// All hazards share the existing host-authoritative arena and warning renderer.
function namelessSeal(e){
 for(let i=0;i<3;i++){
  const a=i*TAU/3, x=clamp(e.x+Math.cos(a)*140,106,WORLD_W-106),y=clamp(e.y+Math.sin(a)*130,155,WORLD_H-105);
  enemies.push({id:nextEnemyId++,type:'runeSeal',x,y,hp:250,maxHp:250,speed:0,radius:17,step:0,phase:0,face:'down',attack:999,walking:false,hurt:0,mode:'idle'});
 }
}
function updateNameless(e,dt,d,dir,spd){
 if(!Number.isFinite(e.specialCd))e.specialCd=2.3;
 if(!Number.isFinite(e.pactBroken))e.pactBroken=0;
 e.pactBroken=Math.max(0,e.pactBroken-dt);
 if(!e.rage&&e.hp<=e.maxHp*.5){
  e.rage=true;e.dragonIntro=4.5;e.specialCd=4.5;e.speed*=1.12;
  bossMessage='O PACTO DESPERTA · DRAGÃO ANCESTRAL!';bossMessageTimer=4.5;
  ring(e.x,e.y,150,'#87d9ff');makeParticles(e.x,e.y,'#a3bdff',60,2);YG_AUDIO.play('bossRage',1.4);
  namelessSeal(e);
 }
 if(!e.enraged&&e.hp<=e.maxHp*.15){e.enraged=true;e.speed*=1.15;bossMessage='ÚLTIMO JURAMENTO · FÚRIA DO DRAGÃO!';bossMessageTimer=3;YG_AUDIO.play('bossRage',1.5);ring(e.x,e.y,160,'#c2adff');}
 if((e.dragonIntro||0)>0){e.dragonIntro-=dt;return;}
 if(e.mode==='windup'){
  e.windup-=dt;
  if(e.windup>0)return;
  const move=e.move, a=e.angle, vx=Math.cos(a),vy=Math.sin(a);
  e.attackPose=.65;YG_AUDIO.play('bossCharge',1);
  if(move==='charge'){e.x=clamp(e.x+vx*112,102,WORLD_W-102);e.y=clamp(e.y+vy*112,155,WORLD_H-105);slash(e.x,e.y,a,105,'#ad9bff');if(Math.hypot(player.x-e.x,player.y-e.y)<85)hurtPlayer(34);}
  else if(move==='execution'){slash(e.x,e.y,a,126,'#e5d3ff');if(d<132&&Math.abs(Math.atan2(Math.sin(Math.atan2(dir.y,dir.x)-a),Math.cos(Math.atan2(dir.y,dir.x)-a)))<.6)hurtPlayer(48);}
  else if(move==='stomp'){ring(e.x,e.y,77,'#c1b5ff');if(d<77)hurtPlayer(22);}
  else if(move==='marks'||move==='claws'){
   for(let i=0;i<(move==='claws'?5:3);i++){const tx=clamp(player.x+rand(-85,85),105,WORLD_W-105),ty=clamp(player.y+rand(-80,80),155,WORLD_H-105);hazards.push({type:'dragon',x:tx,y:ty,r:move==='claws'?34:26,delay:.65+i*.16,active:.33,done:false});}
  }
  else if(move==='breath'){
   for(let i=-3;i<=3;i++){const z=a+i*.15;shoot(e,{x:Math.cos(z),y:Math.sin(z)},e.rage?160:125,32,'#9ac9ff');}
  }
  else if(move==='wings'){
   for(let i=0;i<9;i++){const z=TAU*i/9;shoot(e,{x:Math.cos(z),y:Math.sin(z)},125,14,'#bdb0ff');}
  }
  else if(move==='summon'){if(enemies.filter(n=>n.hp>0&&!isBossEnemy(n)&&n.type!=='runeSeal').length<9){for(let i=0;i<2;i++)addMob('draugr',clamp(e.x+rand(-85,85),105,WORLD_W-105),clamp(e.y+rand(-85,85),155,WORLD_H-105));}}
  e.mode='walk';e.attack=.85;e.specialCd=e.enraged?1.9:e.rage?2.7:3.6;return;
 }
 if(d>e.radius+33){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}
 else if(e.attack<=0){slash(e.x,e.y,Math.atan2(dir.y,dir.x),65,'#b4a0ff');hurtPlayer(e.rage?23:18);e.attack=1.25;e.attackPose=.35;}
 e.specialCd-=dt;
 if(e.specialCd<=0){
  const moves=e.rage?['charge','claws','breath','execution','marks','wings','stomp','summon']:['charge','execution','stomp','marks'];
  e.move=moves[(e.specialIndex++)%moves.length];e.angle=Math.atan2(dir.y,dir.x);e.mode='windup';e.windup=e.move==='execution'?1.45:e.move==='breath'?1.8:1.05;
  bossMessage='INOMINÁVEL · '+({charge:'INVESTIDA DO CONDENADO',execution:'LÂMINA DA EXECUÇÃO',stomp:'PISOTEIO DE GUERRA',marks:'MARCAS DO JULGAMENTO',claws:'GARRAS CELESTES',breath:'SOPRO DRACÔNICO',wings:'ASAS DO CATACLISMO',summon:'CHAMADO DOS CONDENADOS'}[e.move]);bossMessageTimer=1.7;
  YG_AUDIO.play('bossWarning',1.2);
 }
}

// Stage 25 — Frozen Jarl. Attacks are telegraphed and synced by the host in co-op.
function updateFrostJarl(e,dt,d,dir,spd){
 if(!Number.isFinite(e.specialCd))e.specialCd=1.7; else e.specialCd-=dt;
 const fury=e.hp<e.maxHp*.45;
 if(fury&&!e.rage){e.rage=true;e.speed*=1.18;bossMessage='JARL DO GELO · SEGUNDA FASE: INVERNO ETERNO';bossMessageTimer=3;ring(e.x,e.y,105,'#80dfff');makeParticles(e.x,e.y,'#bdf4ff',30,1.7);YG_AUDIO.play('bossRage',1.15);}
 if(e.mode==='windup'){
  e.windup-=dt;
  if(e.windup<=0){
   const move=e.move;e.attackPose=.75;frostBursts.push({x:e.x,y:e.y,angle:e.angle||0,kind:move,life:.66,max:.66});
   if(move==='blizzard'){for(let i=0;i<(e.rage?9:6);i++){let a=i*TAU/(e.rage?9:6)+e.phase;hazards.push({type:'ice',x:clamp(e.x+Math.cos(a)*rand(60,125),103,WORLD_W-103),y:clamp(e.y+Math.sin(a)*rand(60,125),154,WORLD_H-102),r:27,delay:.18+i*.045,active:.32,done:false});}YG_AUDIO.play('bossRain',.85);}
   else if(move==='shards'){let a=e.angle;for(let i=-2;i<=2;i++){const an=a+i*.23;shoot(e,{x:Math.cos(an),y:Math.sin(an)},e.rage?155:134,e.rage?24:19,'#98eaff');}YG_AUDIO.play('oniCast',1.15);}
   else if(move==='crush'){let count=e.rage?6:4;for(let i=0;i<count;i++){const ang=TAU*i/count;hazards.push({type:'ice',x:clamp(player.x+Math.cos(ang)*38,104,WORLD_W-104),y:clamp(player.y+Math.sin(ang)*38,154,WORLD_H-104),r:22,delay:.22+i*.12,active:.33,done:false});}YG_AUDIO.play('bossEclipse',.8);}
   else if(move==='summon'){let count=enemies.filter(a=>a.hp>0&&!isBossEnemy(a)).length;for(let i=0;i<(e.rage?3:2)&&count<14;i++){let a=rand(0,TAU);addMob(i%2?'draugr':'frostwolf',clamp(e.x+Math.cos(a)*75,102,WORLD_W-102),clamp(e.y+Math.sin(a)*75,156,WORLD_H-106));count++;}YG_AUDIO.play('bossRage',.7);}
   e.mode='walk';e.attack=e.rage?.8:1.2;ring(e.x,e.y,45,'#b8f1ff');
  }
  return;
 }
 if(d>e.radius+27){e.x+=dir.x*spd*dt;e.y+=dir.y*spd*dt;}
 else if(e.attack<=0){hurtPlayer(e.rage?29:22);e.attack=.75;e.attackPose=.55;frostBursts.push({x:e.x,y:e.y,angle:Math.atan2(dir.y,dir.x),kind:'melee',life:.36,max:.36});slash(e.x,e.y,Math.atan2(dir.y,dir.x),74,'#b7efff');}
 if(e.specialCd<=0){e.specialCd=e.rage?1.9:2.6;e.move=['shards','blizzard','crush','summon'][e.specialIndex++%4];e.angle=Math.atan2(dir.y,dir.x);e.mode='windup';e.windup=e.rage?.58:.90;e.attackPose=.45;e.attack=1.6;bossMessage='JARL DO GELO · '+({shards:'LANÇAS GLACIAIS',blizzard:'CHUVA DE GELO',crush:'RUÍNA RÚNICA',summon:'CHAMADO DOS DRAUGRS'}[e.move]);bossMessageTimer=1.6;YG_AUDIO.play('bossWarning',1);}
}
function updateBossHazards(dt){
 for(let i=hazards.length-1;i>=0;i--){
  const h=hazards[i];h.delay-=dt;
  if(h.delay<=0){
   if(!h.done){h.done=true;h.active=.32;slash(h.x,h.y-Math.min(17,h.r),Math.PI/2,h.r*.9,h.type==='dragon'?'#91cfff':h.type==='ice'?'#8ce8ff':h.type==='sin'?'#ff1747':h.type==='void'?'#c38bff':h.type==='blood'?'#f8173e':'#f94b7f');makeParticles(h.x,h.y,h.type==='dragon'?'#aabfff':h.type==='ice'?'#c0f4ff':'#ff537d',8);for(const t of coop.active&&coop.host?[player,...coop.allies.values()]:[player]){if(t.hp<=0||Math.hypot(h.x-t.x,h.y-t.y)>=h.r+6)continue;const original=player;player=t;if(h.type==='sin')applyCurse(5);if(h.type==='ice'){t.frostTime=Math.max(t.frostTime||0,2.3);textPop(t.x,t.y-34,'GELADO','#c1f5ff');}hurtPlayer(h.type==='sin'?(isPecador()?36:26):h.type==='void'?(isPecador()?30:22):h.type==='blood'?(isPecador()?25:20):h.type==='dragon'?35:(15+stage*.45));player=original;}
   }
   h.active-=dt;if(h.active<=0)hazards.splice(i,1);
  }
 }
}
function drawBossWarnings(){
 if(phase!=='play')return;
 // Large readable strike VFX, visible on top of the arena floor for the full impact.
 for(const b of frostBursts){
  const t=1-b.life/b.max,opacity=Math.min(1,b.life/.15);
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle||0);ctx.globalAlpha=opacity;
  ctx.strokeStyle='#e6fcff';ctx.lineWidth=3;ctx.shadowColor='#79dfff';ctx.shadowBlur=lowFx()?0:13;
  const radius=b.kind==='melee'?75:b.kind==='crush'?95:120;
  ctx.beginPath();ctx.arc(0,0,radius*(.5+t*.5),-.64,.64);ctx.stroke();
  ctx.strokeStyle='#51bcff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,radius*(.42+t*.52),-.45,.45);ctx.stroke();
  if(b.kind==='crush'||b.kind==='blizzard'){ctx.strokeStyle='#b9f5ff';for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(10,j*16);ctx.lineTo((80+t*40),j*29);ctx.stroke();}}
  ctx.restore();
 }

 for(const h of hazards){
  ctx.save();ctx.strokeStyle=h.type==='dragon'?'#8fceff':h.type==='ice'?'#a1edff':h.type==='sin'?'#ff153c':h.type==='void'?'#c48bff':h.type==='blood'?'#ff1e45':h.done?'#fff0e7':'#ff5476';ctx.fillStyle=h.type==='dragon'?'#9c8aff70':h.type==='ice'?'#8bcdf455':h.type==='sin'?'#df001c66':h.type==='void'?'#7030a34c':h.type==='blood'?'#a909324a':h.done?'#ff5a8666':'#f74a6047';ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.fill();ctx.stroke();
  if(h.done){ctx.strokeStyle='#fff2f5';ctx.beginPath();ctx.moveTo(h.x-8,h.y-17);ctx.lineTo(h.x,h.y+16);ctx.lineTo(h.x+8,h.y-17);ctx.stroke();}
  ctx.restore();
 }
 for(const e of enemies){if(!isBossEnemy(e)||e.mode!=='windup')continue;
  ctx.save();ctx.fillStyle='#f3385652';ctx.strokeStyle='#fe6284';ctx.lineWidth=1.6;
  if(e.type==='frostjarl'){
   ctx.fillStyle='#80dcff42';ctx.strokeStyle='#bdf4ff';ctx.lineWidth=3;
   const radius=e.move==='blizzard'?135:e.move==='crush'?105:85;
   ctx.beginPath();ctx.arc(e.x,e.y,radius,0,TAU);ctx.fill();ctx.stroke();
   if(e.move==='shards'){ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,185,e.angle-.52,e.angle+.52);ctx.closePath();ctx.fill();ctx.stroke();}
   if(e.move==='crush'){ctx.strokeStyle='#e4fdff';ctx.beginPath();ctx.arc(player.x,player.y,72,0,TAU);ctx.stroke();}
  }
  else if(e.type==='nameless'){ctx.fillStyle='#7b6ee455';ctx.strokeStyle='#c2aaff';ctx.lineWidth=3;if(e.move==='charge'||e.move==='execution'||e.move==='breath'){const r=e.move==='breath'?245:170;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,e.angle-(e.move==='execution'?.38:.5),e.angle+(e.move==='execution'?.38:.5));ctx.closePath();ctx.fill();ctx.stroke();}else{ctx.beginPath();ctx.arc(e.x,e.y,e.move==='stomp'?80:120,0,TAU);ctx.fill();ctx.stroke();}}
  else if(e.move==='curse'){const r=210;ctx.fillStyle='#f5193e55';ctx.strokeStyle='#ff5367';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,e.angle-.58,e.angle+.58);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(e.move==='gaze'){const r=165;ctx.fillStyle='#8c43bf55';ctx.strokeStyle='#d59bfa';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,e.angle-.52,e.angle+.52);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(e.move==='eclipse'&&e.type==='tsukuomi'){ctx.strokeStyle='#a37be5';ctx.beginPath();ctx.arc(e.x,e.y,125,0,TAU);ctx.stroke();}
  else if(e.move==='claws'){const r=e.rage?71:59;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,e.angle-.9,e.angle+.9);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(e.move==='dash'){const px=Math.cos(e.angle),py=Math.sin(e.angle),nx=-py*16,ny=px*16,len=e.rage?150:135;ctx.beginPath();ctx.moveTo(e.x+nx,e.y+ny);ctx.lineTo(e.x+px*len+nx,e.y+py*len+ny);ctx.lineTo(e.x+px*len-nx,e.y+py*len-ny);ctx.lineTo(e.x-nx,e.y-ny);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(e.move==='eclipse'){
   const r=e.rage?86:75;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,r,e.angle-1.02,e.angle+1.02);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(e.move==='oni'){
   const a=e.angle,px=Math.cos(a),py=Math.sin(a),nx=-py*17,ny=px*17,len=135;ctx.beginPath();ctx.moveTo(e.x+nx,e.y+ny);ctx.lineTo(e.x+px*len+nx,e.y+py*len+ny);ctx.lineTo(e.x+px*len-nx,e.y+py*len-ny);ctx.lineTo(e.x-nx,e.y-ny);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.restore();}
}

function shoot(e,vec,speed,damage,color){if(projectiles.length>155)return;YG_AUDIO.play('oniCast',.56);projectiles.push({x:e.x,y:e.y,vx:vec.x*speed,vy:vec.y*speed,life:3,r:3.5,damage,from:'enemy',color});}
function drawR(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function drawMap(){
 const activeArena=isNordic()?NORDIC_ARENA:ARENA;
 if(activeArena.complete&&activeArena.naturalWidth){
  const sx=Math.round(camera.x),sy=Math.round(camera.y);
  ctx.drawImage(activeArena,sx,sy,W,H,sx,sy,W,H);
  ctx.fillStyle=isNordic()?'rgba(5,22,43,.15)':stage===20?'rgba(142,0,8,.66)':'#07071126';ctx.fillRect(sx,sy,W,H);
  if(stage===20){ctx.fillStyle='rgba(255,25,40,.09)';ctx.fillRect(sx,sy,W,H);}
 }else{
  ctx.fillStyle='#211e30';ctx.fillRect(0,0,WORLD_W,WORLD_H);
 }
 // Sparse drifting snow in the Nordic kingdom, falling leaves in Japan.
 for(let i=0;i<24;i++){
  const px=(123+i*127+Math.sin(elapsed*.45+i)*10)%WORLD_W;
  const py=(187+i*151+elapsed*11)%WORLD_H;
  if(px<camera.x-10||px>camera.x+W+10||py<camera.y-10||py>camera.y+H+10)continue;
  ctx.globalAlpha=.48;drawR(px,py,2,2,isNordic()?(i%2?'#bdeafa':'#e9faff'):(i%2?'#c33d56':'#e9a58a'));
 }
 ctx.globalAlpha=1;
}
function shiftColor(hex,step){let n=parseInt(hex.slice(1),16),r=clamp((n>>16)+step,0,255),g=clamp(((n>>8)&255)+step,0,255),b=clamp((n&255)+step,0,255);return `rgb(${r},${g},${b})`}
function spritePixel(x,y,a,b=1,c=1){if(typeof a==='string')drawR(x,y,b,c,a);else drawR(x,y,a,b,c)}
function heroSprite(x,y,type,face='down',step=0,transform=false,scale=1,actor=null){
 const shown=actor||player;
 const frogActive=type==='kris'&&shown&&shown.frogTime>0;const im=frogActive?FROG:HERO[type];if(!im||!im.complete||!im.naturalWidth)return;
 const row={down:0,left:1,right:2,up:3}[face]??0;
 const walk=movingNow&&phase==='play';const sequence=[1,0,1,2];
 const col=walk?sequence[Math.floor(step*1.15)%sequence.length]:1;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);
 if(transform&&!lowFx()){
   ctx.shadowBlur=18;ctx.shadowColor='#9a52ff';ctx.fillStyle='#6a2db588';
   ctx.beginPath();ctx.ellipse(0,-13,17,20,0,0,TAU);ctx.fill();ctx.shadowBlur=0;
 }
 // Loid retains the original sprite; Kris now uses the corrected slim-legged 12-frame sheet.
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(im,col*112,row*112,112,112,frogActive?-23:-20,frogActive?-39:-34,frogActive?46:40,frogActive?46:40);ctx.imageSmoothingEnabled=true;
 if(frogActive){ctx.restore();return;}
 if(shown&&shown.type==='cross'&&shown.ultimateBuff==='cross'&&shown.ultimateBuffTime>0){ctx.shadowColor='#b375ff';ctx.shadowBlur=lowFx()?0:14;ctx.strokeStyle='#ab76ed';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-15,25,28,0,0,TAU);ctx.stroke();ctx.shadowBlur=0;}
 if(shown&&shown.type==='kris'&&shown.ultimateBuffTime>0){
  const k=shown.ultimateBuff;
  ctx.strokeStyle=k==='defesa'?'#99e6ff':k==='piedade'?'#91f9c5':k==='fight'?'#ff617d':'#b47dff';ctx.lineWidth=2;
  if(k==='defesa'){ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(0,-17,21,25,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
  if(k==='itens'){
   // Two blades beside the character, rather than replacing the sprite animation.
   ctx.strokeStyle='#24172b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-11,-27);ctx.lineTo(-24,-43);ctx.moveTo(11,-27);ctx.lineTo(24,-43);ctx.stroke();
   ctx.strokeStyle='#ac72fa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-11,-27);ctx.lineTo(-24,-43);ctx.moveTo(11,-27);ctx.lineTo(24,-43);ctx.stroke();
  }
 }

 if(transform){
   ctx.strokeStyle='#b573ff';ctx.lineWidth=2;ctx.beginPath();
   ctx.moveTo(-9,-26);ctx.lineTo(-16,-43);ctx.lineTo(-3,-34);
   ctx.moveTo(9,-26);ctx.lineTo(16,-43);ctx.lineTo(3,-34);ctx.stroke();
   ctx.globalAlpha=.6;ctx.strokeStyle='#dd7dff';ctx.beginPath();
   ctx.arc(0,-17,22,elapsed*2,elapsed*2+1.8);ctx.stroke();
 }
 ctx.restore();
}
function safeWalkFrame(e,cols=3,mult=1){
 const count=Math.max(1,Math.floor(cols));
 const step=Number.isFinite(e.step)?e.step:0;
 const phase=Number.isFinite(e.phase)?e.phase:0;
 const raw=Math.floor(step*mult+phase);
 return ((raw%count)+count)%count;
}
function drawNamelessDragon(){
 const boss=enemies.find(e=>e.type==='nameless'&&e.hp>0&&e.rage);
 if(!boss||!DRAGON_ART.complete||!DRAGON_ART.naturalWidth)return;
 ctx.save();ctx.globalAlpha=.7+Math.sin(elapsed*2)*.04;
 const dx=clamp(boss.x+155,230,WORLD_W-110),dy=clamp(boss.y-115,220,WORLD_H-140);
 ctx.drawImage(DRAGON_ART,dx-135,dy-285,270,300);ctx.restore();
}
function enemySprite(e){
 const img=ENEMY_ART[e.type];
 if(img&&img.complete&&img.naturalWidth){
  ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));
  if(e.type==='nameless'){
   const sz=112, bob=e.walking?Math.abs(Math.sin(e.step*1.1))*3:Math.sin(elapsed*2)*1.3;
   ctx.fillStyle='#080a1a99';ctx.beginPath();ctx.ellipse(0,0,40,13,0,0,TAU);ctx.fill();
   ctx.save();if(e.face==='left')ctx.scale(-1,1);if(e.rage){ctx.shadowColor='#81b8ff';ctx.shadowBlur=lowFx()?0:18;}
   ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,-sz/2,-sz+12-bob,sz,sz);ctx.restore();
   if(e.mode==='windup'||e.attackPose>0){ctx.strokeStyle='#b9e8ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-45,55,elapsed*4,elapsed*4+1.6);ctx.stroke();}
  }else if(e.type==='runeSeal'){ctx.strokeStyle='#a5f1ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-15,21,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(-10,-16);ctx.lineTo(0,-35);ctx.lineTo(10,-16);ctx.lineTo(0,5);ctx.closePath();ctx.stroke();}
  else if(e.type==='frostjarl'){
   // 4×4 atlas: frames 0–7 idle/walk, 8–11 axe swings, 12–15 ice magic.
   // Never use e.phase directly; some network snapshots omit it.
   const attack=e.mode==='windup'||(e.attackPose||0)>0;
   const frame=e.mode==='windup'?(8+(Math.floor(elapsed*5)%4)):
     (e.attackPose||0)>0?(12+(Math.floor(elapsed*9)%4)):
     e.walking?safeWalkFrame(e,8,.85):0;
   const sz=136;
   ctx.fillStyle='#0c1426a0';ctx.beginPath();ctx.ellipse(0,-2,49,13,0,0,TAU);ctx.fill();
   if(e.rage||attack){ctx.shadowColor='#73d9ff';ctx.shadowBlur=lowFx()?0:(e.rage?21:11);}
   ctx.save();if(e.face==='left'){ctx.scale(-1,1);}
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(img,(frame%4)*256,Math.floor(frame/4)*256,256,256,-sz/2,-sz+10,sz,sz);
   ctx.imageSmoothingEnabled=true;ctx.restore();ctx.shadowBlur=0;
   if(e.rage){ctx.strokeStyle='#88ddff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-49,68+Math.sin(elapsed*5)*3,71,0,0,TAU);ctx.stroke();}
   if(e.hurt>0){ctx.globalAlpha=Math.min(.22,e.hurt*2);ctx.fillStyle='#fff';ctx.fillRect(-55,-120,110,121);}
  }else if(isNordic()&&['draugr','frostwolf','berserker','runewitch'].includes(e.type)){
   const row={down:0,left:1,right:2,up:3}[e.face||'down']??0;
   const col=e.walking?safeWalkFrame(e,3,1.1):0;
   const sz=e.type==='frostwolf'?48:e.type==='berserker'?52:e.type==='runewitch'?48:45;
   ctx.imageSmoothingEnabled=false;ctx.drawImage(img,col*112,row*112,112,112,-sz/2,-sz+9,sz,sz);ctx.imageSmoothingEnabled=true;
   if(e.rage){ctx.strokeStyle='#a4e9ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-sz*.36,sz*.55+Math.sin(elapsed*5)*3,0,TAU);ctx.stroke();}
   if(e.hurt>0){ctx.globalAlpha=Math.min(.27,e.hurt*2);ctx.fillStyle='#fff';ctx.fillRect(-sz/2,-sz+9,sz,sz);}
  }else if(isBossEnemy(e)){
   const row={down:0,left:1,right:2,up:3}[e.face||'down']??0;
   const col=e.walking?safeWalkFrame(e,3,1.15):0;
   if(e.rage){ctx.shadowColor=e.type==='pecado'?'#f10d2c':e.type==='tsukuomi'?'#9f59ea':e.type==='reuni'?'#fa1e3e':'#f7367c';ctx.shadowBlur=lowFx()?0:10;ctx.fillStyle='#9e1d5166';ctx.beginPath();ctx.ellipse(0,-10,23,25,0,0,TAU);ctx.fill();ctx.shadowBlur=0;}
   if(e.mode==='guard'&&e.type==='boss'){ctx.strokeStyle='#fa607f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-12,32,0,TAU);ctx.stroke();}
   if(e.mode==='windup'){ctx.shadowColor=e.type==='tsukuomi'?'#ae78ff':'#f46c92';ctx.shadowBlur=lowFx()?0:10;}
   ctx.imageSmoothingEnabled=false;ctx.drawImage(img,col*112,row*112,112,112,e.type==='pecado'?-37:e.type==='tsukuomi'?-31:e.type==='reuni'?-28:-32,e.type==='pecado'?-78:e.type==='tsukuomi'?-63:e.type==='reuni'?-54:-53,e.type==='pecado'?74:e.type==='tsukuomi'?62:e.type==='reuni'?56:64,e.type==='pecado'?90:e.type==='tsukuomi'?70:e.type==='reuni'?62:64);ctx.imageSmoothingEnabled=true;ctx.shadowBlur=0;
   if(e.hurt>0){ctx.fillStyle='#fff';ctx.globalAlpha=Math.min(.25,e.hurt*2);ctx.fillRect(-21,-46,42,42);}
  }else{
   const col={down:0,left:1,up:2,right:3}[e.face||'down']??0;
   const size=e.type==='runner'?30:e.type==='beast'?39:e.type==='yokai'?36:e.type==='ghost'?35:33;
   // Older Oni sprites have one pose per direction. Animate the pose with a
   // rhythmic walking cycle and foot-shadow instead of freezing while moving.
   if(e.walking){const stride=Math.sin(e.step*.83+e.phase);const bob=Math.abs(stride)*1.6;ctx.fillStyle='#05030a70';ctx.beginPath();ctx.ellipse(0,0,size*.37,3,0,0,TAU);ctx.fill();ctx.translate(stride*1.25,-bob);ctx.rotate(stride*.037);}
   if(e.type==='ghost'){ctx.globalAlpha=.72+.18*Math.sin(elapsed*4+e.phase);ctx.translate(0,Math.sin(elapsed*3+e.phase)*3);}
   if(e.elite&&!lowFx()){ctx.shadowColor='#ffad66';ctx.shadowBlur=12;}
   ctx.drawImage(img,col*96,0,96,96,-size/2,-size+8,size,size);ctx.shadowBlur=0;
   if(e.hurt>0){ctx.globalAlpha=Math.min(.3,e.hurt*3);ctx.fillStyle='#fff';ctx.fillRect(-size/2,-size+8,size,size);}
  }
  ctx.restore();
 }else{ctx.fillStyle='#4f274d';ctx.fillRect(e.x-8,e.y-18,16,18)}
 if(e.corruptTime>0){ctx.save();ctx.strokeStyle='#bb58f7';ctx.globalAlpha=.72;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y-12,e.radius+6,e.radius+11,0,0,TAU);ctx.stroke();ctx.restore();}
 if(isBossEnemy(e)){
  const width=e.type==='nameless'?112:e.type==='frostjarl'?104:74, top=e.y-(e.type==='nameless'?115:e.type==='frostjarl'?140:54);
  drawR(e.x-width/2,top,width,7,'#160c18');
  drawR(e.x-width/2+1,top+1,(width-2)*Math.max(0,e.hp/e.maxHp),5,e.type==='nameless'?'#d2b7ff':e.type==='frostjarl'?'#9deaff':e.type==='pecado'?'#ff243b':e.type==='tsukuomi'?'#bc80ff':e.type==='reuni'?'#f61943':e.rage?'#f52d56':'#d97687');
 }
}
function drawTsukuomiNight(){
 if(eclipseTime<=0||phase!=='play')return;
 ctx.save();
 const alpha=Math.min(.63,.22+eclipseTime*.065);
 ctx.fillStyle=`rgba(9,2,26,${alpha})`;
 ctx.fillRect(camera.x,camera.y,W,H);
 const t=enemies.find(e=>e.type==='tsukuomi'&&e.hp>0);
 if(t){ctx.strokeStyle=`rgba(184,127,255,${Math.min(.7,eclipseTime*.14)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,71+Math.sin(elapsed*4)*5,0,TAU);ctx.stroke();}
 ctx.restore();
}
// Reuse high-quality gradient textures rather than rebuilding large radial gradients
// every frame. Keeps the same artwork on strong devices while preventing Loid R/Q
// from stalling weaker phones. Cache is never part of the multiplayer packets.
function cachedRadial(r,stops,inner){
 const cvs=document.createElement('canvas'),dpr=1.6;
 cvs.width=cvs.height=Math.ceil((r*2+6)*dpr);
 const c=cvs.getContext('2d',{alpha:true});
 c.scale(dpr,dpr);
 const center=cvs.width/(2*dpr);
 const gradient=c.createRadialGradient(center,center,inner,center,center,r);
 for(const [stop,color] of stops)gradient.addColorStop(stop,color);
 c.fillStyle=gradient;c.beginPath();c.arc(center,center,r,0,TAU);c.fill();
 return {canvas:cvs,offset:center,r};
}
let loidHaloCache=null;
function getLoidHalo(kind){
 if(!loidHaloCache)loidHaloCache={
  domain:cachedRadial(180,[[0,'rgba(2,1,7,.95)'],[.70,'rgba(3,2,9,.92)'],[.92,'rgba(10,3,20,.85)'],[1,'rgba(14,4,26,0)']],12),
  aura:cachedRadial(75,[[0,'rgba(8,5,13,.83)'],[.48,'rgba(16,8,22,.68)'],[.83,'rgba(22,9,35,.36)'],[1,'rgba(19,7,25,0)']],7)
 };
 return loidHaloCache[kind];
}
function drawDarkDomain(){if(voidCollapse>0){ctx.save();ctx.fillStyle='rgba(3,0,12,.79)';ctx.fillRect(camera.x,camera.y,W,H);ctx.restore();}
 if(!player||player.type!=='loid'||player.ultimateTime<=0)return;
 const radius=177,small=minimalFx();
 // Simple one-fill fallback on weak phones; no blur, filters or radial shaders.
 ctx.save();
 if(small){ctx.fillStyle='rgba(3,2,10,.82)';ctx.beginPath();ctx.arc(player.x,player.y,radius,0,TAU);ctx.fill();}
 else {const t=getLoidHalo('domain');ctx.drawImage(t.canvas,player.x-radius,player.y-radius,radius*2,radius*2);}
 ctx.strokeStyle='#683f95';ctx.globalAlpha=.72;ctx.lineWidth=small?1.5:3;
 ctx.beginPath();ctx.arc(player.x,player.y,radius-6,0,TAU);ctx.stroke();
 if(!lowFx()){ctx.strokeStyle='#b273e6';ctx.globalAlpha=.28;ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(player.x,player.y,radius-15,elapsed*.35,elapsed*.35+4.4);ctx.stroke();}
 ctx.restore();
}
function drawDarkAura(){
 if(!player||player.type!=='loid'||player.darkAuraTime<=0)return;
 ctx.save();
 if(minimalFx()){ctx.fillStyle='rgba(12,6,22,.52)';ctx.beginPath();ctx.arc(player.x,player.y-9,70,0,TAU);ctx.fill();}
 else {const t=getLoidHalo('aura');ctx.drawImage(t.canvas,player.x-75,player.y-9-75,150,150);}
 if(!lowFx()){
  ctx.strokeStyle='#15101f';ctx.lineWidth=3;ctx.globalAlpha=.75;
  for(let i=0;i<3;i++){
   const a=elapsed*(.5+i*.2)+i*TAU/3;
   ctx.beginPath();ctx.arc(player.x,player.y-9,45+i*7,a,a+1.6);ctx.stroke();
  }
 }
 ctx.restore();
}
function drawDashShadows(){
 if(!player||player.type!=='loid'||!dashShadows.length)return;
 for(let i=0;i<dashShadows.length;i++){
  if(minimalFx()&&i%3!==0)continue;
  const ghost=dashShadows[i];
  const a=Math.pow(Math.max(0,ghost.life/ghost.max),1.2);
  ctx.save();ctx.globalAlpha=a*.28;ctx.fillStyle='#13091c';
  ctx.beginPath();ctx.ellipse(ghost.x,ghost.y-10,12+7*(1-a),20,0,0,TAU);ctx.fill();
  ctx.globalAlpha=a*.5;
  if(!lowFx()){ctx.filter='brightness(0)';heroSprite(ghost.x,ghost.y,'loid',ghost.face,ghost.step,false,.96);ctx.filter='none';}
  else {ctx.fillStyle='#110a1c';ctx.beginPath();ctx.ellipse(ghost.x,ghost.y-12,11,18,0,0,TAU);ctx.fill();}
  ctx.globalAlpha=a*.36;ctx.strokeStyle='#61376f';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(ghost.x,ghost.y-13,9+(1-a)*13,0,TAU);ctx.stroke();ctx.restore();
 }
}
function drawNewFields(){ctx.save();for(const t of timeFields){ctx.globalAlpha=.22;ctx.fillStyle='#3f61ac';ctx.beginPath();ctx.arc(t.x,t.y,t.radius,0,TAU);ctx.fill();ctx.globalAlpha=.7;ctx.strokeStyle='#9ccaff';ctx.lineWidth=2;ctx.stroke();}for(const v of mirrorIllusions){ctx.globalAlpha=Math.min(.5,v.life/6*.5);heroSprite(v.x,v.y,v.owner?.type||'kali','down',elapsed*12,false,.85,v.owner);}ctx.restore();}
function drawEffects(){drawNewFields();for(const b of projectiles){if(b.mirror){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(elapsed*10);ctx.shadowColor='#d6a7ff';ctx.shadowBlur=lowFx()?0:7;if(MIRROR_SPRITE.complete&&MIRROR_SPRITE.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(MIRROR_SPRITE,-15,-15,30,30);ctx.imageSmoothingEnabled=true;}else{ctx.fillStyle='#ae70d8';ctx.fillRect(-8,-8,16,16);}ctx.restore();continue;}if(isNordic()&&b.from==='enemy'&&(b.color==='#a5e7ff'||b.color==='#98eaff')){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);ctx.fillStyle='#e6fcff';ctx.strokeStyle='#77cfff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(5,2);ctx.lineTo(0,9);ctx.lineTo(-5,2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}else{ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();}if(b.bone){ctx.strokeStyle='#fff9f4';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=b.color;ctx.fillRect(b.x-7,b.y-2,14,4);}drawR(b.x-1,b.y-1,2,2,'#f4d8ff')}
for(const s of slashes){ctx.save();ctx.globalAlpha=s.life/s.max;ctx.strokeStyle=s.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(s.x,s.y,s.r*.62,s.ang-1.25,s.ang+1.25);ctx.stroke();ctx.strokeStyle='#faf2fe';ctx.lineWidth=1;ctx.stroke();ctx.restore()}
for(const ring of rings){ctx.save();ctx.globalAlpha=ring.life/ring.max;ctx.strokeStyle=ring.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(ring.x,ring.y,ring.r*(1.35-ring.life/ring.max*.35),0,TAU);ctx.stroke();ctx.restore()}
for(const p of particles){if(lowFx()&&(p.x<camera.x-15||p.x>camera.x+W+15||p.y<camera.y-15||p.y>camera.y+H+15))continue;ctx.save();ctx.globalAlpha=Math.min(1,p.life/p.max);if(p.text){ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#17111c';ctx.fillText(p.text,p.x+1,p.y+1);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y)}else{drawR(p.x,p.y,p.size,p.size,p.color)}ctx.restore()}}

function drawHealthDrops(){
 for(const h of healthDrops){if(h.x<camera.x-20||h.x>camera.x+W+20||h.y<camera.y-20||h.y>camera.y+H+20)continue;
  ctx.save();ctx.translate(h.x,h.y-6+Math.sin(elapsed*5+h.phase)*3);
  let k=1+Math.sin(elapsed*7+h.phase)*.13;ctx.scale(k,k);
  ctx.shadowBlur=lowFx()?0:8;ctx.shadowColor='#ff5e89';ctx.fillStyle='#6d1839';ctx.fillRect(-7,-3,14,11);ctx.shadowBlur=0;
  ctx.fillStyle='#ff6a85';ctx.fillRect(-7,-5,5,7);ctx.fillRect(2,-5,5,7);ctx.fillRect(-5,0,10,6);ctx.fillRect(-3,6,6,4);ctx.fillRect(-1,10,2,2);ctx.fillStyle='#ffe4da';ctx.fillRect(-4,-4,2,3);ctx.restore();
 }
}

function drawSpiritAura(p){
 ctx.save();ctx.globalAlpha=.44;ctx.strokeStyle='#a6e9ff';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.ellipse(p.x,p.y-17,16,23,0,0,TAU);ctx.stroke();
 ctx.fillStyle='#80d7f333';ctx.beginPath();ctx.ellipse(p.x,p.y-17,13,21,0,0,TAU);ctx.fill();ctx.restore();
}
function draw(){
 ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality=lowFx()?'low':'high';
 ctx.save();
 if(shake>0&&phase==='play')ctx.translate(rand(-shake,shake),rand(-shake,shake));
 ctx.save();ctx.translate(-Math.round(camera.x),-Math.round(camera.y));
 drawMap();drawNamelessDragon();drawBossWarnings();
 if(phase!=='select'){
  // Sort actors by their feet for an understandable top-down overlap.
  const actors=enemies.filter(e=>e.x>camera.x-110&&e.x<camera.x+W+110&&e.y>camera.y-120&&e.y<camera.y+H+120).map(e=>({y:e.y,kind:'enemy',e}));
  if(player)actors.push({y:player.y,kind:'player'});if(coop.active)for(const [id,a] of coop.allies)actors.push({y:a.y,kind:'ally',a,id});for(const s of shadowClones){if(s.x>camera.x-60&&s.x<camera.x+W+60&&s.y>camera.y-60&&s.y<camera.y+H+60)actors.push({y:s.y,kind:'clone',s});}
  actors.sort((a,b)=>a.y-b.y);
  drawTsukuomiNight();drawDarkDomain();drawDarkAura();
  if(coop.active)for(const ally of coop.allies.values()){
    if(ally.type!=='loid'||ally.hp<=0)continue;
    const r=ally.ultimateTime>0?178:ally.darkAuraTime>0?70:0;
    if(!r)continue;
    ctx.save();ctx.fillStyle=ally.ultimateTime>0?(minimalFx()?'#08030b9c':'#08030bcb'):'#130d21a3';ctx.beginPath();ctx.arc(ally.x,ally.y,r,0,TAU);ctx.fill();
    if(!minimalFx()){ctx.strokeStyle='#8552a6';ctx.lineWidth=2;ctx.stroke();}ctx.restore();
  }drawDashShadows();drawXansPortals();drawEvePortals();drawDimensionalCharge();
  for(const a of actors){
   if(a.kind==='enemy')enemySprite(a.e);else if(a.kind==='clone')drawShadowClone(a.s);else if(a.kind==='ally'){const p=a.a;ctx.save();if(p.hp<=0){drawSpiritAura(p);ctx.globalAlpha=.46;}heroSprite(p.x,p.y,p.type,p.face,p.step,p.transformTime>0,1,p);ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='bold 8px system-ui';ctx.fillStyle='#f7e3fd';ctx.strokeStyle='#160921';ctx.lineWidth=2;const name=p.type==='cross'?'XANS':p.type.toUpperCase();ctx.strokeText(name,p.x,p.y-45);ctx.fillText(name,p.x,p.y-45);ctx.fillStyle='#311524';ctx.fillRect(p.x-17,p.y-40,34,3);ctx.fillStyle=p.hp>0?'#d15d83':'#9ee9f6';ctx.fillRect(p.x-17,p.y-40,p.hp>0?34*Math.max(0,p.hp/p.maxHp):34,3);ctx.restore();}
   else if(player){
    if(player.orbiters){for(let i=0;i<player.orbiters;i++){let t=elapsed*2+i*TAU/player.orbiters;ctx.fillStyle='#7e4bbb';ctx.beginPath();ctx.arc(player.x+Math.cos(t)*23,player.y+Math.sin(t)*13,4,0,TAU);ctx.fill()}}
    if(player.transformTime>0){ctx.globalAlpha=.26;ctx.fillStyle='#a452ff';ctx.beginPath();ctx.arc(player.x,player.y-8,18+Math.sin(elapsed*10)*3,0,TAU);ctx.fill();ctx.globalAlpha=1}
    ctx.save();if(player.hp<=0){drawSpiritAura(player);ctx.globalAlpha=.46;}else if(player.invuln>0&&Math.floor(elapsed*18)%2!==0)ctx.globalAlpha=.5;
    heroSprite(player.x,player.y,player.type,player.face,player.step,player.transformTime>0);ctx.restore();
   }
  }
  drawEffects();drawDamageFloats();drawCardBeam();drawXansSkulls();drawHealthDrops();
  if(player&&player.curseTime>0){ctx.save();ctx.strokeStyle='#ff1c50';ctx.globalAlpha=.6;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y-12,23+Math.sin(elapsed*8)*3,0,TAU);ctx.stroke();ctx.restore();}
 }
 ctx.restore();
 if(phase==='select'){ctx.fillStyle='#100e1c44';ctx.fillRect(0,0,W,H)}
 if(waveIntro>0&&phase==='play'){
  ctx.save();ctx.globalAlpha=Math.min(1,waveIntro,2.3-waveIntro+.45);
  const introBossArt=stage===25?JARL_BOSS_ART:stage===5?SAMURAI_BOSS_ART:null;
  if(introBossArt?.complete&&introBossArt.naturalWidth){ctx.fillStyle=stage===25?'#081625eb':'#2c0a17eb';ctx.fillRect(W/2-110,H/2-94,220,160);ctx.drawImage(introBossArt,W/2-53,H/2-90,106,108);}
  ctx.fillStyle='#160e22eb';ctx.fillRect(W/2-103,H/2-27,206,54);
  ctx.strokeStyle='#b981a4';ctx.strokeRect(W/2-103,H/2-27,206,54);
  ctx.font='bold 18px Georgia';ctx.textAlign='center';ctx.fillStyle='#ffe6ca';
  ctx.fillText(isNordic()?'NÓRDICO · '+String(localNordicWave()).padStart(2,'0'):'JAPÃO · '+String(stage).padStart(2,'0'),W/2,H/2-5);
  ctx.font='10px Georgia';ctx.fillStyle='#edb7c8';ctx.fillText(waveName(stage),W/2,H/2+13);ctx.restore();
 }
 if(bossMessageTimer>0&&phase==='play'){
  ctx.save();ctx.font='bold 10px Georgia';ctx.textAlign='center';ctx.fillStyle='#170d1de0';ctx.fillRect(W/2-140,32,280,21);ctx.strokeStyle='#db7b8e';ctx.strokeRect(W/2-140,32,280,21);ctx.fillStyle='#ffe1cc';ctx.fillText(bossMessage,W/2,46);ctx.restore();
 }
 if(flash>0){ctx.fillStyle=`rgba(255,60,105,${flash*.95})`;ctx.fillRect(0,0,W,H)}
 ctx.restore();
}
function updateHud(){
 if(!player)return;
 syncSkillArt(player.type);$('secondaryName').textContent=player.type==='loid'?'SOMBRAS':player.type==='cross'?'OSSOS':player.type==='eve'?'TEMPO':player.type==='kali'?'ILUSÕES':'CORTE';
 $('btnSecondary').querySelector('b').textContent=player.type==='loid'?'SOMBRAS E':player.type==='cross'?'OSSOS E':player.type==='eve'?'TEMPO E':player.type==='kali'?'ESPELHOS E':'CORTE E';
 $('playerName').textContent=(player.type==='loid'?'LOID · ESCURIDÃO':player.type==='cross'?'XANS · CORRUPÇÃO':player.type==='eve'?'EVE LOREY · VAZIO':player.type==='kali'?'KALI · ESPELHOS':player.frogSkill?'KRIS · FORMA DO SAPO':'KRIS · ESPADA NEGRA')+(player.curseTime>0?' · ⚠ FRAQUEZA '+Math.ceil(player.curseTime)+'s':'');
 $('hpFill').style.width=Math.max(0,player.hp/player.maxHp*100)+'%';
 $('hpText').textContent=`${Math.ceil(player.hp)} / ${player.maxHp}`;
 const skillPct=player.frogSkill?(player.frogUsed?0:100):Math.max(0,100*(1-player.skillCd/player.skillDelay));
 $('powerFill').style.width=skillPct+'%';
 $('powerText').textContent=player.frogSkill?(player.frogTime>0?'Q · SAPO ATIVO · ATAQUE J':player.frogUsed?'Q · SAPO UTILIZADO':'Q · SAPO PRONTO (1x)'):player.skillCd>0?`Q · ${player.skillCd.toFixed(1)} s`:'Q · PODER PRONTO';
 const charge=Math.max(0,Math.min(100,player.ultimateCharge));
 $('ultimateFill').style.width=charge+'%';
 $('ultimateText').textContent=player.type==='cross'&&player.ultimateBuff==='cross'&&player.ultimateBuffTime>0?'RUPTURA ATIVA':player.ultimateTime>0?'DOMÍNIO '+player.ultimateTime.toFixed(1)+'s':player.ultimateBuffTime>0?'SUPREMO ATIVO':charge>=100?'R · SUPREMO PRONTO':`R · CARGA ${Math.floor(charge)}%`;
 $('btnUltimate').classList.toggle('cool',charge<100);
 $('btnSkill').classList.toggle('cool',player.frogSkill?player.frogUsed:player.skillCd>0);
 $('btnDash').classList.toggle('cool',player.dashCd>0);
 $('btnSecondary').classList.toggle('cool',player.secondaryCd>0&&!player.secondaryCharging);
 $('btnSkill').dataset.timer=player.frogSkill?(player.frogUsed?'USADO':'SAPO'):player.skillCd>0?player.skillCd.toFixed(1)+'s':'';
 $('btnDash').dataset.timer=player.dashCd>0?player.dashCd.toFixed(1)+'s':'';
 $('btnUltimate').dataset.timer=charge<100?Math.floor(charge)+'%':'';
 $('btnSecondary').dataset.timer=player.secondaryCd>0?player.secondaryCd.toFixed(1)+'s':'';
 $('btnSkill').style.setProperty('--readiness',skillPct+'%');
 const bCard=$('btnCardPower');bCard.style.display=player.cardPower?'flex':'none';bCard.classList.toggle('cool',player.cardPowerUsed||player.cardPower==='granita'&&player.ultimateCharge<50);bCard.querySelector('b').textContent=player.cardPower==='gaster'?'GASTER F':'GRANITA F';bCard.dataset.timer=player.cardPowerUsed?'USADO':player.cardPower==='granita'&&player.ultimateCharge<50?'50%':'';
 $('btnDash').style.setProperty('--readiness',Math.max(0,100*(1-player.dashCd/player.dashDelay))+'%');
 $('btnUltimate').style.setProperty('--readiness',charge+'%');
 $('cooldownSkill').textContent=player.frogSkill?(player.frogUsed?'USADO':'SAPO 1x'):player.skillCd>0?player.skillCd.toFixed(1)+'s':'PRONTO';
 $('cooldownDash').textContent=player.dashCd>0?player.dashCd.toFixed(1)+'s':'PRONTO';
 $('cooldownUltimate').textContent=charge>=100?'PRONTO':Math.floor(charge)+'%';
 $('cooldownSkillSlot').style.setProperty('--readiness',skillPct+'%');
 $('cooldownSecondary').textContent=player.secondaryCharging?'CARREGANDO '+Math.round(player.secondaryCharge/1.6*100)+'%':player.secondaryCd>0?player.secondaryCd.toFixed(1)+'s':'PRONTO';
 $('cooldownSecondarySlot').style.setProperty('--readiness', (player.secondaryCharging?player.secondaryCharge/1.6*100:Math.max(0,100*(1-player.secondaryCd/player.secondaryDelay)))+'%');
 $('btnSecondary').style.setProperty('--readiness', (player.secondaryCharging?player.secondaryCharge/1.6*100:Math.max(0,100*(1-player.secondaryCd/player.secondaryDelay)))+'%');
 $('cooldownDashSlot').style.setProperty('--readiness',Math.max(0,100*(1-player.dashCd/player.dashDelay))+'%');
 $('cooldownUltimateSlot').style.setProperty('--readiness',charge+'%');
 $('stageText').textContent=(isNordic()?'NÓRDICO '+String(localNordicWave()).padStart(2,'0'):'JAPÃO '+String(stage).padStart(2,'0'))+(isNordic()?'':stage===20?' · PECADO':stage===15?' · TSUKUOMI':stage===10?' · REUNI':stage%5===0?' · CHEFE':'')+(isPecador()?' ✦ PECADOR':'');
 $('themeText').textContent=theme().name;
 $('counterText').textContent=`INIMIGOS ${enemies.filter(e=>e.hp>0).length} · ESSÊNCIA ${essence}`+(isNordic()?' · 20 RUNAS INICIAIS':'')+(coop.active?` · ONLINE ${coop.members.length}/5`:'');
}

function pickCards(){const pool=isNordic()?nordicCards:cards;let valid=pool.filter(c=>(!c.hero||c.hero===player.type)&&!(c.id==='gaster'&&player.cardPower)&&!(c.id==='granita'&&player.cardPower)&&!(c.id==='frog'&&(player.frogSkill||player.frogUsed))&&!(player.frogSkill&&['black','form','awakening','bloodmoon'].includes(c.id))),selected=[];while(selected.length<3&&valid.length){let index=Math.floor(Math.random()*valid.length),c=valid.splice(index,1)[0],weight=c.rarity==='legendary'?.11:c.rarity==='rare'?.45:1;if(Math.random()<weight||valid.length<3-selected.length)selected.push(c)}if(!isNordic()&&player.type==='kris'&&!player.frogSkill&&stage===8&&!selected.some(c=>c.id==='frog')){selected[1]=cards.find(c=>c.id==='frog');}if(!isNordic()&&player.type==='cross'&&!player.cardPower&&stage===8&&!selected.some(c=>c.id==='gaster'))selected[1]=cards.find(c=>c.id==='gaster');if(!isNordic()&&player.type==='loid'&&!player.cardPower&&stage===11&&!selected.some(c=>c.id==='granita'))selected[1]=cards.find(c=>c.id==='granita');return selected.slice(0,3)}
const rarLabel={common:'COMUM',rare:'RARA',legendary:'LENDÁRIA'};
function showRewards(){if(coop.active)coop.chosen=false;YG_AUDIO.play('waveClear',1.17);opts=pickCards();let gg=$('rewardGrid');gg.innerHTML='';for(let i=0;i<opts.length;i++){const c=opts[i],b=document.createElement('button');b.className='upgrade '+c.rarity+(isNordic()?' nordic-card':'');b.innerHTML=`<span class="num">0${i+1}</span><div class="iconbox"><img class="card-art" alt="" src="${CARD_IMAGES[c.id]}"></div><strong>${c.name}</strong><span class="rar">◆ ${rarLabel[c.rarity]}</span><div class="desc">${c.desc}</div>`;b.onclick=()=>chooseCard(i);gg.appendChild(b)}$('rewardSubtitle').textContent=(isNordic()?'❄ NÓRDICO · ONDA '+String(localNordicWave()).padStart(2,'0')+' · CARTAS RÚNICAS ❄':'◆ ONDA '+String(stage).padStart(2,'0')+' VENCIDA ◆');$('rewardScreen').classList.remove('hidden');updateHud()}
function chooseCard(i){if(phase!=='reward'||!opts[i])return;let c=opts[i];YG_AUDIO.play('card',1.15);if(coop.active){if(coop.chosen)return;coop.chosen=true;$('rewardScreen').classList.add('hidden');if(coop.host){awardCard(player,c);coop.choices.add(coop.id);showWaitingCards();coopTryWave();}else {showWaitingCards();coopAction('card',c.id);}return;}awardCard(player,c);makeParticles(player.x,player.y,'#dfb9ff',25);testBossMode=false;stage++;spawnStage();}
function restart(){if(coop.active){if(coop.host){coopSend({t:'rematch'});coopNote('Voltando à mesma sala...');}else{coopSend({t:'rematchRequest'});coopNote('Solicitação de revanche enviada ao anfitrião.');$('retry').textContent='AGUARDANDO ANFITRIÃO...';}return;}YG_AUDIO.play('menu',.75);phase='title';testBossMode=false;waveClearTimer=-1;dashShadows=[];shadowClones=[];hazards=[];frostBursts=[];bossMessageTimer=0;player=null;keys.clear();mouseAim=null;pointerDown=false;attackMobile=false;mobileMove={x:0,y:0};enemies=[];particles=[];slashes=[];$('titleScreen').classList.remove('hidden');$('selectScreen').classList.add('hidden');$('worldScreen').classList.add('hidden');$('supremeScreen').classList.add('hidden');$('rewardScreen').classList.add('hidden');$('waitingCards').classList.add('hidden');$('gameOverScreen').classList.add('hidden');$('coopScreen').classList.add('hidden');$('hud').style.display='none';$('mobileControls').style.display='none';document.body.classList.remove('is-playing');adaptViewport()}
function frame(time){
 if(coop.active&&player){const death=$('fallenScreen');if(death)death.classList.toggle('hidden',!(phase==='play'&&player.hp<=0));}
 perfFrames++;if(!perfStart)perfStart=time;
 if(time-perfStart>1000){
  const fps=Math.round(perfFrames*1000/(time-perfStart));callbackFps=fps;
  const drawnFps=Math.round(drawnFrames*1000/(time-perfStart));visibleFps=drawnFps;
  if(renderMode==='auto'&&touchUI&&phase==='play'){
   if(fps<43){slowSeconds++;fastSeconds=0;}else if(fps>56){fastSeconds++;slowSeconds=0;}else{slowSeconds=fastSeconds=0;}
   // Escalate GPU savings if the phone struggles; restore only after sustained stability.
   if(slowSeconds>=2){
    if(autoFxTier<2)autoFxTier++;
    RENDER_SCALE=Math.max(.58,+(RENDER_SCALE-.13).toFixed(2));slowSeconds=0;adaptViewport(true);
   }else if(fastSeconds>=14){
    if(autoFxTier>0)autoFxTier--;
    RENDER_SCALE=Math.min(weakMobileHint?1.20:1.70,+(RENDER_SCALE+.08).toFixed(2));fastSeconds=0;adaptViewport(true);
   }
  }
  const el=$('performanceMeter');if(el){const ms=netRtt===null?'CONECTANDO':Math.round(netRtt)+' ms';const loss=coop.active&&!coop.host&&time-(coop.lastMotionArrival||0)>1500?' · SINAL FRACO':'';
   const visual=renderMode==='auto'&&touchUI?(autoFxTier===2?' · AUTO DESEMP.':autoFxTier===1?' · AUTO LEVE':' · AUTO HD'):renderMode==='desempenho'?' · DESEMP.':'';
   el.textContent='FPS '+drawnFps+' · REDE '+(!coop.active?'OFFLINE':ms+' · J '+Math.round(netJitter)+' ms · '+coop.networkRx+'/s'+loss)+visual;
  }
  coop.networkRx=0;perfFrames=0;drawnFrames=0;perfStart=time;
 }
 if(coop.active&&coop.socket?.readyState===WebSocket.OPEN&&time-netPingStart>3500){netPingStart=time;coopSend({t:'ping',ts:Date.now()});}
 if(!last)last=time;const dt=Math.min((time-last)/1000,.032);last=time;
 if(coop.active&&!coop.host){
  if(touchUI&&attackMobile&&!attackManualAim)mobileAutoAim(false);
  elapsed+=dt;
  if(player){predictGuest(dt,time);coopGuestVisualUpdate(dt);}
  coopSendInput(time);
 }else{
  update(dt);
  if(coop.active&&coop.host){
   const buffered=coop.socket?.bufferedAmount||0;
   if(time-coop.lastMotion>=(buffered>16000?100:50)){coop.lastMotion=time;coopSendMotion();}
   const interval=buffered>16000?190:buffered>5000?150:120;
   if(time-coop.lastSnapshot>=interval){coop.lastSnapshot=time;coopSendState();}
  }
 }
 // The graphics stay unchanged in normal mode. Performance mode saves GPU/CPU time.
 // Adaptive 30-FPS presentation on very weak devices. Physics, input sampling and
 // multiplayer packets continue on each animation tick, not on the render cadence.
 const maxDrawGap=minimalFx()?32:renderMode==='leve'?22:0;
 if(!maxDrawGap||time-(coop.lastDrawTime||0)>=maxDrawGap){draw();drawnFrames++;coop.lastDrawTime=time;}
 requestAnimationFrame(frame);
}
// Guest prediction stays local: never pull a moving player back toward a stale snapshot.
function predictGuest(dt,time){
 let mx=mobileMove.x,my=mobileMove.y;
 if(keys.has('w')||keys.has('arrowup'))my-=1;
 if(keys.has('s')||keys.has('arrowdown'))my+=1;
 if(keys.has('a')||keys.has('arrowleft'))mx-=1;
 if(keys.has('d')||keys.has('arrowright'))mx+=1;
 const active=phase==='play'&&Math.hypot(mx,my)>.09;
 movingNow=active;
 const d=active?norm(mx,my):{x:0,y:0};
 const speed=player.hp<=0?116:player.speed*(player.type==='loid'&&player.ultimateTime>0?1.65:1)*(player.curseTime>0?.78:1);
 if(active&&!player.crossTp&&!player.dashTime){
  player.x+=d.x*speed*dt;player.y+=d.y*speed*dt;
  player.face=Math.abs(d.x)>Math.abs(d.y)?d.x<0?'left':'right':d.y<0?'up':'down';player.step+=dt*11;
  if(!mouseAim)player.aim=Math.atan2(d.y,d.x);
 }
 if(coop.targetLocal && !player.crossTp && time-(coop.lastMotionArrival||0)<260){
  const target=coop.targetLocal;
  const age=Math.min(.16,Math.max(0,(time-(coop.lastMotionArrival||time))/1000)+Math.min(.10,(netRtt||60)/2000));
  // Host state is already old when it arrives; project it forward, only if moving.
  const tx=target.x+(active?d.x*speed*age:0),ty=target.y+(active?d.y*speed*age:0);
  const error=Math.hypot(tx-player.x,ty-player.y);
  if(error>115){player.x=tx;player.y=ty;}
  else if(!active){const k=Math.min(1,dt*(error>55?13:8));player.x+=(tx-player.x)*k;player.y+=(ty-player.y)*k;}
  // During input, old authoritative positions are not allowed to slow down movement.
 }
 applyBoundaries(player,8);
 for(const [id,target] of coop.targetAllies){
  const a=coop.allies.get(id);if(!a)continue;
  const e=Math.hypot(target.x-a.x,target.y-a.y);
  const k=e>95?1:Math.min(1,dt*(e>25?18:13));
  a.x+=(target.x-a.x)*k;a.y+=(target.y-a.y)*k;
  if(target.face)a.face=target.face;
  if(target.step!==undefined)a.step=target.step;
 }
 camera.x+=(clamp(player.x-W/2,0,Math.max(0,WORLD_W-W))-camera.x)*Math.min(1,dt*12);
 camera.y+=(clamp(player.y-H/2,0,Math.max(0,WORLD_H-H))-camera.y)*Math.min(1,dt*12);
}
// Guest receives ONE authoritative combat world. Never run combat AI or apply
// damage on the guest. Predict the local player, interpolate the replicated world.
function coopGuestVisualUpdate(dt){
 if(!player)return;
 player.atkTime=Math.max(0,(player.atkTime||0)-dt);
 player.dashCd=Math.max(0,(player.dashCd||0)-dt);
 player.skillCd=Math.max(0,(player.skillCd||0)-dt);
 player.secondaryCd=Math.max(0,(player.secondaryCd||0)-dt);
 if(player.dashTime>0){
  player.dashTime=Math.max(0,player.dashTime-dt);
  player.x+=player.dashV.x*(player.type==='eve'?590:340)*dt;player.y+=player.dashV.y*(player.type==='eve'?590:340)*dt;
  if(player.type==='loid'&&Math.random()<.5&&dashShadows.length<20)
    dashShadows.push({x:player.x,y:player.y,face:player.face,step:player.step,life:.30,max:.30});
 }
 for(let i=slashes.length-1;i>=0;i--){slashes[i].life-=dt;if(slashes[i].life<=0)slashes.splice(i,1);}
 for(let i=rings.length-1;i>=0;i--){rings[i].life-=dt;if(rings[i].life<=0)rings.splice(i,1);}
 for(let i=dashShadows.length-1;i>=0;i--){dashShadows[i].life-=dt;if(dashShadows[i].life<=0)dashShadows.splice(i,1);}
 updateDamageFloats(dt);
 const age=performance.now()-coop.lastCombatPacket;
 const tau=Math.min(0.17,Math.max(0,age/1000));
 for(const e of enemies){
  const t=coop.enemyTargets.get(e.id);if(!t)continue;
  const tx=t.x+clamp(t.vx*tau,-20,20),ty=t.y+clamp(t.vy*tau,-20,20);
  const err=Math.hypot(tx-e.x,ty-e.y);
  const k=err>130?1:1-Math.exp(-dt*17);
  e.x+=(tx-e.x)*k;e.y+=(ty-e.y)*k;
  e.step=(e.step||0)+dt*(e.speed||45)*.18;
 }
 for(const b of projectiles){b.x+=Number(b.vx||0)*dt;b.y+=Number(b.vy||0)*dt;}
 // Host alone decides damage, cooldowns and wave progression.
 updateHud();
}
function drawPortrait(id,type){
 let c=$(id),ct=c.getContext('2d'),oc=ctx;
 const paint=()=>{
  ct.imageSmoothingEnabled=false;ct.clearRect(0,0,90,90);
  ct.fillStyle=type==='loid'?'#291326':'#121a33';ct.fillRect(0,0,90,90);
  ct.fillStyle=type==='loid'?'#57233c':'#254776';ct.fillRect(4,4,82,82);
  ct.strokeStyle=type==='loid'?'#ca6489':'#6e9deb';ct.lineWidth=2;
  ct.beginPath();ct.arc(45,47,31,0,Math.PI*2);ct.stroke();
  ctx=ct;heroSprite(45,87,type,'down',0,false,1.45);ctx=oc;
 };
 if(HERO[type].complete&&HERO[type].naturalWidth) paint(); else HERO[type].addEventListener('load',paint,{once:true});
}
// v2.3 — assisted targeting is TOUCH ONLY, and optional in settings.
// Use world-space positions so the identical aim is sent to the host in multiplayer.
let attackManualAim=false;
function mobileFindTarget(strong=false){
 if(!touchUI||!player||phase!=='play')return null;
 const living=enemies.filter(e=>e.hp>0);
 if(!living.length)return null;
 const inView=living.filter(e=>e.x>=camera.x-35&&e.x<=camera.x+W+35&&e.y>=camera.y-35&&e.y<=camera.y+H+35);
 const pool=inView.length?inView:living.filter(e=>dist(e,player)<520);
 if(!pool.length)return null;
 if(strong){return pool.reduce((best,e)=>{
  const power=t=>(isBossEnemy(t)?10000000:0)+(t.elite?100000:0)+(t.maxHp||t.hp||0);
  return !best||power(e)>power(best)?e:best;
 },null);}
 return pool.reduce((best,e)=>!best||dist(e,player)<dist(best,player)?e:best,null);
}
function mobileAutoAim(strong=false){
 if(!touchUI||!ctrlSettings.aimAssist||!player||phase!=='play'||player.hp<=0||attackManualAim)return false;
 const target=mobileFindTarget(strong);if(!target)return false;
 player.aim=Math.atan2(target.y-player.y,target.x-player.x);
 mouseAim={x:target.x,y:target.y};return true;
}
function mobilePreparePowerAim(){
 if(touchUI){attackManualAim=false;mobileAutoAim(true);}
}
// Input: full keyboard, mouse aim, and touch virtual controls.
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase(); if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
 if(phase==='ultimate'){if(['1','2','3','4'].includes(key))chooseUltimate(['fight','defesa','itens','piedade'][Number(key)-1]);return;}
 if(phase==='reward'){if(['1','2','3'].includes(key))chooseCard(Number(key)-1);return;}
 if(phase==='title'){if(key==='enter')openSelection();return;}
 if(phase!=='play')return;
 keys.add(key);
 if(key===' ')dash();if(key==='q')skill();if(key==='e'&&!e.repeat)secondaryDown();if(key==='r')ultimate();if(key==='f')cardPower();if(key==='j')attack();
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k==='e')secondaryUp();});window.addEventListener('blur',()=>{if(player)player.secondaryCharging=false;keys.clear();attackMobile=false;pointerDown=false;mobileMove={x:0,y:0}});
function canvasPos(e){let b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*W+camera.x,y:(e.clientY-b.top)/b.height*H+camera.y}}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&phase==='play')mouseAim=canvasPos(e)});
canvas.addEventListener('pointerdown',e=>{if(phase!=='play')return;e.preventDefault();let p=canvasPos(e);mouseAim=p;pointerDown=true;attack();canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>{pointerDown=false});canvas.addEventListener('pointercancel',()=>{pointerDown=false});
const joy=$('joystick'),knob=$('knob');let joyPid=null;
function joyPosition(e){
 const b=joy.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy,rad=Math.max(16,b.width*.29),len=Math.hypot(dx,dy);
 const factor=Math.min(1,rad/Math.max(len,.001));
 const px=dx*factor,py=dy*factor;
 knob.style.left=`calc(50% + ${px}px)`;knob.style.top=`calc(50% + ${py}px)`;
 const strength=len/rad;
 // Small movement is a deadzone, not an accidental walk. Diagonals never exceed magnitude 1.
 const usable=strength<=.14?0:Math.min(1,(strength-.14)/.86);
 mobileMove=usable?{x:dx/len*usable,y:dy/len*usable}:{x:0,y:0};
 // Moving the left thumb does not cancel right-thumb manual targeting.
 if(!attackMobile&&touchUI)mouseAim=null;
}
joy.addEventListener('pointerdown',e=>{e.preventDefault();if(joyPid!==null)return;joyPid=e.pointerId;joy.setPointerCapture(e.pointerId);joyPosition(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPid)joyPosition(e)});function joyEnd(e){if(e.pointerId!==joyPid)return;joyPid=null;mobileMove={x:0,y:0};knob.style.left='50%';knob.style.top='50%'}joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);joy.addEventListener('lostpointercapture',joyEnd);
let attackStick=false,attackPointer=null;const attackButton=$('btnAttack');
function attackAim(e){
 if(!attackStick||attackPointer!==e.pointerId||!player)return;
 const r=attackButton.getBoundingClientRect();
 const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
 if(Math.hypot(dx,dy)>12){
  attackManualAim=true;
  player.aim=Math.atan2(dy,dx);
  mouseAim={x:player.x+Math.cos(player.aim)*220,y:player.y+Math.sin(player.aim)*220};
 }
}
attackButton.addEventListener('pointerdown',e=>{
 e.preventDefault();if(attackPointer!==null)return;
 attackMobile=true;attackPointer=e.pointerId;attackManualAim=false;
 attackButton.setPointerCapture(e.pointerId);
 // Tap = target automatically. Drag the attack joystick = aim manually.
 if(touchUI)mobileAutoAim(false);
 attackAim(e);attack();
});
attackButton.addEventListener('pointermove',attackAim);
function attackEnd(e){if(e.pointerId!==attackPointer)return;attackMobile=false;attackPointer=null;attackManualAim=false;if(touchUI)mouseAim=null;}
for(const event of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(event,attackEnd);
$('btnCardPower').addEventListener('pointerdown',e=>{e.preventDefault();mobilePreparePowerAim();cardPower()});$('btnDash').addEventListener('pointerdown',e=>{e.preventDefault();dash()});$('btnSkill').addEventListener('pointerdown',e=>{e.preventDefault();mobilePreparePowerAim();skill()});$('btnUltimate').addEventListener('pointerdown',e=>{e.preventDefault();mobilePreparePowerAim();ultimate()});
const secBtn=$('btnSecondary');let secPid=null;secBtn.addEventListener('pointerdown',e=>{e.preventDefault();secPid=e.pointerId;secBtn.setPointerCapture(e.pointerId);mobilePreparePowerAim();secondaryDown();});for(const event of ['pointerup','pointercancel','lostpointercapture'])secBtn.addEventListener(event,e=>{if(e.pointerId!==secPid)return;secPid=null;mobilePreparePowerAim();secondaryUp();});
function setDifficulty(val){difficulty=val==='pecador'?'pecador':'normal';document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===difficulty;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});}
function openSelection(bossId=null){
 YG_AUDIO.play('menu');phase='select';selectedBoss=bossId;
 $('titleScreen').classList.add('hidden');$('bossScreen').classList.add('hidden');$('selectScreen').classList.remove('hidden');
 $('selectionTitle').textContent=bossId?'ESCOLHA QUEM ENFRENTA O CHEFE':'ESCOLHA SEU HERÓI';
 const names={nordic:'REINO NÓRDICO · 1ª ONDA',frostjarl:'JARL DO GELO · ONDA 25',nameless:'CAVALEIRO INOMINÁVEL · ONDA 35 (NÓRDICA 15)',samurai:'DAIMYŌ ONI · ONDA 5',reuni:'REUNI · ONDA 10',tsukuomi:'TSUKUOMI · ONDA 15',pecado:'PECADO · ONDA 20'};
 $('selectionIntro').textContent=bossId?'TESTE IMEDIATO: '+names[bossId]+' — escolha um dos cinco protagonistas.':(selectedCampaign==='nordic'?'REINO NÓRDICO · 15 ondas independentes. Escolha seu herói.':'JAPÃO · 20 ondas independentes. Escolha seu herói.');
 $('selectionBack').textContent=bossId?'← VOLTAR AOS CHEFES':'← ESCOLHER OUTRO REINO';
}
function openBossList(){YG_AUDIO.play('menu');phase='bosslist';$('titleScreen').classList.add('hidden');$('selectScreen').classList.add('hidden');$('bossScreen').classList.remove('hidden');}
function launchHero(type){start(type,selectedBoss,false);}
function openWorldSelect(){YG_AUDIO.play('menu');phase='world';$('titleScreen').classList.add('hidden');$('selectScreen').classList.add('hidden');$('worldScreen').classList.remove('hidden');}
function chooseWorld(world){selectedCampaign=world==='nordic'?'nordic':'japan';$('worldScreen').classList.add('hidden');openSelection();}
$('worldJapan').addEventListener('click',()=>chooseWorld('japan'));
$('worldNordic').addEventListener('click',()=>chooseWorld('nordic'));
$('worldBack').addEventListener('click',()=>{phase='title';$('worldScreen').classList.add('hidden');$('titleScreen').classList.remove('hidden');});
$('titleStart').addEventListener('click',openWorldSelect);
$('nordicRealmBtn').addEventListener('click',()=>{selectedCampaign='nordic';openSelection('nordic');});
$('titleSelect').addEventListener('click',openBossList);
$('bossBack').addEventListener('click',()=>{phase='title';$('bossScreen').classList.add('hidden');$('titleScreen').classList.remove('hidden')});
$('selectionBack').addEventListener('click',()=>{if(selectedBoss&&selectedBoss!=='nordic')openBossList();else openWorldSelect();});
for(const b of document.querySelectorAll('[data-boss]'))b.addEventListener('click',()=>openSelection(b.dataset.boss));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setDifficulty(b.dataset.mode)));setDifficulty('normal');
for(const btn of document.querySelectorAll('[data-supreme]'))btn.addEventListener('click',()=>chooseUltimate(btn.dataset.supreme));
$('chooseLoid').addEventListener('click',()=>launchHero('loid'));
$('chooseKris').addEventListener('click',()=>launchHero('kris'));
$('chooseCross').addEventListener('click',()=>launchHero('cross'));$('chooseEve').addEventListener('click',()=>launchHero('eve'));$('chooseKali').addEventListener('click',()=>launchHero('kali'));
$('restart').onclick=restart;$('retry').onclick=restart;

// -- Multiplayer test: one host-authoritative game, two remote players, 10 snapshots/s. --
function coopConnect(action, code=''){
 if(location.protocol==='file:'){coopNote('Online precisa abrir pelo servidor: execute npm start e acesse o link publicado.');return;}
 if(!window.WebSocket){coopNote('Este navegador não suporta WebSocket.');return;}
 if(coop.socket){try{coop.socket.close();}catch{}}
 const sock=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');coop.socket=sock;
 coopNote('Conectando à sala...');
 sock.onopen=()=>coopSend(action==='create'?{t:'create'}:{t:'join',code});
 sock.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}coopOnMessage(m)};
 sock.onerror=()=>coopNote('Erro de conexão. É necessário um servidor Node.js com WebSocket.');
 sock.onclose=()=>{if(coop.active){coop.active=false;coopNote('A conexão caiu. Volte ao menu para entrar novamente.');}else coopNote('Servidor indisponível. Confira se o projeto está rodando no Node.');};
}
function coopRenderLobby(){
 $('coopConnect').hidden=true;$('coopLobby').hidden=false;
 $('coopRoomCode').textContent=coop.room||'------';
 $('coopPeople').textContent=coop.members.length+' de 5 jogadores: '+coop.members.map(m=>(m.id===coop.id?'VOCÊ':m.id===coop.hostId?'ANFITRIÃO':'ALIADO')+' — '+(m.hero||'escolhendo')).join(' · ');
 $('coopHostOptions').hidden=!coop.host;
 if(coop.host){const d=$('coopDifficulty');if(d&&!d.dataset.touched)d.value=difficulty;}
 document.querySelectorAll('[data-coop-hero]').forEach(b=>{const mine=coop.members.some(m=>m.id===coop.id&&m.hero===b.dataset.coopHero);const occupied=coop.members.some(m=>m.id!==coop.id&&m.hero===b.dataset.coopHero);b.classList.toggle('selected',mine);b.disabled=occupied;b.title=occupied?'Já escolhido por outro jogador':'';});
 $('coopBegin').disabled=!coop.host||coop.members.length<2||coop.members.some(m=>!m.hero)||new Set(coop.members.map(m=>m.hero)).size!==coop.members.length;
}
function coopOnMessage(m){
 switch(m.t){
 case 'pong':netRtt=Math.max(0,Date.now()-Number(m.ts||Date.now()));return;
 case 'welcome':
   coop.active=true;coop.id=m.id;coop.room=m.code;coop.hostId=m.host;coop.host=m.host===m.id;coop.members=m.members;coop.allies.clear();coop.choices.clear();coop.chosen=false;coopRenderLobby();coopNote('Conectado! Escolha seu herói e compartilhe o código.');return;
 case 'lobby':
   coop.room=m.code;coop.hostId=m.host;coop.host=m.host===coop.id;coop.members=m.members;coopRenderLobby();return;
 case 'error':coopNote(m.message||'Erro na sala.');return;
 case 'rematchRequest':if(coop.host)coopNote('Um aliado pediu revanche. Clique em Reiniciar para voltar à mesma sala.');return;
 case 'lobbyReset':{coop.active=true;coop.remoteStarted=false;coop.chosen=false;coop.choices.clear();coop.selectingUltimate=false;coop.allies.clear();coop.targetAllies.clear();coop.targetLocal=null;coop.guestVisibleHp=null;coop.hostAvatar=null;phase='coop';player=null;enemies=[];projectiles=[];healthDrops=[];shadowClones=[];waveClearTimer=-1;keys.clear();pointerDown=false;attackMobile=false;document.body.classList.remove('is-playing');$('hud').style.display='none';$('mobileControls').style.display='none';for(const id of ['gameOverScreen','rewardScreen','waitingCards','fallenScreen','supremeScreen','titleScreen'])$(id).classList.add('hidden');$('coopScreen').classList.remove('hidden');$('coopConnect').hidden=true;$('coopLobby').hidden=false;$('retry').textContent='TENTAR NOVAMENTE / MESMA SALA';coopRenderLobby();coopNote('Mesma sala! Escolham o personagem e iniciem novamente.');return;}
 case 'closed':coop.active=false;coopNote(m.message||'Sala fechada.');restart();return;
 case 'left':coop.allies.delete(m.id);coop.choices.delete(m.id);return;
 case 'begun':{
   coop.active=true;coop.hostId=m.host;coop.host=m.host===coop.id;coop.members=m.members;
   coop.lastStateSeq=0;coop.stateSeq=0;coop.lastMotionSeq=0;coop.motionSeq=0;coop.guestVisibleHp=null;
   coop.enemyTargets.clear();coop.lastCombatPacket=0;
   const mine=m.members.find(p=>p.id===coop.id);const hero=mine?.hero||'loid';
   difficulty=m.difficulty==='pecador'?'pecador':'normal';selectedCampaign=m.boss==='nordic'||m.boss==='frostjarl'||m.boss==='nameless'?'nordic':'japan';coop.chosen=false;coop.choices.clear();coop.remoteStarted=true;
   $('coopScreen').classList.add('hidden');start(hero,m.boss||false,false);
   if(!coop.host){coop.allies=new Map();let i=0;const others=m.members.filter(mp=>mp.id!==coop.id);for(const mp of others){const a=createPlayer(mp.hero);if(activeCampaign==='nordic')grantNordicStarter(a);const angle=(i+++0.5)*Math.PI*2/Math.max(others.length,1);a.x=player.x+Math.cos(angle)*62;a.y=player.y+Math.sin(angle)*62;coop.allies.set(mp.id,a);}coopNote('Online iniciado.');}
   return;}
 case 'remoteInput':if(coop.host){const a=coop.allies.get(m.id);if(a){a.input={x:m.x||0,y:m.y||0,aim:Number(m.aim)||0,attack:!!m.attack};a.inputAt=performance.now();}}return;
 case 'remotePress':if(coop.host)coopRemotePress(m.id,m.action,m.value,m.aim,m.dx,m.dy);return;
 case 'signal':if(!coop.host&&m.value==='ultimate'){
     coop.selectingUltimate=true;phase='ultimate';$('supremeScreen').classList.remove('hidden');
   }return;
 case 'motion':if(!coop.host){coop.networkRx++;coopApplyMotion(m); }return;
 case 'state':if(!coop.host){coop.networkRx++;lastStateArrival=performance.now();coopApplyState(m.data);}return;
 }
}
function coopInitAllies(){
 coop.allies.clear();
 let allyIndex=0;const allyTotal=Math.max(1,coop.members.length-1);for(const m of coop.members){if(m.id===coop.id)continue;
   const a=createPlayer(m.hero||'loid');if(activeCampaign==='nordic')grantNordicStarter(a);const angle=(allyIndex+++.5)*Math.PI*2/allyTotal;a.x=WORLD_W/2+Math.cos(angle)*62;a.y=WORLD_H/2+120+Math.sin(angle)*62;
   a.input={x:0,y:0,aim:-Math.PI/2,attack:false};a.inputAt=performance.now();a.lastAttack=0;
   coop.allies.set(m.id,a);
 }
}
function coopAction(action,value){
 if(!coop.active||!player)return;
 const move=getMove();
 const aim=mouseAim?Math.atan2(mouseAim.y-player.y,mouseAim.x-player.x):player.aim;
 coopSend({t:'press',action,value,aim,dx:move.x,dy:move.y});
}
function coopRemotePress(id,action,value,aim,dx,dy){
 const a=coop.allies.get(id);if(!a||phase==='over')return;
 if(Number.isFinite(aim))a.aim=aim;
 if(Number.isFinite(dx)&&Number.isFinite(dy)){
  a.input=a.input||{x:0,y:0,aim:a.aim,attack:false};
  a.input.x=clamp(dx,-1,1);a.input.y=clamp(dy,-1,1);a.input.aim=a.aim;
  a.inputAt=performance.now();
 }
 if(action==='card'){
   if(phase!=='reward'||coop.choices.has(id))return;
   const c=(isNordic()?nordicCards:cards).find(c=>c.id===value&&(!c.hero||c.hero===a.type));if(!c)return;
   if((c.id==='frog'&&a.frogSkill)||(['gaster','granita'].includes(c.id)&&a.cardPower))return;
   awardCard(a,c);coop.choices.add(id);coopTryWave();return;
 }
 if(action==='ultimateChoice'){
   if(a.type!=='kris'||!a.coopUltimatePending)return;
   if(!['fight','defesa','itens','piedade'].includes(value))return;
   a.coopUltimatePending=false;a.ultimateBuff=value;a.ultimateBuffTime={fight:9,defesa:3,itens:11,piedade:9}[value];
   if(value==='piedade')a.hp=a.maxHp;
   ring(a.x,a.y,50,'#bd84ff');return;
 }
 if(phase!=='play'||a.hp<=0)return;
 // Held attack is checked every frame; skip no-op strikes before expensive camera/actor setup.
 if(action==='attack'&&a.atkTime>0)return;
 if(action==='ultimate'&&a.type==='kris'){
   if(a.ultimateCharge>=100&&!a.coopUltimatePending){a.ultimateCharge=0;a.coopUltimatePending=true;coopSend({t:'signal',to:id,value:'ultimate'});}return;
 }
 const actionCanExecute=action!=='attack'||a.atkTime<=0;
 const before=player,cam={...camera},hostMouseAim=mouseAim;
 coop.actorId=id;coop.executing=true;player=a;mouseAim=null;
 camera.x=clamp(a.x-W/2,0,WORLD_W-W);camera.y=clamp(a.y-H/2,0,WORLD_H-H);
 try{
   if(action==='attack')attack();
   if(action==='q')skill();
   if(action==='eDown')secondaryDown();
   if(action==='eUp')secondaryUp();
   if(action==='dash')dash();
   if(action==='ultimate')ultimate();
   if(action==='f')cardPower();
 }finally{
  player=before;mouseAim=hostMouseAim;coop.actorId=null;coop.executing=false;
  camera.x=cam.x;camera.y=cam.y;
 }
 // Immediately replicate actions, not 125ms later; this makes a remote strike,
 // dash and power visible to EVERY client, including their effects and enemy HP.
  if(coop.active&&coop.host&&actionCanExecute){coopSendState(true);coopSendMotion();}
 
}
function coopAdvance(dt){
 for(const [id,a] of coop.allies){
   for(const k of ['dashCd','skillCd','secondaryCd','invuln','curseTime','frostTime','atkTime','darkAuraTime','ultimateTime','ultimateBuffTime','transformTime','frogTime'])a[k]=Math.max(0,(a[k]||0)-dt);
   if(a.secondaryCharging)a.secondaryCharge=Math.min(1.6,a.secondaryCharge+dt);
   if(a.type==='cross')updateCrossBones(a,dt,id);
   // V3.4: a guest's Eve Lorey ultimate must tick on the HOST as well.
   // Previously only the local host hero entered tickEveUltimate(), so a remote
   // Eve cast the darkness effect but never actually desintegrated the Onis.
   if(a.type==='eve'&&a.voidUltimate>0){
     const previous=player; player=a;
     try{tickEveUltimate(dt);}finally{player=previous;}
   }

   const inp=a.input||{x:0,y:0,aim:-Math.PI/2,attack:false};
   if(a.hp<=0){
    // Free-roaming spirit: movement is replicated, but attacks cannot fire.
    if(performance.now()-(a.inputAt||0)<850){const ghostDir=norm(inp.x,inp.y);
     if(Math.hypot(inp.x,inp.y)>.08){a.x+=ghostDir.x*116*dt;a.y+=ghostDir.y*116*dt;
      a.step+=dt*8;a.face=Math.abs(ghostDir.x)>Math.abs(ghostDir.y)?ghostDir.x<0?'left':'right':ghostDir.y<0?'up':'down';}}
    a.ghost=true;applyBoundaries(a,8);continue;
   }
   if(performance.now()-(a.inputAt||0)>850){inp.x=0;inp.y=0;inp.attack=false;}
   const dir=norm(inp.x,inp.y);const active=Math.hypot(inp.x,inp.y)>.08;
   if(a.type==='cross'&&a.crossTp){updateCrossTeleport(a,dt);}
   else if(a.dashTime>0){a.dashTime=Math.max(0,a.dashTime-dt);a.x+=a.dashV.x*340*dt;a.y+=a.dashV.y*340*dt;}
   else if(active){a.x+=dir.x*a.speed*(a.type==='loid'&&a.ultimateTime>0?1.65:1)*(a.curseTime>0?.78:1)*(a.frostTime>0?.72:1)*dt;
     a.y+=dir.y*a.speed*(a.type==='loid'&&a.ultimateTime>0?1.65:1)*(a.curseTime>0?.78:1)*(a.frostTime>0?.72:1)*dt;a.step+=dt*11;
     a.face=Math.abs(dir.x)>Math.abs(dir.y)?dir.x<0?'left':'right':dir.y<0?'up':'down';}
   if(Number.isFinite(inp.aim))a.aim=inp.aim;
   applyBoundaries(a,8);
   if(inp.attack){coopRemotePress(id,'attack');}
   if(a.type==='loid'&&a.darkAuraTime>0){a.darkAuraTick=(a.darkAuraTick||0)-dt;
     if(a.darkAuraTick<=0){a.darkAuraTick=.47;const original=player;player=a;for(const e of enemies){if(e.hp>0&&dist(e,a)<77+e.radius){hitEnemy(e,a.damage*.55*a.skillAmp);e.slow=Math.max(e.slow||0,.65);}}player=original;}}
   if(a.type==='loid'&&a.ultimateTime>0){a.ultimateTick=(a.ultimateTick||0)-dt;
     if(a.ultimateTick<=0){a.ultimateTick=.24;const original=player;player=a;for(const e of enemies){if(e.hp>0&&dist(e,a)<185+e.radius)hitEnemy(e,a.damage*1.18*a.skillAmp);}player=original;}}
 }
}
function showWaitingCards(count=coop.choices.size,total=coop.members.length){const el=$('waitingCards');if(!el)return;el.classList.remove('hidden');$('waitingProgress').textContent=`${count} / ${total} jogadores escolheram`; }
function coopTryWave(){
 if(!coop.active||!coop.host||phase!=='reward')return;
 if(coop.members.every(m=>coop.choices.has(m.id))){$('waitingCards').classList.add('hidden');coop.chosen=false;coop.choices.clear();testBossMode=false;stage++;spawnStage();}
}
function coopSendInput(t){
 if(!coop.active||coop.host||phase!=='play'||t-coop.lastInput<33||!player)return;
 coop.lastInput=t;
 let mx=mobileMove.x,my=mobileMove.y;
 if(keys.has('w')||keys.has('arrowup'))my-=1;if(keys.has('s')||keys.has('arrowdown'))my+=1;
 if(keys.has('a')||keys.has('arrowleft'))mx-=1;if(keys.has('d')||keys.has('arrowright'))mx+=1;
 const v=norm(mx,my);let aim=player.aim;
 if(mouseAim)aim=Math.atan2(mouseAim.y-player.y,mouseAim.x-player.x);
 else if(Math.hypot(mx,my)>.1)aim=Math.atan2(my,mx);
 coopSend({t:'input',x:Math.hypot(mx,my)>.05?v.x:0,y:Math.hypot(mx,my)>.05?v.y:0,aim,attack:keys.has('j')||pointerDown||attackMobile});
}
// 20 Hz movement-only channel: ~300 bytes instead of retransmitting projectiles,
// cards and particles every time. World/combat remains authoritative at the host.
function coopSendMotion(){
 if(!coop.active||!coop.host||!player)return;
 const actors={};
 const capture=p=>({x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,face:p.face,step:Math.round((p.step||0)*10)/10,hp:Math.round(p.hp*10)/10});
 actors[coop.id]=capture(player);
 for(const [id,a] of coop.allies)actors[id]=capture(a);
 coopSend({t:'motion',seq:++coop.motionSeq,actors});
}
// A remote client must SEE when it takes damage. Previously the health bar
// could jump to zero with no local hit indicator because only the host simulated hurtPlayer.
function coopGuestHealthChange(nextHp){
 if(!Number.isFinite(nextHp)||!player)return;
 const prev=coop.guestVisibleHp;
 if(prev!==null&&nextHp<prev-.7&&phase==='play'){
  textPop(player.x,player.y-28,'-'+Math.ceil(prev-nextHp),'#ff728c','hero:'+coop.id);
  flash=Math.max(flash,.10);shake=Math.max(shake,1.2);
  YG_AUDIO.play('hurt',.55);
 }
 coop.guestVisibleHp=nextHp;
}
function coopApplyMotion(m){
 if(!m||!m.actors||m.seq<=coop.lastMotionSeq)return;
 coop.lastMotionSeq=m.seq;
 const now=performance.now();
 if(coop.lastMotionArrival){const gap=now-coop.lastMotionArrival;netJitter=netJitter*.86+Math.abs(gap-coop.networkExpected)*.14;}
 coop.lastMotionArrival=now;
 const mine=m.actors[coop.id];
 if(mine&&Number.isFinite(mine.x)&&Number.isFinite(mine.y)){
  coop.targetLocal={x:mine.x,y:mine.y};
  if(player){coopGuestHealthChange(Number(mine.hp));player.hp=mine.hp;if(mine.face&&!movingNow)player.face=mine.face;}
 }
 for(const [id,target] of Object.entries(m.actors)){
  if(id===coop.id||!Number.isFinite(target.x)||!Number.isFinite(target.y))continue;
  coop.targetAllies.set(id,target);
  const a=coop.allies.get(id);if(a){a.hp=target.hp;}
 }
}
function coopSendState(force=false){
 if(!coop.active||!coop.host||!player||(!force&&coop.socket?.bufferedAmount>48000))return;
 const actors={};actors[coop.id]=player;for(const [id,a] of coop.allies)actors[id]=a;
 // IMPORTANT: every peer receives the COMPLETE arena, not the host camera's view.
 // No random per-client enemy selection or culled mobs; boss HP and hit registration
 // are calculated only here, on the host.
 const slim=(e)=>{const o={};for(const k of [
  'id','type','x','y','hp','maxHp','radius','face','step','mode','move',
  'phase','rage','hurt','attack','attackTime','atkTime','windup','charge','chargeTime',
  'chargeDir','guardTime','guardCd','corruptTime','corrupted','slow','speed',
  'counterCd','summonTimer','bossPhase','specialIndex','corruptionPhase','isElite',
  'elite','stunTime','timeSlow','burnTime','burnTick','angle','r','color','vx','vy','bone','life',
  'max','from','damage','ownerId','mirror','lockX','lockY','time','telegraph'
 ])if(e[k]!==undefined)o[k]=e[k];return o;};
 const mandatory=coop.lastStateStage!==stage||coop.lastStatePhase!==phase;
 const sendActors={};for(const [id,p] of Object.entries(actors)){
  const o={};for(const [k,v] of Object.entries(p)){
   if(typeof v==='function'||k==='input'||k==='inputAt'||k==='lastAttack'||k==='cards'||k==='lastX'||k==='lastY')continue;
   o[k]=v;
  }if(mandatory&&p.cards?.length)o.cards=p.cards.slice();sendActors[id]=o;
 }
 coop.lastStateStage=stage;coop.lastStatePhase=phase;
 const packet={t:'state',data:{seq:++coop.stateSeq,actors:sendActors,
  stage,phase,difficulty,essence,choicesCount:coop.choices.size,
  memberCount:coop.members.length,
  enemies:enemies.filter(e=>e.hp>0).map(slim),
  projectiles:projectiles.slice(-160).map(slim),
  hazards:hazards.slice(-60),healthDrops:healthDrops,
  rings:rings.slice(-20),slashes:slashes.slice(-20),
  shadowClones:shadowClones.slice(-12),dashShadows:dashShadows.slice(-18),
  bonusBeam,xansBlasters:xansBlasters.slice(-4),timeFields:timeFields.slice(-3).map(t=>({...t})),mirrorIllusions:mirrorIllusions.slice(-6).map(v=>({x:v.x,y:v.y,life:v.life,ownerType:v.owner?.type||'kali'})),voidCollapse,evePortals:evePortals.slice(-5),waveIntro,eclipseTime,bossMessage,bossMessageTimer,elapsed,mandatory
 }};
 coopSend(packet);
}
function coopApplyState(s){
 if(!s||!s.actors||!s.actors[coop.id])return;
 if(Number.isFinite(s.seq)&&s.seq<=coop.lastStateSeq)return;
 if(Number.isFinite(s.seq))coop.lastStateSeq=s.seq;
 const receivedAt=performance.now();coop.lastCombatPacket=receivedAt;
 const target=s.actors[coop.id];
 if(!player||player.type!==target.type){player=createPlayer(target.type);coop.guestVisibleHp=null;}
 coopGuestHealthChange(Number(target.hp));
 const wasStage=stage,wasX=player.x,wasY=player.y,localAim=player.aim;
 Object.assign(player,target);
 // Local aim belongs to the player holding the controls; network snapshots
 // must not constantly replace it with an older direction from the host.
 if(Number.isFinite(localAim))player.aim=localAim;
 if(performance.now()-coop.lastMotionArrival>550)coop.targetLocal={x:target.x,y:target.y};
 if(wasStage===s.stage&&!target.crossTp&&Math.hypot(wasX-target.x,wasY-target.y)<130){player.x=wasX;player.y=wasY;}
 const nextAllies=new Map(),nextTargets=new Map();
 for(const [id,hero] of Object.entries(s.actors)){
  if(id===coop.id)continue;const old=coop.allies.get(id);if(old?.cards&&!hero.cards)hero.cards=old.cards;
  if(old&&wasStage===s.stage&&!hero.crossTp&&Math.hypot(old.x-hero.x,old.y-hero.y)<130){nextAllies.set(id,{...hero,x:old.x,y:old.y});}
  else nextAllies.set(id,hero);
  if(performance.now()-coop.lastMotionArrival>550)nextTargets.set(id,{x:hero.x,y:hero.y});else nextTargets.set(id,coop.targetAllies.get(id)||{x:hero.x,y:hero.y});
 }
 coop.allies=nextAllies;coop.targetAllies=nextTargets;
 stage=s.stage;activeCampaign=stage>=21?'nordic':'japan';difficulty=s.difficulty||'normal';essence=s.essence;if(coop.chosen&&s.phase==='reward')showWaitingCards(s.choicesCount,s.memberCount);
 // Reuse visible enemy objects by ID, smoothly tracking the server's version.
 const oldEnemies=new Map(enemies.map(e=>[e.id,e]));
 const nextEnemyTargets=new Map();
 enemies=(s.enemies||[]).map(incoming=>{
  const old=oldEnemies.get(incoming.id);
  if(!old)return {...incoming,walking:true};
  incoming.walking=Math.hypot(incoming.x-(old._serverX??old.x),incoming.y-(old._serverY??old.y))>.25;
  const delta=Math.max(.035,(receivedAt-(old._receivedAt||receivedAt-125))/1000);
  const vx=clamp((incoming.x-(old._serverX??old.x))/delta,-260,260);
  const vy=clamp((incoming.y-(old._serverY??old.y))/delta,-260,260);
  const x=old.x,y=old.y;
  // Visual confirmation for remote hits (never applies damage locally).
  const damageSeen=Number(old.hp)-Number(incoming.hp);
  if(Number.isFinite(damageSeen)&&damageSeen>0.9&&phase==='play'){
    textPop(incoming.x,incoming.y-19,Math.round(damageSeen),'#f7d0ff',incoming.id);
  }
  Object.assign(old,incoming);
  old._receivedAt=receivedAt;old._serverX=incoming.x;old._serverY=incoming.y;
  if(Math.hypot(x-incoming.x,y-incoming.y)<130){old.x=x;old.y=y;}
  nextEnemyTargets.set(incoming.id,{x:incoming.x,y:incoming.y,vx,vy});
  return old;
 });
 for(const incoming of s.enemies||[]){if(!nextEnemyTargets.has(incoming.id))nextEnemyTargets.set(incoming.id,{x:incoming.x,y:incoming.y,vx:0,vy:0});}
 coop.enemyTargets=nextEnemyTargets;
 projectiles=s.projectiles||[];hazards=s.hazards||[];
 healthDrops=s.healthDrops||[];rings=s.rings||[];slashes=s.slashes||[];shadowClones=s.shadowClones||[];dashShadows=s.dashShadows||[];
 bonusBeam=s.bonusBeam||null;xansBlasters=s.xansBlasters||[];timeFields=s.timeFields||[];mirrorIllusions=(s.mirrorIllusions||[]).map(v=>({...v,owner:{type:v.ownerType}}));voidCollapse=s.voidCollapse||0;if(Array.isArray(s.evePortals)&&s.evePortals.length){const old=evePortals.filter(x=>x.local);evePortals=[...old,...s.evePortals.map(p=>({...p}))].slice(-7);}waveIntro=s.waveIntro||0;eclipseTime=s.eclipseTime||0;
 bossMessage=s.bossMessage||'';bossMessageTimer=s.bossMessageTimer||0;
 if(!coop.selectingUltimate){
   if(s.phase==='reward'&&phase!=='reward'){phase='reward';coop.chosen=false;showRewards();}
   else if(s.phase==='play'&&phase!=='play'){phase='play';$('waitingCards').classList.add('hidden');coop.chosen=false;$('rewardScreen').classList.add('hidden');$('supremeScreen').classList.add('hidden');}
   else if(s.phase==='over'&&phase!=='over'){phase='over';$('gameOverScreen').classList.remove('hidden');$('endTitle').textContent='FIM DA PARTIDA';$('endText').textContent='A equipe chegou à onda '+stage+'.';}
 }
 updateHud();const death=$('fallenScreen');if(death)death.classList.toggle('hidden',!(coop.active&&phase==='play'&&player.hp<=0));
}
function coopLeave(){
 if(coop.socket){coopSend({t:'leave'});try{coop.socket.close();}catch{}}
 coop.active=false;coop.host=false;coop.id=null;coop.hostId=null;coop.room=null;coop.socket=null;
 coop.members=[];coop.allies.clear();coop.targetAllies.clear();coop.targetLocal=null;coop.hostAvatar=null;coop.guestVisibleHp=null;coop.choices.clear();coop.chosen=false;coop.actorId=null;coop.executing=false;coop.selectingUltimate=false;
 $('coopScreen').classList.add('hidden');$('coopConnect').hidden=false;$('coopLobby').hidden=true;
}
$('titleOnline').addEventListener('click',()=>{
 phase='coop';$('titleScreen').classList.add('hidden');$('coopScreen').classList.remove('hidden');$('coopConnect').hidden=false;$('coopLobby').hidden=true;coopNote('Crie uma sala ou entre com o código de um amigo.');
});
$('coopCreate').addEventListener('click',()=>coopConnect('create'));
$('coopJoin').addEventListener('click',()=>coopConnect('join',$('coopCode').value));
$('coopBack').addEventListener('click',()=>{coopLeave();phase='title';$('titleScreen').classList.remove('hidden');});
$('coopCopy').addEventListener('click',()=>{if(coop.room&&navigator.clipboard)navigator.clipboard.writeText(coop.room).then(()=>coopNote('Código copiado!')).catch(()=>coopNote('Código da sala: '+coop.room));});
for(const b of document.querySelectorAll('[data-coop-hero]'))b.addEventListener('click',()=>coopSend({t:'choose',hero:b.dataset.coopHero}));
$('coopDifficulty').addEventListener('change',e=>{e.target.dataset.touched='1';setDifficulty(e.target.value);});
$('coopBegin').addEventListener('click',()=>{const selected=$('coopDifficulty').value;setDifficulty(selected);coopSend({t:'begin',boss:$('coopBoss').value||'japan',difficulty:selected});});


// Mobile UI preferences; only CSS sizes change, never the original artwork.
const ctrlSettings={scale:1,attackStick:false,aimAssist:true};
function applyControlSettings(){document.documentElement.style.setProperty('--control-zoom',ctrlSettings.scale);attackStick=ctrlSettings.attackStick;const t=$('attackModeLabel');if(t)t.textContent=attackStick?'JOYSTICK DE ATAQUE':'BOTÃO DE ATAQUE';const b=$('btnAttack');if(b)b.classList.toggle('aim-stick',attackStick);}
function openControlSettings(){$('settingsScreen').classList.remove('hidden');$('sizeControl').value=String(Math.round(ctrlSettings.scale*100));$('stickControl').checked=ctrlSettings.attackStick;$('assistControl').checked=ctrlSettings.aimAssist;}
$('openSettings').addEventListener('click',openControlSettings);
$('closeSettings').addEventListener('click',()=>$('settingsScreen').classList.add('hidden'));
$('sizeControl').addEventListener('input',e=>{ctrlSettings.scale=Number(e.target.value)/100;applyControlSettings();});
$('stickControl').addEventListener('change',e=>{ctrlSettings.attackStick=e.target.checked;applyControlSettings();});
$('assistControl').addEventListener('change',e=>{ctrlSettings.aimAssist=e.target.checked;if(!e.target.checked&&touchUI){mouseAim=null;attackManualAim=false;}});
$('renderControl').addEventListener('change',e=>{
 renderMode=e.target.value;
 autoFxTier=renderMode==='auto'?(weakMobileHint?1:0):0;slowSeconds=fastSeconds=0;
 RENDER_SCALE=renderMode==='desempenho'?.64:renderMode==='leve'?.88:renderMode==='qualidade'?(touchUI?2.0:2.35):(weakMobileHint?1.0:1.2);
 adaptViewport(true);
 try{localStorage.setItem('ygg_render_mode_v19',renderMode);}catch{}
});
try{const saved=localStorage.getItem('ygg_render_mode_v19');if(['auto','leve','qualidade','desempenho'].includes(saved)){$('renderControl').value=saved;renderMode=saved;RENDER_SCALE=renderMode==='desempenho'?.64:renderMode==='leve'?.88:renderMode==='qualidade'?(touchUI?2.0:2.35):(weakMobileHint?1.0:1.2);autoFxTier=renderMode==='auto'?(weakMobileHint?1:0):0;adaptViewport(true);}}catch{}
applyControlSettings();

requestAnimationFrame(frame);
