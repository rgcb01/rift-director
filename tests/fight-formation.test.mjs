import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Formation QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117);
 const [a,b]=[nav.a,nav.b];
 const state={nextDragon:40,nextBaron:25,lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:core.LaneEconomy.create(a,b).lanes,map:{riverVision:{[a]:70,[b]:70}}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents))p.node='upper_river';
 nav.neutralPlans={[a]:{action:'contest',reason:'baron_contest',target:'baron_pit',targetSpawn:25,until:28},[b]:{action:'hold',until:24}};
 return {core,sim,world,fixture,nav,state,health,a,b};
}
test('formation selects three or four reachable allies from an active call without changing it',()=>{
 const {core,nav,state,health,a,b}=setup();
 const before=JSON.stringify({nav,state,health});
 const plans=core.FightFormation.plan({nav,world:state,minute:24,health});
 assert.equal(JSON.stringify({nav,state,health}),before);
 const p=plans[a];assert.ok(p);
 assert.ok(p.members.length>=3&&p.members.length<=4);
 assert.ok(p.members.some(x=>x.role==='JUN'));
 assert.ok(p.members.some(x=>x.role==='SUP'));
 assert.ok(p.members.some(x=>['MID','ADC'].includes(x.role)));
 assert.equal(plans[b],undefined);
 nav.fightFormations=plans;
 for(const m of p.members){
  const order=core.FightFormation.movement(nav,nav.agents[m.id],24);
  assert.equal(order.goal,'baron_pit');assert.equal(order.reason,'baron_contest');
 }
 assert.equal(core.FightFormation.movement(nav,nav.agents[p.members[0].id],25),null);
});
test('formation respects actual spawn, deadlines, health, nexus and siege commitments',()=>{
 const {core,nav,state,health,a,b}=setup();
 const run=()=>core.FightFormation.plan({nav,world:state,minute:24,health});
 const jungler=Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='JUN');
 health[jungler.id]=40;assert.equal(run()[a],undefined);health[jungler.id]=100;
 nav.siegeDecision={stage:1,teamId:a};assert.equal(run()[a],undefined);
 nav.siegeDecision={stage:3,teamId:b};assert.deepEqual(Object.keys(run()),[]);
 nav.siegeDecision=null;state.lanes[a].TOP=3;assert.equal(run()[a],undefined);state.lanes[a].TOP=0;
 nav.neutralPlans[a].until=24;assert.equal(run()[a],undefined);
 nav.neutralPlans[a].until=28;state.nextBaron=26;assert.equal(run()[a],undefined);
});
test('formation planning does not force low health or unreachable players to group',()=>{
 const {core,nav,state,health,a}=setup();
 const own=Object.values(nav.agents).filter(p=>p.teamId===a);
 const byRole=r=>own.find(p=>p.role===r);
 byRole('ADC').intent='recall_recover';health[byRole('TOP').id]=30;
 const plans=core.FightFormation.plan({nav,world:state,minute:24,health});
 assert.ok(plans[a]);assert.deepEqual(Array.from(plans[a].members.map(p=>p.role)).sort(),['JUN','MID','SUP']);
 byRole('MID').node='blue_fountain';nav.neutralPlans[a].until=25;
 assert.equal(core.FightFormation.plan({nav,world:state,minute:24,health})[a],undefined);
});
test('live formations preserve graph travel and existing sports audits',()=>{
 const {core,sim,world,fixture}=setup();let plans=0,arrivals=0;
 for(let i=1;i<=60;i++){
  world.rng=i*12571;const m=sim.simulateMatch(fixture);
  assert.ok(m.winner,'seed '+i);
  assert.equal(core.Encounters.audit(m,world).length,0);
  assert.equal(core.Navigation.auditNavigation(m,world).length,0);
  assert.equal(core.auditMatch(m,world).length,0);
  for(const f of m.frames)for(const p of Object.values(f.fightFormations||{})){
   plans++;assert.ok(p.members.length>=3&&p.members.length<=4);
   assert.equal(p.minute,f.minute);assert.ok(p.spawn<=p.until);
   const present=p.members.filter(x=>f.navigation.before[x.id]?.alive&&core.Navigation.combatRange(f.navigation.before[x.id].node,p.target,2));
   if(present.length>=3)arrivals++;
  }
 }
 console.log('FORMATION_PILOT='+JSON.stringify({maps:60,plans,arrivals}));
 assert.ok(plans>0,'Expected actual objective formations');
});
