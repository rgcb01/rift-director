import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
function setup(){
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Squad QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(r=>world.players.find(p=>p.id===c.lineup[r]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,117),a=nav.a,b=nav.b;
 const state={nextDragon:40,nextBaron:25,lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:core.LaneEconomy.create(a,b).lanes,map:{riverVision:{[a]:70,[b]:70}}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 for(const p of Object.values(nav.agents)){p.node='upper_river';p.intent='group';}
 nav.neutralPlans={[a]:{action:'contest',reason:'baron_contest',target:'baron_pit',targetSpawn:25,until:29}};
 return {core,nav,state,health,a,b};
}
test('common allocation reserves an actual reachable squad and leaves one lane professional',()=>{
 const {core,nav,state,health,a,b}=setup();
 const before=JSON.stringify(nav),run=()=>core.SquadCommitment.plan({nav,world:state,minute:24,health});
 const plans=run(),p=plans[a];
 assert.ok(p);assert.equal(p.members.length,4);assert.equal(plans[b],undefined);
 assert.equal(JSON.stringify(nav),before);assert.equal(JSON.stringify(run()),JSON.stringify(plans));
 nav.squadCommitments=plans;
 for(const m of p.members){
  assert.ok(m.hops<=4&&m.hp>=60);
  assert.equal(core.SquadCommitment.movement(nav,nav.agents[m.id],24).goal,'baron_pit');
 }
 const other=Object.values(nav.agents).find(x=>x.teamId===a&&!p.members.some(m=>m.id===x.id));
 assert.equal(core.SquadCommitment.movement(nav,other,24),null);
 assert.equal(core.SquadCommitment.movement(nav,nav.agents[p.members[0].id],25),null);
});
test('immediate siege, base defense and injured escorts are not sacrificed',()=>{
 const {core,nav,state,health,a,b}=setup(),N=core.Navigation;
 const run=()=>core.SquadCommitment.plan({nav,world:state,minute:24,health})[a];
 const j=Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='JUN');
 health[j.id]=59;assert.equal(run(),undefined);health[j.id]=100;
 const carries=Object.values(nav.agents).filter(p=>p.teamId===a&&['MID','ADC'].includes(p.role));
 const tower=N.towerNode('red','MID',1);
 for(const p of carries)p.node=tower;
 nav.siegeDecision={teamId:a,stage:0,lane:'MID',wave:1,escorts:carries.map(p=>p.id)};
 assert.equal(run(),undefined);
 nav.siegeDecision=null;
 for(const p of carries)p.node='upper_river';
 nav.structureDefense={members:[{id:j.id}]};assert.equal(run(),undefined);
 nav.structureDefense=null;state.lanes[a].TOP=3;assert.equal(run(),undefined);
});
test('squad commitments compare actual arrival and audited fights on 120 paired maps',()=>{
 let plans=0,orders=0,arrivals=0,baseReady=0,ready=0,baseFights=0,fights=0,issues=[];
 const countReady=m=>m.frames.flatMap(fr=>fr.objectiveReadiness||[]).filter(r=>r.lead<=0&&r.members.filter(p=>p.ready&&p.present).length>=3).length;
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,objectiveDiagnostics:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,squadCommitment:true});
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    baseReady+=countReady(base);ready+=countReady(m);
    for(const fr of m.frames)for(const p of Object.values(fr.squadCommitments||{})){
     plans++;
     for(const member of p.members)if(fr.navigation.before[member.id]?.goal===p.target)orders++;
     if(p.members.filter(x=>fr.navigation.before[x.id]?.alive&&core.Navigation.combatRange(fr.navigation.before[x.id].node,p.target,2)).length>=3)arrivals++;
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('SQUAD_COMMITMENT='+JSON.stringify({maps:120,plans,orders,arrivals,baseReady,ready,baseFights,fights,issues:issues.slice(0,5)}));
 assert.ok(plans>0,'Expected actual squad commitments');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});

