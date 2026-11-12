// Read-only Alpha 0.7.17 champion diagnostics. Never mutates match state.
// Health in historical frames is a percentage; "observed TTK" is measured
// in SIMULATED MINUTES from first recorded injury to the confirmed death,
// not real-time seconds or ability micro-ticks.
const avg=values=>values.length?values.reduce((n,v)=>n+v,0)/values.length:null;
function effectiveAverages(frame){
 const rows=Object.values(frame?.powerEconomy?.entries||{});
 const valid=rows.map(row=>row.effectiveStats).filter(Boolean);
 if(!valid.length)return null;
 return {maxHp:avg(valid.map(s=>s.maxHp)),
  attackDamage:avg(valid.map(s=>s.attackDamage)),
  armor:avg(valid.map(s=>s.armor)),
  magicResist:avg(valid.map(s=>s.magicResist)),
  attackSpeed:avg(valid.map(s=>s.attackSpeed))};
}
export function diagnoseChampionMatch(match){
 const events=match.events||[],injuries=new Map();
 let damage=0,mitigationTotal=0,mitigationEvents=0,observedTtkTotal=0,observedTtkKills=0;
 let localTtkTotal=0,localTtkKills=0,shieldAbsorbed=0,healed=0,controlCasts=0,resourceSpent=0;
 const slotCasts={Q:0,W:0,E:0,R:0};
 for(const e of events){
  const facts=e.facts;if(!facts)continue;
  for(const cast of facts.abilityCasts||[]){
   if(cast.slot in slotCasts)slotCasts[cast.slot]++;
   resourceSpent+=cast.cost||0;
   if(cast.controlSeconds>0)controlCasts++;
  }
  const hits=Array.isArray(facts.impacts)?facts.impacts:
   facts.action==='skirmish'?[{id:facts.targetId,hpBefore:facts.hpBefore,
    hpAfter:facts.hpAfter,mitigation:facts.mitigation,
    ttkSeconds:facts.ttkSeconds,shieldAbsorbed:facts.shieldAbsorbed,
    healed:facts.healed}]:[];
  for(const hit of hits){
   if(!hit?.id||!Number.isFinite(hit.hpBefore)||!Number.isFinite(hit.hpAfter))continue;
   const applied=Math.max(0,hit.hpBefore-hit.hpAfter);
   if(applied<=0)continue;
   damage+=applied;
   shieldAbsorbed+=hit.shieldAbsorbed||0;
   healed+=hit.healed||0;
   if(hit.hpAfter===0&&Number.isSafeInteger(hit.ttkSeconds)){
    localTtkTotal+=hit.ttkSeconds;localTtkKills++;
   }
   if(Number.isFinite(hit.mitigation)){
    mitigationTotal+=hit.mitigation;mitigationEvents++;
   }
   // A full HP target, or one unobserved for >8 minutes, starts a new
   // observable combat window. Old damage cannot manufacture short TTK.
   const prior=injuries.get(hit.id);
   if(!prior||hit.hpBefore>=99||e.minute-prior.last>8)
    injuries.set(hit.id,{start:e.minute,last:e.minute});
   else prior.last=e.minute;
   if(hit.hpAfter===0){
    observedTtkTotal+=e.minute-injuries.get(hit.id).start+1;
    observedTtkKills++;
    injuries.delete(hit.id);
   }
  }
 }
 const mid=match.frames?.find(f=>f.minute===20)||
   match.frames?.find(f=>f.minute>20)||match.frames?.at(-1);
 return {damage,mitigationTotal,mitigationEvents,observedTtkTotal,observedTtkKills,
  localTtkTotal,localTtkKills,shieldAbsorbed,healed,controlCasts,resourceSpent,slotCasts,
  at20:effectiveAverages(mid),atEnd:effectiveAverages(match.frames?.at(-1))};
}
export function aggregateChampionDiagnostics(rows){
 const total=k=>rows.reduce((n,r)=>n+(r.championDiagnostics?.[k]||0),0);
 const perMatch=k=>rows.length?+(total(k)/rows.length).toFixed(2):null;
 const stat=(frame,key)=>{
  const vals=rows.map(r=>r.championDiagnostics?.[frame]?.[key])
   .filter(v=>Number.isFinite(v));
  return vals.length?+avg(vals).toFixed(2):null;
 };
 return {hpDamagePerMatch:perMatch('damage'),
  castsPerMatch:rows.length?+(
   rows.reduce((n,r)=>n+Object.values(r.championDiagnostics?.slotCasts||{})
    .reduce((sum,c)=>sum+c,0),0)/rows.length).toFixed(2):null,
  slotCasts:Object.fromEntries(['Q','W','E','R'].map(slot=>
   [slot,rows.length?+(rows.reduce((n,r)=>n+
    (r.championDiagnostics?.slotCasts?.[slot]||0),0)/rows.length).toFixed(2):null])),
  localTtkSeconds:total('localTtkKills')?
   +(total('localTtkTotal')/total('localTtkKills')).toFixed(2):null,
  localTtkKills:total('localTtkKills'),
  shieldsPerMatch:perMatch('shieldAbsorbed'),
  healsPerMatch:perMatch('healed'),
  controlCastsPerMatch:perMatch('controlCasts'),
  resourceSpentPerMatch:perMatch('resourceSpent'),
  observedTtkMinutes:total('observedTtkKills')?
   +(total('observedTtkTotal')/total('observedTtkKills')).toFixed(2):null,
  observedTtkKills:total('observedTtkKills'),
  meanMitigation:total('mitigationEvents')?
   +(total('mitigationTotal')/total('mitigationEvents')).toFixed(3):null,
  hp20:stat('at20','maxHp'),hpEnd:stat('atEnd','maxHp'),
  ad20:stat('at20','attackDamage'),adEnd:stat('atEnd','attackDamage'),
  armorEnd:stat('atEnd','armor'),mrEnd:stat('atEnd','magicResist'),
  asEnd:stat('atEnd','attackSpeed')};
}
