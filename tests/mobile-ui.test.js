import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const source=readFileSync(new URL('../public/client.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('mobile: sem senha, botao clicavel e objetos tocaveis',()=>{
 assert.match(source,/const st=w\.story,stage=st\.stage,near=st\.near/);
 assert.match(source,/\$\('interactAction'\)\.disabled=false/);
 assert.match(source,/canvas.addEventListener\('pointerdown'/);
 assert.doesNotMatch(html,/id="storyCodeForm"/);assert.doesNotMatch(source,/storyCodeForm/);
});
test('diario oculto nao intercepta toques, possui fechar e suporta mobile',()=>{
 assert.match(css,/#storyJournal\[hidden\][^\n]+display:none!important/);
 assert.match(source,/\$\('closeJournal'\)\.onclick=\(\)=>toggleJournal\(false\)/);
 assert.match(css,/@media\(orientation:landscape\) and \(max-height:520px\)/);
 assert.match(html,/id="storyProgress"/);
});
test('cinco personagens possuem pixel art sem mascara',()=>{
 for(const name of ['solar','ritual','alvo','feras','lunar']){
  assert.ok(statSync(new URL('../public/assets/campanha-'+name+'.png',import.meta.url)).size>2000);
 }
 assert.match(source,/campaignSprite\[o\.agent\]/);
});

test('retratos dos agentes sao os originais na selecao; adolescentes so no passado',()=>{
 assert.match(source,/const campaignPortrait=id=>'/);
 assert.match(source,/teenSprite\[o\.agent\]/);
 assert.match(source,/\['flashback','basement','projector'\]/);
 for(const name of ['solar','ritual','alvo','feras','lunar'])
  assert.ok(statSync(new URL('../public/assets/adolescente-'+name+'.png',import.meta.url)).size>2500);
});
test('mapa e botao de interacao possuem regioes de toque que nao ficam invisiveis',()=>{
 assert.match(css,/#storyPanel\{pointer-events:none/);
 assert.match(css,/#controls button,#joystick\{pointer-events:auto/);
 assert.match(source,/tryInteract\(target\.id\)/);
});

test('papel individual, susto acessível e animação da máscara estão presentes',()=>{
 assert.match(html,/id="personalPaper"/);assert.match(html,/id="maskReveal"/);assert.match(html,/id="finalIntro"/);
 assert.match(source,/showPersonalPaper/);assert.match(source,/showMaskReveal/);
 assert.match(css,/#paperKeep/);assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});
