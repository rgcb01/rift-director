import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
test('small encounters are explicit opt-in and simultaneous deaths remain causal',()=>{
 const {core}=boot({now:1731111111000}),S=core.SimultaneousFight;
 const players={};
 for(const team of ['a','b'])for(let i=1;i<=2;i++){
  const id=team+i;players[id]={id,teamId:team,node:'baron_pit',hp:40,alive:true,intent:'objective_setup'};
 }
 assert.throws(()=>S.create({id:'24:baron_pit',at:1476,players}),/Invalid fight start/);
 const state=S.create({id:'24:baron_pit',at:1476,players,minPerTeam:2});
 const result=S.resolve(state,[{actorId:'a1',targetId:'b1',damage:50},{actorId:'b1',targetId:'a1',damage:50}]);
 assert.equal(result.receipt.deaths.length,2);
 assert.equal(result.state.players.a1.alive,false);
 assert.equal(result.state.players.b1.alive,false);
 assert.equal(S.audit(state,[result.receipt]).errors.length,0);
});
test('persistent encounter grows from 2v2 to 3v3 only with surviving physical arrivals',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Persistent QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117),a=nav.a,b=nav.b;
 const target='baron_pit',state={nextDragon:40,nextBaron:24,events:[],map:{riverVision:{[a]:70,[b]:70}}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents)){
  p.node=['JUN','SUP'].includes(p.role)?target:(p.teamId===a?'blue':'red')+'_fountain';
  p.intent='objective_setup';
 }
 nav.neutralPlans=Object.fromEntries([a,b].map(id=>[id,{target,action:'contest',until:29}]));
 const roster=Object.fromEntries(world.players.map(p=>[p.id,p]));
 const run=(minute,continuationOnly=false)=>core.PersistentEncounter.pick({nav,world:state,minute,
  scan:core.Encounters.groupScan({nav,dead:{},minute,health,world:state}),players:roster,health,continuationOnly});
 const start=run(24);assert.ok(start);assert.equal(start.encounter.slice,1);
 assert.equal(start.encounter.groupRound,0);assert.equal(core.PersistentEncounter.large(start),false);
 const initialPlayers=Object.fromEntries(Object.values(start.groups).flat().map(id=>[id,{...nav.agents[id],hp:100}]));
 state.events.push({minute:24,teamId:start.firstTeam,facts:{simultaneous:{encounter:start.encounter,final:{state:{players:initialPlayers}}}}});
 assert.equal(run(25,true).encounter.joinedIds.length,0);
 const arrivals=Object.values(nav.agents).filter(p=>p.role==='MID');
 for(const p of arrivals)p.node=target;
 const next=run(25,true);assert.ok(next);assert.equal(next.encounter.id,start.encounter.id);
 assert.equal(next.encounter.slice,2);assert.equal(next.encounter.groupRound,1);
 assert.equal(core.PersistentEncounter.large(next),true);
 assert.deepEqual(plain(next.encounter.joinedIds),arrivals.map(p=>p.id).sort());
 state.nextBaron=31;assert.equal(run(25,true),null);state.nextBaron=24;
 for(const id of start.groups[a])nav.agents[id].alive=false;
 assert.equal(run(25,true),null);
});
test('persistent slices retain sport and replay audits on 120 paired maps',()=>{
 let starts=0,continued=0,joins=0,escalations=0,baseFights=0,fights=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true,skirmishReinforcements:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,persistentEncounters:true});
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    for(const [index,e] of m.events.entries()){
     const x=e.facts?.simultaneous?.encounter;if(!x)continue;
     if(x.slice===1)starts++;else continued++;
     joins+=x.joinedIds.length;
     const large=Object.values(x.groups).every(ids=>ids.length>=3);
     assert.equal(Boolean(e.facts.groupFight),large);
     if(e.facts.groupFight?.round===1)escalations++;
     assert.equal(core.MatchReplay.eventView(m,index).participants.length,e.facts.participantIds.length);
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world),
     ...core.PersistentEncounter.audit(m),...core.SkirmishReinforcements.audit(m)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,650)});}
  }
 }
 console.log('PERSISTENT_ENCOUNTERS='+JSON.stringify({maps:120,starts,continued,joins,escalations,baseFights,fights,issues:issues.slice(0,5)}));
 assert.ok(starts>0,'Expected genuine small encounter starts');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
