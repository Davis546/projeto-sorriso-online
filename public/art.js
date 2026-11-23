export const AGENTS=[{"id": "solar", "coat": "#27232d", "trim": "#d6bd86", "hair": "#bd9169", "skin": "#d3a18b", "maskColor": "#211b25", "accent": "#f0c466"}, {"id": "ritual", "coat": "#d5ccd0", "trim": "#aa8cbe", "hair": "#593b38", "skin": "#9a6c5b", "maskColor": "#d9d0bd", "accent": "#bb90f8"}, {"id": "alvo", "coat": "#493139", "trim": "#d8a4a1", "hair": "#252329", "skin": "#c49c81", "maskColor": "#d6c7bf", "accent": "#f46b79"}, {"id": "feras", "coat": "#6e4939", "trim": "#d9d1bd", "hair": "#282438", "skin": "#a47d76", "maskColor": "#d0b0ab", "accent": "#fc6a6d"}, {"id": "lunar", "coat": "#ded2cc", "trim": "#eab1c4", "hair": "#2a1e24", "skin": "#9d634b", "maskColor": "#ece2da", "accent": "#f4c0e1"}];
function makeSprite(a,frame=0,masked=true){
 const c=document.createElement('canvas');c.width=48;c.height=56;const g=c.getContext('2d');
 const f=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h)};
 const walk=frame===1?2:frame===2?-2:0,attack=frame===3;
 // leg positions and boots: 4 animation phases
 f(14+walk,43,10,10,'#151018');f(27-walk,43,10,10,'#151018');
 f(16+walk,43,6,9,a.trim);f(29-walk,43,6,9,a.trim);
 f(14+walk,51,10,3,'#08070c');f(27-walk,51,10,3,'#08070c');
 f(14+walk,44,2,6,'#67424a');f(29-walk,44,2,6,'#67424a');
 // silhouette arms; expressive combat pose on attack frame
 const left=attack?3:-walk,right=attack?-3:walk;
 f(7+left,26,10,23,'#0e0b15');f(35+right,26,9,23,'#0d0a13');
 f(9+left,28,7,17,a.coat);f(37+right,28,6,17,a.coat);
 f(8+left,31,2,10,a.trim);f(42+right,31,2,9,a.trim);
 f(10+left,43,5,6,a.skin);f(36+right,43,5,6,a.skin);
 // armored tunic with edging, belt, fabric seams and insignia
 f(12,24,26,26,'#0e0b13');f(14,25,22,22,a.coat);f(13,26,3,18,a.trim);f(33,26,3,18,a.trim);
 f(17,28,2,15,'#ffffff22');f(30,28,2,14,'#0a081650');
 f(16,42,19,3,'#23131b');f(24,42,4,3,'#d0a197');
 f(16,46,19,2,'#0e0c16');
 if(a.id==='solar'){
   f(17,28,14,10,'#171722');f(20,29,9,2,'#d9b75a');f(24,31,3,8,'#f4df9d');
   f(18,39,13,2,'#6b5540');f(17,27,3,17,'#867042');
 }
 if(a.id==='ritual'){
   f(13,26,5,21,'#dfcfd7');f(34,26,5,21,'#dfd4e1');
   f(19,30,13,13,'#48325d');f(22,30,7,3,'#d8b676');
   f(23,35,2,7,'#f3deab');f(21,37,7,2,'#bd9ae9');
   f(14,44,4,3,'#e9bdf3');f(34,44,4,3,'#e9bdf3');
 }
 if(a.id==='alvo'){
   f(15,28,19,16,'#392733');f(17,30,15,3,'#a96b6e');
   f(21,34,9,7,'#271620');f(23,35,4,3,'#dd6678');f(24,35,2,4,'#fbd0b0');
   f(16,43,16,2,'#c14b60');f(18,45,2,4,'#81304c');
   f(15,33,3,7,'#eec6a5');
 }
 if(a.id==='feras'){
   f(15,27,4,12,'#eddcc7');f(33,27,4,12,'#dfc8b6');
   f(17,32,15,12,'#3e2726');f(19,34,3,8,'#d9a57d');f(27,34,3,8,'#d9a57d');
   f(14,29,3,6,'#c45157');f(35,29,3,7,'#c45157');
 }
 if(a.id==='lunar'){
   f(14,28,21,17,'#d9c1cc');f(17,29,16,3,'#fff2df');
   f(22,33,10,10,'#6a455b');f(23,34,7,2,'#efcfe4');
   f(13,40,7,3,'#e9aaca');f(32,40,5,3,'#e9aaca');
 }
 // asymmetrical hair and high-contrast mask
 if(masked){
 f(13,12,23,18,'#0c0911');f(16,10,18,7,a.hair);
 f(14,14,21,10,a.hair);f(16,8,7,8,a.hair);f(28,9,7,9,a.hair);
 f(17,17,18,14,'#241923');f(18,18,16,11,a.maskColor);
 f(17,20,2,8,'#201720');f(33,20,2,8,'#201720');
 f(14,15,6,2,'#47303a');f(30,14,5,2,'#47303a');
 if(a.id==='solar'){
   f(19,18,13,3,'#846137');f(20,21,11,8,'#14131a');f(21,20,9,2,'#ffe094');
   f(23,17,3,13,'#f7bf5a');f(17,26,17,2,'#ca9851');f(25,17,2,2,'#fff2b0');
 }
 if(a.id==='ritual'){
   f(18,19,14,10,'#e7d9bf');f(22,17,3,12,'#b9985f');
   f(18,22,14,2,'#805b49');f(22,25,7,3,'#492837');f(22,16,7,3,'#d3c4c3');
   f(25,18,2,3,'#fce3a2');
 }
 if(a.id==='alvo'){
   f(18,18,15,12,'#ead6c7');f(20,20,11,2,'#32252c');
   f(22,22,8,2,'#17131b');f(24,18,2,11,'#1b1119');
   f(20,26,11,2,'#34202c');f(24,22,3,2,'#ffb4ae');
   f(25,27,2,2,'#962d44');
 }
 if(a.id==='feras'){
   f(18,18,15,10,'#ebc7b4');f(18,22,14,3,'#281820');
   for(let i=0;i<4;i++)f(18+i*4,26,2,4,'#251721');
   f(23,17,4,8,'#ac3c51');f(28,16,6,4,a.hair);
 }
 if(a.id==='lunar'){
   f(18,19,15,11,'#f5e6e2');f(19,22,14,2,'#634855');
   f(27,18,5,5,'#b54d68');f(25,20,6,3,'#622b45');
   f(19,27,10,2,'#dcb9bd');f(22,18,2,3,'#fff6f7');
 }
 }else{
  // Antes de receber as máscaras: rostos distintos, olhos e expressões visíveis.
  f(17,16,18,15,a.skin);f(17,16,2,13,'#2f212b');f(33,16,2,13,'#2f212b');
  f(16,13,19,5,a.hair);f(15,16,7,3,a.hair);f(29,15,6,4,a.hair);
  f(20,22,4,2,'#181923');f(28,22,4,2,'#181923');
  f(24,26,3,2,'#704c48');f(22,29,8,1,'#593d40');
  if(a.id==='solar')f(19,18,14,2,'#4c3133');
  if(a.id==='feras')f(20,30,9,2,'#6f3038');
 }
 // hair glints, cloth highlights, stepped cloak edges, animation accent
 f(17,9,5,2,'#ffffff23');f(30,11,3,2,'#fbe2d721');
 f(15,33,2,3,'#ffffff24');f(33,36,2,4,'#05050a55');
 if(frame===1){f(14,50,5,2,'#d6a3aa');f(34,48,4,2,'#110b13')}
 if(frame===2){f(30,50,5,2,'#d6a3aa');f(17,48,4,2,'#110b13')}
 if(attack){f(9,28,4,5,'#e8c6b2');f(38,28,4,4,'#e8c6b2')}
 return c;
}

