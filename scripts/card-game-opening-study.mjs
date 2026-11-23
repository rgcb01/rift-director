#!/usr/bin/env node
// Opening-advantage A/B study with identical decks, seats, priorities and seeds.
import {runTournament} from '../src/card-game/balance.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
function option(flag, fallback){
 const hit=process.argv.find(s=>s.startsWith('--'+flag+'='));
 return hit===undefined?fallback:hit.slice(flag.length+3);
}
const seeds=Number(option('seeds','20'));
const maxRounds=Number(option('rounds','24'));
const outfile=option('json','');
const difficulty=option('difficulty','director');
const compare=[0,1,2];
const results=compare.map(secondPlayerBonus=>runTournament({seeds,maxRounds,difficulty,secondPlayerBonus}));
console.log('Rift Director · estudio de iniciativa · v0.8.5');
console.log('Mismas semillas y enfrentamientos en ambos asientos y ambos órdenes de salida.');
for(const report of results){
 const {firstWins,secondWins,games,timeouts,draws}=report.totals, decided=firstWins+secondWins;
 console.log('Segundo +'+report.config.secondPlayerBonus+' energía | '+games+' partidas'+
  ' | completadas '+(games-timeouts)+' | sin terminar '+timeouts+
  ' | empates '+draws+' | primero '+firstWins+' ('+(decided?(100*firstWins/decided).toFixed(1):'n/d')+'%)'+
  ' | segundo '+secondWins);
}
console.log('El +1 de energía vigente NO cambia automáticamente con este experimento.');
if(outfile){
 const data={version:'0.8.5',method:'paired-seeds and seat-order crossovers',results};
 const path=resolve(outfile);mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify(data,null,2)+'\n','utf8');
 console.log('Informe comparativo: '+path);
}
