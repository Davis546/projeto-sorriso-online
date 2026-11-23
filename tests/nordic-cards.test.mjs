import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const noop=()=>{};const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},dataset:{},value:'normal',textContent:'',hidden:false,innerHTML:'',addEventListener:noop,querySelector:()=>el('child'),getContext:()=>new Proxy({}, {get:()=>noop}),getBoundingClientRect:()=>({width:480,height:288,left:0,top:0})});return elements.get(id);}
const sandbox={window:{innerWidth:1280,innerHeight:720,matchMedia:()=>({matches:false}),addEventListener:noop},navigator:{maxTouchPoints:0,userAgent:'Desktop'},document:{body:el('body'),documentElement:el('html'),getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('query'),createElement:()=>el('created'),addEventListener:noop},Image:class{complete=true;naturalWidth=448;naturalHeight=448;set src(v){this._src=v}get src(){return this._src}},performance:{now:()=>1000},requestAnimationFrame:noop,localStorage:{getItem:()=>null,setItem:noop},YG_AUDIO:{play:noop,syncMusic:noop},console,Math,Date,Map,Set,WebSocket:class{},location:{protocol:'https:',host:'local.test'},setTimeout:noop,clearTimeout:noop};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8'),sandbox,{timeout:5000});
const evaluate=(s)=>vm.runInContext(s,sandbox,{timeout:5000});
const all=evaluate('nordicCards.map(c=>({id:c.id,name:c.name,rarity:c.rarity,src:CARD_IMAGES[c.id]}))');
assert.equal(all.length,30);assert.equal(new Set(all.map(x=>x.id)).size,30);
for(const a of all){assert.ok(a.id.startsWith('n_'));assert.ok(a.src.startsWith('assets/cards/nordic/'));assert.ok(fs.existsSync(new URL('../public/'+a.src.split('?')[0],import.meta.url)),a.id);}
assert.equal(evaluate('cards.filter(c=>c.id.startsWith("n_")).length'),0);
let seen=new Set();
for(let j=0;j<120;j++){
 const hero=['loid','kris','cross','eve','kali'][j%5];
 const p=evaluate(`selectedCampaign='nordic';start('${hero}');player`);
 assert.equal(evaluate('stage'),21);assert.equal(p.nordicStarterGranted,true);assert.equal(p.cards.length,20);assert.equal(new Set(p.cards).size,20);
 for(const id of p.cards){assert.ok(id.startsWith('n_'));seen.add(id);}
 assert.ok(p.maxHp<=p.baseMaxHp*3.5+1e-6);assert.ok(p.damage<=p.baseDamage*2.85+1e-6);
 assert.ok(p.attackDelay>=p.baseAttackDelay*.52-1e-6);assert.ok(p.speed<=p.baseSpeed*1.75+1e-6);
 assert.ok(p.reach<=p.baseReach*1.65+1e-6);assert.ok(p.armor<=.58+1e-6);assert.ok(p.crit<=.60+1e-6);
 assert.ok(p.echo<=.48+1e-6);assert.ok(p.dodgeChance<=.44+1e-6);
 assert.ok(p.skillDelay>=p.baseSkillDelay*.59-1e-6);assert.ok(p.secondaryDelay>=p.baseSecondaryDelay*.57-1e-6);
 assert.ok(p.dashDelay>=p.baseDashDelay*.50-1e-6);assert.equal(p.hp,p.maxHp);
 const options=evaluate('pickCards().map(c=>c.id)');assert.equal(options.length,3);assert.ok(options.every(id=>id.startsWith('n_')));
}
assert.equal(seen.size,30);
assert.ok(evaluate('player.cards.length')===20);
const a=evaluate("selectedCampaign='nordic';activeCampaign='nordic';coop.active=true;coop.host=true;coop.id='host';coop.members=[{id:'host',hero:'loid'},{id:'guest',hero:'eve'}];coopInitAllies();coop.allies.get('guest')");
assert.equal(a.cards.length,20);assert.ok(a.cards.every(id=>id.startsWith('n_')));
evaluate("coop.active=false;selectedCampaign='japan';start('kris');");
assert.equal(evaluate('player.cards.length'),0);
assert.ok(evaluate('pickCards().every(c=>!c.id.startsWith("n_"))'));
assert.equal(evaluate('createPlayer("eve").skillDelay'),17.5);
assert.equal(evaluate('createPlayer("eve").secondaryDelay'),15);
evaluate("player=createPlayer('eve');stage=1;const e=addMob('walker',player.x,player.y);e.hp=10000;e.maxHp=10000;player.ultimateCharge=0;hitEnemy(e,1,true,false);");
assert.equal(evaluate('player.ultimateCharge'),3.0);
evaluate("player.secondaryCd=0;timeFields=[{x:player.x,y:player.y,radius:105,life:5,tick:.01}];enemies[enemies.length-1].hp=10000;applyTimeFields(.15);");
const drop=evaluate('10000-enemies[enemies.length-1].hp');assert.ok(drop>0&&drop<=6.001,drop);
console.log(`NORDIC EXCLUSIVE DECK PASS: ${all.length} unique cards, 120 randomized 20-card builds, online ally, limits, Japan separation, Eve cooldown/field`);
