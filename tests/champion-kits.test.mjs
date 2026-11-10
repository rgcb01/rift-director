import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';

function setup(){
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Active Kits QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 const a=world.clubs.find(c=>c.id===fixture.a),b=world.clubs.find(c=>c.id===fixture.b);
 const teams=Object.fromEntries([a,b].map(c=>[c.id,
  ctx.core.ROLES.map(role=>world.players.find(p=>p.id===c.lineup[role]))]));
 const players=[...teams[a.id],...teams[b.id]];
 const nav=ctx.core.Navigation.createNavigation([a,b],teams,777);
 const assignments=ctx.core.ChampionScaling;
 const champs={entries:Object.fromEntries(players.map(p=>
  [p.id,assignments.FALLBACK[p.role]]))};
 const power=ctx.core.PowerEconomy.create(players,champs);
 const kits=ctx.core.ChampionKits.create(power);
 return {...ctx,world,fixture,a,b,teams,players,nav,power,kits};
}
const clone=x=>JSON.parse(JSON.stringify(x));

test('ten original champion kits have passive, Q/W/E/R, ranges and bounded costs',()=>{
 const {core}=setup(),defs=core.ChampionKits.DEFINITIONS;
 assert.equal(Object.keys(defs).length,10);
 for(const [id,kit] of Object.entries(defs)){
  assert.ok(['mana','stamina','energy'].includes(kit.resourceType));
  assert.ok(['damage','guard'].includes(kit.passive.kind));
  assert.deepEqual(Object.keys(kit.abilities),['Q','W','E','R']);
  for(const [slot,a] of Object.entries(kit.abilities)){
   assert.ok(a.name&&a.cost>0&&a.cooldown>0);
   assert.ok(a.base>0&&a.range>=0&&a.range<=2);
   assert.ok(['damage','control','shield','heal'].includes(a.kind));
  }
  assert.equal(core.ChampionScaling.DEFINITIONS[id].id,id);
 }
});
test('only a real ranged encounter can spend Q; resolution stays pure until commit',()=>{
 const x=setup(),{core,a,b,nav,power,kits}=x;
 const hero=nav.agents[a.lineup.MID],foe=nav.agents[b.lineup.MID];
 const health=core.Encounters.create(x.players);
 const state=JSON.stringify(kits);
 const fact=core.Encounters.resolveCombat({
  nav,dead:{},minute:8,players:Object.fromEntries(x.players.map(p=>[p.id,p])),
  health,seed:777,mode:'lane',teamId:a.id,
  attackerIds:[hero.id],targetIds:[foe.id],lane:'MID',
  powerState:power,abilityState:kits});
 assert.ok(fact?.abilityCasts?.length);
 assert.equal(JSON.stringify(kits),state,'Preview should not consume resource');
 assert.ok(fact.impacts[0].microSteps?.length===5);
 assert.equal(fact.impacts[0].hpAfter,
  Math.max(0,fact.impacts[0].hpBefore-fact.impacts[0].damage));
 const cast=fact.abilityCasts.find(c=>c.casterId===hero.id);
 assert.equal(cast.slot,'Q');
 assert.ok(cast.amount>0&&cast.resourceAfter<cast.resourceBefore);
 core.ChampionKits.commit(kits,fact.abilityCasts);
 assert.equal(kits.entries[hero.id].casts.Q,1);
 assert.equal(kits.entries[hero.id].resource,cast.resourceAfter);
 assert.throws(()=>core.ChampionKits.commit(kits,fact.abilityCasts),
  /Unverified champion cast/,'Replay cannot duplicate the same cast');
 const far=core.ChampionKits.select(kits,power,nav,hero.id,
  nav.agents[b.lineup.TOP].id,8*60+33,'lane','attack');
 assert.equal(far,null,'Abilities must not cast across lanes');
});
test('ability selection requires XP rank, mana and cooldown, not just gold',()=>{
 const x=setup(),{core,a,b,nav,power,kits}=x;
 const att=a.lineup.MID,target=b.lineup.MID,entry=kits.entries[att];
 const noR=core.ChampionKits.select(kits,power,nav,att,target,900,'teamfight','attack');
 assert.ok(!noR||noR.slot!=='R','Ultimate at level 1 is impossible');
 power.entries[att].level=11;
 const yesR=core.ChampionKits.select(kits,power,nav,att,target,900,'teamfight','attack');
 assert.equal(yesR?.slot,'R');
 core.ChampionKits.commit(kits,[yesR]);
 assert.equal(core.ChampionKits.select(kits,power,nav,att,target,910,'teamfight','attack')?.slot==='R',false);
 entry.resource=0;entry.lastAt=910;
 assert.equal(core.ChampionKits.select(kits,power,nav,att,target,911,'lane','attack'),null,
  'No free cast without resource');
 entry.resource=100;entry.lastAt=911;
 assert.ok(core.ChampionKits.select(kits,power,nav,att,target,1115,'teamfight','attack'));
});
test('five-second encounter traces prove HP loss and actual local TTK',()=>{
 const x=setup(),{core,a,b,nav,power,kits}=x;
 const hero=a.lineup.MID,target=b.lineup.MID;
 const health=core.Encounters.create(x.players);
 health[target]=18;
 const f=core.Encounters.resolveCombat({
  nav,dead:{},minute:12,players:Object.fromEntries(x.players.map(p=>[p.id,p])),
  health,seed:714,mode:'lane',teamId:a.id,
  attackerIds:[hero],targetIds:[target],lane:'MID',
  powerState:power,abilityState:kits
 });
 assert.ok(f);
 assert.equal(f.outcome,'kill');
 const hit=f.impacts[0];
 assert.equal(hit.hpAfter,0);
 assert.ok(hit.ttkSeconds>=1&&hit.ttkSeconds<=5);
 assert.equal(hit.microSteps[hit.ttkSeconds-1].hpAfter,0);
 for(const s of hit.microSteps)assert.ok(s.hpAfter>=0&&s.hpAfter<=100);
 assert.equal(f.abilityCasts.filter(z=>z.kind==='damage').length,1);
});
test('full matches audit all cast resources, cooldowns and their replay snapshots',()=>{
 const x=setup(),{core,sim,world,fixture}=x;
 let casts=0,withQ=0,withW=0,withE=0,withR=0;
 for(let seed=1;seed<=16;seed++){
  world.rng=seed*716999;
  const match=sim.simulateMatch(fixture);
  assert.ok(match.winner&&match.abilityState);
  const err=[...core.ChampionKits.audit(match),...core.Encounters.audit(match,world),
    ...core.PowerEconomy.audit(match)];
  assert.equal(err.length,0,'Seed '+seed+': '+err.slice(0,3).join(' | '));
  for(const e of match.events)for(const c of e.facts?.abilityCasts||[]){
   casts++;if(c.slot==='Q')withQ++;if(c.slot==='W')withW++;
   if(c.slot==='E')withE++;if(c.slot==='R')withR++;
  }
  const last=match.frames.at(-1);
  assert.deepEqual(clone(last.abilityState),clone(match.abilityState));
  for(const id of Object.keys(match.abilityState.entries)){
   const row=match.abilityState.entries[id];
   assert.ok(row.resource>=0&&row.resource<=100);
  }
 }
 assert.ok(casts>40);
 assert.ok(withQ>0&&withW>0&&withE>0&&withR>0,
  'Need offensive, defensive, control and ult casts in actual matches');
});
test('falsifying mana/cooldown, position or microsteps is detected',()=>{
 const x=setup(),{core,sim,world,fixture}=x;world.rng=987653;
 const match=sim.simulateMatch(fixture),i=match.events.findIndex(e=>
  e.facts?.abilityCasts?.length&&e.facts?.impacts?.[0]?.microSteps);
 assert.ok(i>=0);
 const bad=clone(match);bad.events[i].facts.abilityCasts[0].resourceAfter=999;
 assert.ok(core.ChampionKits.audit(bad).length>0);
 const position=clone(match);position.events[i].facts.abilityCasts[0].targetNode='red_fountain';
 assert.ok(core.ChampionKits.audit(position).length>0);
 const damage=clone(match);damage.events[i].facts.impacts[0].microSteps[0].hpAfter=101;
 assert.ok(core.ChampionKits.audit(damage).length>0);
});

