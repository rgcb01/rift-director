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
 assert.equal(weak.action,'farm');
 assert.equal(weak.goal,'red_mid_front');
 assert.ok(strong.scores.pressure>strong.scores.farm);
 assert.ok(weak.scores.farm>weak.scores.pressure);
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
 assert.equal(farm.action,'farm','Una oleada perdida y un deficit real deben justificar farm');
 nav.neutralPlans={[a]:{action:'take',target:'dragon_pit',
  reason:'dragon_take',until:25,score:25}};
 nav.macroPlans=core.MacroPolicy.plan(nav,state,22,health,{});
 const before=core.MacroPolicy.snapshot(nav,22);
 assert.equal(before.plans[mid.id].action,'farm');
 const movement=core.MacroPolicy.movement(nav,mid,22);
 assert.equal(movement.intent,'macro_farm');
 assert.equal(movement.decisionVersion,5);
 assert.equal(nav.seed,23519,'La decisión no consume RNG global');
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
