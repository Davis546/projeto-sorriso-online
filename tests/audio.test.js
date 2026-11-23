import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {RELIQUIA_OST,bossMusic,chooseMusic} from '../public/music-policy.js';

const client=readFileSync(new URL('../public/client.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('OST da Reliquia presente e continua em loop',()=>{
 assert.equal(RELIQUIA_OST,'reliquia-invasion');
 assert.match(client,/audio\.loop=true/);
 assert.ok(statSync(new URL('../public/audio/reliquia-invasion.mp3',import.meta.url)).size>1000000);
 assert.match(html,/V12\.19 CAMPANHA ONLINE/);
});
test('Ritual supremo nao troca trilha durante a introducao e as 3 fases da Reliquia',()=>{
 for(const phase of ['boss_intro','fight'])for(const stage of [1,2,3]){
  const room={phase,bossKind:'energia',enemies:[{kind:'energia',stage}]};
  assert.equal(bossMusic(room),RELIQUIA_OST);
  assert.equal(chooseMusic('ultimate',room),RELIQUIA_OST);
  assert.equal(chooseMusic('ritual',room),RELIQUIA_OST);
  assert.equal(chooseMusic('waves',room),RELIQUIA_OST);
 }
 assert.match(client,/if\(bossMusic\(w\)\)\{playMusic\(bossMusic\(w\),w\)/);
});
test('Chefe da TV, Sol, Diretora tambem mantem OST exclusiva',()=>{
 for(const [kind,expected] of [['sol','sol'],['diretora','diretora'],['tv','alvo']]){
  assert.equal(chooseMusic('ultimate',{phase:'fight',bossKind:kind,enemies:[]}),expected);
 }
});
test('Fora da batalha de chefe, musica normal e ritual especial funcionam',()=>{
 for(const phase of ['lobby','cards','between','over','reward_wait']){
  assert.equal(chooseMusic('ultimate',{phase,bossKind:'energia',enemies:[]}), 'ultimate');
 }
 assert.equal(chooseMusic('waves',{phase:'fight',bossKind:null,enemies:[]}), 'waves');
});

test('Campanha tem quatro trilhas customizadas e OST final exclusiva',()=>{
 for(const track of ['living-in-the-dark','fuga-desesperada','sangue-8bit','gal-final-8bit'])
  assert.ok(statSync(new URL('../public/audio/'+track+'.mp3',import.meta.url)).size>200_000);
 const s={phase:'fight',bossKind:'final',enemies:[{kind:'final',stage:3}]};
 assert.equal(chooseMusic('ultimate',s),'gal-final-8bit');
 assert.equal(chooseMusic('sangue-8bit',s),'gal-final-8bit');
 assert.match(client,/fuga-desesperada/);
 assert.match(client,/living-in-the-dark/);
});
