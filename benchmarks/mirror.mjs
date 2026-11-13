import assert from 'node:assert/strict';
import {boot} from '../tests/harness.mjs';

// Controlled follow-up to the Alpha 0.7.7 baseline.
// Each pair plays the same two rosters / RNG seed with reversed A/B slots.
export function runMirror(){
  const rows=[];const problems=[];
  const bucket=(xs,key)=>Object.fromEntries([...new Set(xs.map(x=>String(x[key])))].sort((a,b)=>Number(a)-Number(b))
    .map(k=>[k,xs.filter(x=>String(x[key])===k).length]));
  const mean=(xs,key)=>xs.reduce((s,x)=>s+x[key],0)/xs.length;
  for(let batch=0;batch<10;batch++){
    const {sim}=boot({now:1731111111000+batch*41241211});
    const world=sim.newGame('balanced','QA Mirror '+batch);
    const fixtures=Object.values(world.fixtures).flat();
    for(let j=0;j<50;j++){
      const pair=batch*50+j;
      const f=fixtures[(pair*13+batch*7)%fixtures.length];
      const seed=(Math.imul(pair+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
      const attempt=(a,b,flipped)=>{
        world.rng=seed;
        const m=sim.simulateMatch({...f,a,b});
        const last=m.frames.at(-1);
        if(!m.winner||!last){
          // Preserve exact failing orientation and physical endgame evidence.
          // This is diagnostics only: the gate still rejects any missing win.
          const snapshot=last&&{minute:last.minute,towers:last.towers,
            gold:last.gold,nexus:last.siege?.hp,
            siegeDecision:last.siegeDecision,
            units:Object.values(last.navigation?.after||{}).map(p=>({
              role:p.role,team:p.teamId,node:p.node,intent:p.intent,goal:p.goal
            }))};
          console.error('[mirror-failure] '+JSON.stringify({
            batch,pair,seed,a,b,flipped,snapshot}));
          throw Error('No winner/final frame');
        }
        return {batch,pair,seed,a,b,flipped,blueWon:m.winner===a,
          winner:m.winner,minute:last.minute,
          kills:last.kills[a]+last.kills[b],
          towers:last.towers[a]+last.towers[b],
          dragons:last.dragons[a]+last.dragons[b],
          barons:last.barons[a]+last.barons[b],
          firstTowerMinute:m.events.find(e=>e.facts?.action==='tower')?.minute??null,
          towerActions:m.events.filter(e=>e.facts?.action==='tower').length};
      };
      try{
        const first=attempt(f.a,f.b,false),mirror=attempt(f.b,f.a,true);
        rows.push(first,mirror);
      }catch(e){problems.push({pair,seed,error:String(e)})}
    }
  }
  const pairs=[];
  for(let i=0;i<rows.length;i+=2){
    const x=rows[i],y=rows[i+1];
    if(!y||x.pair!==y.pair)continue;
    pairs.push({pair:x.pair,bothBlue:x.blueWon&&y.blueWon,bothRed:!x.blueWon&&!y.blueWon,
      sameTeam:x.winner===y.winner,
      oppositeWinners:x.winner!==y.winner});
  }
  const summary={
    base:'500 paired fixtures with fixed seeds and reversed sides',
    matches:rows.length,pairs:pairs.length,failures:problems.slice(0,8),
    wins:{blue:rows.filter(x=>x.blueWon).length,red:rows.filter(x=>!x.blueWon).length},
    outcomes:{bothBlue:pairs.filter(x=>x.bothBlue).length,
      bothRed:pairs.filter(x=>x.bothRed).length,
      sameTeamWinsBoth:pairs.filter(x=>x.sameTeam).length,
      oppositeWinners:pairs.filter(x=>x.oppositeWinners).length},
    towers:{mean:+mean(rows,'towers').toFixed(3),hist:bucket(rows,'towers'),
      exact3:rows.filter(x=>x.towers===3).length,
      meanFirstTowerMinute:+mean(rows.filter(x=>x.firstTowerMinute!==null),'firstTowerMinute').toFixed(2),
      noEarlyTowerBefore36:rows.filter(x=>x.firstTowerMinute===null||x.firstTowerMinute>=36).length},
    objectives:{dragonsMean:+mean(rows,'dragons').toFixed(3),baronsMean:+mean(rows,'barons').toFixed(3),
      dragonHist:bucket(rows,'dragons'),baronHist:bucket(rows,'barons')},
    duration:{mean:+mean(rows,'minute').toFixed(2),min:Math.min(...rows.map(r=>r.minute)),max:Math.max(...rows.map(r=>r.minute))},
    samples:rows.filter(x=>x.towers>=5).slice(0,4)
  };
  
  // Return diagnostics even if a match fails; the runner marks the gate red after exporting metrics.
 return summary;
}
