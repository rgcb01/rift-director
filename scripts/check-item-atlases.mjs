import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const run=(...args)=>new Promise((resolve,reject)=>execFile('magick',args,{encoding:'buffer',maxBuffer:4000000},(err,out)=>err?reject(err):resolve(out)));
const scope={};
for(const file of ['src/core/power-economy.js','src/ui/item-art.js'])runInNewContext(readFileSync(root+file,'utf8'),scope);
for(const kind of ['items','components']){
 const manifest=JSON.parse(readFileSync(root+`assets/inventory/${kind}_atlas.json`));
 assert.deepEqual(manifest.entries,JSON.parse(JSON.stringify(scope.RiftItemArt.catalogs[kind])));
 assert.equal((await run('identify','-format','%wx%h',root+manifest.entries[0].atlas)).toString(),'640x384');
 for(const e of manifest.entries){
  for(const size of [128,64,32])assert.equal((await run('identify','-format','%wx%h %[opaque]',root+e['icon'+size])).toString().toLowerCase(),`${size}x${size} true`);
  const cell=await run(root+e.atlas,'-crop',`128x128+${e.x}+${e.y}`,'+repage','-depth','8','rgb:-');
  assert.deepEqual(cell,await run(root+e.icon128,'-depth','8','rgb:-'),`${kind}/${e.id}: atlas mismatch`);
 }
}
console.log('PASS: 30 IDs/names, 90 PNG sizes/opacity, both atlases and all 30 pixel-identical cells.');
