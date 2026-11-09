/* Rift Director Alpha 0.7.15A — deterministic, physically earned Nexus siege.
 * No clock-based winner roll. A Nexus loses HP only with a broken three-tower
 * lane, an escorting wave and two living attackers in physical attack range.
 * Defenders reduce damage. Baron only improves an actual, present assault.
 * No gameplay RNG is consumed and no club/finance resources are awarded.
 */
((root)=>{
 'use strict';
 const core=root.RiftCore||(root.RiftCore={});
 const MAX_HP=108,LANES=['TOP','MID','BOT'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const side=(nav,id)=>id===nav.a?'blue':'red';
 const foe=(nav,id)=>id===nav.a?nav.b:nav.a;
 const round=v=>Math.round(v*100)/100;
 function create(a,b){
  return {version:1,maxHp:MAX_HP,hp:{[a]:MAX_HP,[b]:MAX_HP},hits:0};
 }
 // A wave is required; an abstract lane-pressure lead is not a free attack
 // unless all three physical towers in that *same lane* have fallen.
 function validWave(nav,world,attacker,defender){
  const opened=LANES.filter(l=>world.lanes?.[defender]?.[l]===3);
  const choices=opened.map(l=>({lane:l,wave:core.LaneEconomy.pressureFor(
   {teamIds:[nav.a,nav.b],lanes:world.waves},attacker,l)}));
  choices.sort((a,b)=>b.wave-a.wave||LANES.indexOf(a.lane)-LANES.indexOf(b.lane));
  return choices[0]&&choices[0].wave>=-.25?choices[0]:null;
 }
 function damageFor(attackers,defenders,wave,baron){
  if(!Number.isSafeInteger(attackers)||attackers<2||attackers>5||
     !Number.isSafeInteger(defenders)||defenders<0||defenders>5||
     !Number.isFinite(wave)||wave<-.25) return 0;
  // Defenders interrupt physical attacks rather than undoing dealt damage.
  return Math.max(0,Math.round(attackers*10+clamp(wave,0,3)*3+
   (baron?7:0)-defenders*7));
 }
 function candidates(nav,world,minute,health,dead){
  const output=[];
  for(const attacker of [nav.a,nav.b]){
   const defender=foe(nav,attacker),target=side(nav,defender)+'_nexus';
   const wave=validWave(nav,world,attacker,defender);
   if(!wave)continue;
   const active=p=>p.alive&&(dead?.[p.id]??0)<=minute&&
     (health?.[p.id]??100)>0&&p.intent!=='retreat'&&p.intent!=='dead';
   const participants=core.Navigation.participants(nav,attacker,target,1).filter(active);
   if(participants.length<2)continue;
   const defenders=core.Navigation.participants(nav,defender,target,1).filter(active);
   const baron=(world.baronBuff?.[attacker]??0)>0;
   const damage=damageFor(participants.length,defenders.length,wave.wave,baron);
   if(damage<=0)continue;
   output.push({teamId:attacker,targetTeamId:defender,node:target,
    lane:wave.lane,wave:wave.wave,baron,
    participantIds:participants.map(p=>p.id),
    defenderIds:defenders.map(p=>p.id),damage});
  }
  // Stronger simultaneous physical assaults are resolved first, regardless
  // of blue/red identity. If both deal lethal damage at once, a fixed
  // ordering still produces an auditable winner rather than a scripted roll.
  return output.sort((a,b)=>b.damage-a.damage||
   a.teamId.localeCompare(b.teamId));
 }
 function advance(model,nav,world,minute,health,dead){
  const hits=[];
  for(const attack of candidates(nav,world,minute,health,dead)){
   if(model.hp[attack.targetTeamId]===0)continue;
   const before=model.hp[attack.targetTeamId];
   const applied=Math.min(before,attack.damage);
   model.hp[attack.targetTeamId]=before-applied;model.hits++;
   hits.push({...attack,minute,before,damage:applied,
    rawDamage:attack.damage,after:model.hp[attack.targetTeamId]});
   if(model.hp[attack.targetTeamId]===0)break;
  }
  return hits;
 }
 function snapshot(model){
  return {version:1,maxHp:model.maxHp,hp:{...model.hp},hits:model.hits};
 }
 function audit(match){
  const errors=[],ids=[match.fixture.a,match.fixture.b];
  let hp=Object.fromEntries(ids.map(id=>[id,MAX_HP])),hitCount=0;
  for(const event of match.events||[]){
   const p=event.facts;
   if(!['nexus_damage','nexus'].includes(p?.action))continue;
   const other=event.teamId===ids[0]?ids[1]:ids[0];
   const frame=match.frames?.find(f=>f.minute===event.minute);
   const before=frame?.navigation?.before;
   const actor=before?.[p.actorId];
   if(event.teamId!==p.teamId||p.targetTeamId!==other||
      !actor||actor.teamId!==event.teamId||
      p.node!==(other===ids[0]?'blue':'red')+'_nexus'||
      !LANES.includes(p.lane)||
      !Number.isFinite(p.wave)||p.wave<-.25||
      !Number.isSafeInteger(p.before)||p.before!==hp[other]||
      !Number.isSafeInteger(p.after)||p.after<0||
      !Number.isSafeInteger(p.damage)||p.damage<1||
      p.before-p.after!==p.damage||
      !Number.isSafeInteger(p.rawDamage)||p.rawDamage<p.damage||
      p.rawDamage!==damageFor(p.participantIds?.length,p.defenderIds?.length,p.wave,p.baron)||
      !Array.isArray(p.participantIds)||p.participantIds.length<2||
      !p.participantIds.includes(p.actorId)||
      !Array.isArray(p.defenderIds)||
      !p.participantIds.every(id=>before?.[id]?.alive&&
       before[id].teamId===event.teamId&&
       core.Navigation.nearby(before[id].node,p.node,1)&&
       core.Navigation.combatRange(before[id].node,p.node,1))||
      !p.defenderIds.every(id=>before?.[id]?.alive&&
       before[id].teamId===other&&
       core.Navigation.nearby(before[id].node,p.node,1))||
      (p.action==='nexus'&&p.after!==0)||
      (p.action==='nexus_damage'&&p.after===0))
    errors.push('Golpe al Nexo incoherente: minuto '+event.minute);
   hp[other]=p.after;hitCount++;
  }
  for(const frame of match.frames||[]){
   if(!frame.siege||frame.siege.maxHp!==MAX_HP||
      !Number.isSafeInteger(frame.siege.hits))
    errors.push('Frame sin libro de vida del Nexo: '+frame.minute);
  }
  const last=match.frames?.at(-1)?.siege;
  for(const id of ids)if(last?.hp?.[id]!==hp[id])
   errors.push('Vida final del Nexo distinta de los golpes: '+id);
  if(last?.hits!==hitCount)
   errors.push('Número de golpes al Nexo distinto del replay.');
  if(match.winner&&hp[foe({a:ids[0],b:ids[1]},match.winner)]!==0)
   errors.push('Ganador sin destruir el Nexo.');
  return errors;
 }
 core.NexusSiege=Object.freeze({MAX_HP,create,validWave,damageFor,
  candidates,advance,snapshot,audit});
})(globalThis);
