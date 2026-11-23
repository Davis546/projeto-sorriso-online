// YGGDRASIL v3.6 — authoritative duel simulation shared from the original X1 rules.
// No DOM/canvas is used by this module. Server owns positions, hits, cooldowns and winner.
const HP=11200,MAP_W=1920,MAP_H=1400;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const heroes={loid:{name:'LOID',dmg:128,speed:175,attack:.37,range:46,crit:.09,skill:9,second:20,dash:2.4,color:'#cda4f2'},kris:{name:'KRIS',dmg:158,speed:157,attack:.43,range:109,crit:.08,skill:14,second:8.5,dash:2.8,color:'#6dbbff'},cross:{name:'XANS',dmg:137,speed:174,attack:.40,range:98,crit:.26,skill:6.5,second:9,dash:2.55,color:'#bb74ff'},eve:{name:'EVE LOREY',dmg:175,speed:197,attack:.34,range:113,crit:.15,skill:21,second:18,dash:2.2,color:'#916aff'},kali:{name:'KALI',dmg:113,speed:162,attack:.44,range:157,crit:.08,skill:20,second:18,dash:2.6,color:'#dfaafa'}};
const cards={
  heart:['Coração da Raiz','+1.100 de vida máxima.'],blade:['Fio da Ruína','+12% de dano.'],fast:['Dança das Lâminas','+10% de rapidez de ataque.'],speed:['Passos Leves','+8% velocidade de movimento.'],armor:['Casca Ancestral','9% menos dano recebido.'],reach:['Alcance da Raiz','+10% alcance (máximo 25%).'],dodge:['Reflexos Antigos','Esquiva recarrega mais rápido.'],critical:['Olho do Predador','+8% chance de crítico.'],arc:['Corte Crescente','Aumenta o arco do ataque.'],echo:['Eco da Lâmina','12% chance de segundo golpe.'],ancient:['Herança de Yggdrasil','+6% vida, dano e velocidade.'],shadowblade:['Lâmina Sombria','Loid: +14% de dano.'],shadowdash:['Passo Sombrio','Loid: esquiva 18% mais rápida.'],darkburst:['Abismo Desperto','Loid: aura mais forte.'],black:['Fúria Negra','Kris: +25% dano transformado.'],form:['Forma Perfeita','Kris: +3s de transformação.'],awakening:['Despertar','Kris: Q recarrega mais rápido.'],bloodmoon:['Lua do Abismo','Kris: corte transformado causa mais dano.'],mirror:['Reflexo Duplo','Kali: +12% de dano de ilusão.'],mirrorguard:['Espelho Protetor','Kali: defesa ilusória dura mais.'],voidblade:['Espada Voraz','Eve: +12% dano da espada.'],timeward:['Tempo Dilatado','Eve: área de tempo mais duradoura.']
};

export function createDuel(fighters){
 let battle={host:true,players:[],projectiles:[],fx:[],clones:[],clock:0,remaining:180,starting:3,resultSent:false,winner:null};
 let state={finished:false,id:'__server__'}, hostSeq=0;
 let lastAt=performance.now();
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
function finish(id){if(!battle||battle.resultSent)return;battle.resultSent=true;state.finished=true;battle.winner=id;}
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
  if(a.id!==state.id&&a.inputAt&&performance.now()-a.inputAt>250){
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

function snapshot(forNetwork=true){if(!battle?.host)return null;
 return {seq:forNetwork?++hostSeq:hostSeq,stamp:+battle.clock.toFixed(3),time:battle.remaining,starting:battle.starting,players:battle.players.map(a=>({id:a.id,hero:a.hero,x:+a.x.toFixed(2),y:+a.y.toFixed(2),face:a.face,step:+a.step.toFixed(2),aim:+a.aim.toFixed(3),hp:Math.ceil(a.hp),maxHp:Math.ceil(a.maxHp),ult:Math.round(a.ultCharge),qCd:+a.qCd.toFixed(1),eCd:+a.eCd.toFixed(1),dashCd:+a.dashCd.toFixed(1),aura:+a.aura.toFixed(2),shadows:+a.shadows.toFixed(2),transform:+a.transform.toFixed(2),defend:+a.defend.toFixed(2),ultTimer:+a.ultTimer.toFixed(2),ultMode:a.ultMode,mirrorGuard:+a.mirrorGuard.toFixed(2),temporalField:+a.temporalField.toFixed(2),voidUlt:+a.voidUlt.toFixed(2),fieldX:Math.round(a.fieldX),fieldY:Math.round(a.fieldY),fieldRadius:a.fieldRadius,stun:+a.stun.toFixed(1),mirrorImages:+a.mirrorImages.toFixed(2),atkFx:+a.attackFx.toFixed(2),atkAngle:a.attackAngle||a.aim,hitFx:+a.hitFx.toFixed(2),blink:+a.blink.toFixed(2),corruption:+a.corruption.toFixed(2)})),
  clones:(battle.clones||[]).map(c=>({owner:c.owner,id:c.id,x:Math.round(c.x),y:Math.round(c.y),face:c.face,step:+c.step.toFixed(2),life:+c.life.toFixed(1)})),projectiles:battle.projectiles.map(p=>({x:Math.round(p.x),y:Math.round(p.y),color:p.color,kind:p.kind||0})),fx:battle.fx.slice(-18).map(f=>({...f,t:+f.t.toFixed(2)}))};
}
// Tiny positional packets for Cloudflare fallback: about 250 bytes instead of
// forwarding the entire VFX/projectile state 20 times each second.

 for(let i=0;i<fighters.length;i++)battle.players.push(makeActor(fighters[i],i));
 return {
   get finished(){return battle.resultSent;},
   get winner(){return battle.winner;},
   tick(){let now=performance.now();let dt=Math.min(.09,Math.max(0,(now-lastAt)/1000));lastAt=now;
     // Fixed-step integration prevents a delayed worker callback from creating a giant teleport.
     while(dt>.00001){const step=Math.min(dt,1/60);sim(step);dt-=step;if(battle.resultSent)break;}
   },
   input(id,input,seq=0){const p=battle.players.find(p=>p.id===id);if(!p)return false;
     if(seq&&seq<=(p.inputSeq||0))return false;
     if(seq)p.inputSeq=seq;
     p.input={x:clamp(Number(input.x)||0,-1,1),y:clamp(Number(input.y)||0,-1,1),aim:Number.isFinite(input.aim)?input.aim:0,attack:!!input.attack};
     p.inputAt=performance.now();return true;
   },
   action(id,name,variant,aim){const p=battle.players.find(p=>p.id===id);if(!p)return false;
     if(Number.isFinite(aim))p.input.aim=aim;
     act(p,name,variant);
     return true;
   },
   snapshot(){return snapshot(true);},
   getClock(){return +battle.clock.toFixed(3);},
   getTime(){return +battle.remaining.toFixed(2);},
   getStarting(){return +battle.starting.toFixed(2);},
   getActors(){return battle.players.map(p=>({id:p.id,x:p.x,y:p.y,face:p.face,step:+p.step.toFixed(2),aim:p.aim,hp:p.hp}));}
 };
}
