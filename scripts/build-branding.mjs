import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {execFile} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),scope={};
runInNewContext(readFileSync(root+'src/ui/branding.js','utf8'),scope);
const art=scope.RiftBranding,base=root+'assets/branding/';
const run=(...args)=>new Promise((resolve,reject)=>execFile('magick',args,{encoding:'utf8'},(err,out)=>err?reject(err):resolve(out)));
const raster=(source,destination)=>new Promise((resolve,reject)=>execFile('inkscape',[source,'--export-type=png','--export-filename='+destination],{encoding:'utf8'},(err,out)=>err?reject(err):resolve(out)));
const write=(file,text)=>{mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});writeFileSync(file,text+'\n');};
for(const entry of art.catalog){
 write(base+entry.asset,art.svg(entry.id,256));
 mkdirSync(base+'png',{recursive:true});
 // Preserve the wordmark's aspect ratio inside a transparent 256px square.
 await raster(base+entry.asset,base+entry.png);
 await run(base+entry.png,'-resize','256x256','-background','none','-gravity','center','-extent','256x256','-strip',base+entry.png);
}
for(const id of art.symbols)write(base+`symbols/${id}.svg`,art.symbolSVG(id));
for(const id of Object.keys(art.shapes))write(base+`shapes/${id}.svg`,art.shapeSVG(id));
write(base+'branding.json',JSON.stringify({schema:1,style:'Rift Faceted Fantasy — Competitive Edition',pathBase:'assets/branding/',entries:art.catalog,symbols:art.symbols.map(id=>({id,name:art.symbolNames[id],asset:`symbols/${id}.svg`})),shapes:Object.keys(art.shapes).map(id=>({id,name:art.shapeNames[id],asset:`shapes/${id}.svg`}))},null,2));
const escape=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;');
for(const mode of ['dark','light']){
 const bg=mode==='dark'?'#0B1727':'#f1eee7',ink=mode==='dark'?'#e5eaf0':'#192C43';
 let body=`<rect width="1152" height="1056" fill="${bg}"/>`;
 art.catalog.forEach((e,i)=>{
  const x=i%6*192,y=Math.floor(i/6)*176;
  const logo=art.svg(e.id,e.motif==='wordmark'?23:96).replace('<svg ',`<svg x="${x+(e.motif==='wordmark'?22:48)}" y="${y+16}" `);
  body+=logo+`<text x="${x+96}" y="${y+134}" text-anchor="middle" fill="${ink}" font-size="12" font-family="DejaVu Sans">${escape(e.displayName)}</text>`;
  body+=`<text x="${x+96}" y="${y+152}" text-anchor="middle" fill="${ink}" font-size="9" font-family="DejaVu Sans">${e.futureOnly?'ASSET FUTURO':e.id}</text>`;
 });
 const file=root+`docs/art-pack-03/review_${mode}.svg`;
 write(file,`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="1056" viewBox="0 0 1152 1056">${body}</svg>`);
 await raster(file,file.replace('.svg','.png'));
}
write(root+'docs/art-pack-03/review.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rift Director — Art Pack 03</title><style>body{margin:0;font:14px system-ui;background:#0b1727;color:#eee}h1,p{margin:24px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px}.sample{padding:20px;background:#192c43}.light{background:#f1eee7;color:#192c43}.logos{display:flex;align-items:center;gap:18px}.logos img{object-fit:contain}small{display:block;margin-top:12px}</style><h1>Rift Faceted Fantasy — Competitive Edition</h1><p>Maestros originales · 24 / 48 / 96 px · fondos claro y oscuro. El wordmark y el logo completo se usan en cabeceras; para 24 px se utiliza el isotipo.</p><section>${art.catalog.flatMap(e=>['dark','light'].map(mode=>`<article class="sample ${mode}"><b>${escape(e.displayName)}</b><div class="logos">${[24,48,96].map(size=>`<img src="../../assets/branding/${e.asset}" width="${size}" height="${size}" alt="${escape(e.displayName)} a ${size} píxeles">`).join('')}</div><small>${e.id}${e.futureOnly?' · futuro, no jugable':''}</small></article>`)).join('')}</section></html>`);
console.log('Built 36 identity SVGs, 36 PNGs, 16 modular symbols, 8 shields, manifest and light/dark review sheets.');
