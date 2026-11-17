import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Structure QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117),a=nav.a,b=nav.b;
 const state={lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:core.LaneEconomy.create(a,b).lanes};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents))p.node='red_mid_outer';
 nav.siegeDecision={stage:0,teamId:a,lane:'MID',wave:1,escorts:Object.values(nav.agents).filter(p=>p.teamId===a).map(p=>p.id)};
 return {core,sim,world,fixture,nav,state,health,a,b};
}
test('visible tower threats recruit healthy reachable defenders without moving or drafting a jungler',()=>{
 const {core,nav,state,health,b}=setup();
 const before=JSON.stringify(nav);
 const run=()=>core.StructureFormation.plan({nav,world:state,minute:25,health});
 const p=run();assert.ok(p);assert.equal(p.teamId,b);assert.equal(p.goal,'red_mid_outer');
 assert.equal(p.members.length,4);assert.ok(p.members.every(m=>m.role!=='JUN'&&m.hops<=3));
 assert.equal(JSON.stringify(nav),before);
 nav.structureDefense=p;
 assert.equal(core.StructureFormation.movement(nav,nav.agents[p.members[0].id],25).goal,p.goal);
 const mid=Object.values(nav.agents).find(p=>p.teamId===b&&p.role==='MID');
 health[mid.id]=40;assert.equal(run(),null);
 health[mid.id]=100;
 for(const r of Object.values(nav.agents).filter(p=>p.teamId!==b))r.node='blue_fountain';
 assert.equal(run(),null);
});
test('structure mode tests varied real fixtures against atomic combat baseline',()=>{
 let plans=0,structureFights=0,baseFights=0,newFights=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const f=fixtures[(i*13+batch*7)%fixtures.length];
   try{
    world.rng=seed;const baseline=sim.simulateMatch(f,{simultaneousCombat:true});
    world.rng=seed;const m=sim.simulateMatch(f,{simultaneousCombat:true,structureTeamfights:true});
    baseFights+=baseline.events.filter(e=>e.facts?.groupFight?.round===1).length;
    newFights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    structureFights+=m.events.filter(e=>e.facts?.action==='simultaneous_fight'&&/_(outer|inner|base)$/.test(e.facts.node)).length;
    for(const fr of m.frames){const p=fr.structureDefense;if(!p)continue;plans++;
     assert.ok(p.visibleRivals.length>=2&&p.members.length>=3&&p.members.length<=4);
     assert.ok(p.members.every(x=>x.hops<=3&&x.hp>=65&&x.role!=='JUN'));
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.auditMinimap(m,world),...core.MatchReplay.auditMoments(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('STRUCTURE_TEAMFIGHTS='+JSON.stringify({maps:120,plans,structureFights,baseFights,newFights,issues:issues.slice(0,5)}));
 assert.ok(plans>0,'Expected actual defensive formation calls');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
