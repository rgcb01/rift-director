import assert from 'node:assert/strict';
import {test} from 'node:test';
import {boot} from './harness.mjs';

const setup=()=>{
 const ctx=boot({now:1731111111000});
 const world=ctx.sim.newGame('balanced','Director QA');
 const fixture=Object.values(world.fixtures).flat().find(f=>[f.a,f.b].includes(world.userClub));
 return {...ctx,world,fixture};
};
const event=(action,minute,extra={})=>({minute,time:String(minute).padStart(2,'0')+':00',teamId:'a',source:'match',facts:{action,...extra}});

test('routine resets, movement, components and minor damage stay in the record',()=>{
 const {core}=setup(),D=core.EventDirector;
 for(const action of ['recall_start','recall_complete','fountain_recovery','return_to_lane','rotation','resource_regen','farm','move'])
  assert.equal(D.classify(event(action,5)),0,action);
 assert.equal(D.classify(event('recall_cancel',5,{interruption:'damage'})),2);
 assert.equal(D.classify(event('recall_cancel',5,{interruption:'movement'})),0);
 assert.equal(D.classify(event('item_purchase',5,{itemId:core.PowerEconomy.COMPONENT_CATALOG[0].id})),1);
 assert.equal(D.classify(event('item_purchase',5,{itemId:core.PowerEconomy.ITEM_CATALOG[0].id})),2);
 assert.equal(D.classify(event('tower_damage',5)),1);
 assert.equal(D.classify(event('lane_trade',5,{combatVersion:1,outcome:'trade'})),1);
 assert.equal(D.classify(event('lane_trade',5,{combatVersion:1,impacts:[{retreat:true,hpAfter:20}]})),2);
});
test('kills, captures and major fights are never suppressed by editorial cooldown',()=>{
 const {core}=setup(),D=core.EventDirector;
 const feed=[event('move',0),event('recall_complete',1),event('plate',2,{plate:1,lane:'MID'}),
  event('plate',3,{plate:1,lane:'MID'}),event('gank',3,{victimIds:['p']}),
  event('gank',3,{victimIds:['q']}),event('dragon',3,{stolen:true}),event('nexus',4)];
 const selected=D.select(feed);
 assert.equal(JSON.stringify(selected.map(e=>e.narrativeVisible)),JSON.stringify([true,false,true,false,true,true,true,true]));
 assert.equal(selected[6].importance,4);
 assert.equal(selected[7].importance,4);
 assert.equal(feed.some(e=>Object.hasOwn(e,'importance')),false);
 // Selection does not depend on future events or outcomes.
 assert.equal(JSON.stringify(D.select(feed.slice(0,4))),JSON.stringify(selected.slice(0,4)));
});
test('live narrative advances to a highlight while every raw moment remains addressable',()=>{
 const {sim,core,world,fixture,store}=setup();
 sim.startDemoMatch();
 const match=sim.getState().live;
 const before=JSON.stringify({events:match.events,frames:match.frames,moments:match.moments,broadcast:match.broadcast});
 const timeline=core.MatchReplay.timeline(match);
 const visible=timeline.filter(x=>x.event.narrativeVisible);
 assert.ok(visible.length<timeline.length);
 assert.equal(timeline[0].event.narrativeVisible,true);
 assert.equal(timeline.at(-1).event.narrativeVisible,true);
 const click=(action,kind)=>sim.handleClick({target:{closest:()=>({dataset:{action,kind}})}});
 let html=sim.renderMatch();
 assert.match(html,/Siguiente destacado/);
 assert.match(html,/Registro completo/);
 click('replay-next-highlight');
 assert.equal(match.replayCursor,visible[1].index);
 assert.equal(match.replayProgress,visible[1].index);
 click('replay-filter','full');
 html=sim.renderMatch();
 for(let i=0;i<=match.replayProgress;i++)
  assert.ok(html.includes('data-index="'+i+'"'));
 assert.equal(sim.seekReplay(match.replayProgress+1),false);
 assert.equal(core.auditBroadcast(match,sim.getState()).length,0);
 assert.equal(core.auditMatch(match,sim.getState()).length,0);
 assert.equal(JSON.stringify({events:match.events,frames:match.frames,moments:match.moments,broadcast:match.broadcast}),before);
 assert.equal(store.size,0);
 sim.exitDemoMatch();
});
test('full replay indices and historical feed count remain stable',()=>{
 const {sim,core,world,fixture}=setup();
 const match=sim.simulateMatch(fixture),feed=core.broadcastFeed(match);
 assert.equal(feed.length,match.events.length+match.broadcast.insights.length);
 assert.equal(core.feedCountAt(match,match.frames.length-1),feed.length);
 for(const e of feed.filter(x=>x.source==='match'))
  assert.equal(e.time,match.events[e.eventIndex].time);
 const first=core.MatchReplay.timeline(match);
 assert.equal(first.length,feed.length);
 assert.equal(core.MatchReplay.nextHighlight(match),first.findIndex((x,i)=>i>0&&x.event.narrativeVisible)===first.length-1);
 assert.equal(core.MatchReplay.seek(match,0),true);
 assert.equal(core.MatchReplay.seek(match,match.replayProgress+1),false);
});

test('group start and real kills remain visible, repeated nonlethal exchanges do not',()=>{
 const D=setup().core.EventDirector;
 const g={id:'25:mid_center',groups:{a:['1','2','3'],b:['4','5','6']}};
 const feed=[event('move',0),event('clash',25,{groupFight:{...g,round:1},combatVersion:1,mode:'teamfight',attackerCount:3,defenderCount:3}),
  event('clash',25,{groupFight:{...g,round:2},combatVersion:1,mode:'teamfight',attackerCount:3,defenderCount:3}),
  event('teamfight',25,{groupFight:{...g,round:3},victimIds:['4']}),
  event('simultaneous_fight',28,{groupFight:{...g,id:'28:baron_pit'},victimIds:[]})];
 const actual=D.select(feed);
 assert.deepEqual(Array.from(actual.map(e=>e.narrativeVisible)),[true,true,false,true,true]);
 for(let i=1;i<=feed.length;i++)assert.equal(JSON.stringify(D.select(feed.slice(0,i))),JSON.stringify(actual.slice(0,i)));
});
