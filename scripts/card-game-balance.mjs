#!/usr/bin/env node
// Reproducible offline balance report. No network or user data.
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {runTournament} from '../src/card-game/balance.mjs';
function arg(name,fallback){
 const flag=process.argv.find(x=>x.startsWith('--'+name+'='));
 return flag?flag.slice(name.length+3):fallback;
}
const seeds=Number(arg('seeds','20'));
const maxRounds=Number(arg('rounds','24'));
const difficulty=arg('difficulty','director');
const outfile=arg('json','');
const result=runTournament({seeds,maxRounds,difficulty});
const divider='─'.repeat(86);
console.log('Rift Director CCG · Torneo de balance v'+result.version);
console.log('Partidas: '+result.totals.games+' | 4 orientaciones por semilla (2 lados × 2 iniciativas)');
console.log('IA: '+difficulty+' | límite de rondas: '+maxRounds+' | semillas por cruce: '+seeds);
console.log(divider);
for(const line of result.fixtures){
 const wr=line.winRateAOverDecided===null?'n/d':line.winRateAOverDecided.toFixed(1)+'%';
 const first=line.firstWinRateOverDecided===null?'n/d':line.firstWinRateOverDecided.toFixed(1)+'%';
 const avg=line.avgRoundsCompleted===null?'n/d':line.avgRoundsCompleted.toFixed(1);
 console.log(line.fixture.padEnd(23)+' '+String(line.winsA).padStart(3)+'/'+String(line.winsB).padEnd(3)+
   ' | A '+wr.padEnd(7)+' | primero '+first.padEnd(7)+
   ' | rondas '+avg.padEnd(5)+' | s/f '+line.timeouts+'/'+line.games+
   ' | neutral '+line.captureRates.minor+'%/'+line.captureRates.major+'%');
}
console.log(divider);
console.log('Finalizadas '+result.totals.finished+', sin finalizar '+result.totals.timeouts+', empates '+result.totals.draws+'.');
console.log('Nota: los porcentajes de victoria excluyen empates y partidas sin finalizar; no prueban balance competitivo.');
if(outfile){
 const path=resolve(outfile);
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(result,null,2)+'\n','utf8');
 console.log('Informe JSON: '+path);
}
