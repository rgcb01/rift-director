import { mkdirSync, writeFileSync } from 'node:fs';
import { runStandard } from './standard.mjs';
import { runMirror } from './mirror.mjs';

const version=process.argv[2]||'development';
const output=process.argv[3]||'.balance-output';
mkdirSync(output,{recursive:true});
const started=Date.now();
console.log('[balance] '+version+': iniciando 1,000 partidos + 1,000 partidos espejo');
const standard=runStandard();
console.log('[balance] 1,000 partidos completos; '+standard.audited+' auditorías detalladas; '+standard.issueCount+' errores');
const mirror=runMirror();
console.log('[balance] 500 pares invertidos completos: '+mirror.matches+' partidos; '+mirror.failures.length+' errores');
const result={schema:1,version,createdAt:new Date().toISOString(),
  benchmarkRevision:'fixed-seed-1000-v1',durationMs:Date.now()-started,standard,mirror};
writeFileSync(output+'/summary.json',JSON.stringify(result,null,2)+'\n');
console.log('[balance] output '+output+'/summary.json');
if(standard.completed!==1000||standard.audited!==1000||standard.issueCount||
   standard.auditFailures||standard.wins.invalid||mirror.matches!==1000||mirror.pairs!==500||
   mirror.failures.length)process.exitCode=1;
