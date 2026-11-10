/* Alpha 0.7.18 — deterministic active champion kits.
 * One short, local five-second combat window per valid encounter, built on the
 * existing map-authoritative navigation and persistent normalized HP ledger.
 * No RNG and no speculative mutation: preview first, commit only once an
 * actual encounter is applied; all casts and resources are replay-auditable.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const SLOTS=['Q','W','E','R'];
// Stable original identities; ability scripts are data, never arbitrary code.
// Each row: ID, resource, passive, Q, W, E, R, defensive W type, R type.
const ROWS=[
 ['hrodan','stamina','damage','Corte rúnico','Guardia de hierro','Embestida del norte','Furia del clan','shield','damage'],
 ['korvek','stamina','guard','Martillo de piedra','Bastión vivo','Choque de escudo','Muralla ancestral','shield','shield'],
 ['sereth','stamina','damage','Garra salvaje','Reflejo del bosque','Trampa espinada','Cacería ancestral','shield','damage'],
 ['veyra','energy','damage','Filo umbrío','Velo cauteloso','Interrupción fugaz','Ejecución lunar','shield','damage'],
 ['aeska','mana','damage','Chispa astral','Égida arcana','Prisión de hielo','Nova celeste','shield','damage'],
 ['elaris','mana','damage','Oleada azul','Corriente vital','Atadura de mareas','Diluvio eterno','heal','damage'],
 ['nyra','stamina','damage','Flecha veloz','Paso evasivo','Red inmovilizante','Lluvia de estrellas','shield','damage'],
 ['velin','stamina','damage','Virote de acero','Cobertura ligera','Disparo cortante','Salva de tormenta','shield','damage'],
 ['thessa','mana','guard','Rayo primaveral','Semilla sanadora','Raíces firmes','Jardín de refugio','heal','heal'],
 ['drathos','mana','guard','Pulso protector','Escudo espectral','Sello de silencio','Juramento eterno','shield','shield']
];
const DEFINITIONS=Object.freeze(Object.fromEntries(ROWS.map(([id,resourceType,passive,q,w,e,r,wKind,rKind])=>{
 const spell=(name,kind,cost,cooldown,base,growth,range=2)=>
  Object.freeze({name,kind,cost,cooldown,base,growth,range});
 return [id,Object.freeze({id,resourceType,
  passive:Object.freeze({kind:passive,amount:1}),
  abilities:Object.freeze({
   Q:spell(q,'damage',18,105,4,1.1),
   W:spell(w,wKind,18,140,wKind==='heal'?4:3,1.0,0),
   E:Object.freeze({...spell(e,'control',24,160,3,0.7),controlSeconds:1}),
   R:spell(r,rKind,42,310,rKind==='damage'?8:5,2.0,rKind==='damage'?2:0)
  })})];
})));
function create(powerState){
 const entries={};
 for(const row of Object.values(powerState?.entries||{})){
  if(!row.championId||!DEFINITIONS[row.championId])continue;
  entries[row.id]={championId:row.championId,resource:100,lastAt:0,
   cooldowns:{Q:0,W:0,E:0,R:0},casts:{Q:0,W:0,E:0,R:0}};
 }
 return {version:1,entries};
}
function snapshot(model){
 return {version:1,entries:Object.fromEntries(Object.entries(model?.entries||{})
  .map(([id,p])=>[id,{...p,cooldowns:{...p.cooldowns},casts:{...p.casts}}]))};
}
function projected(row,at){
 const elapsed=Math.max(0,at-row.lastAt);
 return Math.min(100,row.resource+Math.floor(elapsed/60)*9);
}
const itemCatalog=()=>[...(core.PowerEconomy?.ITEM_CATALOG||[]),
 ...(core.PowerEconomy?.COMPONENT_CATALOG||[])];
function select(model,powerState,nav,id,targetId,at,mode,side){
 const entry=model?.entries?.[id],row=powerState?.entries?.[id],
  actor=nav?.agents?.[id],target=nav?.agents?.[targetId];
 if(!entry||!row||!actor?.alive||!target?.alive||entry.championId!==row.championId)return null;
 const def=DEFINITIONS[row.championId],stats=core.ChampionScaling?.effective(row,itemCatalog());
 if(!def||!stats)return null;
 const wanted=side==='attack'?
  mode==='teamfight'?['R','E','Q']:mode==='gank'?['E','Q','R']:
   mode==='skirmish'?['R','Q','E']:['Q','E','R']:
  mode==='teamfight'?['R','W']:['W','R'];
 for(const slot of wanted){
  const ability=def.abilities[slot],rank=stats.abilityRanks[slot];
  if(!rank||side==='attack'&&!['damage','control'].includes(ability.kind)||
   side==='defense'&&!['shield','heal'].includes(ability.kind))continue;
  if((entry.cooldowns[slot]||0)>at||projected(entry,at)<ability.cost)continue;
  if(side==='attack'&&!core.Navigation.combatRange(actor.node,target.node,ability.range))
   continue;
  if(side==='defense'&&id!==targetId)continue; // self mitigation, not a remote rescue
  const amount=clamp(Math.round(ability.base+ability.growth*(rank-1)+
   (['damage','control'].includes(ability.kind)?
    stats.attackDamage*.011+stats.abilityPower*.024:
    stats.abilityPower*.009)),2,ability.kind==='damage'?15:ability.kind==='control'?10:8);
  return {casterId:id,targetId,championId:def.id,slot,name:ability.name,
   kind:ability.kind,resourceType:def.resourceType,
   rank,at,cost:ability.cost,resourceBefore:projected(entry,at),
   resourceAfter:projected(entry,at)-ability.cost,
   cooldownBefore:entry.cooldowns[slot]||0,
   cooldownUntil:at+ability.cooldown,
   casterNode:actor.node,targetNode:target.node,
   amount,controlSeconds:ability.controlSeconds||0};
 }
 return null;
}
function preview(model,powerState,nav,actorId,targetId,minute,mode){
 if(!model?.entries?.[actorId]||!model?.entries?.[targetId])return null;
 const at=minute*60+({lane:6,gank:16,skirmish:26,teamfight:36}[mode]||0);
 const offense=select(model,powerState,nav,actorId,targetId,at,mode,'attack');
 // A confirmed crowd-control cast prevents a defender's next local reaction.
 const defense=offense?.kind==='control'?null:
  select(model,powerState,nav,targetId,targetId,at+1,mode,'defense');
 const attacking=DEFINITIONS[model.entries[actorId].championId];
 const defending=DEFINITIONS[model.entries[targetId].championId];
 return {casts:[...(offense?[offense]:[]),...(defense?[defense]:[])],
  offense,defense,
  passiveAttack:attacking?.passive.kind==='damage'?attacking.passive.amount:0,
  passiveGuard:defending?.passive.kind==='guard'?defending.passive.amount:0};
}
function impact({model,powerState,nav,actorId,targetId,minute,mode,before,base,minDamage}){
 const plan=preview(model,powerState,nav,actorId,targetId,minute,mode);
 if(!plan)return null;
 const offense=plan.offense,defense=plan.defense;
 const spell=offense?.amount||0,passive=plan.passiveAttack;
 // A spell REPLACES most basic attacks within the same five seconds.
 // The first candidate stacked a full spell onto almost all auto-damage,
 // multiplying early leads (4.6% -> 3.2% comebacks in 1,000 maps).
 // Real cast timing, crowd control and resource costs still determine fights.
 let plain=Math.max(0,Math.round(base-spell*.80-passive*.50));
 const potentialShield=(defense?.kind==='shield'?
  Math.ceil(defense.amount*.50):0)+plan.passiveGuard;
 const heal=defense?.kind==='heal'?
  Math.min(Math.ceil(defense.amount*.60),100-before):0;
 let total=plain+spell+passive;
 // The existing 12/18 minimum and 120 maximum remain the combat contract.
 // A shield/heal lowers REAL HP damage, never the number of recorded hits.
 const absorb=Math.min(potentialShield,Math.max(0,total-minDamage-heal));
 total=clamp(total-absorb-heal,minDamage,120)+absorb+heal;
 plain=Math.max(0,total-spell-passive);
 let hp=before,shield=absorb,absorbed=0;
 const steps=[];
 for(let second=0;second<5;second++){
  const basePart=Math.floor(plain/5)+(second<plain%5?1:0);
  const gross=basePart+(second===1?spell:0)+(second===2?passive:0);
  if(second===0)hp=Math.min(100,hp+heal);
  const blocked=Math.min(shield,gross);shield-=blocked;absorbed+=blocked;
  hp=Math.max(0,hp-(gross-blocked));
  steps.push({second,basic:basePart,spell:second===1?spell:0,
   passive:second===2?passive:0,blocked,
   healed:second===0?heal:0,controlSeconds:second===1?(offense?.controlSeconds||0):0,
   hpAfter:hp});
 }
 const damage=total-absorb-heal;
 if(damage<minDamage||damage>120||hp!==Math.max(0,before-damage))
  throw Error('Incompatible champion combat window');
 const fatal=steps.find(s=>s.hpAfter===0)?.second;
 return {damage,hpAfter:hp,abilityCasts:plan.casts,passiveDamage:passive,
  passiveGuard:plan.passiveGuard,shieldAbsorbed:absorbed,healed:heal,
  controlSeconds:offense?.controlSeconds||0,
  microSteps:steps,ttkSeconds:fatal===undefined?null:fatal+1};
}
function commit(model,casts){
 if(!model||!Array.isArray(casts))throw Error('Invalid champion cast ledger');
 const seen=new Set();
 for(const cast of casts){
  const row=model.entries[cast.casterId],def=DEFINITIONS[row?.championId],
   ability=def?.abilities[cast.slot];
  if(!row||!ability||seen.has(cast.casterId)||
   cast.championId!==def.id||cast.name!==ability.name||
   cast.kind!==ability.kind||cast.cost!==ability.cost||
   !Number.isSafeInteger(cast.at)||cast.at<row.lastAt||
   cast.cooldownBefore!==(row.cooldowns[cast.slot]||0)||
   cast.cooldownBefore>cast.at||cast.resourceBefore!==projected(row,cast.at)||
   cast.resourceAfter!==cast.resourceBefore-ability.cost||
   cast.resourceAfter<0||cast.cooldownUntil!==cast.at+ability.cooldown||
   !Number.isSafeInteger(cast.amount)||cast.amount<2||cast.amount>15||
   !Number.isSafeInteger(cast.rank)||cast.rank<1||cast.rank>5||
   (cast.slot==='R'&&cast.rank>3))
   throw Error('Unverified champion cast: '+cast.casterId+'/'+cast.slot);
  seen.add(cast.casterId);
  row.resource=cast.resourceAfter;row.lastAt=cast.at;
  row.cooldowns[cast.slot]=cast.cooldownUntil;row.casts[cast.slot]++;
 }
}
function audit(match){
 const errors=[];
 if(!match.abilityState)return errors; // old replay: no invented casts
 const initial={entries:Object.fromEntries(Object.entries(match.abilityState.entries)
  .map(([id,p])=>[id,{id,championId:p.championId}]))};
 const model=create(initial);
 for(const [i,event] of (match.events||[]).entries()){
  const f=event.facts||{},casts=f.abilityCasts||[];
  try{
   if(casts.length){
    if(!['lane_trade','gank','gank_avoided','teamfight','clash','skirmish'].includes(f.action))
     throw Error('Cast has no combat encounter');
    const pre=match.moments?.[i]?.navigation?.before||{};
    for(const c of casts){
     const from=pre[c.casterId],to=pre[c.targetId];
     if(!from?.alive||!to?.alive||from.node!==c.casterNode||
        to.node!==c.targetNode||!DEFINITIONS[c.championId]||
        (c.kind==='damage'||c.kind==='control'?
         from.teamId===to.teamId||!core.Navigation.combatRange(from.node,to.node,
          DEFINITIONS[c.championId].abilities[c.slot].range):
         c.casterId!==c.targetId))
      throw Error('Cast without physical reach or valid participants');
    }
    commit(model,casts);
   }
   const moment=match.moments?.[i];
   if(!moment?.abilityState||JSON.stringify(snapshot(model))!==
      JSON.stringify(moment.abilityState))
    throw Error('Replay cast ledger diverged');
   const hits=Array.isArray(f.impacts)?f.impacts:
    f.action==='skirmish'?[{hpBefore:f.hpBefore,hpAfter:f.hpAfter,
     damage:f.damage,microSteps:f.microSteps,shieldAbsorbed:f.shieldAbsorbed,
     healed:f.healed,passiveDamage:f.passiveDamage,
     controlSeconds:f.controlSeconds,ttkSeconds:f.ttkSeconds}]:[];
   const offensive=casts.find(c=>c.kind==='damage'||c.kind==='control');
   for(const hit of hits){
    if(!hit.microSteps)continue;
    if(hit.microSteps.length!==5||hit.microSteps.at(-1).hpAfter!==hit.hpAfter)
     throw Error('Micro step HP diverged');
    let hp=hit.hpBefore,shield=hit.shieldAbsorbed||0;
    let gross=0,blockedTotal=0,healedTotal=0,spellTotal=0,passiveTotal=0;
    for(const [second,step] of hit.microSteps.entries()){
     if(step.second!==second||!Number.isSafeInteger(step.basic)||
        !Number.isSafeInteger(step.spell)||!Number.isSafeInteger(step.passive)||
        !Number.isSafeInteger(step.blocked)||!Number.isSafeInteger(step.healed)||
        step.basic<0||step.spell<0||step.passive<0||
        step.blocked<0||step.blocked>shield||step.healed<0||
        (second>0&&step.healed!==0))
      throw Error('Invalid local combat step');
     if(second===0)hp=Math.min(100,hp+step.healed);
     hp=Math.max(0,hp-step.basic-step.spell-step.passive+step.blocked);
     if(hp!==step.hpAfter)throw Error('Forged microstep damage');
     shield-=step.blocked;
     gross+=step.basic+step.spell+step.passive;
     spellTotal+=step.spell;passiveTotal+=step.passive;
     blockedTotal+=step.blocked;healedTotal+=step.healed;
    }
    const fatal=hit.microSteps.find(step=>step.hpAfter===0)?.second;
    if(gross-blockedTotal-healedTotal!==hit.damage||
       blockedTotal!==(hit.shieldAbsorbed||0)||
       healedTotal!==(hit.healed||0)||
       passiveTotal!==(hit.passiveDamage||0)||
       spellTotal!==(offensive?.amount||0)||
       (hit.controlSeconds||0)!==(offensive?.controlSeconds||0)||
       (fatal===undefined?null:fatal+1)!==(hit.ttkSeconds??null))
     throw Error('Cast effect or local TTK diverged from HP ledger');
   }
  }catch(e){errors.push('Champion kit event '+i+': '+e.message)}
 }
 if(JSON.stringify(snapshot(model))!==JSON.stringify(match.abilityState))
  errors.push('Final ability ledger differs from replay');
 return errors;
}
core.ChampionKits=Object.freeze({DEFINITIONS,SLOTS,create,snapshot,projected,
 select,preview,impact,commit,audit});
})(globalThis);
