import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Escalation QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117),a=nav.a,b=nav.b,N=core.Navigation;
 const state={lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},waves:core.LaneEconomy.create(a,b).lanes,events:[]};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 const p=(team,role)=>Object.values(nav.agents).find(p=>p.teamId===team&&p.role===role);
 const target='baron_pit';
 for(const agent of Object.values(nav.agents)){agent.node=(agent.teamId===a?'blue':'red')+'_fountain';agent.intent='lane';}
 const first=[p(a,'JUN'),p(a,'SUP')],second=[p(b,'JUN'),p(b,'SUP')];
 for(const agent of [...first,...second])agent.node=target;
 const recruit=p(a,'MID');
 recruit.node=Object.keys(core.MiniGraph.nodes).find(n=>N.hops(n,target)===3&&!N.combatRange(n,target,2)&&!n.includes('fountain')&&!n.includes('nexus'));
 assert.ok(recruit.node);
 state.events.push({minute:24,teamId:a,facts:{action:'skirmish',zone:target,attackerCount:3,defenderCount:2,participantIds:[...first.map(p=>p.id),recruit.id],targetId:second[0].id,opponentIds:[second[1].id]}});
 return {core,nav,state,health,a,b,first,second,recruit,target};
}
test('a witnessed local skirmish can recruit a nearby laner, not teleport or invent a fight',()=>{
 const {core,nav,state,health,a,recruit,target}=setup();
 const before=JSON.stringify(nav),run=()=>core.SkirmishReinforcements.plan({nav,world:state,minute:25,health});
 const plans=run(),p=plans[a];
 assert.ok(p);assert.equal(p.recruits.length,1);assert.equal(p.recruits[0].id,recruit.id);
 assert.equal(p.sourceIndex,0);assert.equal(p.sourceMinute,24);
 assert.equal(JSON.stringify(nav),before);
 nav.skirmishReinforcements=plans;
 assert.equal(core.SkirmishReinforcements.movement(nav,recruit,25).goal,target);
 assert.equal(core.SkirmishReinforcements.movement(nav,recruit,26),null);
 assert.equal(core.Navigation.hops(recruit.node,target),3);
});
test('no reinforcement after contact breaks, stale source, a group fight or unsafe lane exit',()=>{
 const {core,nav,state,health,a,second,recruit,target}=setup();
 const run=(minute=25)=>core.SkirmishReinforcements.plan({nav,world:state,minute,health})[a];
 assert.equal(run(27),undefined);
 health[recruit.id]=59;assert.equal(run(),undefined);health[recruit.id]=100;
 state.waves.MID.front=-1;assert.equal(run(),undefined);state.waves.MID.front=0;
 state.events.push({minute:24,facts:{groupFight:{zone:target}}});assert.equal(run(),undefined);state.events.pop();
 for(const p of second)p.node='red_fountain';
 assert.equal(run(),undefined);
});
test('reinforcement pilot compares 120 paired maps and audits actual routes and sources',()=>{
 let plans=0,orders=0,arrivals=0,converted=0,baseFights=0,fights=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,skirmishReinforcements:true});
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    for(const fr of m.frames)for(const p of Object.values(fr.skirmishReinforcements||{})){
     plans++;orders+=p.recruits.length;
     if([...p.stayingIds,...p.recruits.map(r=>r.id)].filter(id=>{const a=fr.navigation.before[id];return a?.alive&&core.Navigation.combatRange(a.node,p.target,2);}).length>=3)arrivals++;
     if(m.events.some(e=>e.minute>=fr.minute&&e.minute<=fr.minute+2&&e.facts?.groupFight?.zone===p.target&&e.facts.groupFight.groups[p.teamId]?.some(id=>p.recruits.some(r=>r.id===id))))converted++;
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('SKIRMISH_REINFORCEMENTS='+JSON.stringify({maps:120,plans,orders,arrivals,converted,baseFights,fights,issues:issues.slice(0,5)}));
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
