import { mkdirSync, writeFileSync } from 'node:fs';
import { runStandard } from './standard.mjs';
import { runMirror } from './mirror.mjs';
import { runChampionMatchups } from './champion-matchups.mjs';

const version=process.argv[2]||'development';
const output=process.argv[3]||'.balance-output';
const simultaneousCombat=process.argv.includes('--simultaneous');
const structureTeamfights=process.argv.includes('--structure-teamfights');
const coordinatedResets=process.argv.includes('--coordinated-resets');
const squadCommitment=process.argv.includes('--squad-commitment');
const engagePolicy=process.argv.includes('--engage-policy');
const skirmishReinforcements=process.argv.includes('--skirmish-reinforcements');
const neutralHp=process.argv.includes('--neutral-hp');
const options=simultaneousCombat?{simultaneousCombat:true,structureTeamfights,coordinatedResets,squadCommitment,engagePolicy,skirmishReinforcements,neutralHp,engageDiagnostics:true,objectiveDiagnostics:true}:{objectiveDiagnostics:true};
console.log('[combat-mode] '+(simultaneousCombat?'simultaneous':'default'));
mkdirSync(output,{recursive:true});
const started=Date.now();
console.log('[balance] '+version+': iniciando 1,000 partidos + 1,000 partidos espejo');
const standard=runStandard(options);
console.log('[balance] 1,000 partidos completos; '+standard.audited+' auditorías detalladas; '+standard.issueCount+' errores');
console.log('[group-fights] '+JSON.stringify({
  perMatch:standard.gameplay.groupFightsPerMatch,
  matches:standard.gameplay.groupFightGames,
  responses:standard.gameplay.groupFightResponses,
  killsPerMatch:standard.gameplay.groupFightKillsPerMatch,
  fiveOnFive:standard.gameplay.fullFiveOnFive
}));
console.log('[teamfight-diagnostics] '+JSON.stringify(standard.teamfightDiagnostics));
console.log('[objective-readiness] '+JSON.stringify(standard.objectiveReadiness));
console.log('[neutral-health] '+JSON.stringify(standard.neutralHealth));
if(standard.issueSamples?.length)
 console.error('[standard-failures] '+JSON.stringify(standard.issueSamples));
const mirror=runMirror(options);
console.log('[balance] 500 pares invertidos completos: '+mirror.matches+' partidos; '+mirror.failures.length+' errores');
const championMatchups=runChampionMatchups(options);
writeFileSync(output+'/champion-matchups.json',JSON.stringify(championMatchups,null,2)+'\n');
console.log('[champion-matchups] '+JSON.stringify({validPairs:championMatchups.validPairs,
 requestedPairs:championMatchups.requestedPairs,failures:championMatchups.failures,
 rows:championMatchups.rows}));
const result={schema:1,version,createdAt:new Date().toISOString(),
  benchmarkRevision:'fixed-seed-1000-v1',combatMode:simultaneousCombat?'simultaneous':'default',structureTeamfights,coordinatedResets,squadCommitment,engagePolicy,skirmishReinforcements,neutralHp,durationMs:Date.now()-started,standard,mirror,
  championMatchups:{...championMatchups,cases:undefined}};
writeFileSync(output+'/summary.json',JSON.stringify(result,null,2)+'\n');
console.log('[balance] output '+output+'/summary.json');
if(standard.completed!==1000||standard.audited!==1000||standard.issueCount||
   standard.auditFailures||standard.wins.invalid||mirror.matches!==1000||mirror.pairs!==500||
   mirror.failures.length||championMatchups.failures.length||
   championMatchups.validPairs!==championMatchups.requestedPairs)process.exitCode=1;
