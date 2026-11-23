// Rift Director 0.8.5 — deterministic, side-balanced tournament runner.
// A timeout is a separately reported incomplete game, never an invented draw.
// The same seed is exercised in both seat assignments and both first-player choices.
import {createMatch} from './engine.mjs';
import {aiStep, AI_LEVELS, AI_STYLES} from './tactical-ai.mjs';
import {templateDeck} from './catalog.mjs';

export const DEFAULT_FIXTURES=Object.freeze([
 {name:'Asedio vs Jungla',a:'siege',b:'jungle',styleA:'siege',styleB:'jungle'},
 {name:'Asedio vs Control',a:'siege',b:'control',styleA:'siege',styleB:'control'},
 {name:'Jungla vs Control',a:'jungle',b:'control',styleA:'jungle',styleB:'control'},
 {name:'Espejo Asedio',a:'siege',b:'siege',styleA:'siege',styleB:'siege'},
 {name:'Espejo Jungla',a:'jungle',b:'jungle',styleA:'jungle',styleB:'jungle'},
 {name:'Espejo Control',a:'control',b:'control',styleA:'control',styleB:'control'}
]);
const round2=n=>Math.round(n*100)/100;
function percentile(values,percent){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*percent))];
}
function asMetric(match,halfTurns,timedOut){
 const cards=match.log.filter(e=>e.type==='PLAY');
 return {
   winner:timedOut?null:match.winner,
   completed:!timedOut,
   timedOut,
   rounds:Math.min(match.round,timedOut?match.round-1:match.round),
   halfTurns, cardsPlayed:cards.length,
   cardTypes:Object.fromEntries([...new Set(cards.map(e=>e.name))].map(key=>[key,cards.filter(e=>e.name===key).length])),
   nexus:match.players.map(p=>p.nexus),
   towers:match.players.map(p=>({...p.towers})),
   objectives:{
     minor:match.objectives.minor.claimedBy,
     major:match.objectives.major.claimedBy
   },
   structureDamage:match.log.filter(e=>['TOWER_HIT','NEXUS_HIT'].includes(e.type)).reduce((sum,e)=>sum+e.amount,0),
   combatDeaths:match.log.filter(e=>e.type==='DEATH').length,
   backs:match.log.filter(e=>e.type==='BACK').length,
   ganks:cards.filter(e=>e.name?.toLowerCase().includes('gank')).length
 };
}
export function simulateGame(deckA,deckB,options={}){
 const seed=options.seed??42,firstPlayer=options.firstPlayer??0, maxRounds=options.maxRounds??24;
 const secondPlayerBonus=options.secondPlayerBonus??1;
 const level=options.difficulty||'director',styles=options.styles||['siege','jungle'];
 if(!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>200)throw Error('Límite de rondas inválido');
 if(!AI_LEVELS[level]||!styles.every(x=>AI_STYLES[x]))throw Error('IA desconocida');
 const decks=[typeof deckA==='string'?templateDeck(deckA):deckA,typeof deckB==='string'?templateDeck(deckB):deckB];
 const m=createMatch(decks,{seed,firstPlayer,secondPlayerBonus});
 let moves=0;
 const maxMoves=maxRounds*18;
 while(m.phase==='tactics'&&m.round<=maxRounds&&moves<maxMoves){
   const player=m.turn;
   const handled=aiStep(m,player,{difficulty:level,style:styles[player]});
   if(!handled)throw Error('La IA no ejecutó un turno legal');
   moves++;
 }
 if(moves>=maxMoves&&m.phase==='tactics'&&m.round<=maxRounds)throw Error('La IA se estancó sin finalizar una ronda');
 return asMetric(m,moves,m.phase!=='finished');
}
export function runTournament(options={}){
 const seeds=options.seeds??20,maxRounds=options.maxRounds??24,difficulty=options.difficulty??'director';
 const secondPlayerBonus=options.secondPlayerBonus??1;
 const fixtures=options.fixtures??DEFAULT_FIXTURES;
 if(!Number.isInteger(seeds)||seeds<1||seeds>3000)throw Error('Semillas inválidas');
 if(![0,1,2].includes(secondPlayerBonus))throw Error('Bono de segundo inválido');
 if(!Array.isArray(fixtures)||!fixtures.length)throw Error('Faltan enfrentamientos');
 const all=[],stats=[];
 for(const fixture of fixtures){
   let aWins=0,bWins=0,draws=0,timeouts=0,firstWins=0,secondWins=0;
   let totalCards=0,totalDamage=0,totalDeaths=0;
   const finishedRounds=[],allRounds=[];
   const captures={minor:0,major:0};
   for(let seed=1;seed<=seeds;seed++){
     for(const swapped of [false,true]){
       for(const firstPlayer of [0,1]){
         const sides=swapped?[fixture.b,fixture.a]:[fixture.a,fixture.b];
         const styles=swapped?[fixture.styleB,fixture.styleA]:[fixture.styleA,fixture.styleB];
         const result=simulateGame(sides[0],sides[1],{seed,firstPlayer,maxRounds,difficulty,styles,secondPlayerBonus});
         const originalWinner=result.winner==='draw'?'draw':(result.winner===null?null:swapped?1-result.winner:result.winner);
         if(result.timedOut)timeouts++;
         else if(result.winner==='draw')draws++;
         else if(originalWinner===0)aWins++;
         else bWins++;
         if(typeof result.winner==='number'){
           if(result.winner===firstPlayer)firstWins++;
           else secondWins++;
         }
         if(result.completed)finishedRounds.push(result.rounds);
         allRounds.push(result.rounds);
         totalCards+=result.cardsPlayed;totalDamage+=result.structureDamage;totalDeaths+=result.combatDeaths;
         for(const key of ['minor','major'])if(result.objectives[key]!==null)captures[key]++;
         if(options.keepSamples)all.push({fixture:fixture.name,seed,swapped,firstPlayer,...result});
       }
     }
   }
   const games=seeds*4,finished=games-timeouts,decided=finished-draws;
   stats.push({
     fixture:fixture.name,archetypes:[fixture.a,fixture.b],games,finished,timeouts,draws,
     winsA:aWins,winsB:bWins,firstWins,secondWins,
     winRateAOverDecided:decided?round2(aWins/decided*100):null,
     firstWinRateOverDecided:decided?round2(firstWins/decided*100):null,
     avgRoundsCompleted:finishedRounds.length?round2(finishedRounds.reduce((a,b)=>a+b,0)/finishedRounds.length):null,
     medianRoundsCompleted:percentile(finishedRounds,.5),p90RoundsCompleted:percentile(finishedRounds,.9),
     avgCardsPlayed:round2(totalCards/games),
     avgStructureDamage:round2(totalDamage/games),
     avgCombatDeaths:round2(totalDeaths/games),
     captureRates:{minor:round2(captures.minor/games*100),major:round2(captures.major/games*100)}
   });
 }
 const sum=(key)=>stats.reduce((a,s)=>a+s[key],0);
 return {
   version:'0.8.5',config:{seeds,maxRounds,difficulty,secondPlayerBonus,fixtures:fixtures.length,
     paired:true,seatSwaps:true,initiativeSwaps:true},
   totals:{games:sum('games'),finished:sum('finished'),timeouts:sum('timeouts'),draws:sum('draws'),
     firstWins:sum('firstWins'),secondWins:sum('secondWins')},
   fixtures:stats,
   ...(options.keepSamples?{samples:all}:{})
 };
}
