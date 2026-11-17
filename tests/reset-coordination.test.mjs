import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {boot} from './harness.mjs';
import {readFileSync} from 'node:fs';
const ctx={};
vm.runInNewContext(readFileSync(new URL('../src/core/reset-coordination.js',import.meta.url),'utf8'),ctx);
const C=ctx.RiftCore.ResetCoordination;
const fixture=()=>({teamId:'a',minute:20,players:['TOP','JUN','MID','ADC','SUP'].map(role=>({
 id:role,role,teamId:'a',alive:true,inField:true,resetting:false,safe:true,canStart:true,
 reason:null,hp:100,returnMinutes:4,waveSafe:true
}))});
const set=(f,role,opts)=>Object.assign(f.players.find(p=>p.role===role),opts);
const ids=r=>Array.from(r.ids);
test('bot resets synchronize only when two independently justified and covered',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});
 assert.deepEqual(ids(C.select(f)),['ADC']);
 set(f,'SUP',{reason:'low_mana'});
 const pair=C.select(f);
 assert.equal(pair.kind,'bot_sync');assert.deepEqual(ids(pair),['ADC','SUP']);
 assert.equal(pair.evidence.fieldAfter,3);
 set(f,'SUP',{waveSafe:false});
 assert.deepEqual(ids(C.select(f)),['ADC']);
});
test('critical health has priority over a discretionary pair',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});set(f,'SUP',{reason:'low_mana'});
 set(f,'TOP',{hp:15,reason:'critical_health'});
 assert.deepEqual(ids(C.select(f)),['TOP']);
});
test('existing resets, deaths and commitments consume map availability',()=>{
 const f=fixture();set(f,'ADC',{hp:40,reason:'low_health'});set(f,'SUP',{reason:'low_mana'});
 set(f,'TOP',{resetting:true});assert.equal(C.select(f).kind,'staggered');
 set(f,'MID',{alive:false});assert.equal(C.select(f).kind,'hold');
 set(f,'MID',{alive:true});set(f,'ADC',{siegeEscort:true});
 assert.deepEqual(ids(C.select(f)),['SUP']);
});
test('objective escort with insufficient return window and assigned defenders cannot reset',()=>{
 const f=fixture();set(f,'JUN',{hp:40,reason:'low_health'});
 set(f,'SUP',{hp:45,reason:'low_health'});
 f.objective={action:'contest',target:'baron_pit',until:23,requiredIds:['JUN','SUP']};
 assert.equal(C.select(f).kind,'hold');
 f.objective.until=26;assert.deepEqual(ids(C.select(f)),['JUN']);
 set(f,'JUN',{baseDefender:true});f.baseThreat=true;
 assert.equal(C.select(f).kind,'hold');
 set(f,'SUP',{hp:15,reason:'critical_health'});assert.deepEqual(ids(C.select(f)),['SUP']);
});
test('selection is deterministic, non-mutating, and rejects malformed teams',()=>{
 const f=fixture();set(f,'MID',{hp:40,reason:'low_health'});
 const prior=JSON.stringify(f);assert.equal(JSON.stringify(C.select(f)),JSON.stringify(C.select(f)));
 assert.equal(JSON.stringify(f),prior);
 f.players[0].role='JUN';assert.throws(()=>C.select(f),/Invalid team/);
});

test('critical safe reset is not suppressed by an exhausted field budget',()=>{
 const f=fixture();set(f,'TOP',{resetting:true});set(f,'MID',{alive:false});
 set(f,'JUN',{hp:15,reason:'critical_health'});
 f.objective={action:'contest',target:'baron_pit',until:21,requiredIds:['JUN']};
 const r=C.admit(f);assert.equal(r.kind,'emergency');assert.deepEqual(ids(r),['JUN']);
 set(f,'JUN',{safe:false});assert.equal(C.admit(f).kind,'hold');
});
test('coordinated live recalls preserve physical and sporting audits',()=>{
 let starts=0,paired=0,held=0,emergency=0,issues=[];
 for(let batch=0;batch<3;batch++){
  const {core,sim}=boot({now:1731111111000+batch*41241211});
  const world=sim.newGame('balanced','QA Balance '+batch),fixtures=Object.values(world.fixtures).flat();
  for(let i=0;i<40;i++){
   const seed=(Math.imul(i+1,2654435761)^Math.imul(batch+1,1013904223))>>>0;
   const f=fixtures[(i*13+batch*7)%fixtures.length];
   try{
    world.rng=seed;
    const m=sim.simulateMatch(f,{simultaneousCombat:true,structureTeamfights:true,coordinatedResets:true});
    for(const fr of m.frames){
     starts+=fr.recall?.starts?.length||0;
     for(const {input,decision} of fr.recall?.coordination||[]){
      if(decision.kind==='bot_sync')paired++;
      if(decision.kind==='emergency')emergency++;
      if(decision.kind==='hold'&&input.players.some(p=>p.canStart&&p.reason))held++;
      assert.ok(decision.ids.length<=2);
     }
    }
    const errors=[...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world),
      ...core.ChampionKits.audit(m),...core.Shutdowns.audit(m),...core.PowerEconomy.audit(m),
      ...core.MatchReplay.auditMoments(m,world),...core.auditMinimap(m,world),...core.auditBroadcast(m,world)];
    if(!m.winner||errors.length)issues.push({batch,i,seed,errors:errors.slice(0,5)});
   }catch(e){issues.push({batch,i,seed,error:String(e.stack||e).slice(0,500)});}
  }
 }
 console.log('COORDINATED_RESETS='+JSON.stringify({maps:120,starts,paired,held,emergency,issues:issues.slice(0,5)}));
 assert.ok(starts>0);assert.equal(issues.length,0,JSON.stringify(issues.slice(0,5)));
});