function polishSprite(base,a){const c=document.createElement('canvas');c.width=192;c.height=224;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(base,0,0,192,224);return c}

function makeMonster(type,frame=0){const c=document.createElement('canvas');c.width=48;c.height=48;const g=c.getContext('2d');const f=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h)};
 const walk=frame===1?3:frame===2?-3:0,atk=frame===3;
 if(type==='sangue'){
  f(12,25,26,15,'#541726');f(15,26,21,13,'#bd3346');
  f(8-walk,23,7,17,'#761b2d');f(35+walk,22,7,18,'#802031');
  f(7-walk,33,6,9,'#d04a58');f(38+walk,32,7,9,'#d45560');
  f(16,10,20,18,'#6a1c2c');f(18,13,17,14,'#c64c58');
  f(16,12,7,4,'#e46f79');f(31,15,4,6,'#8b2638');
  f(18,19,5,4,'#ffe7b1');f(29,18,5,4,'#ffe7b1');
  f(19,20,2,2,'#a02d37');f(30,19,2,2,'#7e1b25');
  f(23,27,9,5,'#2c0815');f(24,29,2,3,'#fff0c5');f(29,29,2,3,'#ffddbd');
  f(11+walk,39,9,6,'#42111d');f(30-walk,39,9,6,'#42111d');
  if(atk){f(3,26,9,4,'#ef7c7d');f(39,24,8,4,'#ef7c7d');f(23,27,11,7,'#e88e92')}
 }
 if(type==='rastejante'){
  f(10,23,32,16,'#252738');f(14,21,22,14,'#9b949f');
  f(12,14,25,12,'#514c60');f(14,12,22,7,'#bdb1b6');
  f(14,18,20,6,'#ddd2cb');f(17,20,4,3,'#e690c0');f(29,20,4,3,'#e690c0');
  f(21,26,10,3,'#3e243d');f(23,28,5,3,'#e7a4b8');
  f(6-walk,28,10,7,'#6b6573');f(4-walk,33,7,10,'#928e99');
  f(36+walk,27,9,6,'#6b6573');f(39+walk,31,6,11,'#928e99');
  f(17+walk,38,9,6,'#514a59');f(29-walk,38,8,6,'#514a59');
  for(let i=0;i<3;i++)f(16+i*6,15,2,2,'#efe9e5');
  if(atk){f(2,37,6,8,'#f5b5c9');f(42,37,6,8,'#f5b5c9');f(23,25,5,5,'#3f172c')}
 }
 if(type==='monitor'){
  f(11,17,30,25,'#202331');f(9,12,32,27,'#567877');
  f(13,16,25,21,'#a3c6bc');f(14,17,23,16,'#213a45');
  f(16,20,18,8,'#102e35');f(19,22,4,4,'#ffa1a5');f(29,22,4,4,'#ffa1a5');
  f(17,30,17,3,'#799ea1');f(17,34,15,3,'#37404d');
  f(6-walk,30,7,9,'#4e536b');f(39+walk,29,7,9,'#4e536b');
  f(15+walk,39,9,6,'#2b2b3d');f(30-walk,39,8,6,'#2b2b3d');
  f(20,8,3,5,'#7bc8ba');f(29,9,3,4,'#7bc8ba');f(21,29,8,2,'#dd5c75');
  if(atk){f(15,21,20,7,'#e09ea5');f(18,22,16,3,'#ffdfd0');f(20,9,12,2,'#cefdf4')}
 }
 if(type==='bruto'){
  f(8,21,34,22,'#4d1629');f(12,22,27,21,'#8d3440');
  f(4-walk,22,12,24,'#8b2b41');f(37+walk,20,10,26,'#8b2b41');
  f(5-walk,29,7,13,'#dc5961');f(40+walk,27,6,14,'#da5966');
  f(15,9,21,21,'#a63e4e');f(16,15,8,5,'#f3c7b7');f(28,15,7,5,'#f3c7b7');
  f(17,16,5,3,'#38202a');f(29,16,4,3,'#38202a');
  f(22,23,12,6,'#360c1a');f(25,25,2,4,'#f9d3c1');f(30,25,2,4,'#f9d3c1');
  f(10+walk,40,13,6,'#40121f');f(29-walk,40,13,6,'#40121f');
  f(12,25,4,9,'#e47b76');f(36,26,3,10,'#e47b76');
  if(atk){f(0,24,9,8,'#f07e80');f(41,22,7,9,'#f07e80');f(20,23,16,5,'#c75f67')}
 }

 if(type==='cacador'){
  f(11,27,29,14,'#361b26');f(13,23,24,16,'#9f4b53');
  f(7-walk,25,8,17,'#b55c57');f(35+walk,23,8,17,'#b55c57');
  f(15,11,23,20,'#622f38');f(15,13,21,15,'#d88367');
  f(18,18,6,4,'#ffeeab');f(30,18,6,4,'#ffeeab');
  f(23,26,9,6,'#3e1824');f(20,27,3,4,'#f6d2ab');f(29,27,3,4,'#f6d2ab');
  f(8-walk,38,12,7,'#441728');f(30+walk,38,10,7,'#441728');
  f(10,9,7,12,'#f4b577');f(35,9,7,12,'#f4b577');
  if(atk){f(1,30,12,5,'#ffbc78');f(40,29,7,6,'#ffbc78');f(17,24,18,8,'#eea37b')}
 }
 if(type==='devoto'){
  f(10,17,30,27,'#18152a');f(12,21,26,22,'#5a426d');
  f(7-walk,24,9,19,'#342542');f(35+walk,24,9,19,'#342542');
  f(14,8,24,21,'#2e243d');f(18,13,17,17,'#b99aa7');
  f(17,17,17,5,'#432a52');f(20,20,4,3,'#ec8aff');f(29,20,4,3,'#ec8aff');
  f(21,25,11,3,'#5f3468');f(19,7,4,9,'#a777cf');f(30,7,4,9,'#a777cf');
  f(17+walk,40,10,5,'#24172e');f(29-walk,40,10,5,'#24172e');
  f(5,29,5,11,'#d2aaff');f(2,24,10,5,'#d2aaff');f(6,17,2,13,'#f4e4ff');
  if(atk){f(1,17,13,9,'#cc8cff');f(5,14,6,4,'#fff6cf');f(18,17,16,9,'#8b59c0')}
 }
 return c;
}

