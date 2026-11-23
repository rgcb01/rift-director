#!/usr/bin/env node
import {runTournament} from '../src/card-game/balance.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const flag=(n,d)=>process.argv.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3)??d;
const seeds=Number(flag('seeds','12')),maxRounds=Number(flag('rounds','24'));
const output=flag('json','');
const results=[false,true].map(siegeMomentum=>runTournament({seeds,maxRounds,siegeMomentum}));
for(const report of results){
 const {games,finished,timeouts,draws,firstWins,secondWins}=report.totals;
 console.log((report.config.siegeMomentum?'Con resonancia':'Sin resonancia')+
  ' | terminadas '+finished+'/'+games+
  ' | inconclusas '+timeouts+' | empates '+draws+
  ' | primero '+firstWins+' | segundo '+secondWins);
 for(const row of report.fixtures)
  console.log(' '+row.fixture+': A '+row.winsA+' vs B '+row.winsB+
   ', inconclusas '+row.timeouts+'/'+row.games);
}
console.log('Experimento de diseño, NO activa por sí solo esta regla.');
if(output){
 const path=resolve(output);mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify({version:'0.8.5',method:'mirrored seeds and positions',results},null,2)+'\n');
 console.log('Informe JSON: '+path);
}
