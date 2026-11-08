import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {latestChangelogVersion,compareVersions} from '../benchmarks/version.mjs';
import {evaluate,flatten,bars,generate} from '../benchmarks/report.mjs';

const baseline=JSON.parse(readFileSync('benchmarks/baselines/0.7.6-alpha.json','utf8'));
test('versiones Alpha x.y.z: heading, prefijos y orden numerico',()=>{
 assert.equal(latestChangelogVersion('# Registro\n\n## [Unreleased]\n\n## [0.7.7-alpha] — 2026-11-07'),'0.7.7-alpha');
 assert.ok(compareVersions('0.8.0-alpha','0.7.9-alpha')>0);
 assert.equal(compareVersions('v0.7.7-alpha','0.7.7-alpha'),0);
});
test('baseline real 0.7.6: 1000 simulaciones auditadas sin fallos',()=>{
 assert.equal(baseline.standard.completed,1000);
 assert.equal(baseline.mirror.matches,1000);
 const result=evaluate(baseline,baseline);
 // Initial measurement audited 100 of 1000; new releases audit every game.
 assert.ok(result.failures.every(x=>x.includes('Auditorias')));
 assert.equal(flatten(baseline).blueWinRate,.604);
 assert.equal(flatten(baseline).pairedBlueWinRate,.577);
});
test('detecta regresion severa de objetivos o simetria',()=>{
 const broken=structuredClone(baseline);
 broken.standard.audited=1000;
 broken.standard.objectives.gamesWithoutDragon=950;
 broken.mirror.wins.blue=790;
 broken.mirror.wins.red=210;
 const report=evaluate(broken,baseline);
 assert.ok(report.failures.some(x=>x.includes('Dragon')));
 assert.ok(report.failures.some(x=>x.includes('asimetria')||x.includes('Sesgo')));
});
test('genera un dashboard HTML con graficos SVG sin dependencias',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rift-balance-'));
 try{
  const current=structuredClone(baseline);
  current.standard.audited=1000;
  const r=generate(current,baseline,dir);
  assert.equal(r.failures.length,0);
  for(const name of ['index.html','report.md','duration.svg','kills.svg','sides.svg',
    'objectives.svg','dragon.svg','shutdown.svg','counterplay.svg','towers.svg','strategy.svg','power.svg','previous.svg','regressions.json']){
   assert.ok(existsSync(join(dir,name)),name+' no generado');
  }
  assert.match(readFileSync(join(dir,'duration.svg'),'utf8'),/<svg/);
  assert.match(bars('Test',[{label:'x',value:1}]),/<svg/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('CLI del reporte genera HTML, 11 SVG y JSON desde argumentos relativos',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rift-cli-report-'));
 try{
  const current=structuredClone(baseline);
  current.standard.audited=1000;
  const actual=join(dir,'actual.json'),previous=join(dir,'previous.json');
  writeFileSync(actual,JSON.stringify(current));
  writeFileSync(previous,JSON.stringify(baseline));
  const run=spawnSync(process.execPath,['benchmarks/report.mjs',actual,previous,dir],
    {encoding:'utf8',timeout:20000});
  assert.equal(run.status,0,'Report CLI: '+run.stderr);
  for(const name of ['index.html','report.md','regressions.json','duration.svg','kills.svg',
    'sides.svg','objectives.svg','dragon.svg','shutdown.svg','towers.svg','strategy.svg','power.svg','previous.svg']){
   assert.ok(existsSync(join(dir,name)),name+' ausente en invocacion CLI');
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('la comparación 0.7.8→0.7.9 alerta sobre kills, duración, remontadas y slots saturados',()=>{
 const previous=JSON.parse(readFileSync('benchmarks/baselines/0.7.8-alpha.json','utf8'));
 const current=structuredClone(previous);
 current.version='0.7.9-alpha';
 current.mirror.failures=[];
 current.standard.kills.mean=6.35;
 current.standard.duration.mean=51.5;
 current.standard.gameplay.comebackWins20=25;
 current.standard.gameplay.purchasesPerMatch=26.9;
 const assessment=evaluate(current,previous);
 assert.ok(assessment.warnings.some(x=>x.includes('kills medias')));
 assert.ok(assessment.warnings.some(x=>x.includes('duración media')));
 assert.ok(assessment.warnings.some(x=>x.includes('remontadas')));
 assert.ok(assessment.warnings.some(x=>x.includes('80%')));
});

test('Alpha 0.7.10 compara Dragones contra la versión anterior realmente auditada',()=>{
 const previous=JSON.parse(readFileSync('benchmarks/baselines/0.7.9-alpha.json','utf8'));
 assert.equal(previous.version,'0.7.9-alpha');
 assert.equal(previous.standard.completed,1000);
 assert.equal(previous.mirror.matches,1000);
 assert.equal(previous.standard.objectives.gamesWithoutDragon,425);
 assert.equal(previous.mirror.wins.blue,527);
 const next=structuredClone(previous);
 next.version='0.7.10-alpha';
 next.standard.gameplay.contestedDragonGames=130;
 next.standard.gameplay.contestedDragonsPerMatch=.3;
 next.standard.gameplay.dragonStealsPer100Maps=7;
 next.standard.gameplay.firstDragonMean=15.7;
 next.standard.gameplay.crossmapTradePlatesPerMatch=.8;
 next.standard.gameplay.crossmapTradeTowerGames=100;
 next.mirror.failures=[];
 const result=evaluate(next,previous);
 assert.equal(result.current.contestedDragonRate,.13);
 assert.equal(result.baseline.contestedDragonRate,null);
 assert.equal(result.current.crossmapTowerRate,.1);
 assert.equal(result.baseline.crossmapTowerRate,null);
 assert.equal(result.failures.length,0);
});
