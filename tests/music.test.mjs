import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const noop=()=>{};
class FakeAudio {constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.loop=false;}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}}
const elements={toggleAudio:{addEventListener:noop,setAttribute:noop},audioVolume:{addEventListener:noop,value:67},audioStatus:{textContent:''}};
const ctx={window:{addEventListener:noop},document:{hidden:false,getElementById:id=>elements[id]||null,addEventListener:noop},Audio:FakeAudio,setInterval:noop,setTimeout:noop,console,Math,performance:{now:()=>1000}};
vm.createContext(ctx);vm.runInContext("let phase='play', stage=21, enemies=[];",ctx);vm.runInContext(fs.readFileSync(new URL('../public/audio.js',import.meta.url),'utf8'),ctx);
vm.runInContext('YG_AUDIO.setEnabled(true)',ctx);
const mode=()=>vm.runInContext('YG_AUDIO.currentMusic',ctx);
const check=(stage,enemies,expected)=>{ctx.__bossEnemies=enemies;vm.runInContext(`stage=${stage};enemies=__bossEnemies;YG_AUDIO.syncMusic()`,ctx);assert.equal(mode(),expected);};
check(1,[],'battle');check(5,[{type:'boss',hp:200}],'battle');check(15,[{type:'tsukuomi',hp:100}],'battle');check(20,[{type:'pecado',hp:100}],'pecado');check(20,[],'battle');
check(21,[],'nordic');check(24,[],'nordic');check(25,[{type:'frostjarl',hp:8200}],'nordicBoss');check(25,[{type:'frostjarl',hp:0}],'nordic');check(35,[{type:'nameless',hp:7200}],'nameless');check(35,[],'nordic');
for(const file of ['nordic_theme.mp3','nordic_boss.mp3','nameless_ost.mp3'])assert.ok(fs.statSync(new URL(`../public/assets/audio/${file}`,import.meta.url)).size>100000,file);
assert.match(fs.readFileSync(new URL('../public/audio.js',import.meta.url),'utf8'),/nordicBossTrack/);
console.log('NORDIC + DRAGONFORCE MUSIC ROUTING PASS');
