import { DurableObject } from 'cloudflare:workers';
import {makeRoom,joinRoom,chooseAgent,readyUp,disconnect,launch,setInput,pickCard,advance,snapshot,campaignInteract,campaignCode,campaignAckPaper} from './game.js';

const ok=s=>new Response(s,{status:200,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/health')return ok(JSON.stringify({name:'Projeto Sorriso Online',version:'12.15',ok:true}));
  if(url.pathname==='/api/ws'){
   if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket obrigatório',{status:426});
   const origin=request.headers.get('Origin');if(origin&&new URL(origin).host!==url.host)return new Response('Origem não autorizada',{status:403});
   const code=(url.searchParams.get('code')||'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))return new Response('Código inválido',{status:400});
   // Uma sala tem um unico Durable Object. 'sam' e apenas uma preferencia
   // para salas NOVAS; Cloudflare pode alocar fora da America do Sul.
   const id=env.ROOMS.idFromName(code);return env.ROOMS.get(id,{locationHint:'sam'}).fetch(request);
  }
  return env.ASSETS.fetch(request);
 }
};

export class GameRoom extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.room=null;this.loaded=false;this.lastSave=0;this.lastBroadcast=0;this.sockets=new Map();for(const ws of this.ctx.getWebSockets()){const meta=ws.deserializeAttachment();if(meta?.token)this.sockets.set(ws,meta.token);}}
 async init(){if(!this.loaded){this.room=await this.ctx.storage.get('room')||null;this.loaded=true;if(this.room)this.room.lastTime=Date.now();}}
 send(ws,obj){try{ws.send(JSON.stringify(obj));}catch{}}
 broadcast(){if(!this.room)return;for(const [ws,token] of this.sockets){this.send(ws,snapshot(this.room,token));}}
 async persist(force=false){if(!this.room)return;const now=Date.now();if(!force&&now-this.lastSave<9000)return;this.lastSave=now;await this.ctx.storage.put('room',this.room);}
 async fetch(request){await this.init();const url=new URL(request.url),code=(url.searchParams.get('code')||'').toUpperCase();
  const create=url.searchParams.get('create')==='1';const difficulty=url.searchParams.get('difficulty')==='nightmare'?'nightmare':'normal';const mode=url.searchParams.get('mode')==='campaign'?'campaign':'survival';const token=(url.searchParams.get('token')||'').slice(0,80);const name=(url.searchParams.get('name')||'Agente').slice(0,32);
  if(!/^[a-zA-Z0-9-]{12,80}$/.test(token))return new Response('Token inválido',{status:400});
  if(!this.room){if(!create)return new Response('SALA_NAO_EXISTE',{status:404});this.room=makeRoom(code,difficulty,mode);}
  if(this.room.code!==code)return new Response('Sala inválida',{status:400});
  if(Object.values(this.room.players).some(p=>p.token===token&&p.connected&&[...this.sockets.values()].includes(token)))return new Response('Este jogador já está conectado',{status:409});
  let player;try{player=joinRoom(this.room,token,name);}catch(e){return new Response(e.message,{status:409});}
  const pair=new WebSocketPair();const [client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({token});this.sockets.set(server,token);
  this.send(server,{type:'welcome',token,code});this.broadcast();await this.persist(true);
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,msg){await this.init();const token=this.sockets.get(ws)||ws.deserializeAttachment()?.token;if(!token||!this.room)return;
  let v;try{v=JSON.parse(String(msg));}catch{return;}if(!v||typeof v!=='object')return;
  if(v.type==='ping'){this.send(ws,{type:'pong',t:v.t});return;}
  let changed=false;
  if(v.type==='choose')changed=chooseAgent(this.room,token,v.agent);
  else if(v.type==='ready'){readyUp(this.room,token);changed=true;}
  else if(v.type==='start')changed=launch(this.room,token);
  else if(v.type==='input'){setInput(this.room,token,v);changed=true;}
  else if(v.type==='card')changed=pickCard(this.room,token,v.index);
  else if(v.type==='interact'){changed=campaignInteract(this.room,token,typeof v.target==='string'?v.target:null);if(!changed)this.send(ws,{type:'interaction_hint',text:'Chegue perto de um objeto iluminado e toque nele ou em INTERAGIR.'});}
  else if(v.type==='paper_ack')changed=campaignAckPaper(this.room,token,v.id);
  else if(v.type==='story_code')changed=campaignCode(this.room,token,v.code);
  else if(v.type==='chat'){const p=this.room.players[token],text=String(v.text||'').trim().slice(0,110);if(p&&text){for(const [sock] of this.sockets)this.send(sock,{type:'chat',name:p.name,text});}}
  else if(v.type==='restart'&&this.room.host===token&&['over','victory'].includes(this.room.phase)){
    const members=Object.values(this.room.players).map(p=>({token:p.token,name:p.name,agent:p.agent,connected:p.connected}));const next=makeRoom(this.room.code,this.room.difficulty,this.room.mode);for(const p of members){if(!p.connected)continue;const q=joinRoom(next,p.token,p.name);q.agent=p.agent;q.ready=false;}next.host=token;this.room=next;changed=true;
  }
  if(this.room.phase!=='lobby'&&this.room.phase!=='over'){advance(this.room);changed=true;}
  const now=Date.now();if(changed&&(now-this.lastBroadcast>110||v.type!=='input')){this.lastBroadcast=now;this.broadcast();}
  if(changed)await this.persist(v.type!=='input');
 }
 async webSocketClose(ws){await this.left(ws);}
 async webSocketError(ws){await this.left(ws);}
 async left(ws){await this.init();const token=this.sockets.get(ws)||ws.deserializeAttachment()?.token;this.sockets.delete(ws);if(this.room&&token){disconnect(this.room,token);this.broadcast();await this.persist(true);}try{ws.close(1000,'Desconectado');}catch{}}
}
