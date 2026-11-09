import {execFile} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const root=fileURLToPath(new URL('../',import.meta.url));
const run=(...args)=>new Promise((resolve,reject)=>execFile('magick',args,{encoding:'utf8'},(err,out)=>err?reject(err):resolve(out)));
const scope={};
for(const file of ['src/core/power-economy.js','src/ui/item-art.js'])runInNewContext(readFileSync(root+file,'utf8'),scope);
// Boundaries measured on the generated sources, not assumed to be equal pixels.
// Both source sheets share this layout. Final cells are exactly 128px square.
const columns=[0,324,648,972,1296,1619],rows=[0,323,633,971];
mkdirSync(root+'docs/art-pack-2',{recursive:true});
for(const kind of ['items','components']){
 const source=root+`assets/inventory/source/${kind}.png`;
 const dimensions=(await run('identify','-format','%wx%h',source)).trim();
 if(dimensions!=='1619x971')throw Error('Source changed; remeasure crop boundaries: '+source);
 for(const dir of ['', '/64','/32'])mkdirSync(root+`assets/inventory/${kind}${dir}`,{recursive:true});
 const entries=scope.RiftItemArt.catalogs[kind];
 for(const [i,item] of entries.entries()){
  const col=i%5,row=Math.floor(i/5),x=columns[col]+2,y=rows[row]+2;
  const w=columns[col+1]-columns[col]-4,h=rows[row+1]-rows[row]-4;
  await run(source,'-crop',`${w}x${h}+${x}+${y}`,'+repage','-filter','Lanczos','-resize','128x128!','-alpha','off','-strip',root+item.icon128);
  for(const size of [64,32])await run(root+item.icon128,'-filter','Lanczos','-resize',`${size}x${size}`,'-strip',root+item['icon'+size]);
 }
 await run('-size','640x384','xc:#101b28',...entries.flatMap(e=>[root+e.icon128,'-geometry',`+${e.x}+${e.y}`,'-composite']),'-strip',root+`assets/inventory/${kind}_atlas.png`);
 // Manifest paths are relative to the game root, like the champion pack.
 writeFileSync(root+`assets/inventory/${kind}_atlas.json`,JSON.stringify({schema:1,width:640,height:384,columns:5,rows:3,entries},null,2)+'\n');
 for(const size of [32,24])await run('-size',`${5*size}x${3*size}`,'xc:#101b28',...entries.flatMap((e,i)=>['(',root+e.icon32,'-resize',`${size}x${size}`,')','-geometry',`+${i%5*size}+${Math.floor(i/5)*size}`,'-composite']),'-strip',root+`docs/art-pack-2/${kind}-${size}.png`);
}
console.log('Built two 640x384 atlases, two manifests, 90 individual PNGs and compact previews.');
