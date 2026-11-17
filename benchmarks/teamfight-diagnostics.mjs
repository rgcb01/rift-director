/* Read-only teamfight diagnostics. A sampled minute is classified once,
 * separating formation, contact, earlier combat attrition and cooldown.
 * Historical matches without diagnostics are not counted as zero.
 */
export function diagnoseTeamfights(match){
 const result={sampledMinutes:0,noFormation:0,noContact:0,lostBeforeGroup:0,cooldown:0,selected:0,unexplained:0,formations:{},rounds:{},zones:{}};
 for(const f of match.frames||[]){
  const d=f.teamfightDiagnostic;if(!d||f.minute<14)continue;
  result.sampledMinutes++;
  if(d.selected)result.selected++;
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
  prior.rounds++;groups.set(g.id,prior);
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
 const out={sampledMinutes:0,noFormation:0,noContact:0,lostBeforeGroup:0,cooldown:0,selected:0,unexplained:0,formations:{},rounds:{},zones:{}};
 for(const r of rows){
  if(!r)continue;
  for(const k of Object.keys(out)){
   if(typeof out[k]==='number')out[k]+=r[k]||0;
   else for(const [key,n] of Object.entries(r[k]||{}))out[k][key]=(out[k][key]||0)+n;
  }
 }
 return out;
}
