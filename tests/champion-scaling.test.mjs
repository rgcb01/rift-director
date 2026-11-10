import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './harness.mjs';
const roles=['TOP','JUN','MID','ADC','SUP'];
const roster=()=>['a','b'].flatMap(teamId=>roles.map(role=>({
 id:teamId+'-'+role,teamId,role
})));
const catalog=core=>[...core.PowerEconomy.ITEM_CATALOG,...core.PowerEconomy.COMPONENT_CATALOG];
const asJSON=x=>JSON.parse(JSON.stringify(x));

test('ten champion IDs have separate, bounded and role-compatible physical growth',()=>{
 const {core}=boot(),c=core.ChampionScaling;
 assert.equal(Object.keys(c.DEFINITIONS).length,10);
 const names=new Set();
 for(const [id,d] of Object.entries(c.DEFINITIONS)){
  assert.equal(d.id,id);assert.ok(roles.includes(d.role));
  assert.ok(!names.has(id));names.add(id);
  const lvl1=c.effective({role:d.role,championId:id,level:1,items:[]});
  const lvl18=c.effective({role:d.role,championId:id,level:18,items:[]});
  assert.ok(lvl18.maxHp>lvl1.maxHp);
  assert.ok(lvl18.attackDamage>lvl1.attackDamage);
  assert.ok(lvl18.armor>lvl1.armor);
  assert.ok(lvl18.magicResist>lvl1.magicResist);
  assert.ok(lvl18.attackSpeed>lvl1.attackSpeed);
  for(const level of [1,6,11,16,18]){
   const ranks=c.skillRanks(level,d.priority);
   assert.equal(Object.values(ranks).reduce((n,r)=>n+r,0),level);
   assert.equal(ranks.R,(level>=6?1:0)+(level>=11?1:0)+(level>=16?1:0));
   assert.ok(ranks.Q<=5&&ranks.W<=5&&ranks.E<=5);
  }
 }
});
test('roles and identity determine tank durability, carry offense and mage AP',()=>{
 const {core}=boot(),c=core.ChampionScaling,items=catalog(core);
 const row=(championId,role)=>({championId,role,level:12,items:[]});
 const tank=c.effective(row('korvek','TOP'),items);
 const assassin=c.effective(row('veyra','JUN'),items);
 const carry=c.effective(row('nyra','ADC'),items);
 assert.ok(tank.maxHp>assassin.maxHp&&tank.armor>assassin.armor);
 assert.ok(carry.attackDamage>tank.attackDamage);
 const magic=c.effective({championId:'aeska',role:'MID',level:12,
  items:['spellbook']},items);
 assert.ok(magic.abilityPower>0);
 assert.equal(c.effective(row('aeska','MID'),items).abilityPower,0);
 assert.ok(c.mitigation(row('nyra','ADC'),row('korvek','TOP'),items)<
  c.mitigation(row('nyra','ADC'),row('veyra','JUN'),items));
});
test('wallet alone grants no combat power; purchased equipment and earned XP do',()=>{
 const {core}=boot(),E=core.PowerEconomy,C=core.ChampionScaling;
 const players=roster();
 const ch={entries:Object.fromEntries(players.map(p=>
  [p.id,C.FALLBACK[p.role]]))};
 ch.entries['a-MID']='aeska';
 const model=E.create(players,ch),p=model.entries['a-MID'],items=catalog(core);
 const first=C.effective(p,items),before=E.boost(model,p.id,'attack');
 p.wallet+=7500;p.earned+=7500;
 assert.deepEqual(asJSON(C.effective(p,items)),asJSON(first),
  'Money cannot grant power without a physical purchase');
 const nav={a:'a',b:'b',agents:{[p.id]:{...p,alive:true,node:'blue_fountain',intent:'lane'}}};
 const event=E.purchase(model,nav,nav.agents[p.id],4,{gold:{a:12000,b:15000}});
 assert.ok(event&&event.goldCost>0&&event.itemKind==='complete');
 assert.ok(C.effective(p,items).abilityPower>first.abilityPower||
  C.effective(p,items).attackDamage>first.attackDamage||
  C.effective(p,items).armor>first.armor);
 assert.ok(E.boost(model,p.id,'attack')>before);
 const afterShop=C.effective(p,items);
 E.xpAward?.(model,p.id,0); // optional API; normal XP comes from events
 E.rewardEvent(model,{teamId:'a',facts:{action:'tower',actorId:p.id,participantIds:[p.id]}});
 assert.ok(C.effective(p,items).level>=afterShop.level);
 assert.equal(p.wallet+p.spent,p.earned);
});
test('champion IDs and effective stats appear in replay and are auditable',()=>{
 const {core,sim}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Scaling QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>
  f.a===world.userClub||f.b===world.userClub);
 for(let i=1;i<=14;i++){
  world.rng=i*84017;
  const m=sim.simulateMatch(fixture);
  assert.ok(m.winner);
  const errors=[...core.PowerEconomy.audit(m),...core.Encounters.audit(m,world),
   ...core.auditMatch(m,world),...core.Navigation.auditNavigation(m,world)];
  assert.equal(errors.length,0,'Seed '+i+': '+errors.slice(0,5).join(' / '));
  const last=m.frames.at(-1);
  for(const [id,row] of Object.entries(last.powerEconomy.entries)){
   assert.equal(row.championId,m.champions.entries[id]);
   assert.ok(row.effectiveStats?.maxHp>0);
   assert.equal(row.effectiveStats?.level,row.level);
  }
 }
});