test('a credible base tower assault keeps approaching escorts instead of starting a new objective squad',()=>{
 const {core,nav,state,health,a,b}=setup(),N=core.Navigation;
 state.lanes[b].MID=2;
 const target=N.towerNode('red','MID',3);
 const carries=Object.values(nav.agents).filter(p=>p.teamId===a&&['MID','ADC'].includes(p.role));
 for(const p of carries)p.node=N.path(target,'upper_river')[1];
 nav.siegeDecision={teamId:a,stage:2,lane:'MID',wave:1,escorts:carries.map(p=>p.id)};
 assert.equal(core.SquadCommitment.plan({nav,world:state,minute:24,health})[a],undefined);
});
test('mirrored regression pair 46 must finish through the actual Nexus',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','QA Mirror 0'),fixtures=Object.values(world.fixtures).flat();
 const f=fixtures[(46*13)%fixtures.length],seed=809608224;
 assert.equal(f.b,'c21');assert.equal(f.a,'c45');
 world.rng=seed;
 const m=sim.simulateMatch({...f,a:f.b,b:f.a},{simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,objectiveDiagnostics:true});
 if(!m.winner)console.log('SQUAD_46_DIAG='+JSON.stringify({tail:m.frames.slice(-12).map(fr=>({minute:fr.minute,siege:fr.siegeDecision,health:fr.health,lanes:fr.laneEconomy.lanes,nexus:fr.siege.hp,orders:fr.navigation.after})),events:m.events.slice(-15).map(e=>({minute:e.minute,action:e.facts?.action,team:e.teamId}))}));
 assert.ok(m.winner,'No timeout winner permitted');
 assert.equal(m.events.at(-1)?.facts?.action,'nexus');
 assert.equal(core.auditMatch(m,world).length,0);
 assert.equal(core.Navigation.auditNavigation(m,world).length,0);
});

test('shotcaller forms an affordable central group only with real map incentives',()=>{
 const {core,nav,state,health,a,b}=setup(),S=core.SquadCommitment;
 state.lanes[b].TOP=1;state.gold={[a]:20000,[b]:20000};
 state.map.lanes={MID:{vision:{[a]:80,[b]:80}}};
 nav.neutralPlans={};
 for(const p of Object.values(nav.agents))p.node=p.role==='JUN'?'upper_river':'mid_center';
 const run=()=>S.shotcaller({nav,world:state,minute:24,health});
 const before=JSON.stringify(nav),p=run()[a];
 assert.ok(p);assert.equal(p.action,'contest_mid');assert.equal(p.members.length,4);assert.equal(JSON.stringify(nav),before);
 nav.shotcallerPlans=run();
 for(const m of p.members)assert.equal(S.shotMovement(nav,nav.agents[m.id],24).goal,m.goal);
 nav.neutralPlans={[a]:{action:'contest',target:'baron_pit',until:27}};assert.equal(run()[a],undefined);nav.neutralPlans={};
 state.lanes[b].TOP=3;assert.equal(run()[a],undefined);state.lanes[b].TOP=1;
 nav.siegeDecision={stage:2,teamId:b};assert.equal(run()[a],undefined);nav.siegeDecision=null;
 const sup=Object.values(nav.agents).find(p=>p.teamId===a&&p.role==='SUP');health[sup.id]=40;assert.equal(run()[a],undefined);health[sup.id]=100;
 nav.shotcallerMemory={[a]:{created:21,until:23,cooldownUntil:26,memberIds:p.members.map(m=>m.id)}};assert.equal(run()[a],undefined);
});
test('shotcaller compares real arrivals and fight frequency on 120 paired maps',()=>{
 let plans=0,orders=0,arrivals=0,baseFights=0,fights=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true,skirmishReinforcements:true,neutralHp:true};
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,shotcaller:true});
    baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    for(const fr of m.frames)for(const p of Object.values(fr.shotcallerPlans||{})){
     plans++;orders+=p.members.filter(m=>fr.navigation.before[m.id]?.reason?.startsWith('shotcaller_')).length;
     if(p.members.filter(m=>fr.navigation.before[m.id]?.alive&&fr.navigation.before[m.id].node===m.goal).length>=3)arrivals++;
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),...core.NeutralHealth.audit(m),
     ...core.ChampionKits.audit(m),...core.PowerEconomy.audit(m),...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,650)});}
  }
 }
 console.log('SHOTCALLER='+JSON.stringify({maps:120,plans,orders,arrivals,baseFights,fights,issues:issues.slice(0,5)}));
 assert.ok(plans>0,'Expected real team plans');assert.ok(orders>0,'Expected physical orders');
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
