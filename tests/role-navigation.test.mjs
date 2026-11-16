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
const siegeEscort=(frame,teamId,id)=>
 frame.siegeDecision?.teamId===teamId&&frame.siegeDecision.escorts.includes(id);
const legalSiegeTravel=(match,frame,teamId,id)=>
 match.frames.some(f=>f.minute<=frame.minute&&f.minute>=frame.minute-8&&
  f.siegeDecision?.teamId===teamId&&f.siegeDecision.stage===3&&
  f.siegeDecision.escorts.includes(id));

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
   const reactive=new Set(['low_health','outnumbered_visible',
     'protect_injured_adc','damage_retreat']);
   const affected=reactive.has(frame.navigation.before[adc]?.reason)||
     reactive.has(frame.navigation.before[sup]?.reason);
   const ordered=siegeEscort(frame,teamId,adc)||siegeEscort(frame,teamId,sup);
   const defending=[a,s].some(p=>p.intent==='defend'&&
    p.reason==='visible_structure_defense');
   if(!casualties&&!affected&&!ordered&&!defending){
    assert.equal(a.node,side+'_bot_front','ADC debe estar en su botlane');
    assert.equal(s.node,side+'_bot_front','SUP debe proteger al ADC');
    normal++;
   }else if(defending){
    // A discovered opposing push justifies moving BACK along the own
    // botlane toward its active tower, never an unexplained crossmap roam.
    const laneNodes=new Set([side+'_bot_front',side+'_bot_outer',
     side+'_bot_inner',side+'_bot_base',side+'_nexus',side+'_fountain']);
    for(const p of [a,s]){
     assert.ok(laneNodes.has(p.node),'Defensa BOT salió de su carril');
     if(p.intent==='defend'){
      assert.equal(p.reason,'visible_structure_defense');
      assert.equal(p.lane,'BOT');
      assert.ok(p.goal.startsWith(side+'_bot_'));
     }
    }
   }else if(ordered){
    for(const [id,p] of [[adc,a],[sup,s]]){
     if(!siegeEscort(frame,teamId,id))continue;
     assert.equal(p.intent,'siege','Solo escoltas reales pueden salir de línea');
     const attackingLane=frame.siegeDecision.lane.toLowerCase();
     assert.ok(p.goal.includes('_'+attackingLane+'_')||
      p.goal.endsWith('_nexus'),
      'El escolta debe ir al carril del asedio documentado');
    }
   }else if(!casualties&&affected){
    // A healthy front is not mandatory after an HP-triggered retreat,
    // but the response must remain on the team's own botlane.
    const safeNodes=new Set([side+'_bot_front',side+'_bot_outer',
     side+'_bot_inner',side+'_bot_base',side+'_nexus',side+'_fountain']);
    assert.ok(safeNodes.has(a.node),'ADC reaccionó saltando a otro carril');
    assert.ok(safeNodes.has(s.node),'SUP reaccionó saltando a otro carril');
   }
  }
 }
 console.log('LANING_DIAG='+JSON.stringify({normal,observed:220}));
 assert.ok(normal>=30,'Pocas botlanes estables o con escolta explícita');
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
   // Dynamic pressure may legitimately close a map before minute 36.
   // Validate every frame actually played, not a historical fixed siege clock.
   assert.ok(match.winner&&all.length===match.frames.length&&all.length>=20);
   for(const f of match.frames.filter(f=>f.minute<=35)){
    const p=f.navigation.after[id];
    if(!p.alive)continue;
    if(!nav.jungleAllowed(side,p.node)){
     assert.ok(legalSiegeTravel(match,f,teamId,id),
      'JUN fuera de corredor sin una escolta física: '+seed+' min '+f.minute);
     assert.ok(['siege','siege_return','retreat'].includes(p.intent),
      'Salida sin intención de asedio ni regreso verificable');
    }
    if(p.intent==='farm_jungle')farm++;
    if(p.intent==='objective_setup')objective++;
    if(p.intent==='gank_setup'){
     gankSetup++;assert.ok(['TOP','MID','BOT'].includes(p.lane));
     planned.add(side+':'+p.lane);
     assert.equal(nav.jungleAllowed(side,p.goal),true);
    }
   }
   if(all[7]?.alive&&!validRetreat(match,id,7)&&
      !legalSiegeTravel(match,match.frames.find(f=>f.minute===7),teamId,id))
    assert.ok(['gank_setup','farm_jungle','recover'].includes(all[7].intent),
      'JUN debe gankear o explicar una cancelación');
   if(all[22]?.alive&&
      !(all[22].intent==='shop_recall'&&
        all[22].reason==='affordable_item_spike')&&
      !(all[22].intent==='defend'&&
        match.frames.find(f=>f.minute===22)?.siegeDecision?.stage===3)&&
      !validRetreat(match,id,22)&&
      !legalSiegeTravel(match,match.frames.find(f=>f.minute===22),teamId,id))
    assert.ok(['objective_setup','farm_jungle','recover'].includes(all[22].intent),
      'JUN debe preparar objetivo o evitarlo por riesgo');
   if(all[26]?.alive&&
      !(all[26].intent==='shop_recall'&&
        all[26].reason==='affordable_item_spike')&&
      !(all[26].intent==='defend'&&
        match.frames.find(f=>f.minute===26)?.siegeDecision?.stage===3)&&
      !validRetreat(match,id,26)&&
      !legalSiegeTravel(match,match.frames.find(f=>f.minute===26),teamId,id))
    assert.ok(['objective_setup','farm_jungle','recover'].includes(all[26].intent),
      'JUN puede evitar Barón solo por riesgo médico');
   if(all[31]?.alive&&
      !(all[31].intent==='shop_recall'&&
        all[31].reason==='affordable_item_spike')&&
      !(all[31].intent==='defend'&&
        match.frames.find(f=>f.minute===31)?.siegeDecision?.stage===3)&&
      !validRetreat(match,id,31)&&
      !legalSiegeTravel(match,match.frames.find(f=>f.minute===31),teamId,id))
    assert.ok(['farm_jungle','recover'].includes(all[31].intent)||
      (all[31].intent==='objective_setup'&&
       /^(dragon|baron)_(take|contest)$/.test(all[31].reason||'')),
      'JUN farmea, se recupera o termina una llamada de Dragón todavía comprometida');
  }
 }
 assert.ok(gankSetup>70 && farm>300 && objective>65);
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
    if(p.intent==='defend'&&p.reason==='visible_structure_defense'){
     assert.equal(p.lane,'BOT','SUP only defends its assigned botlane');
     const side=teamId===fixture.a?'blue':'red';
     assert.ok(p.goal.startsWith(side+'_bot_'),
      'Defense needs a real allied tower destination');
     continue;
    }
    if(p.intent==='siege'){
     assert.ok(siegeEscort(frame,teamId,sup),
      'SUP salió con una orden de asedio no sustentada');
     continue;
    }
    if(p.intent==='defend'&&frame.siegeDecision?.stage===3){
     assert.notEqual(frame.siegeDecision.teamId,teamId,
      'Defensa del Nexo sin ruta de ataque rival');
     continue;
    }
    if(p.intent==='retreat'){
     assert.ok(validRetreat(match,sup,t),'SUP se retiró sin combate previo');
     continue;
    }
    if(p.intent==='counterpush'&&t<30){
     assert.equal(p.reason,'earned_fight_pressure',
      'SUP no abandona a ADC por una orden genérica de asedio');
     const source=match.events.find(e=>e.teamId===teamId&&
      e.facts?.counterPressure?.lane==='BOT'&&
      e.facts.counterPressure.allowed.includes(sup)&&
      e.minute<t&&e.minute+3>=t&&
      e.facts.victimIds?.length>0);
     assert.ok(source,'La presión de SUP debe venir de una kill real con ADC');
     continue;
    }
    if(t>=14&&t<=17) {
     if(p.intent==='ward_roam')seenRoam++;
     else assert.ok(['escort','recover','fallback'].includes(p.intent)&&p.reason,
       'SUP solo abandona el roaming por necesidad táctica explicable');
    }
    if(t>=18&&t<=21){
     if(['protect_adc','escort'].includes(p.intent))seenReturn++;
     else assert.ok(['recover','fallback'].includes(p.intent)&&p.reason,
       'SUP solo abandona protección por riesgo verificable');
    }
    if(t>=22&&t<=27){
     if(p.intent==='objective_setup')seenBaron++;
     else assert.ok(['recover','fallback'].includes(p.intent)&&p.reason,
       'SUP solo pierde ventana de Barón por riesgo verificable: seed='+seed+
       ' t='+t+' team='+teamId+' intent='+p.intent+' reason='+p.reason);
    }
    if(t>=1&&t<=13&&carry.alive&&!validRetreat(match,sup,t)){
     assert.ok(['protect_adc','escort'].includes(p.intent)||
       p.reason==='low_health'||p.reason==='outnumbered_visible'||
       (t>=11&&p.intent==='objective_setup'&&
        /^dragon_(take|contest)$/.test(p.reason||'')),
       'SUP protege al ADC o prepara Dragón desde el minuto 11 con una llamada explícita');
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
