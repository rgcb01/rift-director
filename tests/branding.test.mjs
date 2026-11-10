import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {boot} from './harness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>readFileSync(root+name,'utf8');
test('all real organization names have unique masters, with no index-based lookup',()=>{
 const {branding:b}=boot();
 const names=JSON.parse(read('game.js').match(/const clubNames=(\[[^;]+\]);/)[1].replace(/'/g,'"'));
 assert.equal(b.catalog.filter(e=>e.category==='club').length,names.length+1);
 for(const name of ['Aurora Esports',...names]){
  const c={name,color:'#71a5fc',id:'c1',logo:0};
  assert.equal(b.resolve(c)?.kind,'club');
  assert.equal(b.club(c),b.club({...c,id:'c998',logo:5,season:8}));
  assert.match(b.club(c),/#71a5fc/);
 }
 assert.equal(new Set(b.catalog.filter(e=>e.category==='club').map(e=>e.motif)).size,23);
 assert.equal(b.resolve({name:'toString'}),null);
 assert.equal(b.resolve({name:'__proto__'}),null);
});
test('36 SVG/PNG assets, 16 symbols and 8 shields match the runtime source',()=>{
 const {branding:b}=boot(),m=JSON.parse(read('assets/branding/branding.json'));
 assert.deepEqual(m.entries,JSON.parse(JSON.stringify(b.catalog)));
 assert.equal(m.entries.length,36);assert.equal(m.symbols.length,16);assert.equal(m.shapes.length,8);
 for(const e of m.entries){
  const svg=read('assets/branding/'+e.asset);
  assert.equal(svg.trim(),b.svg(e.id,256));
  assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
  assert.doesNotMatch(svg,/<script|<image|<foreignObject|onload=|undefined|NaN/);
  assert.match(e.id,/^[a-z0-9_]+$/);
  const png=readFileSync(root+'assets/branding/'+e.png);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[256,256]);
 }
 for(const e of [...m.symbols,...m.shapes])assert.match(read('assets/branding/'+e.asset),/<svg/);
 assert.deepEqual(m.entries.filter(e=>e.futureOnly).map(e=>e.id),['international_champion']);
 assert.equal(m.entries.find(e=>e.id==='liga_boreal').displayName,'Circuito Boreal');
});
test('modular identity preserves selections and name without advancing RNG',()=>{
 const {sim,branding:b}=boot({now:1731111111000});const world=sim.newGame();
 const c=sim.currentClub(),rng=world.rng;
 const options={shape:'bastion',symbol:'raven',primaryColor:'#123456',secondaryColor:'#abcdef',accent:'#fedcba'};
 const before=JSON.stringify(world),identity=b.identity(c,options);
 assert.equal(JSON.stringify(world),before);assert.equal(world.rng,rng);
 assert.deepEqual(JSON.parse(JSON.stringify(identity)),{version:1,...options});
 c.branding=identity;
 const svg=b.club(c);assert.match(svg,/custom_bastion_raven/);
 assert.equal(svg,b.club(JSON.parse(JSON.stringify(c))));
 assert.equal(svg,b.club({...c,id:'different',logo:4}));
 assert.equal(b.club({...c,name:'<script>alert(1)</script>'}).includes('<script>'),false);
 for(const shape of Object.keys(b.shapes))for(const symbol of b.symbols){
  assert.match(b.modular(b.identity(c,{shape,symbol}),c.name,24),/<svg/);
 }
});
test('v2 save/load retains visual identities without migration; legacy fallback is exact',()=>{
 const {sim,core,branding:b,store}=boot({now:1731111111000});const world=sim.newGame('balanced','Custom Legacy');
 const c=sim.currentClub(),legacy=sim.legacyCrest(c);
 assert.equal(sim.crest(c),legacy);
 const old=core.parseWorld(JSON.stringify(world));assert.equal(old.v,2);assert.equal(old.clubs[0].branding,undefined);
 c.branding=b.identity(c,{symbol:'lotus',shape:'round',primaryColor:'#334455'});
 const before=sim.crest(c);sim.save();assert.ok(store.has(core.SAVE_KEY));
 assert.equal(sim.load(),true);assert.equal(sim.crest(sim.currentClub()),before);
 const parsed=core.parseWorld(JSON.stringify(sim.getState()));
 assert.equal(b.club(parsed.clubs.find(x=>x.id===parsed.userClub),46),before);
 assert.deepEqual(Array.from(core.validateWorld(parsed)),[]);
 sim.nextYear();assert.equal(sim.crest(sim.currentClub()),before,'Custom crest must survive season changes');
 c.branding={version:999,shape:'__proto__',symbol:'<script>'};assert.equal(sim.crest(c),legacy);
});
test('competition presentation follows existing phases and never invents a champion',()=>{
 const {sim,branding:b}=boot();sim.newGame();
 assert.equal(sim.championshipPanel(),'');
 assert.equal(b.phase({}),'regular_season');assert.equal(b.phase({playoff:true}),'playoffs');
 assert.equal(b.phase({phase:'semi',playoff:true}),'semifinal');assert.equal(b.phase({phase:'final',playoff:true}),'grand_final');
 const w=sim.getState(),[a,c,d,e]=w.clubs;
 w.playoffs=[{a:a.id,b:c.id,phase:'semi',played:true,winner:a.id},{a:d.id,b:e.id,phase:'semi',played:true,winner:d.id},{a:a.id,b:d.id,phase:'final',played:true,winner:a.id}];w.champion=a.id;
 const before=JSON.stringify(w),html=sim.championshipPanel();
 for(const id of ['rift_championship','playoffs','semifinal','grand_final','league_champion'])assert.ok(html.includes(`data-brand-id="${id}"`));
 assert.ok(!html.includes('international_champion'));assert.equal(JSON.stringify(w),before);
});
