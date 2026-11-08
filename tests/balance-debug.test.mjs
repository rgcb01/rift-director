import {test} from 'node:test';
import {boot} from './harness.mjs';
test('diagnosticar asedio detenido en 76',()=>{
 const x=boot({now:1731111111000}),world=x.sim.newGame('balanced','Caster QA');
 const f=Object.values(world.fixtures).flat().find(f=>f.a===world.userClub||f.b===world.userClub);
 for(const seed of [98*37771,138*26171,54*14603]){
  world.rng=seed;const m=x.sim.simulateMatch(f),last=m.frames.at(-1);
  const finalNodes=Object.values(last.navigation.after).map(p=>({team:p.teamId,role:p.role,node:p.node,goal:p.goal,intent:p.intent}));
  console.log('SIEGE_DIAGNOSTIC='+JSON.stringify({seed,winner:m.winner,
   teamA:f.a,teamB:f.b,minute:last.minute,stage:Object.fromEntries([f.a,f.b].map(id=>[id,m.events.filter(e=>e.facts?.action==='tower'&&e.teamId===id).length])),
   wave:Object.fromEntries(Object.entries(last.laneEconomy.lanes).map(([lane,state])=>[lane,{front:state.front,plates:state.plates}])),
   nodes:finalNodes,tail:m.events.slice(-5).map(e=>({minute:e.minute,title:e.title,action:e.facts?.action,team:e.teamId})),
   totalEvents:m.events.length,firstTower:last.laneEconomy.firstTower}));
 }
});
