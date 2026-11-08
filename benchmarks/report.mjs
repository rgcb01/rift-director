import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const percent=v=>(v*100).toFixed(1)+'%';
const number=v=>Number(v).toFixed(2);
const ratio=(n,d)=>d?n/d:0;

export function flatten(d){
 const s=d.standard,m=d.mirror;
 return {
  matches:s.completed,
  blueWinRate:ratio(s.wins.blue,s.completed),
  pairedBlueWinRate:ratio(m.wins.blue,m.matches),
  durationMean:s.duration.mean,
  killsMean:s.kills.mean,
  dragonsMean:s.objectives.dragonsAvg,
  noDragonRate:ratio(s.objectives.gamesWithoutDragon,s.completed),
  baronsMean:s.objectives.baronsAvg,
  noBaronRate:ratio(s.objectives.gamesWithoutBaron,s.completed),
  towersMean:s.objectives.towersAvg,
  exactlyThreeTowers:ratio(m.towers.exact3,m.matches),
  noEarlyTowerRate:ratio(m.towers.noEarlyTowerBefore36,m.matches),
  gankGames:ratio(s.gameplay.actionMatches.gank,s.completed),
  averageEvents:s.gameplay.meanEvents,
  zeroKillRate:ratio(s.gameplay.zeroKills,s.completed),
  earlyTowerRate:s.gameplay.earlyTowerMatches===undefined?null:ratio(s.gameplay.earlyTowerMatches,s.completed),
  platesMean:s.gameplay.platesPerMatch||0,
  shutdownsMean:s.gameplay.shutdownsPerMatch??null,
  macroFarmTurnsMean:s.gameplay.macroFarmTurnsPerMatch??null,
  macroDefendTurnsMean:s.gameplay.macroDefendTurnsPerMatch??null,
  macroPressureTurnsMean:s.gameplay.macroPressureTurnsPerMatch??null,
  macroObjectiveTurnsMean:s.gameplay.macroObjectiveTurnsPerMatch??null,
  macroExposedPushMean:s.gameplay.macroExposedPushTurnsPerMatch??null,
  macroEscortedObjectiveMean:s.gameplay.macroEscortedObjectiveTurnsPerMatch??null,
  counterplayFightsMean:s.gameplay.counterplayFightsPerMatch??null,
  counterplayKillsMean:s.gameplay.counterplayKillsPerMatch??null,
  underdogFightsMean:s.gameplay.underdogFightsPerMatch??null,
  shutdownHuntsPer100:s.gameplay.shutdownHuntsPer100Maps??null,
  earnedFightPlatesMean:s.gameplay.earnedFightPlatesPerMatch??null,
  earnedFightTowerRate:s.gameplay.earnedFightTowerGames===undefined?null:
    ratio(s.gameplay.earnedFightTowerGames,s.completed),
  counterplayWinRate:s.gameplay.counterplayWinRate??null,
  shutdownGoldMean:s.gameplay.shutdownGoldPerMatch??null,
  shutdownGameRate:s.gameplay.shutdownGames===undefined?null:
    ratio(s.gameplay.shutdownGames,s.completed),
  underdogShutdownGoldMean:s.gameplay.underdogShutdownGoldPerMatch??null,
  contestedDragonRate:s.gameplay.contestedDragonGames===undefined?null:
    ratio(s.gameplay.contestedDragonGames,s.completed),
  contestedDragonsMean:s.gameplay.contestedDragonsPerMatch??null,
  dragonStealsPer100:s.gameplay.dragonStealsPer100Maps??null,
  firstDragonMean:s.gameplay.firstDragonMean??null,
  objectiveCommitmentMean:s.gameplay.objectiveCommitmentMinutesPerMatch??null,
  crossmapPlatesMean:s.gameplay.crossmapTradePlatesPerMatch??null,
  crossmapTowerRate:s.gameplay.crossmapTradeTowerGames===undefined?null:
    ratio(s.gameplay.crossmapTradeTowerGames,s.completed),
  comebackRate:s.gameplay.comebackWins20===undefined?null:ratio(s.gameplay.comebackWins20,s.completed),
  multiLaneRate:s.gameplay.gamesMultipleTowerLanes===undefined?null:
    ratio(s.gameplay.gamesMultipleTowerLanes,s.completed),
  counterTowerRate:s.gameplay.gamesBothTeamsTowers===undefined?null:
    ratio(s.gameplay.gamesBothTeamsTowers,s.completed),
  soloSplitTowerGames:s.gameplay.soloSplitTowerGames===undefined?null:
    ratio(s.gameplay.soloSplitTowerGames,s.completed),
  purchasesPerMatch:s.gameplay.purchasesPerMatch??null,
  recallPurchasesMean:s.gameplay.recallPurchasesPerMatch??null,
  recallTravelMinutesMean:s.gameplay.recallTravelMinutesPerMatch??null,
  earlyPurchasesMean:s.gameplay.earlyPurchasesPerMatch??null,
  recallPurchaseShare:s.gameplay.recallPurchasesPerMatch===undefined||
    !s.gameplay.purchasesPerMatch?null:
    s.gameplay.recallPurchasesPerMatch/s.gameplay.purchasesPerMatch,
  itemSlotsUsed:s.gameplay.purchasesPerMatch===undefined?null:
    s.gameplay.purchasesPerMatch/30,
  equipmentSpentMean:s.gameplay.equipmentGoldPerMatch??null,
  avgFinalLevel:s.gameplay.avgFinalLevel??null,
  noItemRate:s.gameplay.noItemGames===undefined?null:
    ratio(s.gameplay.noItemGames,s.completed),
  bothTeamsItemRate:s.gameplay.bothTeamsItemGames===undefined?null:
    ratio(s.gameplay.bothTeamsItemGames,s.completed),
  firstPurchaseMean:s.gameplay.firstPurchaseMean??null
 };
}
export function evaluate(current,previous){
 const v=flatten(current),p=flatten(previous);
 const failures=[],warnings=[];
 const fail=(condition,msg)=>{if(condition)failures.push(msg)};
 const warn=(condition,msg)=>{if(condition)warnings.push(msg)};
 fail(current.standard.completed!==1000||current.mirror.matches!==1000,
  'Cantidad de partidos distinta a 1,000 por escenario');
 fail(current.standard.audited!==1000||current.standard.auditFailures>0||
  current.standard.issueCount>0||current.mirror.failures.length>0,
  'Auditorias de causalidad o ejecucion incompletas');
 fail(v.blueWinRate<.33||v.blueWinRate>.67,'Sesgo extremo de victorias en muestreo general');
 fail(v.pairedBlueWinRate<.33||v.pairedBlueWinRate>.67,'Sesgo extremo en cruces espejados');
 fail(v.durationMean<18||v.durationMean>65,'Duracion media fuera de limites de seguridad');
 fail(v.killsMean<3||v.killsMean>35,'Kills medios fuera de limites de seguridad');
 fail(v.noDragonRate>.70,'Mas de 70% de partidas sin Dragon');
 fail(v.noBaronRate>.50,'Mas de 50% de partidas sin Baron');
 fail(v.zeroKillRate>.20,'Mas de 20% de partidos sin bajas');
 fail(v.towersMean<2.9,'Las torres se han reducido por debajo del minimo historico; revisar reglas de nexo');
 if(previous.version!==current.version){
  fail(Math.abs(v.pairedBlueWinRate-.5)-Math.abs(p.pairedBlueWinRate-.5)>.05,
   'La asimetria espejada empeoro en mas de cinco puntos porcentuales');
  fail(v.noDragonRate-p.noDragonRate>.20,
   'Partidos sin Dragon aumentaron mas de 20 puntos porcentuales');
  fail(v.killsMean<p.killsMean*.60,
   'Kills descendieron mas de 40% frente a la version anterior');
  fail(v.durationMean-p.durationMean>15,
   'Duracion media aumento mas de 15 minutos');
  fail(v.exactlyThreeTowers>.95&&v.exactlyThreeTowers>p.exactlyThreeTowers+.10,
   '95% de partidos acaban con solo tres torres: nueva regresion grave');
 }
 warn(v.blueWinRate>.55||v.blueWinRate<.45,
  'Persiste sesgo de color del lado en simulacion general');
 warn(v.pairedBlueWinRate>.55||v.pairedBlueWinRate<.45,
  'Persiste sesgo de color del lado en partidos espejados');
 warn(v.noDragonRate>.30,'Mas de 30% de los partidos no tienen Dragon');
 warn(v.counterplayFightsMean!==null&&v.counterplayFightsMean<.35,
  'Menos de 0.35 combates tácticos por mapa: revisar oportunidades reales');
 warn(v.counterplayKillsMean!==null&&v.counterplayKillsMean<.1,
  'Muy pocas eliminaciones verificadas de contraataque');
 warn(v.shutdownGameRate!==null&&v.shutdownGameRate<.08,
  'Menos del 8% de mapas ofrecen una recompensa por terminar una racha');
 if(previous.version!==current.version){
  warn(v.noBaronRate-p.noBaronRate>.08,
   'Las partidas sin Baron aumentaron más de ocho puntos porcentuales');
 }
 warn(v.contestedDragonRate!==null&&v.contestedDragonRate<.03,
  'Pocos mapas registran Dragones disputados físicamente');
 warn(v.crossmapPlatesMean!==null&&v.crossmapPlatesMean<.01,
  'La decisión de intercambiar Dragón rara vez produce placas reales');
 warn(v.exactlyThreeTowers>.65,'Mas de 65% de los partidos caen con exactamente tres torres');
 warn(v.multiLaneRate!==null&&v.multiLaneRate<.18,
  'Menos del 18% de partidas destruyen torres en al menos dos carriles');
 warn(v.counterTowerRate!==null&&v.counterTowerRate<.04,
  'Pocas partidas registran torres destruidas por ambos clubes');
 warn(v.noItemRate!==null&&v.noItemRate>.25,
  'Más del 25% de los partidos terminan sin ninguna compra');
 warn(v.bothTeamsItemRate!==null&&v.bothTeamsItemRate<.50,
  'Menos del 50% de los mapas tienen compras de ambos equipos');
 if(p.exactlyThreeTowers!==null&&v.exactlyThreeTowers-p.exactlyThreeTowers>.05)
  warnings.push('La proporción de partidas con exactamente tres torres empeoró más de cinco puntos porcentuales');
 if(previous.version!==current.version){
  warn(v.killsMean<p.killsMean*.85,
   'Las kills medias cayeron más de 15% respecto a la versión anterior');
  warn(v.durationMean-p.durationMean>2,
   'La duración media empeoró más de dos minutos');
  warn(v.comebackRate!==null&&p.comebackRate!==null&&
    p.comebackRate-v.comebackRate>.01,
   'La frecuencia de remontadas cayó más de un punto porcentual');
  warn(v.counterTowerRate!==null&&p.counterTowerRate!==null&&
    p.counterTowerRate-v.counterTowerRate>.05,
   'Los mapas con torres para ambos equipos cayeron más de cinco puntos porcentuales');
 }
 warn(v.itemSlotsUsed!==null&&v.itemSlotsUsed>.80,
  'Más del 80% de los 30 espacios prototipo de objetos están ocupados al terminar');
 warn(v.noEarlyTowerRate>.90,'Mas de 90% de los partidos no derriban torres antes del minuto 36');
 warn(current.standard.duration.min>=35,
  'No hay victorias tempranas (duracion minima 35+): revisar asedio por reloj');
 return {failures,warnings,current:v,baseline:p};
}
export function bars(title,items,opts={}){
 const w=900,h=420,base=344,left=70,right=24,usable=w-left-right;
 const max=opts.max||Math.max(1,...items.map(x=>x.value))*1.16;
 const spacing=usable/items.length,width=Math.max(15,spacing*.68);
 let out='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+
  '" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(title)+'">';
 out+='<rect width="'+w+'" height="'+h+'" fill="#0c1423" rx="18"/>';
 out+='<text x="36" y="42" fill="#f4f7fc" font-family="system-ui" font-size="23" font-weight="700">'+esc(title)+'</text>';
 for(let i=0;i<=4;i++){
  const y=base-i*(base-88)/4;
  out+='<path d="M'+left+' '+y+'H'+(w-right)+'" stroke="#314055" stroke-width="1"/>';
  out+='<text x="'+(left-10)+'" y="'+(y+5)+'" fill="#a0b1c9" font-family="system-ui" text-anchor="end" font-size="13">'+
   esc((max*i/4).toFixed(opts.decimals??0))+'</text>';
 }
 items.forEach((p,i)=>{
  const x=left+(i+.5)*spacing-width/2;
  const hei=Math.max(1,Math.min(base-88,p.value/max*(base-88)));
  const y=base-hei;
  const c=p.color||(i%2?'#61b6ee':'#6de2c1');
  out+='<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+hei+'" fill="'+c+'" rx="5"/>';
  out+='<text x="'+(x+width/2)+'" y="'+Math.max(70,y-9)+'" fill="#ffffff" font-family="system-ui" text-anchor="middle" font-weight="700" font-size="15">'+
   esc(opts.labelsPercent?percent(p.value/100):number(p.value).replace(/\.00$/,''))+'</text>';
  out+='<text x="'+(x+width/2)+'" y="'+(base+25)+'" fill="#dce5f4" font-family="system-ui" text-anchor="middle" font-size="14">'+esc(p.label)+'</text>';
 });
 out+='</svg>';
 return out;
}
const keys=[
 ['blueWinRate','Victorias azul','rate'],['pairedBlueWinRate','Azul espejado','rate'],
 ['durationMean','Minutos medios','num'],['killsMean','Kills medios','num'],
 ['dragonsMean','Dragones por mapa','num'],['noDragonRate','Partidos sin Dragon','rate'],
 ['baronsMean','Barones por mapa','num'],['noBaronRate','Partidos sin Baron','rate'],
 ['towersMean','Torres por mapa','num'],['exactlyThreeTowers','Exactamente tres torres','rate'],
 ['noEarlyTowerRate','Sin torre antes del min 36','rate'],
 ['gankGames','Partidos con gank letal','rate'],['averageEvents','Eventos por mapa','num'],
 ['zeroKillRate','Sin bajas','rate'],
 ['earlyTowerRate','Torres antes del min 36','rate'],
 ['platesMean','Placas por mapa','num'],
 ['shutdownsMean','Rachas eliminadas por mapa','num'],
 ['macroFarmTurnsMean','Minutos-jugador dedicados a farm macro por mapa','num'],
 ['macroDefendTurnsMean','Minutos-jugador dedicados a defender oleadas por mapa','num'],
 ['macroPressureTurnsMean','Minutos-jugador dedicados a presión macro por mapa','num'],
 ['macroObjectiveTurnsMean','Minutos-jugador dedicados a rotar por objetivos por mapa','num'],
 ['macroExposedPushMean','Minutos-jugador de pushes con riesgo alto observado','num'],
 ['macroEscortedObjectiveMean','Minutos-jugador de rotaciones con escoltas propias','num'],
 ['counterplayFightsMean','Peleas iniciadas por oportunidad visible por mapa','num'],
 ['counterplayKillsMean','Kills por peleas tácticas por mapa','num'],
 ['underdogFightsMean','Contraataques estando atrás por mapa','num'],
 ['shutdownHuntsPer100','Cazas de jugadores con recompensa por 100 mapas','num'],
 ['earnedFightPlatesMean','Placas tras peleas ganadas por mapa','num'],
 ['earnedFightTowerRate','Mapas con torres tras peleas ganadas','rate'],
 ['counterplayWinRate','Peleas tácticas con kill confirmada','rate'],
 ['shutdownGoldMean','Oro adicional por shutdown por mapa','num'],
 ['shutdownGameRate','Mapas con al menos un shutdown','rate'],
 ['underdogShutdownGoldMean','Oro shutdown para equipo en desventaja por mapa','num'],
 ['contestedDragonRate','Mapas con Dragón disputado','rate'],
 ['contestedDragonsMean','Dragones disputados por partida','num'],
 ['dragonStealsPer100','Robos de Dragón por 100 mapas','num'],
 ['firstDragonMean','Minuto promedio del primer Dragón','num'],
 ['objectiveCommitmentMean','Minutos-jugador de preparación del Dragón','num'],
 ['crossmapPlatesMean','Placas obtenidas como intercambio por Dragón','num'],
 ['crossmapTowerRate','Mapas con torre intercambiada por Dragón','rate'],
 ['comebackRate','Remontadas con deficit >=1500 al min 20','rate'],
 ['multiLaneRate','Torres en dos o mas carriles','rate'],
 ['counterTowerRate','Ambos equipos toman torres','rate'],
 ['soloSplitTowerGames','Partidos con torre de splitpush solitario','rate'],
 ['purchasesPerMatch','Compras de objetos por mapa','num'],
 ['recallPurchasesMean','Compras por regreso táctico por mapa','num'],
 ['recallTravelMinutesMean','Minutos-jugador dedicados a volver a comprar','num'],
 ['earlyPurchasesMean','Compras antes del minuto 30','num'],
 ['recallPurchaseShare','Porcentaje de compras desde recall','rate'],
 ['itemSlotsUsed','Espacios de objetos equipados (30 posibles)','rate'],
 ['equipmentSpentMean','Oro convertido en equipamiento por mapa','num'],
 ['avgFinalLevel','Nivel individual promedio al final','num'],
 ['firstPurchaseMean','Minuto promedio de primera compra','num'],
 ['noItemRate','Partidos sin ninguna compra','rate'],
 ['bothTeamsItemRate','Partidos con compras de ambos equipos','rate']];
