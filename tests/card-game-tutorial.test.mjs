import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTutorialMatch,TUTORIAL_LESSONS,tutorialStep,tutorialAllows,tutorialCompletedStep} from '../src/card-game/tutorial.mjs';
import {activate,playCard,passTurn} from '../src/card-game/engine.mjs';

const own=(m,id)=>m.players[0].characters.find(u=>u.code===id);
const card=(m,id)=>m.players[0].hand.find(c=>c.id===id);
function settleAfterOneAction(m){
 assert.equal(m.turn,1);
 passTurn(m,1);
 assert.equal(m.turn,0);
 passTurn(m,0);
}
test('tutorial: five independent lessons introduce only one mechanic at a time',()=>{
 assert.equal(TUTORIAL_LESSONS.length,5);
 assert.deepEqual(TUTORIAL_LESSONS.map(x=>x.steps.length),[2,2,3,2,2]);
 for(let i=0;i<TUTORIAL_LESSONS.length;i++){
  const m=createTutorialMatch(i);
  assert.equal(m.version,1);
  assert.equal(m.players[0].characters.length,5);
  assert.equal(m.players[0].hand.length,6);
  assert.equal(m.phase,'tactics');
  assert.ok(TUTORIAL_LESSONS[i].steps.every(s=>s.title&&s.body&&s.tip));
  assert.equal(tutorialStep(i,-1),null);
  assert.equal(tutorialStep(i,TUTORIAL_LESSONS[i].steps.length),null);
 }
});
test('tutorial: map and formation use real activated Riftborn',()=>{
 const m=createTutorialMatch(0),hero=own(m,'hero-centinela');
 const step=tutorialStep(0,0);
 assert.equal(tutorialAllows(step,{kind:'focus',lane:'TOP'}),true);
 assert.equal(tutorialAllows(step,{kind:'focus',lane:'BOT'}),false);
 assert.equal(tutorialCompletedStep(step,{kind:'focus',lane:'TOP'},m),true);
 activate(m,0,hero.id,'SWAP_RANK');
 assert.equal(hero.rank,'front'); // engine commits a validated copy
 assert.equal(own(m,'hero-centinela').rank,'rear');
 assert.equal(tutorialCompletedStep(tutorialStep(0,1),{kind:'order',order:'SWAP_RANK'},m),true);
});
test('tutorial: pressure only harms a tower after a real round resolution',()=>{
 const m=createTutorialMatch(1),c=card(m,'wave-push');
 assert.ok(c);
 assert.equal(m.players[1].towers.TOP,6);
 assert.equal(tutorialAllows(tutorialStep(1,0),{kind:'card',id:'wave-push'}),true);
 assert.equal(tutorialAllows(tutorialStep(1,0),{kind:'card',id:'hunt'}),false);
 playCard(m,0,c.uid,{lane:'TOP'});
 assert.equal(m.players[1].towers.TOP,6);
 assert.equal(tutorialCompletedStep(tutorialStep(1,0),{kind:'card',id:c.id,lane:'TOP'},m),true);
 settleAfterOneAction(m);
 assert.equal(m.round,2);
 assert.ok(m.players[1].towers.TOP<6);
 assert.equal(tutorialCompletedStep(tutorialStep(1,1),{kind:'pass'},m),true);
});
test('tutorial: rotation, back and return are real engine actions, not fake UI',()=>{
 const m=createTutorialMatch(2),rot=card(m,'rotation'),centinela=own(m,'hero-centinela'),arcanista=own(m,'hero-arcanista');
 assert.ok(rot);
 playCard(m,0,rot.uid,{unitId:centinela.id,lane:'MID'});
 assert.equal(own(m,'hero-centinela').lane,'MID');
 assert.equal(own(m,'hero-centinela').tapped,true);
 passTurn(m,1);
 activate(m,0,arcanista.id,'BACK');
 assert.equal(own(m,'hero-arcanista').status,'back');
 assert.equal(own(m,'hero-arcanista').readyRound,3);
 passTurn(m,0);
 assert.equal(m.round,2);
 assert.equal(tutorialCompletedStep(tutorialStep(2,2),{kind:'pass'},m),false);
 passTurn(m,1);passTurn(m,0);
 assert.equal(m.round,3);
 assert.equal(own(m,'hero-arcanista').status,'active');
 assert.equal(own(m,'hero-arcanista').rank,'rear');
 assert.equal(tutorialCompletedStep(tutorialStep(2,2),{kind:'pass'},m),true);
});
test('tutorial: Latido arises naturally in R4 and jungler helps claim it',()=>{
 const m=createTutorialMatch(3),hunt=card(m,'hunt');
 assert.equal(m.round,4);
 assert.equal(m.objectives.minor.active,true);
 assert.ok(hunt);
 assert.equal(m.turn,1); // first player alternates every round
 passTurn(m,1);
 assert.equal(m.turn,0);
 playCard(m,0,hunt.uid,{objective:'minor',lane:'MID'});
 assert.ok(m.players[0].objectivePressure.minor>=4);
 assert.equal(tutorialCompletedStep(tutorialStep(3,0),{kind:'card',id:'hunt',objective:'minor',lane:'MID'},m),true);
 passTurn(m,0);
 assert.equal(m.objectives.minor.claimedBy,0);
 assert.equal(m.players[0].permanentPressure.MID,1);
 assert.equal(tutorialCompletedStep(tutorialStep(3,1),{kind:'pass'},m),true);
});
test('tutorial: last scenario starts with a disclosed breach, and real siege wins',()=>{
 const m=createTutorialMatch(4),c=card(m,'wave-push');
 assert.equal(m.players[1].towers.TOP,0);
 assert.equal(m.players[1].nexus,3);
 playCard(m,0,c.uid,{lane:'TOP'});
 assert.equal(m.players[1].nexus,3);
 settleAfterOneAction(m);
 assert.equal(m.phase,'finished');
 assert.equal(m.winner,0);
 assert.equal(m.players[1].nexus,0);
 assert.equal(tutorialCompletedStep(tutorialStep(4,1),{kind:'pass'},m),true);
});
