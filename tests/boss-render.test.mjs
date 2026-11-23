import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const nullFn=()=>{};const elements=new Map(),calls=[];
const canvasCtx=new Proxy({}, {get(t,k){if(k==='drawImage')return (img,...args)=>{
  if(args.length===8){
   for(const n of args)assert.ok(Number.isFinite(n),`Invalid ${n} in image ${img.src}`);
   const [sx,sy,sw,sh]=args;
   assert.ok(sx>=0&&sy>=0&&sx+sw<=img.naturalWidth+1,`Cropping beyond image width: ${img.src} (${sx},${sw},${img.naturalWidth})`);
   assert.ok(sh>0&&sy>=0&&sy+sh<=img.naturalHeight+1,`Cropping beyond image height: ${img.src}`);
  }
  calls.push({src:img.src,args});
 };return t[k]||nullFn;},set(t,k,v){t[k]=v;return true}});
function el(id){if(!elements.has(id))elements.set(id,{style:{setProperty:nullFn},classList:{add:nullFn,remove:nullFn,toggle:nullFn,contains:()=>false},dataset:{},value:'normal',hidden:false,innerHTML:'',textContent:'',addEventListener:nullFn,querySelector:()=>el('child'),getContext:()=>canvasCtx,getBoundingClientRect:()=>({width:480,height:288,left:0,top:0}),setPointerCapture:nullFn});return elements.get(id);}
class FakeImage {
  complete=true;naturalWidth=512;naturalHeight=512;
  set src(v){this._src=v;this.naturalWidth=v.includes('jarl_v39_atlas')?1024:v.includes('/enemies/')?v.includes('sheet')?336:384:512;this.naturalHeight=v.includes('jarl_v39_atlas')?1024:v.includes('/enemies/')?v.includes('sheet')?448:96:512;}
  get src(){return this._src;}
}
const sandbox={window:{innerWidth:1280,innerHeight:720,matchMedia:()=>({matches:false}),addEventListener:nullFn},navigator:{maxTouchPoints:0,userAgent:'Desktop'},document:{body:el('body'),documentElement:el('html'),getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener:nullFn,createElement:()=>el('created')},Image:FakeImage,performance:{now:()=>1000},requestAnimationFrame:nullFn,localStorage:{getItem:()=>null,setItem:nullFn},YG_AUDIO:{play:nullFn,syncMusic:nullFn},console,Math,Date,Map,Set,screen:{orientation:{}},WebSocket:class{},location:{protocol:'https:',host:'test'},setTimeout:nullFn,clearTimeout:nullFn};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8'),sandbox,{timeout:6000});
const evaluate=s=>vm.runInContext(s,sandbox,{timeout:7000});
let checked=0;
for(const [stage,type] of [[5,'boss'],[10,'reuni'],[15,'tsukuomi'],[20,'pecado'],[25,'frostjarl'],[35,'nameless']]){
 evaluate(`player=createPlayer('loid');player.hp=999999;player.maxHp=999999;stage=${stage};testBossMode=false;spawnStage();`);
 assert.ok(evaluate(`enemies.some(e=>e.type==='${type}')`));
 for(const face of ['down','left','right','up']){
  for(const mode of ['walk','windup','charge']){
   for(let step=0;step<18;step++){
    calls.length=0;
    evaluate(`{const e=enemies.find(e=>e.type==='${type}');e.walking=true;e.mode='${mode}';e.face='${face}';e.step=${step/2};e.phase=undefined;e.attackPose=${mode==='windup'?.25:0};enemySprite(e);}`);
    const drawn=calls.find(v=>v.src.includes(type==='boss'?'samurai_sheet':type==='frostjarl'?'jarl_v39_atlas':type==='nameless'?'nameless_knight':`${type}_sheet`));
    assert.ok(drawn,`Missing ${type} sprite in mode ${mode} with direction ${face}, step ${step}`);
    assert.ok(drawn.args[6]>=50,`Unexpected tiny rendered boss ${type}`);
    checked++;
   }
  }
 }
}
assert.equal(checked,6*4*3*18);
const art=new URL('../public/assets/enemies/jarl_v39_atlas.png',import.meta.url);
assert.ok(fs.statSync(art).size>50000);
console.log('ALL SIX BOSSES RENDER WITHOUT INVALID FRAMES',checked);
