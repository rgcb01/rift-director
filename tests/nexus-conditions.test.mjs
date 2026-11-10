import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function fixture(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Nexus QA');
 const round=Object.values(world.fixtures).flat().find(f=>
  [f.a,f.b].includes(world.userClub));
 const clubs=[round.a,round.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,
  core.ROLES.map(role=>world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,191);
 const waves=core.LaneEconomy.create(round.a,round.b).lanes;
 const lanes={[round.a]:{TOP:0,MID:0,BOT:0},[round.b]:{TOP:0,MID:0,BOT:0}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===round.a?'blue_fountain':'red_fountain';
  p.intent='lane';p.alive=true;
 }
 return {core,nav,round,waves,lanes,health,dead:{}};
}
const inspect=x=>x.core.Navigation.nexusOpportunity(x.nav,{
 teamId:x.round.a,lanes:x.lanes,waves:x.waves,
 health:x.health,dead:x.dead,minute:31
});
test('Nexus siege requires opened base lane and two living attackers',()=>{
 const x=fixture(),a=x.round.a,b=x.round.b;
 const attackers=Object.values(x.nav.agents).filter(p=>p.teamId===a);
 attackers[0].node='red_nexus';attackers[1].node='red_nexus';
 assert.equal(inspect(x),null,'A nexus is not open before all towers fall');
 x.lanes[b].BOT=3;
 x.waves.BOT.front=.5;
 const plan=inspect(x);
 assert.equal(plan?.lane,'BOT');
 assert.equal(plan?.attackers.length,2);
 assert.equal(plan?.defenders.length,0);
 assert.equal(plan?.node,'red_nexus');
 assert.equal(inspect(x)?.lane,'BOT','The plan is deterministic');
});
test('defenders slow siege while dead and retreating attackers cannot pressure',()=>{
 const x=fixture(),a=x.round.a,b=x.round.b;
 x.lanes[b].MID=3;x.waves.MID.front=1.1;
 const att=Object.values(x.nav.agents).filter(p=>p.teamId===a);
 const def=Object.values(x.nav.agents).filter(p=>p.teamId===b);
 att[0].node='red_nexus';att[1].node='red_nexus';
 def[0].node='red_nexus';def[1].node='red_nexus';
 const defended=inspect(x);
 assert.ok(defended,'Physical siege opportunity exists even when defended');
 const slow=x.core.Navigation.nexusSiegeDamage(defended);
 assert.ok(slow>0&&slow<x.core.Navigation.nexusSiegeDamage({...defended,defenders:[]}));
 def[1].node='red_fountain';
 assert.ok(inspect(x),'One defender cannot stop two healthy attackers');
 x.health[att[1].id]=15;assert.equal(inspect(x),null,'Wounded attacker does not count');
 x.health[att[1].id]=100;x.dead[att[1].id]=40;
 assert.equal(inspect(x),null,'Dead player does not count');
 x.dead[att[1].id]=0;att[1].intent='retreat';
 assert.equal(inspect(x),null,'Retreating player does not count');
 att[1].intent='siege';x.waves.MID.front=-3.8;
 const losingWave=inspect(x);
 assert.ok(losingWave,'A base already breached remains accessible');
 assert.ok(x.core.Navigation.nexusSiegeDamage(losingWave)<
  x.core.Navigation.nexusSiegeDamage({...losingWave,wave:2}),
  'Losing the wave slows damage rather than erasing a physically earned breach');
});
