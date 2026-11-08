/* Rift Director: factual broadcast and readable playback, no RNG/DOM dependencies.
 * Strategic observations are grounded in saved frame metrics, not fabricated actions.
 * Both gameplay and match-event history remain the authoritative source.
 */
((root)=>{
'use strict';
const core=root.RiftCore||(root.RiftCore={});
const LANES=['TOP','MID','BOT'],laneLabel={TOP:'superior',MID:'central',BOT:'inferior'};
const durations=Object.freeze({1:5000,2:2500,5:950});
const hash=(...parts)=>{
 let h=2166136261>>>0;
 for(const part of parts){
  for(const ch of String(part)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
  h^=124;h=Math.imul(h,16777619)>>>0;
 }
 return h>>>0;
};
const choice=(values,...key)=>values[hash(...key)%values.length];
const opponent=(id,a,b)=>id===a?b:a;
const clip=(x,min,max)=>Math.max(min,Math.min(max,x));
const broadcastInterval=speed=>durations[speed]||durations[1];

function createBroadcast(match,world,seed) {
 const [a,b]=[match.fixture.a,match.fixture.b];
 const clubs=Object.fromEntries(world.clubs.map(c=>[c.id,c]));
 const players=Object.fromEntries(world.players.map(p=>[p.id,p]));
 if(!clubs[a]||!clubs[b])throw new Error('Club inexistente en retransmisión');
 const name=id=>clubs[id]?.name||'un club';
 const who=id=>players[id]?.name||'un jugador';
 const foe=id=>opponent(id,a,b);
 const variants=match.events.map((e,i)=>{
  const f=e.facts;
  if(!f)return null;
  const club=name(e.teamId),enemy=name(foe(e.teamId)),actor=who(f.actorId);
  let entries;
  if(f.combatVersion===1){
   const target=who(f.targetId),k=(f.victimIds||[]).length;
   const arena=f.mode==='gank'?'la emboscada de '+laneLabel[f.lane]:
     f.mode==='lane'?'el carril '+laneLabel[f.lane]:'la pelea grupal';
   const impacts=(f.impacts||[]).map(hit=>who(hit.id)+' queda con '+hit.hpAfter+'% de vida').join('; ');
   const retreats=(f.impacts||[]).filter(hit=>hit.retreat).map(hit=>who(hit.id));
   const resolution=k?('Caen '+f.victimIds.map(who).join(' y ')+'.'):
     retreats.length?('Se retira'+(retreats.length>1?'n ':' ')+retreats.join(' y ')+'.'):
     'Ambos bandos conservan sus jugadores.';
   entries=[
    [k?'¡Baja confirmada en '+arena+'!':
      retreats.length?'¡Retirada tras '+arena+'!':'Intercambio en '+arena,
     actor+' presiona a '+target+'. '+impacts+'. '+resolution],
    [k?'Una eliminación abre espacio para '+club:
      'La vida decide '+arena,
     club+' encuentra el combate en '+arena+'. '+impacts+'. '+resolution],
    [k?'¡El daño termina en kill!':
      retreats.length?'¡No hay baja, pero ceden terreno!':'Intercambio sin víctimas',
     actor+' encabeza el ataque. '+impacts+'. '+resolution],
    [k?'¡'+club+' gana el enfrentamiento!':
      'Se desgastan en '+arena,
     'Daño registrado: '+f.impacts.map(hit=>who(hit.id)+' pierde '+hit.damage+' puntos').join('; ')+
     '. '+resolution]
   ];
  }else if(f.action==='gank'){
   const lane=laneLabel[f.lane],victim=who(f.victimIds[0]);
   entries=[
    ['¡Aparece el jungla en '+lane+'!',who(f.initiatorId)+' '+({rio:'llega desde el río',jungla:'llega desde la jungla',tribush:'entra por el acceso inferior',flanco:'entra por un flanco'}[f.route]||'entra en la zona')+' y '+actor+' elimina a '+victim+'. Visión rival estimada: '+f.defenderVision+'/100.'],
    ['La emboscada funciona en '+lane,club+' aprovecha un hueco de visión. '+actor+' consigue la baja de '+victim+' tras la entrada de '+who(f.initiatorId)+'.'],
    ['Castigan el carril '+lane,victim+' cae ante '+actor+'. La entrada de '+who(f.initiatorId)+' convierte la oportunidad en una eliminación.'],
    ['¡Gank decisivo en '+lane+'!',who(f.initiatorId)+' encuentra el acceso al carril; '+actor+' firma el asesinato sobre '+victim+'.']
   ];
  }else if(f.action==='gank_avoided'){
   const lane=laneLabel[f.lane],target=who(f.targetId);
   entries=[
    ['El gank no consigue baja en '+lane,actor+' se aproxima por '+({rio:'el río',jungla:'la jungla',flanco:'un flanco',tribush:'el acceso inferior'}[f.route]||'la jungla')+
       ', pero '+target+' evita la eliminación. No cambia el marcador.'],
    ['La visita del jungla no prospera',target+' reacciona a la presencia de '+actor+
       ' en '+lane+'. La emboscada termina sin asesinatos.'],
    ['Una rotación sin recompensa',actor+' abandona sus campamentos para acercarse a '+lane+
       ', pero '+target+' sobrevive y no se registra ninguna baja.']
   ];
  }else if(f.action==='skirmish'){
   const place=f.zone==='dragon_pit'?'Dragón':'Barón',target=who(f.targetId);
   entries=f.outcome==='kill'?[
    ['¡Superioridad decisiva junto a '+place+'!',club+' reúne '+f.attackerCount+
      ' profesionales ante '+f.defenderCount+'. '+actor+' elimina a '+target+
      ' después de '+f.damage+' puntos de daño.'],
    ['¡Cae '+target+' cerca de '+place+'!',actor+' aprovecha el '+f.attackerCount+
      ' contra '+f.defenderCount+' de '+club+'. '+target+' no consigue escapar.'],
    ['¡Escaramuza convertida en baja!',club+' obliga a '+target+
      ' a pelear en inferioridad junto a '+place+'. '+actor+' consigue la eliminación.']
   ]:[
    ['¡'+target+' escapa de '+place+'!',club+' presiona '+f.attackerCount+
      ' contra '+f.defenderCount+'. '+target+' recibe '+f.damage+
      ' de daño, queda con '+f.hpAfter+'% de vida y se retira. Sin bajas.'],
    ['Ventaja numérica, pero sin eliminación',actor+' y sus compañeros amenazan a '+
      target+' cerca de '+place+'. '+target+' sobrevive con '+f.hpAfter+
      '% de vida y cede la zona.'],
    ['¡Retirada a tiempo junto a '+place+'!',club+' controla el encuentro '+
      f.attackerCount+' contra '+f.defenderCount+', pero '+target+
      ' retrocede con '+f.hpAfter+'% de vida. No se registra kill.']
   ];
  }else if(f.action==='item_purchase'){
   entries=[
    [actor+' vuelve con equipamiento',actor+' compra '+f.itemName+' en la base por '+f.goldCost+' de oro.'],
    ['Nueva inversión de '+club,actor+' convierte su oro en '+f.itemName+'. El próximo duelo tendrá otro balance.'],
    [actor+' alcanza un pico de poder',club+' invierte en '+f.itemName+' después de regresar físicamente a base.']
   ];
  }else if(f.action==='plate'){
   const lane=laneLabel[f.lane];
   entries=[
    ['¡Placa para '+club+'!',actor+' obtiene oro por la placa '+f.plate+' de la torre '+f.stage+' en '+lane+'.'],
    ['Presión rentable en '+lane,club+' aprovecha una oleada y gana '+f.goldReward+' de oro en placas con '+actor+'.'],
    ['La oleada golpea la estructura',actor+' participa en el daño de la torre de '+lane+' y convierte presión en recompensa.']
   ];
  }else if(f.action==='tower'){
   const layer=['','exterior','interior','de base'][f.stage],lane=laneLabel[f.lane];
   entries=f.soloSplitpush?[
    ['¡Splitpush en '+lane+'!',actor+' derriba por su cuenta la torre '+layer+
      ' de '+enemy+'. La oleada llegó y ningún defensor estaba cerca.'],
    ['La presión lateral se convierte en oro',club+' consigue la torre '+layer+
      ' en '+lane+' gracias a la presión individual de '+actor+'.'],
    ['¡'+enemy+' descuida '+lane+'!',actor+' aprovecha la ruta desprotegida y conquista la torre '+layer+'.']
   ]:[
    ['¡Se abre '+lane+'!',actor+' participa en la caída de la torre '+layer+' de '+enemy+'. '+club+' convierte presión en una estructura.'],
    ['Una estructura menos para '+enemy,'La torre '+layer+' de '+lane+' queda destruida. '+actor+' lidera el empuje de '+club+'.'],
    ['La presión se convierte en torre',club+' derriba la torre '+layer+' del carril '+lane+'. '+actor+' consta entre los protagonistas.'],
    ['Cede la defensa de '+lane,enemy+' pierde su torre '+layer+'; '+club+' gana espacio para seguir avanzando.']
   ];
  }else if(f.action==='dragon'){
   entries=[
    ['Dragón para '+club,actor+' participa en el objetivo. Ya son '+f.ordinal+' dragones para '+club+'.'],
    ['Controlan el foso inferior',club+' asegura su dragón número '+f.ordinal+' con '+actor+' entre los participantes.'],
    ['¡Objetivo elemental asegurado!',actor+' aparece entre quienes consiguen el dragón '+f.ordinal+' de '+club+'.'],
    ['El río da sus frutos',club+' confirma su '+f.ordinal+'.º dragón del encuentro; '+actor+' figura en la jugada.']
   ];
  }else if(f.action==='baron'){
   entries=f.stolen?[
    ['¡Robo de Barón!',enemy+' inició el objetivo, pero '+actor+', jungla de '+club+', se lo lleva con Smite.'],
    ['¡El Barón cambia de manos!',actor+' interviene con Smite y roba el Barón que había empezado '+enemy+'.'],
    ['¡Sorpresa en el foso superior!',club+' consigue un robo de Barón acreditado a '+actor+'.']
   ]:[
    ['Barón controlado por '+club,actor+' participa en la toma del objetivo superior; '+club+' añade un Barón a su marcador.'],
    ['¡Se llevan el Barón!',club+' asegura el objetivo con '+actor+' entre quienes participan.'],
    ['Impulso desde el foso',actor+' acompaña a '+club+' en la captura del Barón.']
   ];
  }else if(f.action==='teamfight'){
   const k=f.victimIds.length,extra=f.ace?' ¡Exterminio confirmado!':'',penta=k===5?'¡PENTAKILL! ':'';
   entries=[
    [penta+'Pelea favorable para '+club,actor+' consigue '+k+' eliminaciones confirmadas contra '+enemy+'.'+extra],
    [penta+'¡Se impone '+club+'!',actor+' lidera el intercambio con '+k+' bajas reales.'+extra],
    [penta+'La pelea cambia de color',club+' vence en el enfrentamiento y '+actor+' firma '+k+' eliminaciones.'+extra],
    [penta+'Choque de equipos',actor+' aparece como autor de '+k+' bajas para '+club+'.'+extra]
   ];
  }else if(f.action==='nexus'){
   entries=[
    ['¡NEXO DESTRUIDO!',club+' completa el asedio a la base de '+enemy+'. '+actor+' figura entre los atacantes finales.'],
    ['¡CAE EL NEXO!',club+' encuentra la ruta abierta y cierra el mapa ante '+enemy+'. '+actor+' participa en el último avance.'],
    ['¡VICTORIA DE '+club+'!',enemy+' no puede sostener su nexo. '+actor+' está entre quienes cierran el encuentro.']
   ];
  }else return null;
  const result=choice(entries,seed,i,f.action);
  return {title:result[0],body:result[1]};
 });

 const insights=[],lastTopic=new Map();
 const offer=(list,t,topic,team,title,body,evidence={},priority=4)=>{
  if(t-(lastTopic.get(topic)??-100)<5)return;
  list.push({topic,teamId:team||null,title,body,evidence,priority});
 };
 for(let index=1;index<match.frames.length;index++){
  const frame=match.frames[index],t=frame.minute;
  if(frame.winner)continue;
  if(t%2!==0&&hash(seed,t,'odd')%3!==0)continue;
  const previous=match.frames[Math.max(0,index-3)];
  const f=frame,pressure=f.map?.lanes||{},vision=f.map?.riverVision||{};
  const diff=f.gold[a]-f.gold[b],absGold=Math.abs(diff),goldLead=diff>=0?a:b;
  const candidates=[];
  const lane=choice(LANES,seed,t,'lane'),ctx=pressure[lane];
  if(ctx){
   const delta=ctx.pressure[a]-50;
   if(Math.abs(delta)>=7){
    const leader=delta>0?a:b,share=ctx.pressure[leader];
    const h=choice(['Prioridad en '+laneLabel[lane],'El empuje cambia el carril '+laneLabel[lane],
      'Una línea inclina la balanza','El mapa se abre por '+laneLabel[lane]],seed,t,'push');
    offer(candidates,t,'lane-'+lane,leader,h,name(leader)+' controla aproximadamente el '+share+
      '% de presión en el carril '+laneLabel[lane]+'. Es espacio ganado, no una torre destruida.',
      {lane,share},6);
   }else if(t<22){
    offer(candidates,t,'even-'+lane,null,'Duelo paciente en '+laneLabel[lane],
     'El carril '+laneLabel[lane]+' sigue ajustado ('+ctx.pressure[a]+'% frente a '+
      ctx.pressure[b]+'%). Nadie domina claramente el avance.',{lane},3);
   }
   const sight=ctx.vision[a]-ctx.vision[b];
   if(Math.abs(sight)>=9){
    const better=sight>0?a:b;
    const h=choice(['Lectura de visión en '+laneLabel[lane],'El flanco exige respeto',
      'Un corredor menos seguro','La información también cuenta'],seed,t,'vision');
    offer(candidates,t,'vision-'+lane,better,h,
      name(better)+' tiene mejor visión estimada en '+laneLabel[lane]+' ('+ctx.vision[better]+
      '/100 frente a '+ctx.vision[foe(better)]+'/100). Las emboscadas allí encuentran más resistencia.',
      {lane,vision:ctx.vision[better]},7);
   }
  }
  const riverDiff=(vision[a]||50)-(vision[b]||50);
  if(Math.abs(riverDiff)>=7){
   const better=riverDiff>0?a:b;
   offer(candidates,t,'river',better,choice(['Se disputa el control del río',
      'La información abre el mapa','Preparación alrededor del río'],seed,t,'river'),
      name(better)+' tiene una lectura del río superior ('+vision[better]+'/100 frente a '+
      vision[foe(better)]+'/100). Eso ayuda a anticipar disputas por objetivos.',
      {riverVision:vision[better]},8);
  }
  if(absGold>=1800){
   offer(candidates,t,'gold',goldLead,choice(['La ventaja económica exige respuesta',
       'El oro empieza a pesar','Margen creciente','La economía cambia las decisiones'],seed,t,'gold'),
     name(goldLead)+' suma cerca de '+(absGold/1000).toFixed(1)+'k de oro más que '+
     name(foe(goldLead))+'. Ese margen condiciona los próximos intercambios.',
     {goldLead:absGold},5);
  }
  const previousDiff=previous.gold[a]-previous.gold[b];
  if(Math.sign(previousDiff)!==Math.sign(diff)&&Math.abs(previousDiff)>500&&absGold>500&&t>=10){
   offer(candidates,t,'comeback',goldLead,'¡La ventaja cambia de lado!',
    name(goldLead)+' pasó de ir por detrás en oro a liderar por '+
    (absGold/1000).toFixed(1)+'k. La partida ya no sigue el mismo rumbo.',
    {before:previousDiff,after:diff},12);
  }
  const totalKills=f.kills[a]+f.kills[b];
  if(t>=7&&totalKills===0){
   offer(candidates,t,'pacific',null,'Nadie quiere regalar la primera sangre',
    t+' minutos y cero asesinatos. La tensión se acumula en presión, oro y objetivos.',
    {kills:0},9);
  }
  if(t>=10&&Math.abs(f.kills[a]-f.kills[b])<=1&&totalKills>=3){
   offer(candidates,t,'close',null,'El marcador no separa a los rivales',
    f.kills[a]+' a '+f.kills[b]+' en asesinatos. Las estructuras y el oro podrían pesar más que el resultado de los duelos.',
    {killsA:f.kills[a],killsB:f.kills[b]},4);
  }
  if(t>=18&&t<=22){
   offer(candidates,t,'baron-window',null,'Todas las miradas van al foso superior',
    t>=20?'El Barón ya puede aparecer. La visión y los junglas serán importantes si alguien se compromete.':
    'Se acerca el minuto de aparición del Barón; el control de río puede facilitar o frustrar un intento.',
    {minute:t},6);
  }
  if(t>=4&&t<=8){
   const better=(vision[a]||50)>=(vision[b]||50)?a:b;
   offer(candidates,t,'dragon-window',null,'El primer dragón cambia las prioridades',
    'Desde el minuto 5 puede disputarse. La visión estimada del río favorece ahora a '+
    name(better)+', pero todavía hay que ganar el objetivo.',{minute:t},6);
  }
  for(const id of [a,b]){
   const rivals=f.towers[foe(id)],ours=f.towers[id];
   if(ours>=3&&ours>rivals){
    offer(candidates,t,'tower-lead-'+id,id,'La ventaja también se mide en torres',
     name(id)+' ha derribado '+ours+' estructuras frente a '+rivals+' de '+
     name(foe(id))+'. Las rutas hacia la base rival son más accesibles.',
     {towers:ours},7);
   }
   const adc=clubs[id].lineup.ADC,record=f.playerStats?.[adc];
   if(t>=14&&record?.kills>=3&&record.deaths===0){
    offer(candidates,t,'carry-'+id,id,choice(['El tirador sigue sin caer',
      'El carry mantiene la racha','Amenaza desde la retaguardia'],seed,t,id,'carry'),
      who(adc)+' tiene '+record.kills+' asesinatos y ninguna muerte. Protegerlo en el siguiente combate puede ser decisivo.',
      {playerId:adc,kills:record.kills},9);
   }
   const dead=Object.values(f.minimap?.players||{}).filter(p=>p.teamId===foe(id)&&!p.alive).length;
   if(t>=8&&dead>=2){
    offer(candidates,t,'numbers-'+id,id,'La balanza se inclina por número',
     name(foe(id))+' tiene '+dead+' jugadores esperando reaparecer. '+
     name(id)+' dispone de una oportunidad breve para presionar.',
     {rivalDead:dead},10);
   }
   if(t>=25&&['TOP','MID','BOT'].some(l=>f.minimap?.structures?.[foe(id)]?.[l]===3)){
    offer(candidates,t,'open-'+id,id,'¡Ya hay una vía hacia el nexo!',
     name(id)+' ha destruido las tres torres de al menos un carril rival. El asedio es posible si mantienen suficientes atacantes vivos.',
     {open:true},11);
   }
  }
  if(!candidates.length)continue;
  candidates.sort((x,y)=>(y.priority+hash(seed,t,y.topic)%7)-
                       (x.priority+hash(seed,t,x.topic)%7));
  const selected=candidates[0];
  lastTopic.set(selected.topic,t);
  insights.push({minute:t,time:String(t).padStart(2,'0')+':59',
    title:selected.title,body:selected.body,kind:'insight',teamId:selected.teamId,
    topic:selected.topic,evidence:selected.evidence});
 }
 return {version:1,seed,variants,insights};
}
function attachBroadcast(match,world,seed){
 match.broadcast=createBroadcast(match,world,seed);
 return match;
}
function broadcastFeed(match){
 const variants=match.broadcast?.variants;
 const originals=match.events.map((e,i)=>({...e,
   title:variants?.[i]?.title||e.title,
   body:variants?.[i]?.body||e.body,source:'match',eventIndex:i}));
 const insights=(match.broadcast?.insights||[]).map(e=>({...e,source:'insight'}));
 return [...originals,...insights].sort((x,y)=>x.minute-y.minute||x.time.localeCompare(y.time));
}
function feedCountAt(match,frameIndex){
 const frame=match.frames[Math.max(0,Math.min(match.frames.length-1,frameIndex))];
 if(!frame)return 0;
 let count=frame.eventsCount;
 for(const e of match.broadcast?.insights||[])if(e.minute<=frame.minute)count++;
 return count;
}
function auditBroadcast(match,world){
 if(!match.broadcast)return ['No hay registro nuevo de RiftCast'];
 return JSON.stringify(match.broadcast)===JSON.stringify(createBroadcast(match,world,match.broadcast.seed))?
 []:['La narración ampliada no coincide con los datos del partido'];
}
core.broadcastInterval=broadcastInterval;
core.createBroadcast=createBroadcast;
core.attachBroadcast=attachBroadcast;
core.broadcastFeed=broadcastFeed;
core.feedCountAt=feedCountAt;
core.auditBroadcast=auditBroadcast;
})(globalThis);
