// Matched single-pick substitutions. Not a draft simulator or an
// observational win-rate table: each pair keeps roster, opponent, side,
// other nine champion picks and match seed fixed.
import {boot} from '../tests/harness.mjs';
const ROLES=['TOP','JUN','MID','ADC','SUP'];
export function runChampionMatchups({pairsPerRole=20}={}){
 if(!Number.isInteger(pairsPerRole)||pairsPerRole<1)throw Error('Invalid pair count');
 const cases=[],failures=[];
 const rows=[];
 for(const role of ROLES){
  let options;
  const totals={},paired={bothWin:0,neitherWin:0,firstOnly:0,secondOnly:0,validPairs:0};
  for(let j=0;j<pairsPerRole;j++){
   const batch=j%4;
   const {sim,core}=boot({now:1731111111000+batch*41241211});
   const world=sim.newGame('balanced','QA Champion Matchups '+batch);
   const fixtures=Object.values(world.fixtures).flat();
   const f=fixtures[(j*13+batch*7)%fixtures.length];
   const seed=(Math.imul(j+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const teamId=j%2===0?f.a:f.b;
   const professional=world.clubs.find(c=>c.id===teamId).lineup[role];
   options=Object.values(core.ChampionScaling.DEFINITIONS).filter(c=>c.role===role).map(c=>c.id);
   if(options.length!==2)throw Error('Matched pair requires exactly two choices for '+role);
   const outcomes=[];
   for(const championId of options){
    const row=totals[championId]??={games:0,wins:0,kills:0,deaths:0,assists:0,casts:0,level:0};
    try{
     world.rng=seed;
     const m=sim.simulateMatch(f,{draft:{[professional]:championId}});
     const end=m.frames.at(-1),p=end.powerEconomy.entries[professional],stats=end.playerStats[professional];
     const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
      ...core.PowerEconomy.audit(m),...core.NexusSiege.audit(m),
      ...core.Encounters.audit(m,world),...core.ChampionKits.audit(m)];
     if(!m.winner||p.championId!==championId||errors.length)
      throw Error(errors.slice(0,4).join(' | ')||'Invalid draft or winner');
     const win=m.winner===teamId;
     outcomes.push({championId,win});
     row.games++;row.wins+=Number(win);row.kills+=stats.kills;
     row.deaths+=stats.deaths;row.assists+=stats.assists;row.level+=p.level;
     row.casts+=Object.values(m.abilityState.entries[professional].casts).reduce((a,b)=>a+b,0);
    }catch(e){failures.push({role,j,batch,seed,fixture:f,teamId,championId,error:String(e)});}
   }
   if(outcomes.length===2){
    paired.validPairs++;
    const [a,b]=outcomes;
    if(a.win&&b.win)paired.bothWin++;
    else if(!a.win&&!b.win)paired.neitherWin++;
    else if(a.win)paired.firstOnly++;
    else paired.secondOnly++;
    cases.push({role,j,batch,seed,teamId,fixture:f,outcomes});
   }
  }
  rows.push({role,options,paired,champions:options.map(id=>{
   const r=totals[id],n=r.games;
   return {id,...r,winRate:n?r.wins/n:null,
    meanKills:n?r.kills/n:null,meanDeaths:n?r.deaths/n:null,meanAssists:n?r.assists/n:null,
    meanCasts:n?r.casts/n:null,meanLevel:n?r.level/n:null};
  }),pairedWinDelta:paired.validPairs?(paired.firstOnly-paired.secondOnly)/paired.validPairs:null});
 }
 return {schema:1,pairsPerRole,requestedPairs:ROLES.length*pairsPerRole,
  validPairs:cases.length,failures,rows,cases};
}