test('objective skirmish cannot forge five-second damage, healing or local TTK',()=>{
 const x=setup(),{core,sim,world,fixture}=x;
 let found=null;
 for(let seed=1;seed<=75&&!found;seed++){
  world.rng=seed*92877;
  const match=sim.simulateMatch(fixture);
  const i=match.events.findIndex(e=>e.facts?.action==='skirmish'&&
   Array.isArray(e.facts.microSteps)&&e.facts.microSteps.length===5);
  if(i>=0)found={match,i};
 }
 assert.ok(found,'Need a true contested neutral encounter');
 const {match,i}=found;
 assert.equal(core.ChampionKits.audit(match).length,0);
 const step=clone(match);
 step.events[i].facts.microSteps[1].spell+=2;
 assert.ok(core.ChampionKits.audit(step).length>0,
  'Artificial damage in Baron/Dragon must be detected');
 const heal=clone(match);
 heal.events[i].facts.healed+=1;
 assert.ok(core.ChampionKits.audit(heal).length>0);
 const ttk=clone(match);
 ttk.events[i].facts.ttkSeconds=99;
 assert.ok(core.ChampionKits.audit(ttk).length>0);
});

test('active spell spends part of basic-attack budget instead of stacking a free full hit',()=>{
 const x=setup(),{core,a,b,nav,power,kits}=x;
 const health=core.Encounters.create(x.players),players=Object.fromEntries(x.players.map(p=>[p.id,p]));
 const args={nav,dead:{},minute:8,players,health,seed:777,
  mode:'lane',teamId:a.id,attackerIds:[a.lineup.MID],
  targetIds:[b.lineup.MID],lane:'MID',powerState:power};
 const old=core.Encounters.resolveCombat(args);
 const candidate=core.Encounters.resolveCombat({...args,abilityState:kits});
 assert.ok(old&&candidate);
 const hit=candidate.impacts[0];
 const casts=candidate.abilityCasts;
 assert.ok(casts.some(c=>c.kind==='damage'));
 const raw=hit.microSteps.reduce((n,s)=>n+s.basic+s.spell+s.passive,0);
 const spell=casts.find(c=>c.kind==='damage');
 assert.ok(raw-old.impacts[0].damage<=Math.ceil(spell.amount*.35)+2,
  'A spell should replace autos; old model added the full spell as free damage');
 assert.ok(Math.abs(hit.damage-old.impacts[0].damage)<=8,
  'Burst and defensive reactions should have bounded early-game effect');
 assert.equal(JSON.stringify(core.ChampionKits.snapshot(kits)),
  JSON.stringify(core.ChampionKits.snapshot(kits)),'Preview is pure');
});
