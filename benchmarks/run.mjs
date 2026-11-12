import { mkdirSync, writeFileSync } from 'node:fs';
import { runStandard } from './standard.mjs';
import { runMirror } from './mirror.mjs';
import { runChampionMatchups } from './champion-matchups.mjs';
import { runCompositionMatchups } from './composition-matchups.mjs';

const version=process.argv[2]||'development';
const output=process.argv[3]||'.balance-output';
mkdirSync(output,{recursive:true});
const started=Date.now();
console.log('[balance] '+version+': iniciando 1,000 partidos + 1,000 partidos espejo');
const standard=runStandard();
console.log('[balance] 1,000 partidos completos; '+standard.audited+' auditorías detalladas; '+standard.issueCount+' errores');
console.log('[group-fights] '+JSON.stringify({
  perMatch:standard.gameplay.groupFightsPerMatch,
  matches:standard.gameplay.groupFightGames,
  responses:standard.gameplay.groupFightResponses,
  killsPerMatch:standard.gameplay.groupFightKillsPerMatch,
  fiveOnFive:standard.gameplay.fullFiveOnFive
}));
if(standard.issueSamples?.length)
 console.error('[standard-failures] '+JSON.stringify(standard.issueSamples));
const mirror=runMirror();
console.log('[balance] 500 pares invertidos completos: '+mirror.matches+' partidos; '+mirror.failures.length+' errores');
const championMatchups=runChampionMatchups();
writeFileSync(output+'/champion-matchups.json',JSON.stringify(championMatchups,null,2)+'\n');
console.log('[champion-matchups] '+JSON.stringify({validPairs:championMatchups.validPairs,
 requestedPairs:championMatchups.requestedPairs,failures:championMatchups.failures,
 rows:championMatchups.rows}));
const compositionMatchups=runCompositionMatchups();
writeFileSync(output+'/composition-matchups.json',JSON.stringify(compositionMatchups,null,2)+'\n');
console.log('[composition-matchups] '+JSON.stringify({validPairs:compositionMatchups.validPairs,
 requestedPairs:compositionMatchups.requestedPairs,failures:compositionMatchups.failures,
 summary:compositionMatchups.summary,rows:compositionMatchups.rows}));
const result={schema:1,version,createdAt:new Date().toISOString(),
  benchmarkRevision:'fixed-seed-1000-v1',durationMs:Date.now()-started,standard,mirror,
  championMatchups:{...championMatchups,cases:undefined},
  compositionMatchups:{...compositionMatchups,cases:undefined}};
writeFileSync(output+'/summary.json',JSON.stringify(result,null,2)+'\n');
console.log('[balance] output '+output+'/summary.json');
if(standard.completed!==1000||standard.audited!==1000||standard.issueCount||
   standard.auditFailures||standard.wins.invalid||mirror.matches!==1000||mirror.pairs!==500||
   mirror.failures.length||championMatchups.failures.length||
   championMatchups.validPairs!==championMatchups.requestedPairs||compositionMatchups.failures.length||
   compositionMatchups.validPairs!==compositionMatchups.requestedPairs)process.exitCode=1;