export function createArt(){return {heroes: AGENTS.map(a=>[0,1,2,3].map(f=>polishSprite(makeSprite(a,f,true),a))),heroesUnmasked:AGENTS.map(a=>[0,1,2,3].map(f=>polishSprite(makeSprite(a,f,false),a))), monsters: Object.fromEntries(["sangue","rastejante","monitor","bruto","cacador","devoto"].map(t=>[t,[0,1,2,3].map(i=>makeMonster(t,i))]))};}
export function renderBoss(ctx,e,t){const game={t};
function drawBoss(e){
 const time=game.t,tw=Math.sin(time*4);
 ctx.save();ctx.translate(e.x,e.y+tw*1.8);ctx.rotate(Math.sin(time*2.9)*.036);
 ctx.fillStyle='#060509aa';ctx.beginPath();ctx.ellipse(0,35,42,14,0,0,Math.PI*2);ctx.fill();
 // Broken golden TV-sun halo, each jagged ray breathing in pixel steps.
 ctx.save();ctx.rotate(time*(e.phase2?.17:.08));
 for(let i=0;i<12;i++){const a=i*Math.PI/6,ray=12+Math.sin(time*5+i*1.7)*4;
  ctx.save();ctx.rotate(a);ctx.fillStyle=i%3===0?'#e58744':'#a75c37';ctx.fillRect(-5,-43,10,12);ctx.fillStyle=e.phase2?'#ffad45':'#f5be62';ctx.fillRect(-3,-55-ray,6,18+ray);ctx.fillStyle='#ffe1a3';ctx.fillRect(-1,-55-ray,2,8);ctx.restore()}
 ctx.restore();
 // Dark coat, ribbed shoulders, animated heavy arms.
 const arm=tw*3;
 ctx.fillStyle='#16111e';ctx.fillRect(-26,0,52,61);ctx.fillStyle='#43242d';ctx.fillRect(-21,4,42,52);
 ctx.fillStyle='#6e303b';ctx.fillRect(-35,8+arm,15,42);ctx.fillRect(20,8-arm,15,42);
 ctx.fillStyle='#a04e47';ctx.fillRect(-33,15+arm,8,25);ctx.fillRect(25,15-arm,8,25);
 ctx.fillStyle='#261a23';ctx.fillRect(-24,56,20,10);ctx.fillRect(4,56,20,10);
 ctx.fillStyle='#b88369';ctx.fillRect(-7,5,14,16);ctx.fillStyle='#d5b195';ctx.fillRect(-4,10,8,7);
 ctx.fillStyle='#d59e59';ctx.fillRect(-17,20,34,3);ctx.fillRect(-13,38,26,3);
 ctx.fillStyle='#e5b77f';ctx.fillRect(-3,24,6,14);ctx.fillStyle='#8b3c3f';ctx.fillRect(-23,4,7,52);
 // Stepped pixel sun face, glint and shadow.
 for(let yy=-54;yy<=9;yy+=4){const k=(yy+23)/34,half=Math.floor(33*Math.sqrt(Math.max(0,1-k*k)));
  ctx.fillStyle='#712d22';ctx.fillRect(-half-4,yy,half*2+8,4);
  ctx.fillStyle=yy< -40?'#ffd381':yy>0?'#dc995a':'#f2be6f';ctx.fillRect(-half+2,yy,Math.max(1,half*2-4),4)}
 ctx.fillStyle='#fce0a0';ctx.fillRect(-22,-42,12,4);ctx.fillRect(11,-41,9,4);
 const blink=Math.sin(time*2.7)> .97;
 ctx.fillStyle='#2a111e';ctx.fillRect(-16,-33,9,blink?3:13);ctx.fillRect(7,-33,9,blink?3:13);
 ctx.fillStyle='#fff0ac';if(e.phase2){ctx.fillRect(-13,-31,3,5);ctx.fillRect(10,-31,3,5)}
 const smile=Math.sin(time*4)>0 ? 1:0;
 ctx.fillStyle='#4b1723';ctx.fillRect(-17,-13,34,4);ctx.fillRect(-12,-9,24,smile?7:4);
 ctx.fillStyle='#fbe8af';ctx.fillRect(-10,-9,20,2);ctx.fillRect(-7,-3,14,2);
 ctx.fillStyle='#c24441';ctx.fillRect(-24,-49,4,17);ctx.fillRect(-20,-44,4,5);ctx.fillRect(15,-36,5,20);
 if(e.phase2){ctx.fillStyle='#ff9d64';ctx.fillRect(-24,-12,8,4);ctx.fillRect(16,-11,8,4);ctx.fillStyle='#ff4d58';ctx.fillRect(-6,2,12,3)}
 ctx.restore();
}

function drawDirector(e){
 const tm=game.t,bob=Math.sin(tm*3)*2;
 ctx.save();ctx.translate(e.x,e.y+bob);ctx.imageSmoothingEnabled=false;
 const f=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)};
 ctx.fillStyle='#080512aa';ctx.beginPath();ctx.ellipse(0,44,47,13,0,0,Math.PI*2);ctx.fill();
 // antennae, floating tape crown
 for(let i=-2;i<=2;i++){const dx=i*14,w=Math.round(Math.sin(tm*5+i)*3);f(dx-2,-98+w,4,29,'#5c4879');f(dx-5,-105+w,10,8,i%2?'#ff8dc6':'#a7eeff');f(dx-3,-94+w,6,9,'#9975b6')}
 // tattered black-purple coat
 f(-30,-3,60,65,'#100c1e');f(-24,1,48,61,'#332343');
 f(-38,8,18,50,'#262137');f(20,8,18,50,'#262137');
 const hand=Math.round(Math.sin(tm*4)*5);f(-44,10+hand,12,24,'#a99bce');f(32,10-hand,12,24,'#a99bce');
 f(-23,18,8,33,'#8d70a7');f(15,18,8,33,'#8d70a7');
 f(-24,56,20,12,'#140d24');f(5,56,20,12,'#140d24');
 f(-7,8,14,33,'#cda4e4');f(-5,15,10,26,'#572a6c');f(-3,20,6,16,'#e6c3fa');
 f(-32,-65,64,68,'#080b1a');f(-26,-59,52,55,'#716397');
 f(-22,-55,44,43,'#211a39');f(-19,-51,38,34,e.phase2?'#9c1f53':'#342b60');
 f(-16,-47,32,5,'#a880cc');f(-14,-42,28,27,e.phase2?'#d84977':'#4c456f');
 const eye=Math.sin(tm*7)>0;f(-12,-35,9,5,eye?'#dcfffd':'#efbbef');f(5,-35,9,5,eye?'#dcfffd':'#efbbef');
 f(-7,-24,14,3,'#1a132d');f(-10,-21,20,3,'#e9baff');
 f(-28,-62,56,6,'#12121e');f(-28,-6,56,6,'#0a0716');
 // flickering static bars
 for(let i=0;i<5;i++){const yy=-47+i*9+Math.round(Math.sin(tm*13+i)*2),ww=8+i*5;f(-21+(i*13)%18,yy,ww,2,i%2?'#d2f4ef':'#b07fe9')}
 f(-38,-57,9,48,'#4e3d64');f(29,-57,9,48,'#4e3d64');f(-44,-13,17,8,'#e8b9f3');f(27,-13,17,8,'#e8b9f3');
 if(e.phase2){ctx.strokeStyle='#ff4baa';ctx.lineWidth=3;ctx.strokeRect(-41,-72,82,142);f(-33,-68,8,5,'#ffb1d9');f(26,-68,8,5,'#ffb1d9')}
 ctx.restore();
}

