import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

const dir=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(resolve(dir,'../src/ui/match-tab.js'),'utf8');
const scope={};
runInNewContext(source,scope);
const tab=scope.RiftMatchTab;
const roles=['TOP','JUN','MID','ADC','SUP'];
const team=(id,side)=>({id,name:side,players:roles.map((role,i)=>({id:id+'-'+i,role,name:side+' <'+role+'>'}))});
const teams=[team('a','Blue'),team('b','Red')];
const players=teams.flatMap(t=>t.players);
const champions=tab.assign(players);

test('ten original champion definitions and deterministic assignments for ten professionals',()=>{
 assert.equal(tab.CHAMPIONS.length,10);
 assert.equal(Object.keys(champions.entries).length,10);
 assert.deepEqual(JSON.parse(JSON.stringify(champions)),JSON.parse(JSON.stringify(tab.assign(players))));
 for(const p of players){
  const champ=tab.CHAMPIONS.find(x=>x.id===champions.entries[p.id]);
  assert.equal(champ?.role,p.role);
 }
});
test('match tab represents precisely the snapshot, six item slots, and escapes player text',()=>{
 const frame={
  playerStats:Object.fromEntries(players.map(p=>[p.id,{kills:2,deaths:1,assists:3}])),
  powerEconomy:{entries:Object.fromEntries(players.map(p=>[p.id,{level:13,items:['boots','blade'] }]))}
 };
 const html=tab.render({match:{champions},frame,teams});
 assert.equal((html.match(/class="rift-tab-player"/g)||[]).length,10);
 assert.equal((html.match(/class="tab-item /g)||[]).length,60);
 assert.match(html,/Veyra|Sereth/);
 assert.match(html,/Nivel/);
 assert.match(html,/2 \/ 1 \/ 3/);
 assert.match(html,/Botas de desplazamiento/);
 assert.doesNotMatch(html,/<TOP>/);
 assert.match(html,/&lt;TOP&gt;/);
});
test('item catalogue exposes 15 original icons and real stat metadata',()=>{
 assert.equal(Object.keys(tab.ITEMS).length,15);
 for(const item of Object.values(tab.ITEMS))assert.ok(Object.keys(item.stats).length>0);
});
test('historical replay without champion assignments has no synthetic champions',()=>{
 assert.equal(tab.render({match:{},frame:{},teams}), '');
});
test('no purchase, unavailable XP, and missing KDA never become invented values',()=>{
 const html=tab.render({match:{champions},frame:{playerStats:{}},teams});
 assert.match(html,/— \/ — \/ —/);
 assert.match(html,/Espacio vacío/);
});
