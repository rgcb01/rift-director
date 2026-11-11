import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {boot} from './harness.mjs';

const filename=fileURLToPath(new URL('../src/ui/balance-lab.js',import.meta.url));
const env={};
runInNewContext(readFileSync(filename,'utf8'),env,{filename:'balance-lab.js'});
const lab=env.RiftBalanceLab;
const click=(sim,dataset)=>sim.handleClick({target:{closest:()=>({dataset})}});
const change=(sim,key,value)=>sim.handleChange({target:{dataset:{change:'lab-'+key},value}});

test('UX-3 frozen values match released 0.7.14, 0.7.16 and 0.7.17 reports',()=>{
 assert.deepEqual(Array.from(lab.DATA,x=>x.version),['0.7.14','0.7.16','0.7.17']);
 assert.deepEqual(Array.from(lab.DATA,x=>x.samples),[1000,1000,1000]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.mirrored),[1000,1000,1000]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.metrics.duration),[49.28,49.78,49.48]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.metrics.kills),[6.39,6.44,6.50]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.metrics.towers),[4.48,4.72,4.76]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.metrics.comeback),[4.2,4.1,4.6]);
 assert.deepEqual(Array.from(lab.DATA,x=>x.metrics.side),[49.5,49.0,49.5]);
 for(const release of lab.DATA){
  assert.equal(release.metrics.p50,null);
  assert.equal(release.metrics.p90,null);
  assert.match(release.sourceUrl,/^https:\/\/github\.com\/rgcb01\/rift-director\//);
 }
 assert.equal(lab.point('0.7.17','observedTtk'),2.52);
 assert.equal(lab.point('0.7.16','observedTtk'),null);
});

test('UX-3 deltas are directional differences, not fabricated improvement labels',()=>{
 const m=lab.model();
 assert.equal(m.baseline,'0.7.16');
 assert.equal(m.current,'0.7.17');
 assert.equal(m.delta,'−0.30 min');
 assert.equal(lab.difference(4.1,4.6,'comeback'),'+0.5 pp');
 assert.equal(lab.difference(49.0,49.5,'side'),'+0.5 pp');
 assert.equal(lab.difference(6.44,6.50,'kills'),'+0.06 kills/mapa');
 assert.equal(lab.format('p50',null),'No medido');
 assert.equal(lab.difference(null,2.52,'observedTtk'),null);
 assert.equal(lab.model({baseline:'bad',current:'bad',metric:'unknown'}).metric,'duration');
});

test('UX-3 charts, table and attribution identify proxy TTK and missing P50/P90',()=>{
 const html=lab.render();
 assert.match(html,/Laboratorio de balance/);
 assert.match(html,/role="img"/);
 assert.match(html,/No medido ≠ 0/);
 assert.match(html,/No son 2,000 observaciones independientes/);
 assert.match(html,/42755942297/);
 assert.match(html,/42751443138/);
 assert.match(html,/49.48 min/);
 assert.match(html,/−0.30 min/);
 const ttk=lab.render({baseline:'0.7.16',current:'0.7.17',metric:'observedTtk'});
 assert.match(ttk,/NO es tiempo real de combate en segundos/);
 assert.match(ttk,/No comparable/);
 assert.match(ttk,/2.52 min simulados/);
 const p90=lab.render({metric:'p90'});
 assert.match(p90,/No medido en las versiones disponibles/);
 assert.doesNotMatch(p90,/NaN|Infinity|undefined/);
 const equal=lab.render({baseline:'0.7.17',current:'0.7.17'});
 assert.match(equal,/misma versión/);
});

test('UX-3 works before founding a club and never creates a save',()=>{
 const {sim,store,app}=boot({now:1731111111000});
 assert.equal(sim.getState(),null);
 assert.match(app.innerHTML,/data-action="lab-open"/);
 click(sim,{action:'lab-open'});
 assert.equal(sim.getView(),'lab');
 assert.match(app.innerHTML,/Laboratorio de balance/);
 assert.equal(sim.getState(),null);
 change(sim,'baseline','0.7.14');
 assert.match(app.innerHTML,/value="0.7.14" selected/);
 change(sim,'metric','p90');
 assert.match(app.innerHTML,/No medido en las versiones disponibles/);
 assert.equal(store.size,0,'Exploring history must not persist anything');
 click(sim,{action:'lab-close'});
 assert.equal(sim.getView(),'home');
 assert.match(app.innerHTML,/Fundar organización/);
 assert.equal(store.size,0);
});

test('UX-3 from a running career preserves every byte of game state and RNG',()=>{
 const {sim,store,app}=boot({now:1731111111000});
 const world=sim.newGame('balanced','Laboratory QA');
 const before=JSON.stringify(world);
 const rng=world.rng;
 sim.render();
 click(sim,{nav:'lab'});
 assert.equal(sim.getView(),'lab');
 assert.match(app.innerHTML,/Laboratorio de balance/);
 change(sim,'baseline','0.7.14');
 change(sim,'metric','comeback');
 assert.match(app.innerHTML,/data-change="lab-metric"/);
 change(sim,'current','0.7.16');
 assert.match(app.innerHTML,/value="0.7.16" selected/);
 assert.equal(JSON.stringify(world),before);
 assert.equal(world.rng,rng);
 assert.equal(store.size,0,'Comparison must not save');
 click(sim,{nav:'home'});
 assert.equal(sim.getView(),'home');
 assert.equal(JSON.stringify(world),before);
});
