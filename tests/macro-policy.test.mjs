import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

function setup(){
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Macro QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const clubs=[fixture.a,fixture.b].map(id=>world.clubs.find(c=>c.id===id));
 const teams=Object.fromEntries(clubs.map(c=>[c.id,core.ROLES.map(role=>
  world.players.find(p=>p.id===c.lineup[role]))]));
 const nav=core.Navigation.createNavigation(clubs,teams,23519);
 const [a,b]=clubs.map(c=>c.id);
 const economy=core.LaneEconomy.create(a,b);
 const state={minute:21,gold:{[a]:17000,[b]:17000},
  kills:{[a]:0,[b]:0},towers:{[a]:0,[b]:0},
  dragons:{[a]:0,[b]:0},barons:{[a]:0,[b]:0},
  nextDragon:22,nextBaron:26,
  lanes:{[a]:{TOP:0,MID:0,BOT:0},[b]:{TOP:0,MID:0,BOT:0}},
  waves:economy.lanes,map:{riverVision:{[a]:70,[b]:70},
   lanes:Object.fromEntries(['TOP','MID','BOT'].map(l=>[l,{
    pressure:{[a]:50,[b]:50},vision:{[a]:65,[b]:65}
   }]))}};
 const health=Object.fromEntries(Object.keys(nav.agents).map(id=>[id,100]));
 return {sim,core,world,fixture,clubs,nav,economy,state,health,a,b};
}
test('la misma oleada genera decisiones diferentes por ventaja, visión y economía real',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 state.waves.MID.front=2.7;
 state.map.lanes.MID.pressure[a]=78;
 state.map.lanes.MID.pressure[b]=22;
 state.map.lanes.MID.vision[a]=75;
 state.map.lanes.MID.vision[b]=35;
 const strong=core.MacroPolicy.evaluate(nav,state,nav.agents[clubs[0].lineup.MID],18,health);
 const weak=core.MacroPolicy.evaluate(nav,state,nav.agents[clubs[1].lineup.MID],18,health);
 assert.equal(strong.action,'pressure');
 assert.equal(strong.goal,'mid_center');
 assert.equal(weak.action,'defend','Una oleada amenazante merece defensa activa');
 assert.equal(weak.goal,'red_mid_front');
 assert.ok(strong.scores.pressure>strong.scores.farm);
 assert.ok(weak.scores.defend>weak.scores.pressure);
});
test('rotación a Dragón compite con oro perdido, sin regalar captura, experiencia ni recompensa',()=>{
 const {core,nav,state,health,a,clubs}=setup();
 const mid=nav.agents[clubs[0].lineup.MID];
 nav.neutralPlans={[a]:{action:'take',target:'dragon_pit',
  reason:'dragon_take',until:25,score:25}};
 const rotate=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 assert.equal(rotate.action,'objective');
 assert.equal(rotate.goal,'dragon_pit');
 assert.ok(rotate.evidence.travelHops>0);
 state.waves.MID.front=-2.5;
 state.gold[a]=10000;state.gold[clubs[1].id]=20000;
 state.map.lanes.MID.pressure[a]=35;
 state.map.lanes.MID.vision[a]=30;
 health[mid.id]=75;
 const farm=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 assert.ok(['farm','defend'].includes(farm.action),
  'Una oleada perdida y un déficit real exigen quedarse en línea');
 nav.neutralPlans={[a]:{action:'take',target:'dragon_pit',
  reason:'dragon_take',until:25,score:25}};
 nav.macroPlans=core.MacroPolicy.plan(nav,state,22,health,{});
 const before=core.MacroPolicy.snapshot(nav,22);
 assert.equal(before.plans[mid.id].action,farm.action);
 const movement=core.MacroPolicy.movement(nav,mid,22);
 assert.equal(movement.intent,'macro_'+farm.action);
 assert.equal(movement.decisionVersion,5);
 assert.equal(nav.seed,23519,'La decisión no consume RNG global');
});
test('un equipo rezagado considera disputa física en vez de farm automático',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 const mid=nav.agents[clubs[0].lineup.MID];
 state.waves.MID.front=-.8;
 state.map.lanes.MID.pressure[a]=40;
 state.map.lanes.MID.vision[a]=45;
 nav.neutralPlans={[a]:{action:'contest',target:'dragon_pit',
  reason:'dragon_contest',until:24,score:-5}};
 const even=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 assert.equal(even.action,'farm','Sin deuda de oro debe proteger la oleada.');
 state.gold[a]=13000;state.gold[b]=15800;
 const trailing=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 assert.equal(trailing.action,'objective','El equipo atrasado debe poder disputar la ventana real.');
 assert.ok(trailing.scores.objective>trailing.scores.farm);
 assert.equal(trailing.goal,'dragon_pit');
 assert.equal(health[mid.id],100,'La decisión no genera ni quita HP.');
 assert.equal(state.gold[a],13000,'Planificar no fabrica oro.');
});
test('el riesgo de empuje se basa en rivales vistos, no en HP o posiciones ocultas',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 const us=nav.agents[clubs[0].lineup.TOP];
 const them=nav.agents[clubs[1].lineup.TOP];
 us.node='blue_top_front';them.node='blue_top_ambush';
 state.map.lanes.TOP.vision[a]=39;
 state.map.lanes.TOP.pressure[a]=58;
 state.waves.TOP.front=.5;
 const threatened=core.MacroPolicy.evaluate(nav,state,us,18,health);
 assert.equal(threatened.evidence.visibleEnemies,1,
  'El rival cercano debe identificarse por sight real');
 assert.ok(threatened.evidence.overextendRisk>10);
 assert.equal(threatened.action,'farm',
  'No sobreextenderse sin información suficiente');
 them.node='red_fountain';health[them.id]=10;
 const hiddenWounded=core.MacroPolicy.evaluate(nav,state,us,18,health);
 health[them.id]=100;
 const hiddenHealthy=core.MacroPolicy.evaluate(nav,state,us,18,health);
 assert.deepEqual(hiddenWounded.scores,hiddenHealthy.scores,
  'El HP de un rival oculto nunca debe dar inteligencia omnisciente');
 assert.equal(hiddenWounded.evidence.visibleEnemies,0);
 nav.vision.wards.push({id:'vision-test',teamId:a,actorId:us.id,
  node:'red_top_ambush',placed:17,expires:25});
 const ward=core.MacroPolicy.evaluate(nav,state,us,18,health);
 assert.equal(ward.evidence.wardCover,true);
 assert.ok(ward.evidence.overextendRisk<hiddenHealthy.evidence.overextendRisk,
  'Un ward realmente colocado reduce el riesgo de la ruta');
});
test('TOP prepara oleadas desde puntos seguros simétricos antes de avanzar',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 state.waves.TOP.front=3;
 state.map.lanes.TOP.pressure[a]=82;
 state.map.lanes.TOP.vision[a]=90;
 const blue=core.MacroPolicy.evaluate(nav,state,
  nav.agents[clubs[0].lineup.TOP],18,health);
 state.waves.TOP.front=-3;
 state.map.lanes.TOP.pressure[b]=82;
 state.map.lanes.TOP.vision[b]=90;
 const red=core.MacroPolicy.evaluate(nav,state,
  nav.agents[clubs[1].lineup.TOP],18,health);
 assert.equal(blue.action,'pressure');
 assert.equal(red.action,'pressure');
 assert.equal(blue.goal,'top_corner');
 assert.equal(red.goal,'top_center');
 assert.ok(core.Navigation.hops('blue_top_front',blue.goal)>0);
 assert.ok(core.Navigation.hops('red_top_front',red.goal)>0);
});
test('rotar sin escoltas visibles cuesta más que una rotación realmente coordinada',()=>{
 const {core,nav,state,health,a,clubs}=setup();
 const mid=nav.agents[clubs[0].lineup.MID];
 nav.neutralPlans={[a]:{action:'contest',target:'dragon_pit',
  reason:'dragon_contest',until:24,score:10}};
 const jun=nav.agents[clubs[0].lineup.JUN];
 const sup=nav.agents[clubs[0].lineup.SUP];
 jun.node='blue_top_front';sup.node='blue_top_front';
 const alone=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 jun.node='lower_river';
 const withEscort=core.MacroPolicy.evaluate(nav,state,mid,22,health);
 assert.ok(withEscort.evidence.objectiveEscortCount>
  alone.evidence.objectiveEscortCount);
 assert.ok(withEscort.scores.objective>alone.scores.objective);
 assert.ok(withEscort.evidence.objectiveRisk<alone.evidence.objectiveRisk);
});
test('presión compromete una oleada física; la llamada no concede oro gratis',()=>{
 const {core,nav,state,economy,health,a,b,clubs}=setup();
 for(const agent of Object.values(nav.agents)){
  agent.alive=true;agent.node=agent.teamId===a?'blue_fountain':'red_fountain';
 }
 const top=nav.agents[clubs[0].lineup.TOP],foe=nav.agents[clubs[1].lineup.TOP];
 top.node='blue_top_front';top.intent='macro_pressure';
 foe.node='red_top_front';foe.intent='macro_farm';
 const gold={[a]:0,[b]:0};
 const first=core.LaneEconomy.advance(economy,{minute:18,nav,map:state.map,health,gold});
 assert.ok(first.some(x=>x.teamId===a&&x.lane==='TOP'));
 assert.ok(gold[a]>0&&gold[b]>0,'El farm requiere estar en linea y cobrar de oleadas');
 const momentum=economy.lanes.TOP.front;
 top.node='blue_fountain';
 top.intent='macro_pressure';
 const goldBefore=gold[a];
 core.LaneEconomy.advance(economy,{minute:19,nav,map:state.map,health,gold});
 assert.equal(gold[a],goldBefore,'Dar orden de empuje sin presencia no entrega gold');
 assert.ok(economy.lanes.TOP.front<momentum,'La oleada pierde impulso sin escort real');
});
test('una defensa física frena oleadas entrantes sin regalar oro ni destruir torres',()=>{
 const {core,nav,state,health,a,b,clubs}=setup();
 for(const p of Object.values(nav.agents)){
  p.node=p.teamId===a?'blue_fountain':'red_fountain';
  p.alive=true;p.intent='lane';
 }
 const defender=nav.agents[clubs[0].lineup.TOP];
 const attacker=nav.agents[clubs[1].lineup.TOP];
 defender.node='blue_top_front';attacker.node='red_top_front';
 state.waves.TOP.front=-2;
 state.map.lanes.TOP.pressure[a]=35;
 state.map.lanes.TOP.pressure[b]=65;
 const decision=core.MacroPolicy.evaluate(nav,state,defender,19,health);
 assert.equal(decision.action,'defend');
 const goldFarm={[a]:0,[b]:0},goldDefense={[a]:0,[b]:0};
 defender.intent='macro_farm';
 const farm=core.LaneEconomy.create(a,b);
 core.LaneEconomy.advance(farm,{minute:19,nav,map:state.map,health,gold:goldFarm});
 defender.intent='macro_defend';
 const defense=core.LaneEconomy.create(a,b);
 core.LaneEconomy.advance(defense,{minute:19,nav,map:state.map,health,gold:goldDefense});
 assert.ok(defense.lanes.TOP.front>farm.lanes.TOP.front,
  'Defensa visible debe frenar el avance de la oleada enemiga');
 assert.deepEqual(goldFarm,goldDefense,'Defender no fabrica farm extra');
 defender.node='blue_fountain';
 const untouched=core.LaneEconomy.create(a,b);
 const goldAway={[a]:0,[b]:0};
 core.LaneEconomy.advance(untouched,{minute:19,nav,map:state.map,health,gold:goldAway});
 assert.equal(goldAway[a],0,'Defender desde la fuente no produce oro');
 assert.ok(untouched.lanes.TOP.front<defense.lanes.TOP.front,
  'La defensa desaparece al abandonar físicamente el carril');
});
test('70 partidas reproducibles conservan las auditorías y registran costes de oportunidad',()=>{
 const {sim,core,world,fixture}=setup();
 const actions={farm:0,pressure:0,objective:0};
 let auditCount=0;
 for(let seed=1;seed<=70;seed++){
  world.rng=seed*19031;
  const m=sim.simulateMatch(fixture);
  const errors=[...core.MacroPolicy.audit(m),
    ...core.Navigation.auditNavigation(m,world),
    ...core.LaneEconomy.audit(m),
    ...core.PowerEconomy.audit(m),
    ...core.NeutralObjectives.audit(m),
    ...core.Counterplay.audit(m),
    ...core.Encounters.audit(m,world),
    ...core.auditMatch(m,world),
    ...core.MatchReplay.auditMoments(m,world)];
  assert.equal(errors.length,0,'seed '+seed+': '+errors.slice(0,4).join(' | '));
  for(const frame of m.frames){
   for(const a of Object.values(frame.navigation?.before||{})){
    if(a.reason?.startsWith('macro_')){
     const chosen=a.reason.slice(6);
     assert.ok(chosen in actions);
     actions[chosen]++;
    }
   }
  }
  auditCount++;
 }
 assert.ok(actions.farm>20,'No existe una decision de farm visible');
 assert.ok(actions.pressure>10,'No existe presion macro decidida');
 console.log('MACRO_SAMPLE='+JSON.stringify({actions,auditCount}));
});
