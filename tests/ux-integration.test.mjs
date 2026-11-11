import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {boot} from './harness.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFileSync(root+name,'utf8');
const click=(sim,dataset)=>sim.handleClick({target:{closest:()=>({dataset})}});
const change=(sim,key,value)=>sim.handleChange({target:{dataset:{change:'lab-'+key},value}});

test('UX integrated: all four modules/scripts and version are loaded exactly once',()=>{
 const html=read('index.html');
 for(const name of ['src/ui/club-command.js','src/ui/balance-lab.js','game.js']){
  const script='<script src="'+name+'"></script>';
  assert.equal(html.split(script).length-1,1,'Missing or duplicate script '+name);
 }
 assert.ok(html.indexOf('src/ui/club-command.js')<html.indexOf('game.js'));
 assert.ok(html.indexOf('src/ui/balance-lab.js')<html.indexOf('game.js'));
 assert.match(html,/Alpha 0\.7\.17/);
 const js=read('game.js');
 for(const action of ['replay-prev','replay-latest','replay-filter','match-toggle-roster']){
  assert.match(js,new RegExp("case '"+action+"'"));
 }
 assert.match(js,/RiftClubCommand\.render/);
 assert.match(js,/RiftBalanceLab\.render/);
});

test('UX integrated: guest balance lab, then career dashboard, then spectator mode',()=>{
 const {sim,store,app}=boot({now:1731111111000});
 assert.equal(sim.getState(),null);
 click(sim,{action:'lab-open'});
 assert.equal(sim.getView(),'lab');
 change(sim,'metric','p90');
 assert.match(app.innerHTML,/No medido en las versiones disponibles/);
 click(sim,{action:'lab-close'});
 assert.equal(store.size,0,'Guest must never save');

 const world=sim.newGame('balanced','Integrated QA');
 const rng=world.rng;
 sim.render();
 assert.match(app.innerHTML,/TU SIGUIENTE DECISIÓN/);
 assert.match(app.innerHTML,/data-nav="lab"/);
 assert.match(app.innerHTML,/id="club-agenda"/);
 assert.match(app.innerHTML,/data-action="close-month" disabled/);
 click(sim,{nav:'lab'});
 change(sim,'metric','kills');
 assert.match(app.innerHTML,/Eliminaciones por mapa/);
 assert.equal(world.rng,rng);
 assert.equal(store.size,0);

 click(sim,{nav:'match'});
 click(sim,{action:'demo-start'});
 assert.equal(sim.getDemoActive(),true);
 const match=sim.renderMatch();
 for(const action of ['replay-prev','replay-latest','replay-filter','match-toggle-roster']){
  assert.match(match,new RegExp('data-action="'+action+'"'));
 }
 assert.match(match,/match-center-stage/);
 assert.doesNotMatch(app.innerHTML,/data-nav="lab"/,'Demo stays inside spectator area');
 click(sim,{action:'demo-exit'});
 assert.equal(sim.getDemoActive(),false);
 assert.equal(world.rng,rng);
 assert.equal(store.size,0);
});

test('UX integrated: replay controls, filters and roster toggles are non-destructive',()=>{
 const {sim,store}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Integrated Replay QA');
 const before=JSON.stringify(world);
 sim.startDemoMatch();
 let html=sim.renderMatch();
 assert.match(html,/aria-expanded="false"/);
 click(sim,{action:'match-toggle-roster'});
 click(sim,{action:'replay-filter',kind:'combat'});
 html=sim.renderMatch();
 assert.match(html,/data-action="match-toggle-roster" aria-expanded="true"/);
 assert.match(html,/data-action="replay-filter" data-kind="combat" aria-pressed="true"/);
 click(sim,{action:'replay-next'});
 click(sim,{action:'replay-prev'});
 assert.equal(sim.getState().live.replayCursor,0);
 sim.exitDemoMatch();
 assert.equal(JSON.stringify(world),before);
 assert.equal(store.size,0);
});
