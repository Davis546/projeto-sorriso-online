/* YGGDRASIL v0.7 — Original procedural sound system. WebAudio, offline, mobile gesture unlock.
   No downloaded samples or third-party dependencies; low allocation + capped voices. */
const YG_AUDIO=(()=>{
 let context=null, master=null, sfxBus=null, musicBus=null;
 let enabled=true, volume=.67, beat=0, timer=null, voices=0;
 const sampled={slash:'assets/audio/slash.mp3',special:'assets/audio/kris_ultimate.mp3'};
 const sampleBanks={};
 const menuTrack=new Audio('assets/audio/menu.mp3'),battleTrack=new Audio('assets/audio/battle.mp3'),pecadoTrack=new Audio('assets/audio/pecado.mp3');
 const nordicTrack=new Audio('assets/audio/nordic_theme.mp3'),nordicBossTrack=new Audio('assets/audio/nordic_boss.mp3');
 const namelessTrack=new Audio('assets/audio/nameless_ost.mp3');
 const tracks={nameless:namelessTrack,menu:menuTrack,battle:battleTrack,pecado:pecadoTrack,nordic:nordicTrack,nordicBoss:nordicBossTrack};
 for(const a of Object.values(tracks)){a.loop=true;a.preload='none';a.playsInline=true;}

 let musicMode='',audioUnlocked=false;
 const cached={}, playedAt=Object.create(null);
 const SPECS={
  menu:[.14,640,930,.20,.80,.2], choose:[.32,500,1100,.12,.92,.24],
  loidSlash:[.20,1250,320,.83,.21,.27], krisSlash:[.26,850,210,.64,.45,.32],
  hit:[.15,240,70,.69,.47,.53], heavyHit:[.24,330,59,.72,.66,.66],
  dash:[.29,1250,80,.95,.14,.24], footstep:[.085,148,65,.66,.13,.13],
  loidAura:[.75,150,40,.36,.89,.42], krisForm:[.70,145,650,.39,.87,.55],
  oniCast:[.34,560,116,.58,.70,.28], oniDeath:[.36,330,62,.71,.50,.38],
  bossWarning:[.46,170,90,.35,.83,.44], bossEclipse:[.50,740,90,.73,.75,.64],
  bossCharge:[.43,1050,105,.88,.39,.62], bossRain:[.60,920,230,.69,.52,.53],
  bossGuard:[.37,520,175,.34,.82,.40], bossRage:[.78,140,52,.52,.88,.72],
  bossDefeat:[1.16,320,44,.48,.90,.80],
  waveStart:[.43,420,740,.12,.88,.33], waveClear:[.65,340,820,.13,.96,.49],
  card:[.52,600,1260,.08,.99,.40],
  hurt:[.33,310,68,.63,.75,.48], defeat:[.86,320,46,.42,.80,.66],
  ultimate:[.95,110,35,.57,.82,.76], magicTick:[.18,460,178,.54,.59,.17],
  mirrorCast:[.26,960,410,.22,.83,.28], mirrorHit:[.36,850,190,.40,.73,.34]
 };
 let seed=90218;
 function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
 function sample(spec){
   const [duration,f1,f2,n,t,loud]=spec;
   const rate=22050,size=Math.floor(duration*rate),arr=new Float32Array(size);let phase=0,lp=0;
   for(let i=0;i<size;i++){
    const u=i/Math.max(1,size-1);
    const f=f1*Math.pow(Math.max(.025,f2/f1),u);
    phase+=Math.PI*2*f/rate;
    let noise=random()*2-1;
    lp=lp*.81+noise*.19;
    const air=noise*.63+(noise-lp)*.37;
    const harmonic=Math.sin(phase)+.23*Math.sin(phase*2.013)+.13*Math.sin(phase*.51);
    const attack=Math.min(1,u*duration/.012);
    const env=attack*Math.pow(1-u, spec[0]>.7?1.8:2.25);
    arr[i]=Math.max(-1,Math.min(1,(air*n+harmonic*t)*env*.68));
   }
   const buffer=context.createBuffer(1,size,rate);
   buffer.getChannelData(0).set(arr);return buffer;
 }
 function updateButtons(){
   const b=document.getElementById('toggleAudio');if(b){b.textContent=enabled?'🔊 SOM LIGADO':'🔇 SOM DESLIGADO';b.setAttribute('aria-pressed',String(enabled));}
   const slider=document.getElementById('audioVolume');if(slider) slider.value=Math.round(volume*100);
   const status=document.getElementById('audioStatus');if(status)status.textContent=enabled?'Áudio ativo após o primeiro toque/clique.':'Áudio desativado.';
 }
 function ensure(){
  if(!enabled)return false;
  if(!context){
   const C=window.AudioContext||window.webkitAudioContext;
   if(!C){const s=document.getElementById('audioStatus');if(s)s.textContent='Este navegador não suporta Web Audio.';return false;}
   try{
    context=new C();master=context.createGain();sfxBus=context.createGain();musicBus=context.createGain();
    master.gain.value=volume;sfxBus.gain.value=.84;musicBus.gain.value=.21;
    sfxBus.connect(master);musicBus.connect(master);master.connect(context.destination);
    if(!timer)timer=setInterval(syncMusic,420);
   }catch(e){console.warn('Som indisponível',e);return false;}
  }
  if(context.state==='suspended')context.resume().catch(()=>{});
  return true;
 }

 function sampledPlay(kind,weight=1){
   if(!enabled||!audioUnlocked)return false;
   if(!sampleBanks[kind]){
    sampleBanks[kind]=Array.from({length:kind==='slash'?4:2},()=>{
      const a=new Audio(sampled[kind]);a.preload='auto';return a;
    });sampleBanks[kind].index=0;
   }
   const bank=sampleBanks[kind],a=bank[bank.index++%bank.length];
   try{a.pause();a.currentTime=0;a.volume=Math.max(0,Math.min(1,volume*(kind==='slash'?.82:.96)*weight));
    a.play().catch(()=>{});return true;}catch(e){return false;}
 }
 function syncMusic(){
  const all=Object.values(tracks);
  if(!enabled||!audioUnlocked||document.hidden){for(const t of all)t.pause();return;}
  const currentPhase=typeof phase==='string'?phase:'title';
  const combat=['play','reward','ultimate'].includes(currentPhase);
  const activeBoss=(type)=>typeof enemies!=='undefined'&&enemies.some(e=>e.type===type&&e.hp>0);
  const currentStage=typeof stage==='number'?stage:0;
  // Each Nordic wave uses its own OST. The Jarl switches to the DragonForce
  // 8-bit cover while alive, then automatically returns to Nordic ambience.
  // Waves 15 / 20 are intentionally distinct; stage 15 remains the existing
  // battle track until its custom audio is provided, stage 20 has Peccatum.
  const requested=!combat?'menu':
   currentStage===35&&activeBoss('nameless')?'nameless':
   (currentStage===25||currentStage===30)&&activeBoss('frostjarl')?'nordicBoss':
   currentStage===20&&activeBoss('pecado')?'pecado':
   currentStage>=21&&currentStage<=35?'nordic':'battle';
  if(requested!==musicMode){
   musicMode=requested;
   for(const t of all){t.pause();try{t.currentTime=0;}catch(_){}}
  }
  const target=tracks[requested];
  const gains={menu:.32,battle:.41,pecado:.46,nordic:.42,nordicBoss:.43,nameless:.47};
  target.volume=Math.min(1,volume*gains[requested]);
  if(target.paused)target.play().catch(()=>{});
 }
 function play(name,weight=1,pan=0){
   if(name==='loidSlash'||name==='krisSlash')return sampledPlay('slash',weight);
   if(name==='krisForm'||(name==='ultimate'&&typeof player!=='undefined'&&player&&player.type==='kris')){
     return sampledPlay('special',weight);
   }
 
  if(!enabled||!ensure()||voices>17)return false;
  const spec=SPECS[name];if(!spec)return false;
  let stamp=performance.now();let minInterval=name==='hit'?65:name==='footstep'?240:name==='magicTick'?170:name==='oniDeath'?100:30;
  if(stamp-(playedAt[name]||0)<minInterval)return false;
  playedAt[name]=stamp;
  try{
   const b=cached[name]||(cached[name]=sample(spec));
   const src=context.createBufferSource(),gain=context.createGain();src.buffer=b;
   src.playbackRate.value=.95+random()*.1;
   gain.gain.value=Math.max(.0,Math.min(1.1,spec[5]*weight));
   src.connect(gain);
   if(context.createStereoPanner){const p=context.createStereoPanner();p.pan.value=Math.max(-.75,Math.min(.75,pan));gain.connect(p);p.connect(sfxBus);}
   else gain.connect(sfxBus);
   voices++;src.onended=()=>{voices=Math.max(0,voices-1);try{src.disconnect();gain.disconnect()}catch(_){}};
   src.start();return true;
  }catch(err){console.warn('Erro de som',err);return false;}
 }
 function note(frequency,time,length=.38,strength=.09,kind='triangle'){
  if(!context||context.state!=='running'||!enabled)return;
  const osc=context.createOscillator(),g=context.createGain();osc.type=kind;osc.frequency.value=frequency;
  const start=context.currentTime+time;
  g.gain.setValueAtTime(.0001,start);
  g.gain.exponentialRampToValueAtTime(Math.max(.001,strength),start+.02);
  g.gain.exponentialRampToValueAtTime(.0001,start+length);
  osc.connect(g);g.connect(musicBus);osc.start(start);osc.stop(start+length+.03);
  osc.onended=()=>{osc.disconnect();g.disconnect()};
 }
 function musicPulse(){
  if(!context||context.state!=='running'||!enabled||document.hidden)return;
  const boss=typeof stage==='number'&&stage%5===0&&typeof phase==='string'&&phase==='play';
  const combat=typeof phase==='string'&&phase==='play';
  const notes=[146.83,174.61,196,261.63,293.66,349.23,392,523.25]; // Original Japanese-inspired pentatonic ambience.
  const pattern=[0,2,4,3,1,4,2,5,0,3,4,6,2,1,5,3];
  if(beat%2===0){
    let p=pattern[(beat/2)%pattern.length];
    note(notes[p],0,.64,combat?.11:.095,boss?'sawtooth':'triangle');
    note(notes[p]*2,.055,.23,.028,'sine');
  }
  if(beat%8===0)note(boss?73.42:98,0,2.6,boss?.16:.085,'sine');
  if(combat&&beat%4===0)note(boss?65.41:110,0,.25,boss?.15:.07,'triangle');
  if(boss&&beat%4===2)note(146.83,0,.14,.052,'sawtooth');
  beat++;
 }
 function setEnabled(on){enabled=!!on; if(master&&context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.025); if(enabled){audioUnlocked=true;ensure();syncMusic();play('menu',.9);}else{for(const t of Object.values(tracks))t.pause();} updateButtons();}
 function setVolume(val){volume=Math.max(0,Math.min(1,Number(val)/100));if(master&&context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.025);syncMusic();updateButtons();}
 function unlock(){if(enabled){audioUnlocked=true;ensure();syncMusic();}}
 function initUI(){
  const button=document.getElementById('toggleAudio');if(button)button.addEventListener('click',e=>{e.preventDefault();setEnabled(!enabled)});
  const slider=document.getElementById('audioVolume');if(slider)slider.addEventListener('input',e=>setVolume(e.target.value));
  const test=document.getElementById('audioTest');if(test)test.addEventListener('click',e=>{e.preventDefault();if(!enabled)setEnabled(true);audioUnlocked=true;ensure();syncMusic();sampledPlay('slash',1);setTimeout(()=>sampledPlay('special',.72),240)});
  for(const ev of ['pointerdown','touchstart','keydown','click'])window.addEventListener(ev,unlock,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(context&&context.state==='suspended'&&enabled&&!document.hidden)context.resume().catch(()=>{})});
  updateButtons();
 }
 return {play,unlock,initUI,setEnabled,setVolume,syncMusic,get currentMusic(){return musicMode},get musicPlaying(){return Object.values(tracks).some(t=>!t.paused)},get status(){return context?.state||'not-started'}};
})();
YG_AUDIO.initUI();
