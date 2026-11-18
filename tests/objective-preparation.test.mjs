import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Preparation QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117),a=nav.a,b=nav.b;
 const state={nextDragon:40,nextBaron:28,lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:core.LaneEconomy.create(a,b).lanes,map:{riverVision:{[a]:70,[b]:70}},gold:{[a]:10000,[b]:10000}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents))p.node='upper_river';
 return {core,nav,state,health,a,b};
}
test('early call is based on actual future spawn and a reachable healthy squad',()=>{
 const {core,nav,state,health,a}=setup(),N=core.NeutralObjectives;
 assert.equal(N.plan(nav,state,22,health)[a].action,'hold');
 const p=N.plan(nav,state,22,health,{earlyPreparation:true})[a];
 assert.equal(p.target,'baron_pit');assert.equal(p.targetSpawn,28);
 assert.equal(p.preparation.lead,6);assert.equal(p.until,30);
 assert.ok(p.reinforcementIds.length>=1);
 assert.equal(p.preparation.escortIds.length,2);
 for(const id of [...p.preparation.escortIds,...p.reinforcementIds]){
  assert.ok(core.Navigation.hops(nav.agents[id].node,p.target)<=6);
  nav.neutralPlans={[a]:p};
  assert.equal(N.movement(nav,nav.agents[id],22,state).goal,p.target);
 }
 assert.equal(state.nextBaron,28);
 state.nextBaron=35;
 assert.equal(N.plan(nav,state,23,health,{earlyPreparation:true})[a].action,'hold');
});
test('preparation does not override a viable siege, exposed base or injured escorts',()=>{
 const {core,nav,state,health,a}=setup(),N=core.NeutralObjectives;
 const run=()=>{nav.neutralCalls={};return N.plan(nav,state,22,health,{earlyPreparation:true})[a]};
 const j=Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='JUN');
 health[j.id]=50;assert.equal(run().action,'hold');health[j.id]=100;
 nav.siegeDecision={teamId:a,stage:1,wave:1,travel:2,escorts:['a','b']};assert.equal(run().action,'hold');
 nav.siegeDecision=null;state.lanes[a].TOP=3;assert.equal(run().action,'hold');
});
test('early preparation measures actual arrival and match audits on 120 paired maps',()=>{
 let calls=0,earlyMinutes=0,ready=0,baseReady=0,baseFights=0,fights=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,objectiveDiagnostics:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,earlyPreparation:true});
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    const countReady=m=>m.frames.flatMap(fr=>fr.objectiveReadiness||[]).filter(r=>r.lead<=0&&r.members.filter(p=>p.ready&&p.present).length>=3).length;
    baseReady+=countReady(base);ready+=countReady(m);
    for(const fr of m.frames){
     for(const p of Object.values(fr.objectivePlans||{}))if(p.preparation){
      earlyMinutes++;if(p.created===fr.minute)calls++;
      assert.equal(p.targetSpawn-p.created,p.preparation.lead);
      assert.ok(p.preparation.lead>=4&&p.preparation.lead<=6);
      assert.equal(p.until,p.targetSpawn+2);
      assert.ok(p.reinforcementIds.length>=1);
     }
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('EARLY_PREPARATION='+JSON.stringify({maps:120,calls,earlyMinutes,baseReady,ready,baseFights,fights,issues:issues.slice(0,5)}));
 assert.ok(calls>0,'Expected actual preparation calls');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
