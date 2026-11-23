// Prioridade de trilha: durante chefes, especiais não substituem a OST.
export const RELIQUIA_OST='reliquia-invasion';
export function bossMusic(state){
 if(!state || (state.phase!=='fight' && state.phase!=='boss_intro'))return null;
 if(state.bossKind==='energia')return RELIQUIA_OST;
 // A trilha do chefe permanece enquanto a onda do chefe ainda tem inimigos.
 if(['sol','diretora','tv','confessor','final'].includes(state.bossKind))
  return state.bossKind==='final'?'gal-final-8bit':state.bossKind==='tv'?'alvo':state.bossKind;
 const b=state.enemies?.find(e=>['sol','diretora','tv','energia','confessor','final'].includes(e.kind));
 return b?(b.kind==='energia'?RELIQUIA_OST:b.kind==='final'?'gal-final-8bit':b.kind==='tv'?'alvo':b.kind):null;
}
export function chooseMusic(requested,state){return bossMusic(state)||requested;}
