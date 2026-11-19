/* Bounded encounter lifecycle: successive authoritative combat slices
 * share an ID, but each minute rechecks current physical participants.
 * Existing HP/cast/economy ledgers remain the source of truth.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const MAX_MINUTES=3;
const large=g=>Object.values(g.groups).every(ids=>ids.length>=3);
function pick({nav,world,minute,scan,players,health,powerState,abilityState,continuationOnly=false,previous=-10}){
 if(minute<22||minute>55)return null;
 const events=world.events||[];
 const previousEvent=events.findLast(e=>e.facts?.simultaneous?.encounter);
 const old=previousEvent?.facts?.simultaneous?.encounter;
 const eligible=scan.filter(g=>['dragon_pit','baron_pit'].includes(g.zone)&&Object.values(g.groups).every(ids=>ids.length>=2));
 const options=[];
 for(const g of eligible){
  const continuing=old&&previousEvent.minute===minute-1&&old.zone===g.zone&&minute-old.started<MAX_MINUTES&&
   [nav.a,nav.b].every(team=>g.groups[team].some(id=>old.groups[team].includes(id)&&previousEvent.facts.simultaneous.final.state.players[id]?.alive));
  if(continuationOnly&&!continuing||!continuationOnly&&continuing)continue;
  if(!continuing&&(large(g)||minute-previous<3))continue;
  const spawn=g.zone==='dragon_pit'?world.nextDragon:world.nextBaron;
  // A captured objective ends this encounter. No fighting the old spawn.
  if(!Number.isFinite(spawn)||spawn>minute||continuing&&old.spawn!==spawn)continue;
  const assessment=core.EngagePolicy.evaluate({nav,group:g,minute,players,health,powerState,abilityState,world});
  if(!assessment.firstTeam)continue;
  if(!continuing&&!assessment.decisions.some(d=>d.evidence.objective&&['engage','contest'].includes(d.action)))continue;
  const priorIds=continuing?Object.values(old.groups).flat():[];
  const ids=Object.values(g.groups).flat(),isLarge=large(g);
  const encounter={version:1,id:continuing?old.id:minute+':'+g.zone,zone:g.zone,spawn,
   started:continuing?old.started:minute,minute,slice:continuing?old.slice+1:1,
   firstTeam:assessment.firstTeam,groups:g.groups,
   joinedIds:continuing?ids.filter(id=>!priorIds.includes(id)).sort():[],
   groupRound:(continuing?old.groupRound:0)+Number(isLarge)};
  options.push({zone:g.zone,groups:g.groups,firstTeam:assessment.firstTeam,encounter});
 }
 return options.sort((a,b)=>Object.values(b.groups).flat().length-Object.values(a.groups).flat().length||a.zone.localeCompare(b.zone))[0]||null;
}
function audit(match){
 const errors=[],seen=new Map();
 for(const e of match.events||[]){
  const p=e.facts?.simultaneous,x=p?.encounter;if(!x)continue;
  const prev=seen.get(x.id),ids=Object.values(x.groups).flat(),isLarge=large(x);
  const teams=[match.fixture.a,match.fixture.b];
  if(x.version!==1||x.id!==x.started+':'+x.zone||x.minute!==e.minute||x.zone!==p.zone||
     x.spawn>x.minute||x.minute-x.started>=MAX_MINUTES||x.slice<1||x.slice>MAX_MINUTES||
     !teams.includes(x.firstTeam)||x.firstTeam!==e.teamId||teams.some(t=>!x.groups[t]||x.groups[t].length<2||x.groups[t].length>5)||
     new Set(ids).size!==ids.length||JSON.stringify(ids)!==JSON.stringify(Object.keys(p.initial.state.players))||
     ids.some(id=>!x.groups[p.initial.state.players[id].teamId]?.includes(id)))
   errors.push('Invalid persistent encounter header '+e.minute);
  const joined=prev?ids.filter(id=>!Object.values(prev.encounter.groups).flat().includes(id)).sort():[];
  if(JSON.stringify(joined)!==JSON.stringify(x.joinedIds)||x.groupRound!==(prev?.encounter.groupRound||0)+Number(isLarge)||
     (!prev&&(x.slice!==1||x.started!==e.minute||isLarge))||
     (prev&&(x.slice!==prev.encounter.slice+1||e.minute!==prev.minute+1||x.spawn!==prev.encounter.spawn||
      teams.some(t=>!x.groups[t].some(id=>prev.encounter.groups[t].includes(id)&&prev.final.state.players[id]?.alive)))))
   errors.push('Invalid persistent encounter continuity '+e.minute);
  seen.set(x.id,p);
 }
 return errors;
}
core.PersistentEncounter=Object.freeze({MAX_MINUTES,large,pick,audit});
})(globalThis);