function drawTargetBoss(e){
 const tm=game.t,bob=Math.sin(tm*4.5)*2.2;
 ctx.save();ctx.translate(e.x,e.y+bob);ctx.imageSmoothingEnabled=false;
 const f=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)};
 ctx.fillStyle='#08050aaa';ctx.beginPath();ctx.ellipse(0,44,49,14,0,0,Math.PI*2);ctx.fill();
 // trailing wires
 for(let i=0;i<6;i++){ctx.strokeStyle=i%2?'#5b2024':'#2d0e12';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10+i*4,-72);ctx.quadraticCurveTo(-45+i*11,-112+Math.sin(tm*3+i)*8,-30+i*13,-144+Math.sin(tm*4+i)*10);ctx.stroke()}
 // claws
 const sway=Math.sin(tm*6)*4;
 f(-44,2,15,46,'#ead8d2');f(29,2,15,46,'#ead8d2');
 f(-49,35+sway,8,20,'#ead8d2');f(-57,47+sway,9,18,'#ead8d2');f(-37,49+sway,9,18,'#ead8d2');
 f(41,35-sway,8,20,'#ead8d2');f(33,47-sway,9,18,'#ead8d2');f(53,49-sway,9,18,'#ead8d2');
 f(-58,63+sway,12,5,'#9e171f');f(-39,65+sway,12,5,'#9e171f');f(31,65-sway,12,5,'#9e171f');f(51,63-sway,12,5,'#9e171f');
 // body suit
 f(-24,-4,48,70,'#171116');f(-28,-8,56,18,'#2d272d');f(-32,-4,11,62,'#2a2229');f(21,-4,11,62,'#2a2229');
 f(-18,5,36,57,'#241a20');f(-7,9,14,20,'#f2e8df');f(-6,30,12,16,'#7b1118');f(-15,47,30,6,'#1a1015');
 f(-17,65,13,21,'#1a1317');f(4,65,13,21,'#1a1317');f(-19,85,15,5,'#47333c');f(4,85,15,5,'#47333c');
 // ripped coat edges
 f(-39,2,12,53,'#0f0b12');f(27,2,12,53,'#0f0b12');f(-33,50,8,18,'#0f0b12');f(25,50,8,18,'#0f0b12');
 // tv head
 f(-31,-70,62,52,'#5f4d52');f(-28,-67,56,46,'#7f6b6f');f(-22,-61,44,33,'#eedfd3');f(-24,-63,48,37,'#332226');
 f(-17,-56,34,23,'#f1e7da');
 // target screen rings
 ctx.strokeStyle=e.phase2?'#ff4f70':'#b33d3f';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,-45,12,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,-45,20,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,-45,28,0,Math.PI*2);ctx.stroke();
 f(-1,-46,3,3,'#3d0c10');ctx.strokeStyle='#431015';ctx.beginPath();ctx.moveTo(-31,-72);ctx.lineTo(33,-20);ctx.moveTo(24,-70);ctx.lineTo(-20,-21);ctx.stroke();
 // knobs / blood / paper
 f(30,-61,8,10,'#d0bcaf');f(30,-47,8,10,'#d0bcaf');f(-37,-79,28,7,'#efe4d7');f(-35,-77,25,5,'#fbf1e8');
 f(-29,-78,11,2,'#8f151e');f(-8,-58,3,30,'#a4121a');f(6,-62,3,35,'#a4121a');f(11,-26,3,20,'#a4121a');
 if(e.phase2){ctx.strokeStyle='#ff8aa0';ctx.lineWidth=3;ctx.strokeRect(-36,-76,72,167);f(-30,-71,10,5,'#ffccd6');f(20,-71,10,5,'#ffccd6')}
 ctx.restore();
}

if(e.kind==="sol")drawBoss(e);else if(e.kind==="diretora")drawDirector(e);else drawTargetBoss(e);}
