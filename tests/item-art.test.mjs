import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>readFileSync(root+file,'utf8');
function boot(){
 const scope={};
 for(const file of ['src/core/power-economy.js','src/ui/item-art.js','src/ui/match-tab.js'])runInNewContext(read(file),scope);
 return scope;
}
const expected={
 items:'boots blade mantle focus bulwark spellbook arcane_orb spear reaver wardstone sun_charm aegis bow hourglass crystal'.split(' '),
 components:'leather_boots iron_dagger chain_vest oak_shield magic_page mana_orb ruby_shard azure_crystal hunter_string sun_fragment ward_totem bronze_handle tempered_plate focus_lens green_charm'.split(' ')
};
test('Art Pack 2 manifests preserve IDs, order, cells and all export sizes',()=>{
 const {RiftItemArt}=boot();
 const size=file=>{
  const png=readFileSync(root+file);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  return [png.readUInt32BE(16),png.readUInt32BE(20)];
 };
 for(const kind of ['items','components']){
  const m=JSON.parse(read(`assets/inventory/${kind}_atlas.json`));
  assert.deepEqual([m.width,m.height,m.columns,m.rows],[640,384,5,3]);
  assert.deepEqual(m.entries.map(e=>e.id),expected[kind]);
  assert.deepEqual(m.entries,JSON.parse(JSON.stringify(RiftItemArt.catalogs[kind])));
  assert.deepEqual(size(m.entries[0].atlas),[640,384]);
  for(const [i,e] of m.entries.entries()){
   assert.deepEqual([e.x,e.y,e.width,e.height],[i%5*128,Math.floor(i/5)*128,128,128]);
   for(const n of [128,64,32])assert.deepEqual(size(e['icon'+n]),[n,n]);
  }
 }
});
test('active economy names are authoritative; art never registers purchases or components',()=>{
 const scope={};runInNewContext(read('src/core/power-economy.js'),scope);
 const core=scope.RiftCore.PowerEconomy;
 const before=JSON.stringify(core.ITEM_CATALOG);
 runInNewContext(read('src/ui/item-art.js'),scope);
 assert.equal(core,scope.RiftCore.PowerEconomy);
 assert.equal(JSON.stringify(core.ITEM_CATALOG),before);
 assert.deepEqual(Array.from(core.ITEM_CATALOG,e=>e.id),expected.items.slice(0,5));
 for(const item of core.ITEM_CATALOG){
  assert.equal(scope.RiftItemArt.get(item.id).name,item.name);
  assert.equal(scope.RiftItemArt.get(item.id).visualOnly,false);
 }
 assert.ok(scope.RiftItemArt.catalogs.components.every(e=>e.visualOnly));
 assert.ok(scope.RiftItemArt.catalogs.items.slice(5).every(e=>e.visualOnly));
 const renamed={RiftCore:{PowerEconomy:{ITEM_CATALOG:[{id:'boots',name:'Nombre vigente del core'}]}}};
 runInNewContext(read('src/ui/item-art.js'),renamed);
 assert.equal(renamed.RiftItemArt.get('boots').name,'Nombre vigente del core');
});
test('item rendering preserves SVGs, labels, empty slots and unknown item safety',()=>{
 const {RiftMatchTab:tab,RiftItemArt:art}=boot();
 for(const id of expected.items){
  const html=tab.itemSlot(id,0);
  assert.ok(html.includes(`title="${art.get(id).name}"`));
  assert.ok(html.includes(`src="assets/inventory/items/32/${id}.png"`));
  assert.match(html,/<svg/);
  assert.match(html,/onerror="this.remove\(\)"/);
 }
 assert.doesNotMatch(tab.itemSlot(null,0),/<img|<svg/);
 assert.match(tab.itemSlot(null,0),/Espacio vacío/);
 for(const id of ['unknown','toString','__proto__','"><script>']){
  const html=tab.itemSlot(id,0);
  assert.doesNotMatch(html,/<img|<script>/);
  assert.match(html,/Objeto desconocido:/);
 }
 assert.equal(art.image('../missing'), '');
 assert.equal(art.get('boots','__proto__'),undefined);
 assert.match(art.image('leather_boots','components'),/components\/32\/leather_boots.png/);
});
test('missing optional art script still renders all legacy SVG item fallbacks',()=>{
 const scope={};runInNewContext(read('src/ui/match-tab.js'),scope);
 for(const id of expected.items.slice(0,5)){
  assert.match(scope.RiftMatchTab.itemSlot(id,0),/<svg/);
  assert.doesNotMatch(scope.RiftMatchTab.itemSlot(id,0),/<img/);
 }
});
test('Pages loads the presentation catalog after economy and before its consumers',()=>{
 const html=read('index.html');
 const names=['src/core/power-economy.js','src/ui/item-art.js','src/ui/match-tab.js','game.js'];
 const positions=names.map(name=>html.indexOf(`src="${name}"`));
 assert.ok(positions.every((position,i)=>position>=0&&(i===0||position>positions[i-1])));
});