const show=(v,type)=>v==null?'No medido':type==='rate'?percent(v):number(v);
export function generate(current,previous,output){
 mkdirSync(output,{recursive:true});
 const assessment=evaluate(current,previous);
 const s=current.standard,m=current.mirror;
 const graph=[
  ['duration.svg',bars('Duracion de los partidos',s.duration.hist.map(v=>({label:v.label,value:v.count})))],
  ['kills.svg',bars('Kills totales por partida',s.kills.hist.map(v=>({label:v.label,value:v.count})))],
  ['sides.svg',bars('Victorias azules y rojas',[
   {label:'Azul',value:s.wins.blue,color:'#56aaff'},
   {label:'Rojo',value:s.wins.red,color:'#f27e8a'},
   {label:'Azul espejo',value:m.wins.blue,color:'#56aaff'},
   {label:'Rojo espejo',value:m.wins.red,color:'#f27e8a'}],{max:1000})],
  ['objectives.svg',bars('Partidos con eventos por tipo',[
   {label:'Dragon',value:s.gameplay.actionMatches.dragon},
   {label:'Baron',value:s.gameplay.actionMatches.baron},
   {label:'Gank',value:s.gameplay.actionMatches.gank},
   {label:'Teamfight',value:s.gameplay.actionMatches.teamfight},
   {label:'Torre',value:s.gameplay.actionMatches.tower}],{max:1100})],
  ['towers.svg',bars('Torres destruidas (espejados)',Object.entries(m.towers.hist)
   .map(([label,value])=>({label:label+' torres',value})),{max:1000})],
  ['strategy.svg',bars('Indicadores nuevos de presion y remontadas',[
   {label:'Torres temprano',value:(assessment.current.earlyTowerRate||0)*100},
   {label:'Dos carriles',value:(assessment.current.multiLaneRate||0)*100},
   {label:'Ambos toman',value:(assessment.current.counterTowerRate||0)*100},
   {label:'Remontadas',value:(assessment.current.comebackRate||0)*100}],{max:100,decimals:0})],
  ['macro.svg',bars('Eleccion de recursos: farm, defensa, presion y objetivos',[
   {label:'Farm',value:s.gameplay.macroFarmTurnsPerMatch||0},
   {label:'Defensa',value:s.gameplay.macroDefendTurnsPerMatch||0},
   {label:'Presion',value:s.gameplay.macroPressureTurnsPerMatch||0},
   {label:'Objetivos',value:s.gameplay.macroObjectiveTurnsPerMatch||0}
  ])],
  ['dragon.svg',bars('Objetivos neutrales: disputa, intercambios y ausencia',[
   {label:'Sin Dragon',value:assessment.current.noDragonRate*100},
   {label:'Disputado',value:(assessment.current.contestedDragonRate||0)*100},
   {label:'Torre de intercambio',value:(assessment.current.crossmapTowerRate||0)*100}
  ],{max:100,decimals:0})],
  ['counterplay.svg',bars('Peleas tácticas y conversión territorial por 100 mapas',[
   {label:'Peleas con kill',value:(assessment.current.counterplayWinRate||0)*100},
   {label:'Torres de respuesta',value:(assessment.current.earnedFightTowerRate||0)*100},
   {label:'Peleas sin kill',value:(1-(assessment.current.counterplayWinRate||0))*100}
  ],{max:100,decimals:0})],
  ['shutdown.svg',bars('Recompensas por cortar rachas (porcentaje de mapas)',[
   {label:'Con shutdown',value:(assessment.current.shutdownGameRate||0)*100},
   {label:'Sin shutdown',value:100-(assessment.current.shutdownGameRate||0)*100}
  ],{max:100,decimals:0})],
  ['power.svg',bars('Equipamiento: porcentaje de mapas por resultado',[
   {label:'Ambos compran',value:(assessment.current.bothTeamsItemRate||0)*100},
   {label:'Slots llenos',value:(assessment.current.itemSlotsUsed||0)*100},
   {label:'Vuelta a tienda',value:(assessment.current.recallPurchaseShare||0)*100},
   {label:'Sin compras',value:(assessment.current.noItemRate||0)*100}
  ],{max:100,decimals:0})],
  ['previous.svg',bars('Version anterior vs actual: porcentaje de partidas sin Dragon',[
   {label:previous.version,value:assessment.baseline.noDragonRate*100,color:'#f27e8a'},
   {label:current.version,value:assessment.current.noDragonRate*100,color:'#6de2c1'}],{max:100,decimals:0})]
 ];
 for(const [name,svg] of graph)writeFileSync(join(output,name),svg+'\n');
 const lines=keys.map(([key,label,type])=>{
  const a=assessment.baseline[key],b=assessment.current[key];
  const delta=a==null||b==null?'No comparable':
   type==='rate'?(100*(b-a)).toFixed(1)+' pp':(b-a).toFixed(2);
  return '| '+label+' | '+show(a,type)+' | '+show(b,type)+' | '+delta+' |';
 });
 const hdr='# Balance Rift Director — '+current.version+'\n\n'+
  '**Partidos:** 1,000 principales + 1,000 espejados (500 pares). '+
  '**Auditorias completas:** '+s.audited+'/1,000. '+
  '**Referencia:** '+previous.version+' ('+(previous.baselineSource||'metricas guardadas')+').\n\n';
 const md=hdr+'| Metrica | Anterior | Actual | Delta |\n|---|---:|---:|---:|\n'+
  lines.join('\n')+'\n\n'+
  '## Regresiones bloqueantes ('+assessment.failures.length+')\n'+
  (assessment.failures.map(x=>'- ❌ '+x).join('\n')||'- Ninguna')+'\n\n'+
  '## Riesgos existentes / revisiones ('+assessment.warnings.length+')\n'+
  (assessment.warnings.map(x=>'- ⚠️ '+x).join('\n')||'- Ninguno')+'\n\n'+
  '## Graficas\n'+graph.map(([n])=>'- '+n).join('\n')+
  '\n\nEstos umbrales detectan problemas, no definen el balance final de un MOBA. '+
  'Cambios intencionales requieren documentar la justificacion en la release.\n';
 writeFileSync(join(output,'report.md'),md);
 const html='<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'+
  '<title>Balance '+esc(current.version)+'</title><style>'+
  'body{background:#0a1020;color:#edf4ff;font:16px system-ui;max-width:1100px;margin:auto;padding:28px}'+
  'h1{font-size:30px}p{line-height:1.6}img{width:100%;border-radius:16px}'+
  'table{border-collapse:collapse;width:100%;margin:26px 0}td,th{padding:9px;border-bottom:1px solid #30405b;text-align:left}'+
  'figure{margin:25px 0}figure figcaption{color:#a9bdd4;margin:8px 0}</style></head><body>'+
  '<h1>Rift Director · '+esc(current.version)+'</h1>'+
  '<p>1,000 partidas + 1,000 espejadas · 1,000 auditorias · vs '+esc(previous.version)+
  ' · '+esc(previous.baselineSource||'baseline')+'</p>'+
  '<h2>Regresiones bloqueantes</h2><p>'+esc(assessment.failures.join(' | ')||'Ninguna')+'</p>'+
  '<h2>Advertencias</h2><p>'+esc(assessment.warnings.join(' | ')||'Ninguna')+'</p>'+
  '<table><thead><tr><th>Metrica</th><th>Antes</th><th>Ahora</th></tr></thead><tbody>'+
  keys.map(([key,label,type])=>'<tr><td>'+esc(label)+'</td><td>'+show(assessment.baseline[key],type)+
   '</td><td>'+show(assessment.current[key],type)+'</td></tr>').join('')+'</tbody></table>'+
  graph.map(([name])=>'<figure><img src="'+name+'" alt="'+esc(name)+'"/></figure>').join('')+'</body></html>';
 writeFileSync(join(output,'index.html'),html);
 const report={version:current.version,previous:previous.version,
  source:previous.baselineSource||'metricas guardadas',...assessment};
 writeFileSync(join(output,'regressions.json'),JSON.stringify(report,null,2)+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md,{flag:'a'});
 console.log(md);
 return report;
}
const executed=process.argv[1]?.endsWith('/report.mjs');
if(executed){
 const current=JSON.parse(readFileSync(process.argv[2]||'.balance-output/summary.json','utf8'));
 const previous=JSON.parse(readFileSync(process.argv[3]||'.balance-output/previous.json','utf8'));
 const report=generate(current,previous,process.argv[4]||'.balance-output');
 if(report.failures.length)process.exitCode=1;
}
