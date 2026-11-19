import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const evidence=()=>({allies:['a1','a2','a3'],enemies:['b1','b2','b3'].map(id=>({id,hp:90})),
 ownHP:90,enemyHP:90,controlReady:[],ultimateReady:[],frontline:false,carry:false,
 vulnerable:[],reinforcements:[],objective:false,vision:65,risk:50,communication:50});
test('engage policy distinguishes opening, live contest, waiting, poke and withdrawal',()=>{
 const {core}=boot({now:1731111111000}),D=core.EngagePolicy;
 const e=evidence();
 assert.equal(D.decide(e).action,'wait');
 assert.equal(D.decide({...e,carry:true}).action,'poke');
 assert.equal(D.decide({...e,reinforcements:['a4'],carry:true}).reason,'await_reinforcements');
 assert.equal(D.decide({...e,objective:true}).action,'contest');
 assert.equal(D.decide({...e,controlReady:e.allies,ultimateReady:e.allies}).action,'engage');
 assert.equal(D.decide({...e,ownHP:40,objective:true}).action,'disengage');
 assert.equal(D.decide({...e,enemies:[],enemyHP:0,controlReady:e.allies}).action,'wait');
 assert.equal(D.decide({...e,enemies:[...e.enemies,{id:'b4',hp:90},{id:'b5',hp:90}]}).action,'disengage');
});
test('shadow engage assessments do not alter the underlying simulation',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','QA Balance 0'),fixtures=Object.values(world.fixtures).flat();
 let records=0;
 for(let i=0;i<30;i++){
  const f=fixtures[(i*13)%fixtures.length],seed=(Math.imul(i+1,2654435761)^1013904223)>>>0;
  const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true};
  world.rng=seed;const base=sim.simulateMatch(f,opts);
  world.rng=seed;const shadow=sim.simulateMatch(f,{...opts,engageDiagnostics:true});
  assert.equal(JSON.stringify(base.events),JSON.stringify(shadow.events));
  assert.equal(base.winner,shadow.winner);
  assert.equal(core.EngagePolicy.audit(shadow).length,0);
  records+=shadow.frames.reduce((n,f)=>n+(f.engageDecisions?.length||0),0);
 }
 assert.ok(records>0);
});
test('authoritative engage policy compares decisions and audits on 120 paired maps',()=>{
 let baseline=0,fights=0,withheld=0,decisions={},issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const f=fixtures[(i*13+batch*7)%fixtures.length],seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,engagePolicy:true});
    baseline+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
    fights+=m.events.filter(e=>e.facts?.groupFight?.round===1).length;
    for(const fr of m.frames){
     if(fr.teamfightDiagnostic?.withheld)withheld++;
     for(const r of fr.engageDecisions||[])for(const d of r.decisions)decisions[d.action]=(decisions[d.action]||0)+1;
     const zone=fr.teamfightDiagnostic?.selected;
     if(zone){
      const decision=fr.engageDecisions?.find(d=>d.zone===zone);
      assert.ok(decision?.firstTeam);
      const e=m.events.find(e=>e.minute===fr.minute&&e.facts?.groupFight?.zone===zone&&e.facts.groupFight.round===1);
      if(e)assert.equal(e.facts.groupFight.firstTeam,decision.firstTeam);
     }
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('ENGAGE_POLICY='+JSON.stringify({maps:120,baseline,fights,withheld,decisions,issues:issues.slice(0,5)}));
 assert.ok(Object.keys(decisions).length>0);
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
