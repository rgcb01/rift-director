// Read-only benchmark diagnostics: NEVER alter simulation state or match RNG.
// Windows after shutdown measure temporal association, not proven causality.
const average=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const teamRows=(frame,team)=>Object.values(frame?.powerEconomy?.entries||{})
 .filter(p=>p.teamId===team);
export function equipmentAt(frame,team,catalog){
 const rows=teamRows(frame,team);
 const ids=new Set(catalog.map(x=>x.id));
 return {
  spent:rows.reduce((n,p)=>n+p.spent,0),
  wallet:rows.reduce((n,p)=>n+p.wallet,0),
  completed:rows.reduce((n,p)=>n+p.items.filter(id=>ids.has(id)).length,0),
  attack:rows.reduce((n,p)=>n+p.items.reduce((v,id)=>{
   const item=catalog.find(x=>x.id===id);return v+(item?.attack||0);
  },0),0),
  defense:rows.reduce((n,p)=>n+p.items.reduce((v,id)=>{
   const item=catalog.find(x=>x.id===id);return v+(item?.defense||0);
  },0),0)
 };
}
export function diagnoseMatch(match,fixture,catalog){
 const [a,b]=[fixture.a,fixture.b];
 const at=minute=>match.frames.find(f=>f.minute===minute)||
  [...match.frames].reverse().find(f=>f.minute<minute)||match.frames[0];
 const snapshot=minute=>{
  const fr=at(minute),A=equipmentAt(fr,a,catalog),B=equipmentAt(fr,b,catalog);
  return {minute:fr?.minute??0,goldLead:(fr?.gold?.[a]||0)-(fr?.gold?.[b]||0),
   spentLead:A.spent-B.spent,walletLead:A.wallet-B.wallet,
   completedLead:A.completed-B.completed,
   attackLead:A.attack-B.attack,defenseLead:A.defense-B.defense};
 };
 const early=snapshot(20),mid=snapshot(30);
 const deficit=early.goldLead>=1500?b:early.goldLead<=-1500?a:null;
 const shutdowns=match.events.filter(e=>e.facts?.bountyGold>0);
 const conversions=shutdowns.map(e=>{
  const team=e.teamId,from=e.minute;
  const objective=match.events.filter(other=>
   other.teamId===team&&other.minute>from&&other.minute<=from+5&&
   ['plate','tower','dragon','baron'].includes(other.facts?.action));
  const next=match.frames.find(f=>f.minute>=from+5)||match.frames.at(-1);
  const current=match.frames.find(f=>f.minute>=from)||match.frames.at(-1);
  const opp=team===a?b:a;
  const gap=fr=>(fr?.gold?.[team]||0)-(fr?.gold?.[opp]||0);
  return {team,minute:from,objective:objective.length>0,
   tower:objective.some(x=>x.facts.action==='tower'),
   goldGapImprovement:gap(next)-gap(current),
   underdog:gap(current)<0};
 });
 const purchases=match.events.filter(e=>e.facts?.action==='item_purchase');
 return {early,mid,deficit,comeback:!!deficit&&match.winner===deficit,
  deficitWasEquipped:!!deficit&&
   (deficit===a?early.spentLead<0:early.spentLead>0),
  shutdowns:conversions.length,
  shutdownObjectives:conversions.filter(x=>x.objective).length,
  shutdownTowers:conversions.filter(x=>x.tower).length,
  underdogShutdowns:conversions.filter(x=>x.underdog).length,
  underdogShutdownObjectives:conversions.filter(x=>x.underdog&&x.objective).length,
  underdogShutdownGapImprovement:conversions.filter(x=>x.underdog)
   .reduce((n,x)=>n+x.goldGapImprovement,0),
  purchasesAfter20:purchases.filter(x=>x.minute>20).length
 };
}
export function aggregateDiagnostics(rows){
 const diagnostic=rows.map(r=>r.economyDiagnosis).filter(Boolean);
 const eligible=diagnostic.filter(d=>d.deficit),underdog=diagnostic.filter(d=>d.underdogShutdowns);
 const aggregate=key=>diagnostic.reduce((n,d)=>n+d[key],0);
 const avg=key=>Number(average(diagnostic.map(d=>d[key])).toFixed(2));
 const difference=(minute,key)=>Number(average(diagnostic.map(d=>Math.abs(d[minute][key]))).toFixed(2));
 return {
  eligibleComebacks20:eligible.length,
  conditionalComebackRate:eligible.length?
   Number((eligible.filter(d=>d.comeback).length/eligible.length).toFixed(4)):null,
  earlyGoldGapMean:difference('early','goldLead'),
  earlySpentGapMean:difference('early','spentLead'),
  earlyWalletGapMean:difference('early','walletLead'),
  midGoldGapMean:difference('mid','goldLead'),
  midSpentGapMean:difference('mid','spentLead'),
  midWalletGapMean:difference('mid','walletLead'),
  earlyEquipmentAlignedWithGoldLead:eligible.length?
   Number((eligible.filter(d=>d.deficitWasEquipped).length/eligible.length).toFixed(4)):null,
  shutdownsPerMatch:avg('shutdowns'),
  shutdownToObjective5Rate:aggregate('shutdowns')?
   Number((aggregate('shutdownObjectives')/aggregate('shutdowns')).toFixed(4)):null,
  shutdownToTower5Rate:aggregate('shutdowns')?
   Number((aggregate('shutdownTowers')/aggregate('shutdowns')).toFixed(4)):null,
  underdogShutdowns:aggregate('underdogShutdowns'),
  underdogShutdownToObjective5Rate:aggregate('underdogShutdowns')?
   Number((aggregate('underdogShutdownObjectives')/aggregate('underdogShutdowns')).toFixed(4)):null,
  underdogShutdownGapImprovementMean:aggregate('underdogShutdowns')?
   Number((underdog.reduce((n,d)=>n+d.underdogShutdownGapImprovement,0)/
    aggregate('underdogShutdowns')).toFixed(2)):null,
  purchasesAfter20PerMatch:avg('purchasesAfter20')
 };
}
