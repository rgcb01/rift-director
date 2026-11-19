/* Read-only teamfight diagnostics. A sampled minute is classified once,
 * separating formation, contact, earlier combat attrition and cooldown.
 * Historical matches without diagnostics are not counted as zero.
 */
export function diagnoseTeamfights(match){
 const result={sampledMinutes:0,noFormation:0,noContact:0,lostBeforeGroup:0,cooldown:0,selected:0,withheld:0,unexplained:0,engageActions:{},reinforcementPlans:0,reinforcementOrders:0,reinforcementArrivals:0,reinforcementGroupFights:0,shotcallerPlans:0,shotcallerOrders:0,shotcallerArrived3:0,shotcallerGroupFights:0,shotcallerActions:{},formations:{},rounds:{},zones:{}};
 for(const f of match.frames||[]){
  const d=f.teamfightDiagnostic;if(!d||f.minute<14)continue;
  result.sampledMinutes++;
  for(const p of Object.values(f.shotcallerPlans||{})){
   result.shotcallerPlans++;
   result.shotcallerActions[p.action]=(result.shotcallerActions[p.action]||0)+1;
   const actual=p.members.map(m=>f.navigation.before[m.id]);
   result.shotcallerOrders+=actual.filter(a=>a?.reason?.startsWith('shotcaller_')).length;
   if(p.members.filter((m,i)=>actual[i]?.alive&&actual[i].node===m.goal).length>=3)result.shotcallerArrived3++;
   if(match.events.some(e=>e.minute===f.minute&&e.facts?.groupFight?.round===1&&e.facts.groupFight.groups[p.teamId]?.filter(id=>p.members.some(m=>m.id===id)).length>=3))result.shotcallerGroupFights++;
  }
  for(const p of Object.values(f.skirmishReinforcements||{})){
   result.reinforcementPlans++;
   result.reinforcementOrders+=p.recruits.length;
   const present=[...p.stayingIds,...p.recruits.map(r=>r.id)].filter(id=>{const a=f.navigation.before[id];return a?.alive&&a.node===p.target;});
   if(present.length>=3)result.reinforcementArrivals++;
   if(match.events.some(e=>e.minute===f.minute&&e.facts?.groupFight?.zone===p.target&&e.facts.groupFight.groups[p.teamId]?.some(id=>p.recruits.some(r=>r.id===id))))result.reinforcementGroupFights++;
  }
  for(const r of f.engageDecisions||[])for(const d of r.decisions)result.engageActions[d.action]=(result.engageActions[d.action]||0)+1;
  if(d.selected)result.selected++;
  else if(d.withheld)result.withheld++;
  else if(d.after.reachableBoth&&d.cooldown)result.cooldown++;
  else if(d.before.reachableBoth&&!d.after.reachableBoth)result.lostBeforeGroup++;
  else if(!d.after.nearBoth)result.noFormation++;
  else if(!d.after.reachableBoth)result.noContact++;
  else result.unexplained++;
 }
 const groups=new Map();
 for(const e of match.events||[]){
  const g=e.facts?.groupFight;if(!g)continue;
  const prior=groups.get(g.id)||{g,rounds:0};
  prior.rounds+=e.facts.action==='simultaneous_fight'?e.facts.simultaneous.receipts.length:1;groups.set(g.id,prior);
 }
 for(const {g,rounds} of groups.values()){
  const sizes=Object.values(g.groups).map(ids=>ids.length).sort((a,b)=>a-b).join('v');
  result.formations[sizes]=(result.formations[sizes]||0)+1;
  result.rounds[rounds]=(result.rounds[rounds]||0)+1;
  result.zones[g.zone]=(result.zones[g.zone]||0)+1;
 }
 return result;
}
export function aggregateTeamfights(rows){
 const out={sampledMinutes:0,noFormation:0,noContact:0,lostBeforeGroup:0,cooldown:0,selected:0,withheld:0,unexplained:0,engageActions:{},reinforcementPlans:0,reinforcementOrders:0,reinforcementArrivals:0,reinforcementGroupFights:0,shotcallerPlans:0,shotcallerOrders:0,shotcallerArrived3:0,shotcallerGroupFights:0,shotcallerActions:{},formations:{},rounds:{},zones:{}};
 for(const r of rows){
  if(!r)continue;
  for(const k of Object.keys(out)){
   if(typeof out[k]==='number')out[k]+=r[k]||0;
   else for(const [key,n] of Object.entries(r[k]||{}))out[k][key]=(out[k][key]||0)+n;
  }
 }
 return out;
}
