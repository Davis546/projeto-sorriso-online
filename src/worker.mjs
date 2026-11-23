import { createDuel } from './duel-engine.mjs';
// Yggdrasil Online v3.4 — Cloudflare Workers + Durable Objects (prototype)
// Host-authoritative: the host simulates combat; this Durable Object relays inputs/states.
import { DurableObject } from 'cloudflare:workers';

const HEROES = new Set(['loid', 'kris', 'cross', 'eve', 'kali']);
const MAX_COOP_PLAYERS = HEROES.size; // five unique heroes, including the host
const BOSSES = new Set(['japan', 'samurai', 'reuni', 'tsukuomi', 'pecado', 'nordic', 'frostjarl', 'nameless']);
const ACTIONS = new Set(['attack', 'q', 'eDown', 'eUp', 'dash', 'ultimate', 'card', 'ultimateChoice', 'f']);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// The PvP draft is server-generated and server-validated. No instant-kill cards in PvP.
const PVP_CARDS = ['heart','blade','fast','speed','armor','reach','dodge','critical','arc','echo','ancient','shadowblade','shadowdash','darkburst','black','form','awakening','bloodmoon','mirror','mirrorguard','voidblade','timeward'];
function pvpOffer(hero){
  const pool = PVP_CARDS.filter(id=>!['shadowblade','shadowdash','darkburst'].includes(id)||hero==='loid').filter(id=>!['black','form','awakening','bloodmoon'].includes(id)||hero==='kris').filter(id=>!['mirror','mirrorguard'].includes(id)||hero==='kali').filter(id=>!['voidblade','timeward'].includes(id)||hero==='eve');
  for(let i=pool.length-1;i>0;i--){ const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool.slice(0,6);
}


export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rooms = new Map();
    this.players = new Map();
    this.nextId = 1;
    this.duelTicker = null;

    // Rebuild in-memory lobby from WebSocket attachments after DO hibernation.
    for (const socket of ctx.getWebSockets()) {
      const a = socket.deserializeAttachment() || {};
      const id = typeof a.id === 'string' ? a.id : String(this.nextId++);
      this.nextId = Math.max(this.nextId, (Number(id) || 0) + 1);
      const c = { id, socket, hero: a.hero || null, room: null, role:a.role||'fighter', offer:a.offer||[], picks:a.picks||[] };
      this.players.set(id, c);
    }
    for (const c of this.players.values()) {
      const a = c.socket.deserializeAttachment() || {};
      if (!a.code) continue;
      let room = this.rooms.get(a.code);
      if (!room) {
        room = { code: a.code, members: new Set(), host: null, started: false, kind:a.kind||'coop', lastSnapshot:null, finished:false };
        this.rooms.set(a.code, room);
      }
      room.members.add(c);
      c.room = room;
      if (a.isHost) room.host = c;
    }
    for (const [code, room] of this.rooms) {
      if (!room.host) {
        for (const c of room.members) this.safeSend(c, { t: 'closed', message: 'Anfitrião desconectado.' });
        for (const c of room.members) { c.room = null; this.persist(c); }
        this.rooms.delete(code);
      }
    }
  }

  persist(c) {
    c.socket.serializeAttachment({
      id: c.id,
      code: c.room?.code || null,
      hero: c.hero || null,
      isHost: !!c.room && c.room.host === c,
      started: !!c.room?.started,
      kind:c.room?.kind||'coop', role:c.role||'fighter', offer:c.offer||[], picks:c.picks||[]
    });
  }

  safeSend(c, value) {
    if (!c) return;
    try {
      // A slow guest must not accumulate an ever-growing queue of obsolete frames.
      // Critical events (cards, lobby, start, attack controls) are never dropped.
      if ((value.t === 'motion' || value.t === 'state' || value.t === 'pvpSnapshot' || value.t === 'pvpMotion') &&
          typeof c.socket.bufferedAmount === 'number' && c.socket.bufferedAmount > 131072) return;
      c.socket.send(JSON.stringify(value));
    } catch { /* disconnected */ }
  }

  members(room) {
    return [...room.members].map(c => ({ id: c.id, hero: c.hero || null }));
  }

  notify(room) {
    if (!room?.host) return;
    const state = { t: 'lobby', members: this.members(room), host: room.host.id, code: room.code, started: room.started };
    for (const c of room.members) this.safeSend(c, state);
  }

  makeCode() {
    let code;
    do {
      const b = crypto.getRandomValues(new Uint8Array(6));
      code = [...b].map(n => ALPHABET[n % ALPHABET.length]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  joinRoom(c, room) {
    if(room.kind === 'pvp') { this.safeSend(c,{t:'error',message:'Use o modo X1 para acessar essa sala.'}); return; }
    if (room.members.size >= MAX_COOP_PLAYERS) {
      this.safeSend(c, { t: 'error', message: 'Sala cheia (máximo 5 jogadores).' });
      return;
    }
    if (room.started) {
      this.safeSend(c, { t: 'error', message: 'Partida em andamento. Crie outra sala.' });
      return;
    }
    if (c.room) this.leaveRoom(c);
    room.members.add(c);
    c.room = room;
    c.hero = null;
    this.persist(c);
    this.safeSend(c, { t: 'welcome', id: c.id, code: room.code, host: room.host.id, members: this.members(room) });
    this.notify(room);
  }

  leaveRoom(c) {
    const room = c.room;
    if (!room) return;
    c.room = null;
    c.hero = null;
    room.members.delete(c);
    this.persist(c);
    if (room.kind === 'pvp') { this.pvpLeave(c,room); return; }
    if (room.host === c) {
      for (const member of room.members) {
        member.room = null;
        member.hero = null;
        this.persist(member);
        this.safeSend(member, { t: 'closed', message: 'O anfitrião saiu da sala.' });
      }
      this.rooms.delete(room.code);
      return;
    }
    if (room.members.size === 0) {
      this.rooms.delete(room.code);
      return;
    }
    this.notify(room);
    this.safeSend(room.host, { t: 'left', id: c.id });
  }

  // Cloudflare Durable Object is the only authority for the duel. Neither browser runs combat.
  // One 20-Hz tick loop is shared across all active duels; stopped when no duels remain.
  ensureDuelTicker(){
    if(this.duelTicker)return;
    this.duelTicker=setInterval(()=>{
      let active=0;
      for(const room of this.rooms.values()){
        if(room.kind!=='pvp'||!room.started||room.finished||!room.match)continue;
        active++;
        try{
          room.match.tick();
          // 20Hz small motion updates, ~10Hz combat snapshots: fast movement without
          // resending spell FX, projectiles and all cooldowns on every frame.
          room.netTick=(room.netTick||0)+1;
          const actors=room.match.getActors();
          const motion={t:'pvpMotion',data:{seq:room.netTick,stamp:room.match.getClock(),time:room.match.getTime(),starting:room.match.getStarting(),players:actors.map((a,i)=>({id:a.id,x:Number(a.x.toFixed(2)),y:Number(a.y.toFixed(2)),face:a.face,step:a.step,aim:a.aim}))}};
          if(room.netTick%2===1 || !room.lastSnapshot){
            const packet={t:'pvpSnapshot',data:room.match.snapshot()};
            room.lastSnapshot=packet.data;
            for(const p of room.members)this.safeSend(p,packet);
          }else{
            for(const p of room.members)this.safeSend(p,motion);
          }
          if(room.match.finished){
            room.finished=true;
            const result={t:'pvpResult',winner:room.match.winner,reason:'DUELO ENCERRADO'};
            for(const p of room.members)this.safeSend(p,result);
            this.pvpLobby(room);
          }
        }catch(e){
          room.finished=true;
          for(const p of room.members)this.safeSend(p,{t:'error',message:'Erro na simulação do duelo. Volte à sala e tente novamente.'});
        }
      }
      if(!active){clearInterval(this.duelTicker);this.duelTicker=null;}
    },50);
  }
  pvpMembers(room){
    return [...room.members].map(c=>({id:c.id,role:c.role,hero:c.hero||null,chosen:(c.picks||[]).length,ready:(c.picks||[]).length===3&&!!c.hero}));
  }
  pvpLobby(room){
    const data={t:'pvpLobby',code:room.code,members:this.pvpMembers(room),host:room.host.id,started:room.started,finished:!!room.finished};
    for(const p of room.members)this.safeSend(p,data);
  }
  pvpLeave(c,room){
    if(room.host===c){
      for(const other of room.members){other.room=null;this.persist(other);this.safeSend(other,{t:'closed',message:'O anfitrião saiu da arena X1.'});}
      this.rooms.delete(room.code);return;
    }
    if(c.role==='fighter' && room.started && !room.finished){
      const survivor=[...room.members].find(x=>x.role==='fighter');
      room.finished=true;
      for(const other of room.members)this.safeSend(other,{t:'pvpResult',winner:survivor?.id||null,reason:'Oponente desconectado'});
    }
    this.pvpLobby(room);
  }
  pvpJoin(c,room,role){
    if(room.kind!=='pvp'){this.safeSend(c,{t:'error',message:'Esta não é uma sala X1.'});return;}
    if(room.members.size>=12){this.safeSend(c,{t:'error',message:'Arena cheia.'});return;}
    const fighters=[...room.members].filter(x=>x.role==='fighter');
    if(role==='fighter'&&(fighters.length>=2||room.started)){
      this.safeSend(c,{t:'error',message:'As duas vagas de lutador estão ocupadas. Entre como espectador.'});return;
    }
    if(c.room)this.leaveRoom(c);
    c.room=room;c.role=role;c.hero=null;c.picks=[];c.offer=[];
    room.members.add(c);this.persist(c);
    this.safeSend(c,{t:'pvpWelcome',id:c.id,code:room.code,role:c.role,host:room.host.id,offer:c.offer,
      members:this.pvpMembers(room),started:room.started,finished:!!room.finished});
    this.pvpLobby(room);
    if(room.started){
      this.safeSend(c,{t:'pvpBegin',fighters:this.pvpMembers(room).filter(x=>x.role==='fighter').map(x=>({...x,cards:this.players.get(x.id)?.picks||[]})),
        hp:11200,host:room.host.id,spectator:true,authority:'server'});
      if(room.lastSnapshot)this.safeSend(c,{t:'pvpSnapshot',data:room.lastSnapshot});
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, rooms: this.rooms.size }), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
    if (url.pathname !== '/ws' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    const c = { id: String(this.nextId++), socket: server, room: null, hero: null };
    this.players.set(c.id, c);
    this.persist(c);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment() || {};
    const c = this.players.get(a.id);
    if (!c || typeof raw !== 'string' || raw.length > 180000) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    if (m.t === 'ping') { this.safeSend(c,{t:'pong',ts:Number(m.ts)||Date.now()}); return; }

    // PvP is isolated from the original cooperative protocol.
    if (m.t === 'pvpCreate') {
      if(c.room)this.leaveRoom(c);
      const code=this.makeCode();
      const room={code,host:c,members:new Set(),started:false,finished:false,kind:'pvp',lastSnapshot:null};
      this.rooms.set(code,room);
      this.pvpJoin(c,room,'fighter');return;
    }
    if (m.t === 'pvpJoin') {
      const code=String(m.code||'').trim().toUpperCase();
      const room=this.rooms.get(code);
      if(!room){this.safeSend(c,{t:'error',message:'Sala X1 não encontrada.'});return;}
      this.pvpJoin(c,room,m.role==='spectator'?'spectator':'fighter');return;
    }
    if (m.t === 'pvpLeave'){this.leaveRoom(c);return;}
    if (c.room?.kind === 'pvp') {
      const r=c.room;
      if(m.t === 'pvpChoose'&&!r.started&&c.role==='fighter'){
        if(!HEROES.has(m.hero))return;
        if([...r.members].some(p=>p!==c&&p.role==='fighter'&&p.hero===m.hero)){
          this.safeSend(c,{t:'error',message:'Esse personagem já foi escolhido.'});return;
        }
        c.hero=m.hero;c.picks=[];c.offer=pvpOffer(c.hero);this.persist(c);this.safeSend(c,{t:'pvpDraft',offer:c.offer,picks:[]});this.pvpLobby(r);return;
      }
      if(m.t === 'pvpPick'&&!r.started&&c.role==='fighter'){
        const id=String(m.card||'');
        if(!c.hero || !c.offer.includes(id)||c.picks.includes(id)||c.picks.length>=3)return;
        c.picks.push(id);this.persist(c);
        this.safeSend(c,{t:'pvpDraft',offer:c.offer,picks:c.picks});this.pvpLobby(r);return;
      }
      if(m.t==='pvpBegin'&&!r.started&&r.host===c){
        const fighters=[...r.members].filter(p=>p.role==='fighter');
        if(fighters.length!==2||fighters.some(p=>!p.hero||p.picks.length!==3)||fighters[0].hero===fighters[1].hero){
          this.safeSend(c,{t:'error',message:'Aguarde dois lutadores com personagem e 3 cartas escolhidas.'});return;
        }
        r.started=true;r.finished=false;r.lastSnapshot=null;
        r.match=createDuel(fighters.map(p=>({id:p.id,hero:p.hero,cards:p.picks})));
        this.ensureDuelTicker();
        const started={t:'pvpBegin',host:r.host.id,authority:'server',hp:11200,
          fighters:fighters.map(p=>({id:p.id,hero:p.hero,cards:p.picks}))};
        for(const p of r.members){this.persist(p);this.safeSend(p,started);}this.pvpLobby(r);return;
      }
      // Server-authoritative movement and skills: applies equally to both fighters.
      if(m.t==='pvpInput'&&r.started&&!r.finished&&c.role==='fighter'&&r.match){
        const seq=Number.isSafeInteger(m.seq)&&m.seq>0?m.seq:0;
        r.match.input(c.id,{x:m.x,y:m.y,aim:m.aim,attack:m.attack},seq);
        return;
      }
      if(m.t==='pvpAction'&&r.started&&!r.finished&&c.role==='fighter'&&r.match){
        if(!['dash','q','e','eDown','eUp','r'].includes(m.action))return;
        // Rate limit actions even if a client attempts to spam websocket packets.
        const now=Date.now();if(!['eDown','eUp'].includes(m.action)&&c.lastSkillAt&&now-c.lastSkillAt<50)return;if(!['eDown','eUp'].includes(m.action))c.lastSkillAt=now;
        r.match.action(c.id,m.action,typeof m.variant==='string'?m.variant.slice(0,12):'',Number.isFinite(m.aim)?m.aim:0);
        const packet={t:'pvpSnapshot',data:r.match.snapshot()};r.lastSnapshot=packet.data;
        for(const p of r.members)this.safeSend(p,packet);
        return;
      }
      if(r.match)return; // Legacy host/P2P transport is intentionally disabled for this duel.
      // Secure WebRTC signaling within an active X1 room. Only the two verified
      // fighters may exchange offer/answer/ICE; spectators cannot inject signals.
      if(m.t==='pvpSignal'&&r.started&&!r.finished&&c.role==='fighter'){
        const other=[...r.members].find(p=>p.id===m.to&&p.role==='fighter'&&p!==c);
        if(!other || !m.data || !['offer','answer','candidate'].includes(m.data.type))return;
        const payload=JSON.stringify(m.data);
        if(payload.length>16000)return;
        this.safeSend(other,{t:'pvpSignal',from:c.id,data:m.data});return;
      }
      if(m.t==='pvpInput'&&r.started&&!r.finished&&c.role==='fighter'&&c!==r.host){
        const safe = v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
        this.safeSend(r.host,{t:'pvpInput',id:c.id,seq:Number.isSafeInteger(m.seq)&&m.seq>0?m.seq:0,data:{
          x:safe(m.x),y:safe(m.y),aim:Number.isFinite(m.aim)?m.aim:0,
          attack:!!m.attack,dash:!!m.dash,q:!!m.q,e:!!m.e,r:!!m.r,
          ult:typeof m.ult==='string'?m.ult.slice(0,10):''}});return;
      }
      if(m.t==='pvpAction'&&r.started&&!r.finished&&c.role==='fighter'&&c!==r.host){
        if(!['dash','q','e','eDown','eUp','r'].includes(m.action))return;
        this.safeSend(r.host,{t:'pvpAction',id:c.id,action:m.action,variant:String(m.variant||'').slice(0,10),aim:Number.isFinite(m.aim)?m.aim:0,x:Number.isFinite(m.x)?Math.max(-1,Math.min(1,m.x)):0,y:Number.isFinite(m.y)?Math.max(-1,Math.min(1,m.y)):0});return;
      }
      if(m.t==='pvpMotion'&&r.started&&!r.finished&&r.host===c){
        const d=m.data;
        if(!d||!Number.isSafeInteger(d.seq)||!Array.isArray(d.players)||d.players.length!==2)return;
        const valid=d.players.every(p=>typeof p.id==='string'&&Number.isFinite(p.x)&&Number.isFinite(p.y));
        if(!valid||JSON.stringify(d).length>2200)return;
        for(const other of r.members)if(other!==c)this.safeSend(other,{t:'pvpMotion',data:d});return;
      }
      if(m.t==='pvpSnapshot'&&r.started&&!r.finished&&r.host===c){
        if(!m.data||!Array.isArray(m.data.players)||m.data.players.length!==2)return;
        const payload=JSON.stringify(m.data);if(payload.length>17000)return;
        r.lastSnapshot=m.data;
        for(const other of r.members)if(other!==c)this.safeSend(other,{t:'pvpSnapshot',data:m.data});return;
      }
      if(m.t==='pvpResult'&&r.started&&!r.finished&&r.host===c){
        const fighters=[...r.members].filter(p=>p.role==='fighter');
        if(m.winner!==null&&!fighters.some(p=>p.id===m.winner))return;
        r.finished=true;
        for(const other of r.members)this.safeSend(other,{t:'pvpResult',winner:m.winner,reason:'DUELO ENCERRADO'});
        this.pvpLobby(r);return;
      }
      if(m.t==='pvpRematch'&&r.host===c&&r.started){
        r.started=false;r.finished=false;r.lastSnapshot=null;r.match=null;
        for(const p of r.members){p.picks=[];p.offer=p.role==='fighter'&&p.hero?pvpOffer(p.hero):[];this.persist(p);
          this.safeSend(p,{t:'pvpReset',offer:p.offer});}
        this.pvpLobby(r);return;
      }
      return;
    }
    if (m.t === 'create') {
      // New host room. If already in one, leave it before creating another.
      if (c.room) this.leaveRoom(c);
      const code = this.makeCode();
      const room = { code, host: c, members: new Set(), started: false };
      this.rooms.set(code, room);
      this.joinRoom(c, room);
      return;
    }
    if (m.t === 'join') {
      const code = String(m.code || '').trim().toUpperCase();
      const room = this.rooms.get(code);
      if (!room) { this.safeSend(c, { t: 'error', message: 'Sala não encontrada. Confira o código.' }); return; }
      this.joinRoom(c, room);
      return;
    }
    if (m.t === 'leave') { this.leaveRoom(c); return; }
    const r = c.room;
    if (!r) return;
    if (m.t === 'choose' && !r.started) {
      if (!HEROES.has(m.hero)) return;
      if ([...r.members].some(p => p !== c && p.hero === m.hero)) { this.safeSend(c, {t:'error',message:'Esse personagem já foi escolhido. Escolha outro!'}); return; }
      c.hero = m.hero;
      this.persist(c);
      this.notify(r);
      return;
    }
    if (m.t === 'begin' && r.host === c && !r.started) {
      if (r.members.size < 2 || [...r.members].some(p => !p.hero) || new Set([...r.members].map(p=>p.hero)).size !== r.members.size) {
        this.safeSend(c, { t: 'error', message: 'São necessários de 2 a 5 jogadores com personagens diferentes selecionados.' });
        return;
      }
      r.started = true;
      const boss = BOSSES.has(m.boss) ? m.boss : null;
      const difficulty = m.difficulty === 'pecador' ? 'pecador' : 'normal';
      const members = this.members(r);
      for (const p of r.members) {
        this.persist(p);
        this.safeSend(p, { t: 'begun', id: p.id, host: c.id, members, boss, difficulty });
      }
      return;
    }
    if (m.t === 'rematchRequest' && r.started && r.host !== c) { this.safeSend(r.host,{t:'rematchRequest',id:c.id});return; }
    if (m.t === 'rematch' && r.started && r.host === c) {
      r.started=false;
      for (const p of r.members) {p.hero=null;this.persist(p);this.safeSend(p,{t:'lobbyReset'});}
      this.notify(r);return;
    }
    if (!r.started) return;
    if (m.t === 'input' && r.host !== c) {
      const x = Number(m.x) || 0, y = Number(m.y) || 0, aim = Number(m.aim) || 0;
      this.safeSend(r.host, {
        t: 'remoteInput', id: c.id,
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
        aim: Number.isFinite(aim) ? aim : 0,
        attack: !!m.attack
      });
      return;
    }
    if (m.t === 'press' && r.host !== c && ACTIONS.has(m.action)) {
      this.safeSend(r.host, { t: 'remotePress', id: c.id, action: m.action, value: String(m.value || '').slice(0, 35),
        aim:Number.isFinite(m.aim)?m.aim:0,
        dx:Number.isFinite(m.dx)?Math.max(-1,Math.min(1,m.dx)):0,
        dy:Number.isFinite(m.dy)?Math.max(-1,Math.min(1,m.dy)):0
      });
      return;
    }
    if (m.t === 'motion' && r.host === c) {
      // Verify compact movement-only packets; do not let large payloads congest the room.
      if (!m.actors || typeof m.actors !== 'object' || Object.keys(m.actors).length > MAX_COOP_PLAYERS || JSON.stringify(m).length > 2400) return;
      const positions = {};
      for (const p of r.members) {
        const a = m.actors[p.id];
        if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) return;
        positions[p.id] = { x:a.x, y:a.y, face:String(a.face||'down').slice(0,5), step:Number(a.step)||0, hp:Number(a.hp)||0 };
      }
      for (const p of r.members) if (p !== c) this.safeSend(p,{t:'motion',seq:Number(m.seq)||0,actors:positions});
      return;
    }
    if (m.t === 'state' && r.host === c) {
      if (!m.data || typeof m.data !== 'object') return;
      const payload = JSON.stringify(m.data);
      if (payload.length > 180000) return;
      for (const p of r.members) if (p !== c) this.safeSend(p, { t: 'state', data: m.data });
      return;
    }
    if (m.t === 'signal' && r.host === c) {
      for (const p of r.members) {
        if (p.id === m.to) { this.safeSend(p, { t: 'signal', value: m.value }); break; }
      }
    }
  }

  webSocketClose(ws) {
    const a = ws.deserializeAttachment() || {};
    const c = this.players.get(a.id);
    if (!c) return;
    this.leaveRoom(c);
    this.players.delete(c.id);
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname === '/health') {
      const id = env.LOBBY.idFromName('yggdrasil-global-lobby-v1');
      const stub = env.LOBBY.get(id);
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
