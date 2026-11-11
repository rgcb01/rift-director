import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {boot} from './harness.mjs';

const path=fileURLToPath(new URL('../src/ui/club-command.js',import.meta.url));
const context={};
runInNewContext(readFileSync(path,'utf8'),context);
const presenter=context.RiftClubCommand;
const input=(updates={})=>({
 dateLabel:'Enero 2027',cash:1200000,cashLabel:'$1.2M',payroll:115000,payrollLabel:'$115k',
 planCost:5000,planCostLabel:'$5k',sponsorLabel:'$121k',
 pendingFixtures:0,matchRunning:false,playoffsPending:false,crisis:false,over:false,
 contentBlocks:1,communityBlocks:0,sponsorRequirement:'content',usedBlocks:6,strategy:'Equilibrado',
 ...updates
});
const setup=()=>{
 const t=boot({now:1731111111000});
 const world=t.sim.newGame('balanced','Club UX QA');
 return {...t,world};
};
const click=(sim,action)=>sim.handleClick({target:{closest:()=>({dataset:{action}})}});

test('UX-2 model: crisis takes priority, match blocks closing and ready state is actionable',()=>{
 let status=presenter.model(input({crisis:true,pendingFixtures:2}));
 assert.equal(status.canClose,false);
 assert.equal(status.lead.value,'crisis');
 assert.equal(status.lead.key,'action');
 status=presenter.model(input({matchRunning:true}));
 assert.equal(status.canClose,false);
 assert.equal(status.lead.value,'match');
 status=presenter.model(input({pendingFixtures:1}));
 assert.equal(status.canClose,false);
 assert.match(status.lead.title,/Preparar/);
 status=presenter.model(input({playoffsPending:true}));
 assert.equal(status.canClose,false);
 status=presenter.model(input());
 assert.equal(status.canClose,true);
 assert.equal(status.lead.value,'close-month');
});

test('UX-2 financial and sponsor warnings report known amounts, no invented forecast',()=>{
 const state=presenter.model(input({cash:50000,contentBlocks:0}));
 assert.equal(state.outstanding,'contenido');
 assert.ok(state.priorities.some(x=>/patrocinador/i.test(x.title)));
 assert.ok(state.priorities.some(x=>/liquidez/i.test(x.title)));
 const html=presenter.render(input({cash:50000,contentBlocks:0}));
 assert.match(html,/Falta asignar al menos un bloque de contenido/);
 assert.match(html,/Coste adicional de agenda \(estimado\)/);
 assert.match(html,/no una previsión de beneficio/);
 assert.match(html,/href="#club-agenda"/);
 assert.doesNotMatch(html,/probabilidad de victoria|ganancia proyectada/i);
});

test('UX-2 integrated home is read-only and month close is disabled during crisis',()=>{
 const {sim,app,store,world}=setup();
 world.crisis={amount:120000};
 world.plan.content=0;
 const original=JSON.stringify(world);
 sim.render();
 assert.match(app.innerHTML,/TU SIGUIENTE DECISIÓN/);
 assert.match(app.innerHTML,/Resolver la crisis comercial/);
 assert.match(app.innerHTML,/data-action="close-month" disabled/);
 assert.match(app.innerHTML,/id="club-agenda"/);
 assert.match(app.innerHTML,/id="club-strategy"/);
 assert.match(app.innerHTML,/Compromiso con el patrocinador/);
 assert.equal(JSON.stringify(world),original,'Render is not allowed to mutate save or RNG');
 assert.equal(store.size,0,'Rendering cannot persist state');
 click(sim,'crisis');
 assert.match(app.innerHTML,/DECISIÓN EJECUTIVA · CRISIS/);
});

test('UX-2 planned match routes to preparation; a cleared month can advance',()=>{
 const {sim,app,world}=setup();
 const pending=Object.entries(world.fixtures).find(([,items])=>
  items.some(f=>!f.played&&[f.a,f.b].includes(world.userClub)));
 assert.ok(pending,'Need a genuine future scheduled match');
 world.month=Number(pending[0]);
 sim.render();
 assert.match(app.innerHTML,/Preparar el próximo encuentro/);
 assert.match(app.innerHTML,/data-action="close-month" disabled/);
 for(const fixtures of Object.values(world.fixtures))for(const f of fixtures){
  if([f.a,f.b].includes(world.userClub))f.played=true;
 }
 world.playoffs=[];
 world.crisis=null;
 world.live=null;
 sim.render();
 assert.match(app.innerHTML,/Cerrar el mes y avanzar/);
 assert.match(app.innerHTML,/data-action="close-month">Cerrar el mes y avanzar/);
 assert.doesNotMatch(app.innerHTML,/data-action="close-month" disabled/);
});
