import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

const dir=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(resolve(dir,'../src/ui/match-tab.js'),'utf8');
const scope={};
for(const file of ['src/core/power-economy.js','src/ui/item-art.js'])runInNewContext(readFileSync(resolve(dir,'..',file),'utf8'),scope);
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
test('ten champion identities render individually faceted silhouettes',()=>{
 const frame={playerStats:{},powerEconomy:{entries:{}}};
 const markup=tab.render({match:{champions},frame,teams});
 assert.equal((markup.match(/aria-label="Campeón /g)||[]).length,10);
 for(const id of tab.CHAMPIONS.map(c=>c.name))assert.ok(markup.includes('Campeón '+id));
 assert.match(markup,/fill="#e4bb85"|fill="#c2d5dc"/);
});
test('historical replays show visual-only champions without altering historical matches',()=>{
 const match={fixture:{a:'a',b:'b'}};
 const original=JSON.stringify(match);
 const html=tab.render({match,frame:{},teams});
 assert.equal((html.match(/class="rift-tab-player"/g)||[]).length,10);
 assert.equal((html.match(/class="rift-tab-portrait-image"/g)||[]).length,10);
 assert.match(html,/Replay histórico/);
 assert.equal(JSON.stringify(match),original);
 for(const p of players){
  assert.equal(tab.championFor(match,p).id,tab.championFor(match,p).id);
 }
});
test('portrait manifest matches catalog, ordered atlas cells and PNG dimensions',()=>{
 const manifest=JSON.parse(readFileSync(resolve(dir,'../assets/champions/atlas.json'),'utf8'));
 assert.deepEqual(manifest.champions.map(c=>c.championId),Array.from(tab.CHAMPIONS,c=>c.id));
 const size=file=>{
  const png=readFileSync(resolve(dir,'..',file));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  return [png.readUInt32BE(16),png.readUInt32BE(20)];
 };
 assert.deepEqual(size(manifest.atlas),[1280,512]);
 for(const [i,c] of manifest.champions.entries()){
  assert.equal(c.name,tab.CHAMPIONS[i].name);
  assert.equal(c.icon64,tab.CHAMPIONS[i].portrait);
  assert.deepEqual([c.x,c.y,c.width,c.height],[i%5*256,Math.floor(i/5)*256,256,256]);
  assert.deepEqual(size(c.icon),[256,256]);
  assert.deepEqual(size(c.icon64),[64,64]);
 }
});
test('TAB renders catalog PNGs while preserving labeled SVG fallbacks and snapshot state',()=>{
 const frame={playerStats:{},powerEconomy:{entries:{}}};
 const before=JSON.stringify({champions,frame,teams});
 const html=tab.render({match:{champions},frame,teams});
 assert.equal((html.match(/class="rift-tab-portrait-image"/g)||[]).length,10);
 for(const p of players){
  assert.ok(html.includes(`src="assets/champions/${champions.entries[p.id]}-64.png"`));
 }
 assert.equal((html.match(/onerror="this.remove\(\)"/g)||[]).length,10);
 assert.equal((html.match(/aria-label="Campeón /g)||[]).length,10);
 assert.equal(JSON.stringify({champions,frame,teams}),before);
});
test('no purchase, unavailable XP, and missing KDA never become invented values',()=>{
 const html=tab.render({match:{champions},frame:{playerStats:{}},teams});
 assert.match(html,/— \/ — \/ —/);
 assert.match(html,/Espacio vacío/);
});
test('historical replay portraits and club identity render together without changing the replay',()=>{
 const match={},frame={playerStats:{}},before=JSON.stringify({match,frame,teams});
 const html=tab.render({match,frame,teams,renderCrest:(team,size)=>`<svg data-club="${team.id}" width="${size}"></svg>`});
 assert.equal((html.match(/data-club=/g)||[]).length,2);
 assert.equal((html.match(/class="rift-tab-portrait-image"/g)||[]).length,10);
 assert.match(html,/Replay histórico/);
 assert.equal(typeof tab.championFor,'function');
 assert.equal(typeof tab.portraitFor,'function');
 assert.equal(JSON.stringify({match,frame,teams}),before);
});

test('0.7.17 shows earned effective stats without inventing historical values',()=>{
 const frame={playerStats:{},powerEconomy:{entries:Object.fromEntries(players.map(p=>[
  p.id,{level:12,items:['boots'],effectiveStats:{maxHp:1723,
   attackDamage:108,armor:65,magicResist:46,attackSpeed:.91,abilityPower:0}}
 ]))}};
 const before=JSON.stringify(frame);
 const html=tab.render({match:{champions},frame,teams});
 assert.equal((html.match(/class="rift-tab-effective"/g)||[]).length,10);
 assert.match(html,/HP 1723/);
 assert.match(html,/DA 108/);
 assert.match(html,/Arm 65/);
 assert.match(html,/RM 46/);
 assert.match(html,/VA 0\.91/);
 assert.equal(JSON.stringify(frame),before,'Spectator must not mutate snapshots');
 const old=tab.render({match:{},frame:{playerStats:{},powerEconomy:{entries:{}}},teams});
 assert.doesNotMatch(old,/rift-tab-effective/,'No fabricated legacy attributes');
});

test('0.7.18 TAB shows earned resources and QWER cooldowns without rewriting history',()=>{
 const frame={minute:22,playerStats:{},
  powerEconomy:{entries:Object.fromEntries(players.map(p=>[p.id,{level:8,items:[]}]))},
  abilityState:{entries:Object.fromEntries(players.map(p=>[p.id,{
   championId:champions.entries[p.id],resource:63,lastAt:21*60,
   cooldowns:{Q:22*60+90,W:0,E:0,R:22*60+15},
   casts:{Q:3,W:1,E:0,R:1}
  }]))}
 };
 const before=JSON.stringify(frame);
 const html=tab.render({match:{champions},frame,teams});
 assert.equal((html.match(/Habilidades y recursos activos/g)||[]).length,10);
 assert.match(html,/Recurso 63\/100/);
 assert.match(html,/Q:1m/);
 assert.match(html,/W:lista/);
 assert.equal(JSON.stringify(frame),before,'TAB may not mutate replay');
 const historical=tab.render({match:{},frame:{minute:20,playerStats:{}},teams});
 assert.doesNotMatch(historical,/Habilidades y recursos activos/);
 const locked=JSON.parse(JSON.stringify(frame));
 for(const p of Object.values(locked.powerEconomy.entries))
  p.effectiveStats={abilityRanks:{Q:1,W:1,E:0,R:0}};
 const lockedUI=tab.render({match:{champions},frame:locked,teams});
 assert.match(lockedUI,/R:bloq\./);
 assert.match(lockedUI,/E:bloq\./);
 assert.match(lockedUI,/Q:1m/);
});
