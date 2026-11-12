// Full-draft round robin, paired by swapping both complete drafts
// between the same rosters, side assignment and match seed.
// These are hypotheses for the current ten-champion pool, NOT gameplay
// modifiers or promises of poke range, dive mobility or late scaling.
import {boot} from '../tests/harness.mjs';
export const ROLES=Object.freeze(['TOP','JUN','MID','ADC','SUP']);
export const COMPOSITIONS=Object.freeze({
 front_to_back:Object.freeze({TOP:'korvek',JUN:'sereth',MID:'elaris',ADC:'nyra',SUP:'thessa'}),
 dive:Object.freeze({TOP:'hrodan',JUN:'veyra',MID:'aeska',ADC:'velin',SUP:'drathos'}),
 pick:Object.freeze({TOP:'korvek',JUN:'veyra',MID:'elaris',ADC:'velin',SUP:'drathos'}),
 poke_prototype:Object.freeze({TOP:'hrodan',JUN:'sereth',MID:'aeska',ADC:'velin',SUP:'thessa'}),
 scaling_prototype:Object.freeze({TOP:'korvek',JUN:'sereth',MID:'elaris',ADC:'nyra',SUP:'drathos'})
});
export function compositionDraft(world,core,teamId,name){
 const team=world.clubs.find(c=>c.id===teamId),comp=COMPOSITIONS[name];
 if(!team||!comp)throw Error('Invalid composition/team: '+name);
 return Object.fromEntries(ROLES.map(role=>{
  const id=team.lineup[role],champion=comp[role];
  if(!world.players.some(p=>p.id===id&&p.role===role)||
     core.ChampionScaling.DEFINITIONS[champion]?.role!==role)
   throw Error('Invalid composition pick: '+role);
  return [id,champion];
 }));
}
export function runCompositionMatchups({pairsPerMatchup=10}={}){
 if(!Number.isInteger(pairsPerMatchup)||pairsPerMatchup<1)throw Error('Invalid pair count');
 const names=Object.keys(COMPOSITIONS),cases=[],failures=[],rows=[];
 const metricKeys=['kills','towers','dragons','barons','gold20','level20','casts','groupCasts','groupKills','nexusDamage'];
 const blank=()=>({games:0,wins:0,...Object.fromEntries(metricKeys.map(k=>[k,0]))});
 const totals=Object.fromEntries(names.map(name=>[name,blank()]));
 for(let a=0;a<names.length;a++)for(let b=a+1;b<names.length;b++){
  const first=names[a],second=names[b],stats={[first]:blank(),[second]:blank()};
  const paired={validPairs:0,firstSweep:0,secondSweep:0,split:0,blueSweep:0,redSweep:0};
  for(let j=0;j<pairsPerMatchup;j++){
   // Use the same scenarios for every matchup, avoiding composition-specific
   // strength of schedule. The second leg changes drafts, not roster/side.
   const batch=j%5,{sim,core}=boot({now:1731111111000+batch*41241211});
   const world=sim.newGame('balanced','QA Composition '+batch);
   const fixtures=Object.values(world.fixtures).flat();
   const f=fixtures[(j*17+batch*11)%fixtures.length];
   const seed=(Math.imul(j+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const legs=[];
   for(const [blue,red] of [[first,second],[second,first]]){
    try{
     const draft={...compositionDraft(world,core,f.a,blue),...compositionDraft(world,core,f.b,red)};
     world.rng=seed;
     const m=sim.simulateMatch(f,{draft}),end=m.frames.at(-1);
     const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
      ...core.PowerEconomy.audit(m),...core.NexusSiege.audit(m),
      ...core.Encounters.audit(m,world),...core.ChampionKits.audit(m)];
     if(!m.winner||errors.length||Object.entries(draft).some(([id,c])=>
      m.champions.entries[id]!==c||end.powerEconomy.entries[id].championId!==c))
      throw Error(errors.slice(0,4).join(' | ')||'Invalid winner or draft');
     const mid=m.frames.find(fr=>fr.minute===20)||end;
     const winner=m.winner===f.a?blue:red;
     const values={};
     for(const [team,name] of [[f.a,blue],[f.b,red]]){
      const ids=Object.keys(end.powerEconomy.entries).filter(id=>end.powerEconomy.entries[id].teamId===team);
      const events=m.events.filter(e=>e.teamId===team);
      const groups=events.filter(e=>e.facts?.groupFight);
      values[name]={kills:end.kills[team],towers:end.towers[team],dragons:end.dragons[team],
       barons:end.barons[team],gold20:mid.gold[team],
       level20:ids.reduce((n,id)=>n+mid.powerEconomy.entries[id].level,0)/ids.length,
       casts:ids.reduce((n,id)=>n+Object.values(m.abilityState.entries[id].casts).reduce((a,b)=>a+b,0),0),
       groupCasts:groups.reduce((n,e)=>n+(e.facts.abilityCasts?.length||0),0),
       groupKills:groups.reduce((n,e)=>n+(e.facts.victimIds?.length||0),0),
       nexusDamage:108-end.siege.hp[team===f.a?f.b:f.a]};
     }
     legs.push({blue,red,winner,winningSide:m.winner===f.a?'blue':'red',duration:end.minute,values});
    }catch(e){failures.push({first,second,j,batch,seed,fixture:f,blue,red,error:String(e)});}
   }
   // Exclude both legs if either is invalid to preserve paired design.
   if(legs.length!==2)continue;
   paired.validPairs++;
   if(legs.every(l=>l.winner===first))paired.firstSweep++;
   else if(legs.every(l=>l.winner===second))paired.secondSweep++;
   else paired.split++;
   if(legs.every(l=>l.winningSide==='blue'))paired.blueSweep++;
   if(legs.every(l=>l.winningSide==='red'))paired.redSweep++;
   for(const l of legs)for(const name of [first,second]){
    for(const r of [stats[name],totals[name]]){
     r.games++;r.wins+=Number(l.winner===name);
     for(const key of metricKeys)r[key]+=l.values[name][key];
    }
   }
   cases.push({first,second,j,batch,seed,fixture:f,legs});
  }
  rows.push({first,second,paired,firstWinRate:stats[first].games?stats[first].wins/stats[first].games:null,
   secondWinRate:stats[second].games?stats[second].wins/stats[second].games:null});
 }
 const summary=names.map(name=>({name,...totals[name],winRate:totals[name].games?totals[name].wins/totals[name].games:null,
  means:Object.fromEntries(metricKeys.map(k=>[k,totals[name].games?totals[name][k]/totals[name].games:null]))}));
 return {schema:1,pairsPerMatchup,requestedPairs:names.length*(names.length-1)/2*pairsPerMatchup,
  validPairs:cases.length,failures,compositions:COMPOSITIONS,rows,summary,cases};
}
