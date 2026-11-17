import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
test('120 maps with authoritative simultaneous combat: causal state, sport and replay',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Teamfight QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 let fights=0,windows=0,kills=0,changed=0;
 const issues=[];
 for(let i=1;i<=120;i++){
  const seed=i*12571;
  try{
   world.rng=seed;const baseline=sim.simulateMatch(fixture);
   world.rng=seed;const m=sim.simulateMatch(fixture,{simultaneousCombat:true});
   const events=m.events.filter(e=>e.facts?.action==='simultaneous_fight');
   fights+=events.length;
   windows+=events.reduce((n,e)=>n+e.facts.simultaneous.receipts.length,0);
   kills+=events.reduce((n,e)=>n+e.facts.victimIds.length,0);
   if(m.winner!==baseline.winner)changed++;
   const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
    ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
    ...core.auditMinimap(m,world),...core.MatchReplay.auditMoments(m,world),...core.auditBroadcast(m,world),
    ...core.LaneEconomy.audit(m),...core.NexusSiege.audit(m),...core.NeutralObjectives.audit(m),
    ...core.Vision.audit(m),...core.Counterplay.audit(m),...core.MacroPolicy.audit(m),...core.TacticalAI.audit(m,world)];
   if(!m.winner||errors.length)issues.push({seed,errors:errors.slice(0,10)});
   if(events.length){
    const i=m.events.indexOf(events[0]);
    const view=core.MatchReplay.eventView(m,i);
    assert.ok(view);assert.equal(view.participants.length,events[0].facts.participantIds.length);
   }
  }catch(e){issues.push({seed,error:String(e.stack||e).slice(0,700)});}
 }
 console.log('AUTHORITATIVE_TEAMFIGHT='+JSON.stringify({maps:120,fights,windows,kills,changed,issues:issues.slice(0,10)}));
 assert.ok(fights>0);assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
