import assert from 'node:assert/strict';
import { boot } from '../tests/harness.mjs';

// Alpha 0.7.7 baseline: 1,000 full matches, 10 independently generated
// worlds, 100 distinct seeds/world, rotating actual league fixtures.
// Does not alter gameplay, saves, finances or golden fingerprints.
const N=1000;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const pct=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0;
const histogram=(values,bounds)=>bounds.map(([lo,hi,label])=>({label,count:values.filter(x=>x>=lo&&x<=hi).length}));
const sum=(a,k)=>a.reduce((t,x)=>t+(x[k]||0),0);
const durationBins=[[0,24,'0–24'],[25,34,'25–34'],[35,44,'35–44'],[45,54,'45–54'],[55,64,'55–64'],[65,75,'65–75'],[76,999,'76+']];
const killBins=[[0,4,'0–4'],[5,9,'5–9'],[10,14,'10–14'],[15,19,'15–19'],[20,29,'20–29'],[30,999,'30+']];
const actions=['lane_trade','gank','gank_avoided','teamfight','clash','skirmish','dragon','baron','tower','plate','nexus'];
export function runStandard() {
  const rows=[], actionTotals=Object.fromEntries(actions.map(k=>[k,0]));
  const actionMatches=Object.fromEntries(actions.map(k=>[k,0]));
  const tacticReasons={};const issues=[], worldStats=[];
  let audited=0, auditFailures=0;
  for(let batch=0;batch<10;batch++){
    const {sim,core}=boot({now:1731111111000+batch*41241211});
    const world=sim.newGame('balanced','QA Balance '+batch);
    const fixtures=Object.values(world.fixtures).flat();
    const batchRows=[];
    for(let j=0;j<100;j++){
      const i=batch*100+j;
      const fixture=fixtures[(i*13+batch*7)%fixtures.length];
      const seed=(Math.imul(i+1,2654435761) ^ Math.imul(batch+1,1013904223))>>>0;
      world.rng=seed;
      try{
        const m=sim.simulateMatch(fixture);
        const f=m.frames.at(-1);
        if(!f){issues.push({i,seed,error:'No final frame'});continue}
        const actionCounts=Object.fromEntries(actions.map(k=>[k,0]));
        let baronSteals=0;
        for(const e of m.events){
          const kind=e.facts?.action;
          if(kind in actionCounts)actionCounts[kind]++;
          if(kind==='baron'&&e.facts.stolen)baronSteals++;
        }
        for(const k of actions){
          actionTotals[k]+=actionCounts[k];
          if(actionCounts[k]>0)actionMatches[k]++;
        }
        for(const frame of m.frames){
          if(frame.minute>=36)continue;
          for(const agent of Object.values(frame.navigation?.before||{})){
            if(!agent.alive||!agent.reason)continue;
            tacticReasons[agent.reason]=(tacticReasons[agent.reason]||0)+1;
          }
        }
        const a=fixture.a,b=fixture.b;
        const row={
          i,world:batch,seed,fixtureA:a,fixtureB:b,
          duration:f.minute,events:m.events.length,
          winner:m.winner,side:m.winner===a?'blue':m.winner===b?'red':'invalid',
          killsA:f.kills[a],killsB:f.kills[b],
          totalKills:f.kills[a]+f.kills[b],
          killMargin:Math.abs(f.kills[a]-f.kills[b]),
          dragons:(f.dragons[a]||0)+(f.dragons[b]||0),
          barons:(f.barons[a]||0)+(f.barons[b]||0),
          towers:(f.towers[a]||0)+(f.towers[b]||0),
          baronSteals,
          towerLanes:[...new Set(m.events.filter(e=>e.facts?.action==='tower')
            .map(e=>e.facts.lane))].length,
          soloSplitTowers:m.events.filter(e=>e.facts?.action==='tower'&&e.facts.soloSplitpush).length,
          bothTeamsTowers:m.events.some(e=>e.facts?.action==='tower'&&e.teamId===a)&&
            m.events.some(e=>e.facts?.action==='tower'&&e.teamId===b),
          firstTowerMinute:m.events.find(e=>e.facts?.action==='tower')?.minute??null,
          goldLeader20:(()=>{const at=m.frames.find(f=>f.minute===20)||f;
            return at.gold[a]>at.gold[b]?a:at.gold[b]>at.gold[a]?b:null})(),
          goldLead20:(()=>{const at=m.frames.find(f=>f.minute===20)||f;
            return Math.abs(at.gold[a]-at.gold[b])})(),
          actions:actionCounts
        };
        rows.push(row);batchRows.push(row);
        if(true){
          audited++;
          const errors=[
            ...core.Navigation.auditNavigation(m,world),
            ...core.LaneEconomy.audit(m),
            ...core.TacticalAI.audit(m,world),
            ...core.Encounters.audit(m,world),
            ...core.auditMatch(m,world),
            ...core.auditMinimap(m,world),
            ...core.MatchReplay.auditMoments(m,world),
            ...core.auditBroadcast(m,world)
          ];
          if(errors.length){auditFailures++;issues.push({i,seed,error:errors.slice(0,3).join(' | ')})}
        }
      }catch(e){
        issues.push({i,seed,error:String(e?.stack||e).slice(0,700)});
      }
    }
    worldStats.push({world:batch,n:batchRows.length,blueWins:batchRows.filter(r=>r.side==='blue').length,
      durationAvg:Number(avg(batchRows.map(r=>r.duration)).toFixed(2)),
      killsAvg:Number(avg(batchRows.map(r=>r.totalKills)).toFixed(2))});
  }
  const durations=rows.map(r=>r.duration),kills=rows.map(r=>r.totalKills);
  const summary={
    base:'Fixed 1000-match benchmark across 10 deterministic worlds',
    requested:N,completed:rows.length,worlds:10,fixtures:'rotating actual Aurora league fixtures',
    seedScheme:'distinct per match; 100 per independently generated world',
    audited,auditFailures,issueCount:issues.length,issueSamples:issues.slice(0,10),
    wins:{blue:rows.filter(r=>r.side==='blue').length,red:rows.filter(r=>r.side==='red').length,invalid:rows.filter(r=>r.side==='invalid').length},
    duration:{mean:+avg(durations).toFixed(2),median:pct(durations,.5),p10:pct(durations,.1),p90:pct(durations,.9),
      p95:pct(durations,.95),min:Math.min(...durations),max:Math.max(...durations),hist:histogram(durations,durationBins)},
    kills:{mean:+avg(kills).toFixed(2),median:pct(kills,.5),p10:pct(kills,.1),p90:pct(kills,.9),
      min:Math.min(...kills),max:Math.max(...kills),hist:histogram(kills,killBins)},
    objectives:{dragonsAvg:+avg(rows.map(r=>r.dragons)).toFixed(2),baronsAvg:+avg(rows.map(r=>r.barons)).toFixed(2),
      towersAvg:+avg(rows.map(r=>r.towers)).toFixed(2),baronSteals:sum(rows,'baronSteals'),
      gamesWithoutDragon:rows.filter(r=>r.dragons===0).length,
      gamesWithoutBaron:rows.filter(r=>r.barons===0).length},
    gameplay:{meanEvents:+avg(rows.map(r=>r.events)).toFixed(2),
      zeroKills:rows.filter(r=>r.totalKills===0).length,
      earlyTowerMatches:rows.filter(r=>r.firstTowerMinute!==null&&r.firstTowerMinute<36).length,
      firstTowerMean:+avg(rows.filter(r=>r.firstTowerMinute!==null).map(r=>r.firstTowerMinute)).toFixed(2),
      platesPerMatch:+avg(rows.map(r=>r.actions.plate||0)).toFixed(2),
      gamesMultipleTowerLanes:rows.filter(r=>r.towerLanes>=2).length,
      gamesBothTeamsTowers:rows.filter(r=>r.bothTeamsTowers).length,
      soloSplitTowers:sum(rows,'soloSplitTowers'),
      soloSplitTowerGames:rows.filter(r=>r.soloSplitTowers>0).length,
      comebackWins20:rows.filter(r=>r.goldLead20>=1500&&r.goldLeader20&&r.goldLeader20!==r.winner).length,
      hugeKillMargin15:rows.filter(r=>r.killMargin>=15).length,
      durationAtCap75:rows.filter(r=>r.duration>=75).length,
      actionTotals,actionMatches,tacticReasons},
    worlds:worldStats,
    extremes:{
      fastest:[...rows].sort((a,b)=>a.duration-b.duration).slice(0,5).map(({i,world,seed,duration,totalKills,side})=>({i,world,seed,duration,totalKills,side})),
      slowest:[...rows].sort((a,b)=>b.duration-a.duration).slice(0,5).map(({i,world,seed,duration,totalKills,side})=>({i,world,seed,duration,totalKills,side})),
      bloodiest:[...rows].sort((a,b)=>b.totalKills-a.totalKills).slice(0,5).map(({i,world,seed,duration,totalKills,side})=>({i,world,seed,duration,totalKills,side}))
    }
  };
  
  // Return diagnostics even if a match fails; the runner marks the gate red after exporting metrics.
 return summary;
}
