/* Neutral monster HP ledger. Each strategic minute has three sampled
 * five-second attack windows. No capture/steal RNG, remote damage or
 * free rewards; actual last hit owns the kill. No champion damage yet.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const RULES=Object.freeze({dragon:Object.freeze({hp:4200,armor:45,respawn:5,first:5}),baron:Object.freeze({hp:9600,armor:75,respawn:7,first:20})});
const COOLDOWN=90,WINDOW=5;
function create(){
 return {version:1,monsters:Object.fromEntries(Object.entries(RULES).map(([kind,r])=>[kind,{spawn:r.first,hp:r.hp,initiator:null,lastAttack:null}])),smiteReady:{}};
}
function snapshot(s){return {version:1,monsters:Object.fromEntries(Object.entries(s.monsters).map(([k,v])=>[k,{...v}])),smiteReady:{...s.smiteReady}};}
const active=p=>p.alive&&!['retreat','recall_channel','recall_recover','shop_recall','dead','siege_return'].includes(p.intent);
function observe({kind,nav,dead,health,powerState,minute}){
 const catalog=[...core.PowerEconomy.ITEM_CATALOG,...core.PowerEconomy.COMPONENT_CATALOG],node=kind+'_pit';
 return [nav.a,nav.b].flatMap(team=>core.Navigation.participants(nav,team,node,1))
  .filter(p=>active(p)&&(dead[p.id]||0)<=minute&&(health[p.id]??0)>=31)
  .map(p=>{
   const row=powerState.entries[p.id],s=core.ChampionScaling.effective(row,catalog);
   if(!s)throw Error('Missing objective champion stats '+p.id);
   return {id:p.id,teamId:p.teamId,role:p.role,node:p.node,hp:health[p.id],level:s.level,
    attackDamage:s.attackDamage,attackSpeed:s.attackSpeed};
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
function step({state,kind,minute,players}){
 const rule=RULES[kind],before=state.monsters[kind];
 if(!rule||!before||!Number.isSafeInteger(minute)||minute<before.spawn)throw Error('Objective not spawned');
 if(new Set(players.map(p=>p.id)).size!==players.length||players.some(p=>!Number.isFinite(p.attackDamage)||p.attackDamage<=0||
   !Number.isFinite(p.attackSpeed)||p.attackSpeed<=0||p.hp<31||!core.Navigation.at({agents:{[p.id]:{...p,alive:true}}},p.id,kind+'_pit',1)))
  throw Error('Invalid objective attackers');
 const next=snapshot(state),row=next.monsters[kind],packets=[];
 const groups={};for(const p of players)(groups[p.teamId]??=[]).push(p);
 const attackers=players.filter(p=>groups[p.teamId].length>=2);
 const count=team=>groups[team]?.length||0;
 const attackOrder=attackers.slice().sort((a,b)=>b.attackSpeed-a.attackSpeed||a.id.localeCompare(b.id));
 let capture=null,reset=0;
 if(!attackers.length){
  // No group maintaining aggro: restore 25% max HP per quiet minute.
  reset=Math.min(rule.hp-row.hp,Math.ceil(rule.hp*.25));row.hp+=reset;
  if(row.hp===rule.hp){row.initiator=null;row.lastAttack=null;}
 }else{
  row.initiator??=attackOrder[0].teamId;
  row.lastAttack=minute;
  const hit=(p,type,raw,at)=>{
   const hpBefore=row.hp,damage=Math.min(raw,row.hp);row.hp-=damage;
   packets.push({actorId:p.id,teamId:p.teamId,type,at,raw,damage,before:hpBefore,after:row.hp});
   if(type==='smite')next.smiteReady[p.id]=at+COOLDOWN;
   if(row.hp===0){
    const participants=players.filter(q=>q.teamId===p.teamId&&(q.id===p.id||packets.some(h=>h.actorId===q.id))).map(q=>q.id);
    capture={teamId:p.teamId,actorId:p.id,participantIds:[p.id,...participants.filter(id=>id!==p.id)],
     initiatorTeamId:row.initiator,stolen:type==='smite'&&p.teamId!==row.initiator&&count(row.initiator)>=2,smite:type==='smite'};
   }
  };
  for(let w=0;w<3&&!capture;w++){
   const at=minute*60+44+w*WINDOW;
   // A solo opposing JUN may execute a low-HP monster, not start one.
   const execute=()=>{
    const ready=players.filter(p=>p.role==='JUN'&&(next.smiteReady[p.id]||0)<=at&&
     (count(p.teamId)>=2||p.teamId!==row.initiator)&&row.hp<=Math.min(900,450+p.level*25))
     .sort((a,b)=>b.level-a.level||b.attackSpeed-a.attackSpeed||a.id.localeCompare(b.id))[0];
    if(ready)hit(ready,'smite',Math.min(900,450+ready.level*25),at);
   };
   execute();
   for(const p of attackOrder){
    if(capture)break;
    const raw=Math.max(1,Math.floor(p.attackDamage*Math.max(1,Math.floor(p.attackSpeed*WINDOW))/(1+rule.armor/100)));
    hit(p,'attack',raw,at);
    if(!capture)execute();
   }
  }
  if(capture){row.spawn=minute+rule.respawn;row.hp=rule.hp;row.initiator=null;row.lastAttack=null;}
 }
 return {state:next,receipt:{version:1,kind,minute,spawn:before.spawn,before:before.hp,players:players.map(p=>({...p})),packets,reset,
  after:capture?0:row.hp,capture}};
}
function audit(match){
 const errors=[];let state=create();
 if(match.neutralHpVersion!==1)return errors;
 for(const fr of match.frames){
  const entries=fr.neutralHp?.receipts||[];
  const expectedKinds=Object.keys(RULES).filter(k=>fr.minute>=state.monsters[k].spawn);
  if(JSON.stringify(entries.map(x=>x.receipt.kind))!==JSON.stringify(expectedKinds))errors.push('Missing neutral HP tick '+fr.minute);
  for(const {eventIndex,receipt:r} of entries){
   try{
    const prior=match.moments[eventIndex-1],same=prior?.minute===fr.minute;
    const pre=same?prior.navigation.after:fr.navigation.before;
    if(eventIndex>fr.eventsCount||eventIndex<(match.frames.find(f=>f.minute===fr.minute-1)?.eventsCount||0))throw Error('Invalid objective event cursor');
    if(same){
     const nav={a:match.fixture.a,b:match.fixture.b,agents:Object.fromEntries(Object.entries(pre).map(([id,a])=>[id,{...a,id}]))};
     const expectedPlayers=observe({kind:r.kind,nav,dead:{},health:prior.health,powerState:prior.powerEconomy,minute:fr.minute});
     if(JSON.stringify(expectedPlayers)!==JSON.stringify(r.players))throw Error('Objective attacker set differs from physical snapshot');
    }
    for(const p of r.players){
     const a=pre[p.id];
     if(!a?.alive||a.teamId!==p.teamId||a.role!==p.role||a.node!==p.node||!active(a)||
        same&&prior.health[p.id]!==p.hp)throw Error('Invalid objective physical attacker '+p.id);
     if(same){
      const stats=core.ChampionScaling.effective(prior.powerEconomy.entries[p.id],[...core.PowerEconomy.ITEM_CATALOG,...core.PowerEconomy.COMPONENT_CATALOG]);
      if(!stats||stats.level!==p.level||stats.attackDamage!==p.attackDamage||stats.attackSpeed!==p.attackSpeed)throw Error('Invalid objective damage stats '+p.id);
     }
    }
    const result=step({state,kind:r.kind,minute:fr.minute,players:r.players});
    if(JSON.stringify(result.receipt)!==JSON.stringify(r))throw Error('Invalid objective damage receipt');
    if(r.capture){
     const ev=match.events[eventIndex],c=r.capture,f=ev?.facts;
     if(ev?.minute!==fr.minute||ev.teamId!==c.teamId||f?.action!==r.kind||f.objectiveVersion!==3||
      f.actorId!==c.actorId||JSON.stringify(f.participantIds)!==JSON.stringify(c.participantIds)||
      f.stolen!==c.stolen||f.smite!==c.smite||f.smiteBy!==(c.smite?c.actorId:null)||f.initiatorTeamId!==c.initiatorTeamId)
       throw Error('Capture not backed by actual last hit');
    }
    state=result.state;
   }catch(e){errors.push(e.message+' '+fr.minute);}
  }
  if(JSON.stringify(fr.neutralHp?.state)!==JSON.stringify(state))errors.push('Neutral HP state mismatch '+fr.minute);
  const captures=match.events.slice(match.frames.find(f=>f.minute===fr.minute-1)?.eventsCount||0,fr.eventsCount).filter(e=>['dragon','baron'].includes(e.facts?.action));
  if(captures.length!==entries.filter(x=>x.receipt.capture).length)errors.push('Unbacked neutral capture '+fr.minute);
 }
 return errors;
}
core.NeutralHealth=Object.freeze({RULES,COOLDOWN,create,snapshot,observe,step,audit});
})(globalThis);
