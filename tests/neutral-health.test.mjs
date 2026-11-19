import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const p=(id,teamId,role='ADC',attackDamage=80)=>({id,teamId,role,node:'dragon_pit',hp:100,level:10,attackDamage,attackSpeed:1});
test('neutral HP is persistent, conserved, and resets without an attacking squad',()=>{
 const {core}=boot({now:1731111111000}),N=core.NeutralHealth,state=N.create();
 const players=[p('a1','a'),p('a2','a','SUP')];
 const r=N.step({state,kind:'dragon',minute:5,players});
 assert.equal(state.monsters.dragon.hp,N.RULES.dragon.hp);
 assert.ok(r.receipt.after>0&&r.receipt.after<r.receipt.before);
 assert.equal(r.receipt.before-r.receipt.after,r.receipt.packets.reduce((sum,x)=>sum+x.damage,0));
 assert.equal(r.receipt.capture,null);
 const r2=N.step({state:r.state,kind:'dragon',minute:6,players});
 assert.equal(r2.receipt.before,r.receipt.after);
 const quiet=N.step({state:r.state,kind:'dragon',minute:6,players:[players[0]]});
 assert.ok(quiet.receipt.reset>0);assert.equal(quiet.receipt.packets.length,0);
 assert.equal(quiet.receipt.after,Math.min(N.RULES.dragon.hp,r.receipt.after+1050));
 assert.throws(()=>N.step({state,kind:'dragon',minute:4,players}),/not spawned/);
 assert.throws(()=>N.step({state,kind:'dragon',minute:5,players:[{...players[0],node:'blue_fountain'},players[1]]}),/Invalid objective attackers/);
});
test('actual opposing Smite can steal, consumes cooldown and cannot start an objective alone',()=>{
 const {core}=boot({now:1731111111000}),N=core.NeutralHealth,state=N.create();
 state.monsters.dragon.hp=700;state.monsters.dragon.initiator='a';
 const players=[p('a1','a'),p('a2','a','SUP'),p('b1','b','JUN')];
 const r=N.step({state,kind:'dragon',minute:5,players});
 assert.equal(r.receipt.capture.actorId,'b1');assert.equal(r.receipt.capture.teamId,'b');
 assert.equal(r.receipt.capture.stolen,true);assert.equal(r.receipt.after,0);
 assert.equal(r.state.smiteReady.b1,5*60+44+N.COOLDOWN);
 assert.equal(r.state.monsters.dragon.spawn,10);
 assert.equal(r.state.monsters.dragon.hp,N.RULES.dragon.hp);
 const blocked=N.snapshot(state);blocked.smiteReady.b1=10000;
 const alternative=N.step({state:blocked,kind:'dragon',minute:5,players});
 assert.equal(alternative.receipt.capture?.teamId,'a');
 assert.ok(!alternative.receipt.packets.some(x=>x.type==='smite'));
 const alone=N.step({state,kind:'dragon',minute:5,players:[players[2]]});
 assert.equal(alone.receipt.capture,null);assert.equal(alone.receipt.packets.length,0);
});
test('neutral HP pilot compares 120 paired maps and verifies capture and sporting evidence',()=>{
 let baseline={dragon:0,baron:0,fights:0},actual={dragon:0,baron:0,fights:0},attacks=0,steals=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0,f=fixtures[(i*13+batch*7)%fixtures.length];
   const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true,skirmishReinforcements:true};
   try{
    world.rng=seed;const base=sim.simulateMatch(f,opts);
    world.rng=seed;const m=sim.simulateMatch(f,{...opts,neutralHp:true});
    for(const [match,totals] of [[base,baseline],[m,actual]]){
     for(const e of match.events){
      if(['dragon','baron'].includes(e.facts?.action))totals[e.facts.action]++;
      if(e.facts?.groupFight?.round===1)totals.fights++;
     }
    }
    for(const fr of m.frames)for(const {receipt:r} of fr.neutralHp?.receipts||[]){
     attacks+=r.packets.length;steals+=Number(Boolean(r.capture?.stolen));
     assert.equal(r.before+r.reset-r.packets.reduce((s,x)=>s+x.damage,0),r.after);
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
     ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
     ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world),...core.NeutralHealth.audit(m)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,650)});}
  }
 }
 console.log('NEUTRAL_HEALTH='+JSON.stringify({maps:120,baseline,actual,attacks,steals,issues:issues.slice(0,5)}));
 assert.ok(attacks>0&&actual.dragon+actual.baron>0);
 assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
