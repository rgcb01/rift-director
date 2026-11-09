import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

test('vida de torre persiste, placas nacen del daño y la oleada es obligatoria',()=>{
 const {core}=boot();
 const e=core.LaneEconomy,model=e.create('blue','red');
 assert.deepEqual([...model.lanes.TOP.hp.red],e.TOWER_HP);
 assert.equal(e.damageTower(model,{teamId:'blue',defenderId:'red',
  lane:'TOP',stage:1,minute:12,attackers:2,defenders:0}),null);
 model.lanes.TOP.front=2;
 const hits=[];
 for(let t=12;t<30&&model.lanes.TOP.hp.red[0]>0;t++){
  const h=e.damageTower(model,{teamId:'blue',defenderId:'red',lane:'TOP',
   stage:1,minute:t,attackers:2,defenders:0});
  assert.ok(h&&h.damage>0&&h.damage<=e.TOWER_HP[0]/3);
  hits.push(h);
 }
 assert.ok(hits.length>=3);
 assert.equal(model.lanes.TOP.hp.red[0],0);
 assert.equal(model.lanes.TOP.plates.red[0],3);
 assert.deepEqual(hits.filter(h=>h.plate).map(h=>h.plate),[1,2,3]);
 assert.equal(hits.filter(h=>h.plate).reduce((n,h)=>n+h.goldReward,0),
  model.income.blue.plates);
 const fresh=e.create('blue','red');
 assert.equal(fresh.lanes.TOP.hp.red[0],e.TOWER_HP[0]);
});

test('el splitpush solitario necesita oleada fuerte y ningún rival para rematar',()=>{
 const {core}=boot(),e=core.LaneEconomy;
 const m=e.create('blue','red');m.lanes.BOT.front=1.6;
 const hit=(soloAllowed=false)=>e.damageTower(m,{
  teamId:'blue',defenderId:'red',lane:'BOT',stage:1,minute:15,
  attackers:1,defenders:0,soloAllowed});
 let hits=0;while(m.lanes.BOT.hp.red[0]>1&&hits++<20)assert.ok(hit());
 assert.equal(m.lanes.BOT.hp.red[0],1);
 assert.equal(hit(),null,'Sin escolta no puede derribar el último HP');
 const fin=hit(true);
 assert.ok(fin&&fin.destroyed&&fin.after===0);
 assert.equal(m.lanes.BOT.plates.red[0],3);
});

test('un defensor reduce daño sin reparar la torre; el Barón no ataca de lejos',()=>{
 const {core}=boot(),e=core.LaneEconomy;
 const base=e.create('blue','red');
 base.lanes.MID.front=1.2;
 const damage=(defenders,baron=false)=>e.damageValue({
  stage:2,attackers:2,defenders,wave:1.2,baron});
 assert.ok(damage(2)<damage(0));
 assert.ok(damage(0,true)>damage(0));
 const h=e.damageTower(base,{teamId:'blue',defenderId:'red',
  lane:'MID',stage:2,minute:19,attackers:0,defenders:0,baron:true});
 assert.equal(h,null);
});

test('40 partidos: auditoría de vida de torres, orden de placas y replay completo',()=>{
 const {sim,core}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Tower Durability QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 let hits=0,partial=0;
 for(let seed=1;seed<=40;seed++){
  world.rng=seed*61091;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner,'Ganador ausente: '+seed);
  const issues=[...core.Navigation.auditNavigation(match,world),
   ...core.LaneEconomy.audit(match),
   ...core.NexusSiege.audit(match),
   ...core.auditMatch(match,world),
   ...core.MatchReplay.auditMoments(match,world),
   ...core.auditBroadcast(match,world)];
  assert.equal(issues.length,0,'Seed '+seed+': '+issues.slice(0,4).join(' | '));
  const events=match.events.filter(e=>e.facts?.action==='tower_damage');
  hits+=events.length;
  partial+=events.filter(e=>e.facts.after>0).length;
  for(const f of match.frames){
   assert.deepEqual([...f.laneEconomy.towerMaxHp],[...core.LaneEconomy.TOWER_HP]);
  }
 }
 assert.ok(hits>100&&partial>20);
});
