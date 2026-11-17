import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const prepare=()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Teamfight QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,173111111);
 const players=Object.fromEntries(Object.values(teams).flat().map(p=>[p.id,p]));
 const health=Object.fromEntries(Object.keys(players).map(id=>[id,100]));
 return {sim,core,world,fixture,nav,players,health};
};
test('four-round tactics select a different reachable actor, never a previously used actor',()=>{
 const {core,nav,players,health}=prepare();
 for(const p of Object.values(nav.agents)){p.node='baron_pit';p.alive=true;p.intent='objective_setup';}
 const own=Object.values(nav.agents).filter(p=>p.teamId===nav.a);
 const enemy=Object.values(nav.agents).filter(p=>p.teamId===nav.b);
 const args={viable:own,targets:enemy,players,health,minute:22};
 const a=core.TeamfightTactics.leader(args);
 const b=core.TeamfightTactics.leader({...args,round:3,usedIds:[a.id]});
 assert.ok(a&&b);assert.notEqual(a.id,b.id);
 assert.equal(core.TeamfightTactics.leader({...args,usedIds:own.map(p=>p.id)}),null);
 const facts=core.Encounters.resolveCombat({nav,dead:{},minute:22,players,health,seed:123,mode:'teamfight',teamId:nav.a,attackerIds:own.map(p=>p.id),targetIds:enemy.map(p=>p.id),groupExchange:true,groupRound:3,usedActorIds:[a.id]});
 assert.ok(facts);assert.notEqual(facts.actorId,a.id);
 assert.ok(facts.impacts.every(h=>core.Encounters.hitRange(nav.agents[facts.actorId],nav.agents[h.id],'teamfight')));
});
test('a nominal siege escort does not override an objective unless two allies are physically nearby',()=>{
 const {core,nav}=prepare();
 const own=Object.values(nav.agents).filter(p=>p.teamId===nav.a);
 const goal=core.Navigation.towerNode('red','MID',1);
 for(const p of own){p.node='blue_fountain';p.alive=true;}
 const call={teamId:nav.a,stage:0,lane:'MID',wave:1,escorts:own.map(p=>p.id)};
 assert.equal(core.TeamfightTactics.physicallyCommitted(nav,call),false);
 own[0].node=goal;own[1].node=goal;
 assert.equal(core.TeamfightTactics.physicallyCommitted(nav,call),true);
 assert.equal(core.TeamfightTactics.physicallyCommitted(nav,{...call,stage:3}),false);
});
test('80 live maps: group rounds have unique actors, alternate teams and retain physical audits',()=>{
 const {sim,core,world,fixture}=prepare();
 let fights=0,exchanges=0,extended=0;
 for(let i=1;i<=80;i++){
  world.rng=i*12571;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'seed '+i+' has no winner');
  const errors=[...core.Encounters.audit(match,world),...core.Navigation.auditNavigation(match,world),...core.auditMatch(match,world),...core.ChampionKits.audit(match)];
  assert.equal(errors.length,0,'seed '+i+' '+errors.slice(0,6).join(' | '));
  const groups=new Map();
  for(const e of match.events.filter(e=>e.facts?.groupFight)){
   const g=e.facts.groupFight,prior=groups.get(g.id)||[];
   assert.equal(g.version,2);assert.equal(g.round,prior.length+1);
   assert.equal(e.teamId,g.round%2===1?g.firstTeam:([fixture.a,fixture.b].find(id=>id!==g.firstTeam)));
   assert.ok(!prior.some(p=>p.facts.actorId===e.facts.actorId));
   prior.push(e);groups.set(g.id,prior);
   exchanges++;
   if(g.round===3)extended++;
  }
  fights+=groups.size;
 }
 console.log('TEAMFIGHT_SAMPLE='+JSON.stringify({maps:80,fights,exchanges,extended}));
 assert.ok(fights>0);assert.ok(extended>0,'expected at least one multi-exchange group fight');
});
