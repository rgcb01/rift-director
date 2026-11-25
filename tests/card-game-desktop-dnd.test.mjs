import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,playCard,activate,passTurn} from '../src/card-game/engine.mjs';
import {templateDeck,TACTIC_BY_ID} from '../src/card-game/catalog.mjs';
import {createTutorialMatch} from '../src/card-game/tutorial.mjs';
import {planDrop} from '../src/card-game/drag-rules.mjs';

const fixture=()=>createMatch([templateDeck('siege'),templateDeck('jungle')],{firstPlayer:0,seed:46});
function ensureCard(m,id){
 const p=m.players[m.turn];
 const existing=p.hand.find(c=>c.id===id);
 if(existing)return existing;
 const j=p.deck.findIndex(c=>c.id===id);
 assert.ok(j>=0,'Card missing in template: '+id);
 const c=p.deck.splice(j,1)[0];
 p.hand.unshift(c);
 return c;
}
const cardSource=c=>({kind:'card',uid:c.uid});
const unitSource=(u,side=0)=>({kind:'unit',uid:u.id,side});
const lane=(name,side=1)=>({kind:'lane',lane:name,side});
const unitDest=(u,side)=>({kind:'unit',uid:u.id,side});

test('desktop drop planner plays lane tactics via real engine, no state mutation during hover',()=>{
 const m=fixture(),p=m.players[0],c=ensureCard(m,'wave-push'),before=JSON.stringify(m);
 const plan=planDrop(m,cardSource(c),lane('TOP',1));
 assert.deepEqual(plan,{kind:'play',uid:c.uid,cardId:'wave-push',target:{lane:'TOP'}});
 assert.equal(JSON.stringify(m),before,'Drag inspection cannot mutate the match');
 assert.equal(planDrop(m,cardSource(c),{kind:'base',side:0}),null);
 playCard(m,0,plan.uid,plan.target);
 assert.equal(m.players[0].buffs.TOP,2);
 assert.equal(m.players[0].hand.find(x=>x.uid===c.uid),undefined);
});
test('desktop: defensive, offensive, unit and instant cards target appropriate zones',()=>{
 const m=fixture(),p=m.players[0],enemy=m.players[1],friendly=p.characters.find(u=>u.role==='TOP');
 const guard=ensureCard(m,'line-guard');
 assert.equal(planDrop(m,cardSource(guard),lane('TOP',1)),null);
 assert.deepEqual(planDrop(m,cardSource(guard),lane('TOP',0))?.target,{lane:'TOP'});
 const impact=ensureCard(m,'precise-strike');
 assert.deepEqual(planDrop(m,cardSource(impact),unitDest(enemy.characters[0],1))?.target,{unitId:enemy.characters[0].id});
 assert.equal(planDrop(m,cardSource(impact),unitDest(friendly,0)),null);
 const energy=ensureCard(m,'energy-pulse');
 assert.deepEqual(planDrop(m,cardSource(energy),{kind:'board'})?.target,{});
 assert.deepEqual(planDrop(m,cardSource(energy),lane('BOT',0))?.target,{});
});
test('desktop: dragging allied Riftborn switches rank or sends them back with real actions',()=>{
 const m=fixture(),u=m.players[0].characters.find(x=>x.role==='TOP');
 const swap=planDrop(m,unitSource(u),{kind:'row',side:0,lane:'TOP',rank:'rear'});
 assert.deepEqual(swap,{kind:'activate',unitId:u.id,order:'SWAP_RANK'});
 assert.equal(planDrop(m,unitSource(u),{kind:'row',side:0,lane:'MID',rank:'rear'}),null);
 assert.equal(planDrop(m,unitSource(u),{kind:'row',side:1,lane:'TOP',rank:'rear'}),null);
 activate(m,0,swap.unitId,swap.order);
 assert.equal(m.players[0].characters.find(x=>x.id===u.id).rank,'rear');
 assert.equal(planDrop(m,unitSource(u),{kind:'base',side:0}),null,'Exhausted character cannot Back');
 const other=fixture(),ally=other.players[0].characters.find(x=>x.role==='MID');
 const base=planDrop(other,unitSource(ally),{kind:'base',side:0});
 assert.deepEqual(base,{kind:'activate',unitId:ally.id,order:'BACK'});
 activate(other,0,base.unitId,base.order);
 assert.equal(other.players[0].characters.find(x=>x.id===ally.id).status,'back');
});
test('desktop: drag to different lane consumes existing Rotation card; cannot move for free',()=>{
 const m=fixture(),p=m.players[0],u=p.characters.find(x=>x.role==='TOP');
 // Force the fixture to begin with no rotation in hand.
 p.deck.push(...p.hand.filter(x=>x.effect.type==='ROTATE'));
 p.hand=p.hand.filter(x=>x.effect.type!=='ROTATE');
 assert.equal(planDrop(m,unitSource(u),lane('MID',0)),null);
 const rotation=ensureCard(m,'rotation');
 const move=planDrop(m,unitSource(u),lane('MID',0));
 assert.equal(move.kind,'play');
 assert.equal(move.uid,rotation.uid);
 assert.deepEqual(move.target,{unitId:u.id,lane:'MID'});
 assert.equal(planDrop(m,unitSource(u),lane('MID',1)),null);
 playCard(m,0,move.uid,move.target);
 assert.equal(m.players[0].characters.find(x=>x.id===u.id).lane,'MID');
 assert.equal(m.players[0].characters.find(x=>x.id===u.id).tapped,true);
});
test('desktop: dropping a Rotation card on a friendly unit starts lane targeting',()=>{
 const m=fixture(),c=ensureCard(m,'rotation'),u=m.players[0].characters.find(x=>x.role==='TOP');
 const p=planDrop(m,cardSource(c),unitDest(u,0));
 assert.deepEqual(p,{kind:'select-rotation',uid:c.uid,cardId:'rotation',unitId:u.id});
 assert.equal(planDrop(m,cardSource(c),unitDest(m.players[1].characters[0],1)),null);
 assert.equal(planDrop(m,cardSource(c),unitDest(m.players[0].characters.find(x=>x.role==='JUN'),0)),null);
});
test('desktop: objective drop uses focused lane and real Latido capture',()=>{
 const m=createTutorialMatch(3);
 assert.equal(m.round,4);
 passTurn(m,1);
 const hunt=m.players[0].hand.find(c=>c.id==='hunt');
 const plan=planDrop(m,cardSource(hunt),{kind:'objective',objective:'minor'},{focusLane:'MID'});
 assert.deepEqual(plan.target,{objective:'minor',lane:'MID'});
 assert.equal(planDrop(m,cardSource(hunt),{kind:'objective',objective:'major'}),null);
 playCard(m,0,plan.uid,plan.target);
 passTurn(m,0);
 assert.equal(m.objectives.minor.claimedBy,0);
 assert.equal(m.players[0].permanentPressure.MID,1);
});
test('desktop: out-of-turn, invalid and exhausted actions never create a plan',()=>{
 const m=fixture(),u=m.players[0].characters[0],c=ensureCard(m,'wave-push');
 assert.equal(planDrop(m,unitSource(u,1),lane('MID',1)),null);
 assert.equal(planDrop(m,{kind:'card',uid:'not-in-hand'},lane('TOP',0)),null);
 m.players[0].energy=0;
 assert.equal(planDrop(m,cardSource(c),lane('TOP',0)),null);
 m.players[0].energy=3;
 m.turn=1;
 assert.equal(planDrop(m,cardSource(c),lane('TOP',0)),null);
});
