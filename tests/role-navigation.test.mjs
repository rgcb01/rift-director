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

const validRetreat=(match,id,t)=>match.events.some(e=>
 e.minute<=t&&(
   (e.facts?.action==='skirmish'&&e.facts.outcome==='retreat'&&e.facts.targetId===id)||
   (e.facts?.combatVersion===1&&e.facts.impacts?.some(hit=>hit.id===id&&hit.retreat))
  ));

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
   const casualties=match.events.some(e=>e.minute<=10&&(
    (e.facts?.victimIds||[]).some(id=>id===adc||id===sup)||
    (e.facts?.action==='skirmish'&&
      (e.facts.targetId===adc||e.facts.targetId===sup))||
    (e.facts?.combatVersion===1&&
      e.facts.impacts?.some(hit=>(hit.id===adc||hit.id===sup)&&hit.retreat))
   ));
   if(!casualties){
    assert.equal(a.node,side+'_bot_front','ADC debe estar en su botlane');
    assert.equal(s.node,side+'_bot_front','SUP debe proteger al ADC');
    normal++;
   }
  }
 }
 assert.ok(normal>100,'Pocas botlanes estables para evaluar');
});

test('JUN sigue corredores de jungla y ventanas de gank sin transitar por MID',()=>{
 const {sim,core,world,fixture}=prepare();
 const nav=core.Navigation;
 let gankSetup=0,farm=0,objective=0,planned=new Set();
 for(let seed=1;seed<=120;seed++){
  world.rng=seed*9137;
  const match=sim.simulateMatch(fixture);
  for(const [side,teamId] of [['blue',fixture.a],['red',fixture.b]]){
   const id=byRole(world,teamId,'JUN'),all=match.frames.map(f=>f.navigation.after[id]);
   assert.ok(all.length>=37);
   for(const f of match.frames.filter(f=>f.minute<=35)){
    const p=f.navigation.after[id];
    if(!p.alive)continue;
    assert.equal(nav.jungleAllowed(side,p.node),true,
      'JUN salió del corredor en '+p.node+' seed '+seed+' minuto '+f.minute);
    for(const lane of ['TOP','MID','BOT'])
     assert.equal(nav.isLaneNode(p.node,lane),false,'JUN ocupa carril '+lane);
    if(p.intent==='farm_jungle')farm++;
    if(p.intent==='objective_setup')objective++;
    if(p.intent==='gank_setup'){
     gankSetup++;assert.ok(['TOP','MID','BOT'].includes(p.lane));
     planned.add(side+':'+p.lane);
     assert.equal(nav.jungleAllowed(side,p.goal),true);
    }
   }
   if(all[7].alive&&!validRetreat(match,id,7))assert.equal(all[7].intent,'gank_setup','Primera ventana sigue activa al minuto 7');
   if(all[22].alive&&!validRetreat(match,id,22))assert.equal(all[22].intent,'objective_setup','Preparación de Dragón');
   if(all[26].alive&&!validRetreat(match,id,26))assert.equal(all[26].intent,'objective_setup','Preparación de Barón');
   if(all[31].alive&&!validRetreat(match,id,31))assert.equal(all[31].intent,'farm_jungle','Vuelta a campamentos');
  }
 }
 assert.ok(gankSetup>200 && farm>300 && objective>100);
 assert.equal(planned.size,6,'Las seis combinaciones bando/carril deben ser alcanzables');
});

test('SUP tiene roaming breve después de líneas y regresa junto a su ADC',()=>{
 const {sim,world,fixture}=prepare();
 let seenRoam=0,seenReturn=0,seenBaron=0;
 for(let seed=1;seed<=100;seed++){
  world.rng=seed*6767;
  const match=sim.simulateMatch(fixture);
  for(const teamId of [fixture.a,fixture.b]){
   const adc=byRole(world,teamId,'ADC'),sup=byRole(world,teamId,'SUP');
   for(const frame of match.frames.filter(f=>f.minute<=27)){
    const p=frame.navigation.after[sup],carry=frame.navigation.after[adc],t=frame.minute;
    if(!p.alive)continue;
    if(p.intent==='retreat'){
     assert.ok(validRetreat(match,sup,t),'SUP se retiró sin combate previo');
     continue;
    }
    if(t>=14&&t<=17) {
     assert.equal(p.intent,'ward_roam','Roaming debe tener una ventana temporal');
     seenRoam++;
    }
    if(t>=18&&t<=21){
     assert.equal(p.intent,'protect_adc','El SUP debe regresar con el carry');
     seenReturn++;
    }
    if(t>=22&&t<=27){
     assert.equal(p.intent,'objective_setup','SUP debe preparar el Barón con tiempo');
     seenBaron++;
    }
    if(t>=1&&t<=13&&carry.alive&&!validRetreat(match,sup,t)){
     assert.equal(p.intent,'protect_adc','En early el SUP protege al ADC');
    }
   }
  }
 }
 assert.ok(seenRoam>50&&seenReturn>50&&seenBaron>50);
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
