import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './harness.mjs';

const prepare=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Role Routing QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  [f.a,f.b].includes(world.userClub));
 return {...ctx,world,fixture};
};
const byRole=(world,teamId,role)=>
 world.clubs.find(c=>c.id===teamId).lineup[role];

test('fase de líneas minuto 10: ADC y SUP permanecen en su mitad y no en el mismo extremo neutral',()=>{
 const {sim,world,fixture}=prepare();
 let normal=0;
 for(let seed=1;seed<=110;seed++){
  world.rng=seed*17117;
  const match=sim.simulateMatch(fixture);
  const frame=match.frames.find(f=>f.minute===10);
  assert.ok(frame,'Falta minuto 10 en seed '+seed);
  for(const [side,teamId] of [['blue',fixture.a],['red',fixture.b]]){
   const adc=byRole(world,teamId,'ADC'),sup=byRole(world,teamId,'SUP');
   const a=frame.navigation.after[adc],s=frame.navigation.after[sup];
   assert.notEqual(s.node,'top_corner','SUP nunca debe atascarse en TOP durante fase de líneas');
   // Characters can be dead or traveling back from fountain. Check stable
   // lane positions when both have stayed alive until this point.
   const casualties=match.events.some(e=>e.minute<=10&&
    ['gank','teamfight'].includes(e.facts?.action)&&
    e.facts.victimIds.some(id=>id===adc||id===sup));
   if(!casualties){
    assert.equal(a.node,side+'_bot_front','ADC debe estar en su botlane');
    assert.equal(s.node,side+'_bot_front','SUP debe proteger al ADC');
    normal++;
   }
  }
 }
 assert.ok(normal>100,'Pocas botlanes estables para evaluar');
});

test('JUN alterna campamentos, visitas cortas y vuelta a su jungla, sin quedarse ocho minutos en esquina',()=>{
 const {sim,world,fixture}=prepare();
 let visitedGank=0,returned=0;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*9137;
  const match=sim.simulateMatch(fixture);
  for(const teamId of [fixture.a,fixture.b]){
   const id=byRole(world,teamId,'JUN'),all=match.frames.map(f=>f.navigation.after[id]);
   const at=t=>all[t];
   // While alive, the intended action changes over time.
   for(const t of [2,4,7,11,14,18,22,26,31,34]){
    if(!at(t).alive)continue;
    const expected=t===2||t===4||t===11||t===22||t===31?'farm_jungle':
     t===7||t===14?'gank_setup':t===18||t===26?'objective_setup':'rotation';
    assert.equal(at(t).intent,expected,'JUN sin rotación seed '+seed+' t'+t);
    if(expected==='gank_setup')visitedGank++;
    if(expected==='farm_jungle')returned++;
   }
   let stuck=0;
   for(let t=1;t<=24;t++){
    const p=at(t),before=at(t-1);
    const inLane=['top_corner','bot_corner','mid_center'].includes(p.node);
    stuck=p.alive&&before.alive&&inLane&&p.node===before.node?stuck+1:0;
    assert.ok(stuck<5,'JUN quedó parado demasiado tiempo en '+p.node+' seed '+seed);
   }
  }
 }
 assert.ok(visitedGank>20&&returned>50);
});

test('SUP tiene roaming breve después de líneas y regresa junto a su ADC',()=>{
 const {sim,world,fixture}=prepare();
 let seenRoam=0,seenReturn=0;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*6767;
  const match=sim.simulateMatch(fixture);
  for(const teamId of [fixture.a,fixture.b]){
   const adc=byRole(world,teamId,'ADC'),sup=byRole(world,teamId,'SUP');
   for(const frame of match.frames.filter(f=>f.minute<=27)){
    const p=frame.navigation.after[sup],carry=frame.navigation.after[adc],t=frame.minute;
    if(!p.alive)continue;
    if(t>=14&&t<=17) {
     assert.equal(p.intent,'ward_roam','Roaming debe tener una ventana temporal');
     seenRoam++;
    }
    if(t>=18&&t<=23){
     assert.equal(p.intent,'protect_adc','El SUP debe regresar con el carry');
     seenReturn++;
    }
    if(t>=1&&t<=13&&carry.alive){
     assert.equal(p.intent,'protect_adc','En early el SUP protege al ADC');
    }
   }
  }
 }
 assert.ok(seenRoam>50&&seenReturn>50);
});

test('150 partidas completas mantienen movimientos legales, torres, nexo y replay coherente',()=>{
 const {sim,core,world,fixture}=prepare();
 let end=0,ganks=0;
 for(let seed=1;seed<=150;seed++){
  world.rng=seed*9283;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Sin ganador seed '+seed);
  assert.equal(core.Navigation.auditNavigation(match,world).length,0,'Navegación seed '+seed);
  assert.equal(core.auditMatch(match,world).length,0,'Partido seed '+seed);
  assert.equal(core.auditMinimap(match,world).length,0,'Mapa seed '+seed);
  assert.equal(core.MatchReplay.auditMoments(match,world).length,0,'Replay seed '+seed);
  end+=match.frames.at(-1).minute;
  ganks+=match.events.filter(e=>e.facts?.action==='gank').length;
 }
 assert.ok(end/150<=76);
 assert.ok(ganks>0,'No hay ganks tras cambiar la IA de JUN');
});
