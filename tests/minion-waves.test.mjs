import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
test('individual minions spawn deterministically, travel, die and conserve identity',()=>{
 const W=boot().core.MinionWaves,s=W.create('a','b');
 for(let minute=1;minute<=5;minute++)W.advance(s,{minute,actors:[]});
 assert.equal(s.spawned,3*2*(10*6+3));
 assert.ok(s.dead>0);assert.equal(Object.keys(s.players).length,0);
 assert.equal(s.spawned,s.dead+s.escaped+Object.values(s.lanes).flat().length);
 assert.equal(new Set(Object.values(s.lanes).flat().map(m=>m.id)).size,Object.values(s.lanes).flat().length);
 assert.throws(()=>W.advance(s,{minute:5,actors:[]}));
});
test('a physical lethal attack earns one CS and local shared XP, not remote gold',()=>{
 const W=boot().core.MinionWaves,s=W.create('a','b');
 s.lanes.MID.push({id:'fixture',side:1,type:'caster',pos:4,hp:10});s.spawned++;
 const actors=[{id:'carry',teamId:'a',role:'ADC',node:'mid_center'},
  {id:'support',teamId:'a',role:'SUP',node:'mid_center'},
  {id:'remote',teamId:'a',role:'TOP',node:'blue_top_base'}];
 const r=W.advance(s,{minute:1,actors}),death=r.deaths.find(d=>d.id==='fixture');
 assert.equal(death.killer,'carry');assert.deepEqual(plain(death.xp),[['carry',6],['support',6]]);
 assert.equal(r.farm.filter(f=>f.playerId==='carry').length,r.awards.carry.cs);
 assert.equal(s.players.remote,undefined);
 const again=W.create('a','b');again.lanes.MID.push({id:'fixture',side:1,type:'caster',pos:4,hp:10});again.spawned++;
 assert.equal(JSON.stringify(W.advance(again,{minute:1,actors})),JSON.stringify(r));
});
test('shadow waves do not alter sport and opt-in farm replaces abstract lane gold on paired maps',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','QA Balance 0'),fixtures=Object.values(world.fixtures).flat();
 const opts={simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true,squadCommitment:true,engagePolicy:true,skirmishReinforcements:true,neutralHp:true,objectivePreparation:true};
 let totalCS=0,liveFights=0,baseFights=0;const issues=[];
 for(let i=0;i<24;i++){
  const seed=(Math.imul(i+1,2654435761)^1013904223)>>>0,f=fixtures[(i*13)%fixtures.length];
  try{
   world.rng=seed;const base=sim.simulateMatch(f,opts);
   if(i<3){
    world.rng=seed;const shadow=sim.simulateMatch(f,{...opts,minionWaves:true});
    assert.equal(JSON.stringify(shadow.events),JSON.stringify(base.events));assert.equal(shadow.winner,base.winner);
    assert.equal(JSON.stringify(shadow.powerEconomy),JSON.stringify(base.powerEconomy));
    assert.deepEqual(plain(core.MinionWaves.audit(shadow)),[]);
   }
   world.rng=seed;const live=sim.simulateMatch(f,{...opts,minionFarm:true});
   const last=live.frames.at(-1);
   totalCS+=Object.values(last.minionWaves.state.players).reduce((n,p)=>n+p.cs,0);
   baseFights+=base.events.filter(e=>e.facts?.groupFight?.round===1).length;
   liveFights+=live.events.filter(e=>e.facts?.groupFight?.round===1).length;
   const errors=[...core.auditMatch(live,world),...core.Navigation.auditNavigation(live,world),...core.PowerEconomy.audit(live),...core.MatchReplay.auditMoments(live,world),...core.auditMinimap(live,world),...core.auditBroadcast(live,world)];
   if(!live.winner||errors.length)issues.push({i,seed,errors:errors.slice(0,4)});
  }catch(e){issues.push({i,seed,error:String(e.stack||e).slice(0,600)});}
 }
 console.log('MINION_WAVES='+JSON.stringify({maps:24,totalCS,baseFights,liveFights,issues:issues.slice(0,5)}));
 assert.ok(totalCS>0);assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
