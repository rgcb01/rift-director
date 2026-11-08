/* Rift Director — match-event audit. No DOM, RNG or changes to saved games.
 * Events from pre-M1.2 saves may lack facts; the audit is only required for new matches.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const roles = new Set(core.ROLES);
  const counters = ['kills', 'towers', 'dragons', 'barons'];
  const integer = n => Number.isSafeInteger(n) && n >= 0;

  function auditMatch(match, world) {
    const errors = [];
    const fail = (message) => errors.push(message);
    const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
    if (!isRecord(match) || !isRecord(match.fixture) || !Array.isArray(match.events) || !Array.isArray(match.frames)) {
      return ['Partido sin fixture, eventos o frames válidos.'];
    }
    const { a, b } = match.fixture;
    if (!a || !b || a === b || ![a,b].includes(match.winner)) fail('Ganador o equipos inválidos.');
    const clubs = new Map(world.clubs.map(c => [c.id, c]));
    const players = new Map(world.players.map(p => [p.id, p]));
    if (!clubs.has(a) || !clubs.has(b)) fail('Club del partido inexistente.');
    if (errors.length) return errors;
    const totals = Object.fromEntries(counters.map(k => [k, {[a]:0,[b]:0}]));
    const lanes = {[a]:{TOP:0,MID:0,BOT:0}, [b]:{TOP:0,MID:0,BOT:0}};
    const dead = new Map();
    const plateCounts={};
    const combatants = [a,b].flatMap(id => core.ROLES.map(role => players.get(clubs.get(id).lineup[role])));
    let stats;
    try { stats = core.createPlayerStats(combatants); }
    catch (error) { return ['Participantes de partida inválidos: '+error.message]; }
    function validateRows(actual, minute) {
      if (!isRecord(actual) || Object.keys(actual).length !== Object.keys(stats).length) {
        fail('Estadísticas individuales ausentes/incompletas: minuto '+minute);
        return;
      }
      for (const [id, correct] of Object.entries(stats)) {
        if (!isRecord(actual[id])) { fail('Falta registro de jugador: '+id); continue; }
        for (const key of core.MATCH_STAT_FIELDS) {
          if (!integer(actual[id][key]) || actual[id][key] !== correct[key]) {
            fail('KDA/objetivo individual distinto a eventos: '+id+' / '+key+' minuto '+minute);
          }
        }
      }
    }
    function verifyParticipants(event, facts, minute) {
      if (!Array.isArray(facts.participantIds) || !facts.participantIds.includes(facts.actorId) ||
          new Set(facts.participantIds).size !== facts.participantIds.length) {
        fail('Lista inválida de participantes en objetivo.'); return;
      }
      for (const id of facts.participantIds) {
        const p = players.get(id);
        if (!p || p.teamId !== event.teamId || clubs.get(event.teamId).lineup[p.role] !== id ||
            !alive(p, minute)) fail('Participación falsa o de jugador muerto: '+id);
      }
    }
    let nextDragon = 5, nextBaron = 20, nextEvent = 0, previousMinute = -1;
    let nexusCount = 0, lastEventMinute = 0;

    function alive(p, t) { return p && (dead.get(p.id) ?? 0) <= t; }
    function actor(facts, event, minute) {
      const p = players.get(facts.actorId);
      if (!p || !roles.has(p.role) || p.teamId !== event.teamId || clubs.get(event.teamId).lineup[p.role] !== p.id) fail('Actor fuera del equipo o rol inválido: ' + facts.actorId);
      else if (!alive(p, minute)) fail('Un jugador muerto realiza una acción: ' + p.id);
      return p;
    }
    function recordKills(event, facts, minute, frame) {
      const killer = actor(facts, event, minute);
      const victims = facts.victimIds;
      if (!Array.isArray(victims) || !victims.length || new Set(victims).size !== victims.length) {
        fail('Victimas inválidas o repetidas.'); return;
      }
      for (const id of victims) {
        const victim = players.get(id);
        if (!victim || victim.teamId !== (event.teamId === a ? b : a)) {
          fail('Una baja no pertenece al rival: ' + id); continue;
        }
        if (!alive(victim, minute)) fail('La misma víctima muere sin reaparecer: ' + id);
        dead.set(id, minute + (minute < 16 ? 2 : minute < 29 ? 3 : 4));
        totals.kills[event.teamId]++;
      }
      if (!Array.isArray(facts.assistIds) || new Set(facts.assistIds).size !== facts.assistIds.length ||
          facts.assistIds.includes(facts.actorId)) fail('Asistencias repetidas o autor inválido.');
      else for (const id of facts.assistIds) {
        const helper = players.get(id);
        if (!helper || helper.teamId !== event.teamId ||
            clubs.get(event.teamId).lineup[helper.role] !== helper.id || !alive(helper, minute)) {
          fail('Asistencia falsa o jugador muerto: '+id);
        }
      }
      if (facts.action === 'gank') {
        const j = players.get(facts.initiatorId);
        if (!j || j.role !== 'JUN' || j.teamId !== event.teamId || !alive(j, minute)) fail('Gank sin jungla vivo.');
        if (victims.length !== 1) fail('Gank con múltiples victimas no modeladas.');
        const lane=frame.map?.lanes?.[facts.lane];
        const physical= facts.spatialVersion===2;
        const expectedRoute=physical
          ? (core.Navigation?.adjacency?.[facts.initiatorNode] ? core.Navigation.gankApproach(facts.initiatorNode,facts.lane) : null)
          : core.gankRoute(facts.lane,lane,event.teamId,event.teamId===a?b:a);
        if (!['TOP','MID','BOT'].includes(facts.lane) || !lane ||
            !(physical?['rio','tribush','flanco','jungla']:['rio','tribush','flanco']).includes(facts.route) ||
            facts.route!==expectedRoute ||
            facts.attackerPressure!==lane.pressure[event.teamId] ||
            facts.defenderVision!==lane.vision[event.teamId===a?b:a])
          fail('Gank con ruta, presión o visión que no corresponde al mapa.');
      }
      if (facts.action === 'teamfight') {
        if (facts.ace !== undefined) {
          const defeated = event.teamId === a ? b : a;
          const wiped = [...players.values()].filter(p => p.teamId === defeated && clubs.get(defeated).lineup[p.role] === p.id)
            .every(p => !alive(p, minute));
          if (Boolean(facts.ace) !== wiped) fail('Exterminio narrado sin cinco enemigos muertos.');
        }
        if (facts.multiKill !== victims.length) fail('Multikill no coincide con bajas reales.');
        if (event.title.includes('PENTAKILL') !== (victims.length === 5)) fail('Pentakill sin cinco bajas del mismo autor.');
        if (event.title.includes('CUÁDRUPLE') !== (victims.length === 4)) fail('Cuádruple no coincide con bajas.');
      }
      if (!killer) fail('Falta el autor de una eliminación.');
    }

    function applyEvent(event,frame) {
      if (!isRecord(event) || !integer(event.minute) || !isRecord(event.facts)) return;
      const { facts } = event, t = event.minute;
      if (![a,b].includes(event.teamId)) { fail('Equipo del evento inexistente.'); return; }
      if (facts.action === 'gank' || facts.action === 'teamfight') {
        recordKills(event, facts, t,frame);
      } else if(facts.action==='lane_trade'||facts.action==='clash'){
        if(facts.combatVersion!==1||!['lane','teamfight'].includes(facts.mode))
          fail('Intercambio sin daño verificable.');
        if(facts.action==='lane_trade'&&facts.mode!=='lane'||
           facts.action==='clash'&&facts.mode!=='teamfight')
          fail('Tipo de combate distinto de su zona.');
        if(facts.outcome==='kill'){
          if(facts.action!=='lane_trade')fail('Clash sin etiqueta de kill.');
          recordKills(event,facts,t,frame);
        }else {
          if(facts.victimIds?.length)fail('Daño no letal convertido en baja.');
          actor(facts,event,t);
        }
      } else if (facts.action === 'skirmish') {
        if (facts.healthVersion!==1||!['dragon_pit','baron_pit'].includes(facts.zone)||
            facts.node!==facts.zone||!['kill','retreat'].includes(facts.outcome)||
            !integer(facts.attackerCount)||facts.attackerCount<2||
            !integer(facts.defenderCount)||facts.defenderCount<1)
          fail('Escaramuza sin resultado, zona o superioridad válida.');
        const target=players.get(facts.targetId);
        if(!target||target.teamId===event.teamId||!alive(target,t))
          fail('Objetivo de escaramuza no era rival vivo.');
        if(!Array.isArray(facts.participantIds)||facts.participantIds.length<2||
           !facts.participantIds.includes(facts.actorId)||
           new Set(facts.participantIds).size!==facts.participantIds.length)
          fail('Escaramuza sin dos participantes únicos.');
        else for(const id of facts.participantIds){
          const p=players.get(id);
          if(!p||p.teamId!==event.teamId||!alive(p,t))fail('Atacante inválido en escaramuza: '+id);
        }
        if(!integer(facts.hpBefore)||facts.hpBefore<1||facts.hpBefore>100||
           !integer(facts.damage)||facts.damage<18||facts.damage>120||
           facts.hpAfter!==Math.max(0,facts.hpBefore-facts.damage))
          fail('Daño incompatible con vida registrada.');
        if(facts.outcome==='kill'){
          if(facts.hpAfter!==0||!Array.isArray(facts.victimIds)||
             facts.victimIds.length!==1||facts.victimIds[0]!==facts.targetId)
            fail('Escaramuza sin baja justificada por daño.');
          recordKills(event,facts,t,frame);
        }else{
          actor(facts,event,t);
          if(facts.hpAfter<1||facts.victimIds?.length||facts.assistIds?.length)
            fail('Retirada no puede entregar kills ni asistencias.');
          if(!core.Navigation.adjacency[facts.retreatGoal])
            fail('Retirada sin ruta válida.');
        }
      } else if (facts.action === 'gank_avoided') {
        const j = actor(facts,event,t), target=players.get(facts.targetId);
        if (!j || j.role!=='JUN' || facts.initiatorId!==facts.actorId)
          fail('Gank fallido sin jungla válido.');
        if (!target || target.teamId===(event.teamId)||!alive(target,t) ||
            clubs.get(target.teamId)?.lineup[target.role]!==target.id)
          fail('Gank fallido sin rival vivo.');
        const route=facts.initiatorNode&&core.Navigation?.adjacency?.[facts.initiatorNode]?
           core.Navigation.gankApproach(facts.initiatorNode,facts.lane):null;
        if (!['TOP','MID','BOT'].includes(facts.lane) || facts.spatialVersion!==2 ||
            facts.plannedGankVersion!==1 || facts.route!==route)
          fail('Gank fallido sin ruta y carril verificables.');
        // No elimination, structures, gold or player statistics are awarded.
      } else if (facts.action === 'item_purchase') {
        const buyer=actor(facts,event,t);
        verifyParticipants(event,facts,t);
        const side=event.teamId===a?'blue':'red';
        const item=core.PowerEconomy.ITEM_CATALOG.find(x=>x.id===facts.itemId);
        if(!buyer||!item||item.cost!==facts.goldCost||
           ![side+'_fountain',side+'_nexus'].includes(facts.node)||
           !integer(facts.slot)||facts.slot<1||facts.slot>3||
           !integer(facts.level)||facts.level<1||facts.level>18)
         fail('Compra sin jugador en base, nivel o precio válido.');
        const moment=match.moments?.[match.events.indexOf(event)];
        if(moment?.navigation?.before?.[facts.actorId]?.node!==facts.node)
         fail('Compra inventada fuera de la base: '+facts.actorId);
      } else if (facts.action === 'plate') {
        actor(facts,event,t);verifyParticipants(event,facts,t);
        const defender=event.teamId===a?b:a;
        const lane=facts.lane,stage=facts.stage;
        if(!['TOP','MID','BOT'].includes(lane)||!integer(stage)||
           stage!==lanes[defender]?.[lane]+1||stage>3||
           !integer(facts.plate)||facts.plate>3||
           !integer(facts.goldReward)||facts.goldReward<55)
          fail('Placa sin estructura o recompensa válida.');
        else {
          const plateKey=defender+'|'+lane+'|'+stage;
          if(!plateCounts[plateKey])plateCounts[plateKey]=0;
          plateCounts[plateKey]++;
          if(plateCounts[plateKey]!==facts.plate)
            fail('Placa fuera de secuencia.');
        }
      } else if (facts.action === 'tower') {
        actor(facts, event, t);verifyParticipants(event,facts,t);
        const target = event.teamId === a ? b : a;
        if (!['TOP','MID','BOT'].includes(facts.lane)) fail('Línea de torre inválida.');
        else {
          lanes[target][facts.lane]++;
          if (lanes[target][facts.lane] > 3 || facts.stage !== lanes[target][facts.lane]) fail('Torre fuera de orden.');
          totals.towers[event.teamId]++;
        }
      } else if (facts.action === 'dragon') {
        actor(facts, event, t);verifyParticipants(event,facts,t);
        if (t < nextDragon) fail('Dragón antes de su aparición/reaparición.');
        nextDragon = t + 5;
        totals.dragons[event.teamId]++;
        if (facts.ordinal !== totals.dragons[event.teamId]) fail('Número de dragón incoherente.');
      } else if (facts.action === 'baron') {
        const p = actor(facts, event, t);verifyParticipants(event,facts,t);
        if (t < nextBaron) fail('Barón antes de aparecer o reaparecer.');
        nextBaron = t + 7;
        totals.barons[event.teamId]++;
        if (facts.stolen && (!p || p.role !== 'JUN' || facts.smite !== true)) fail('Robo con Smite atribuido a alguien que no es jungla.');
        if (facts.smite && (!p || p.role !== 'JUN')) fail('Uso inválido de Smite.');
        if (facts.stolen && (!facts.initiatorTeamId || facts.initiatorTeamId === event.teamId)) fail('Robo sin equipo rival iniciador.');
      } else if (facts.action === 'nexus') {
        actor(facts, event, t);
        const target = event.teamId === a ? b : a;
        if (!Object.values(lanes[target]).some(n => n === 3)) fail('Nexo destruido sin una línea abierta.');
        if (match.winner !== event.teamId) fail('Equipo destructor no coincide con ganador.');
        nexusCount++;
      } else {
        fail('Tipo de acción desconocido: ' + facts.action);
      }
      try { core.applyPlayerEvent(stats, event); }
      catch (error) { fail('Fallo de estadística individual: '+error.message); }
    }

    for (const frame of match.frames) {
      if (!isRecord(frame) || !integer(frame.minute) || frame.minute < previousMinute) {
        fail('Frames en orden inválido.'); continue;
      }
      previousMinute = frame.minute;
      while (nextEvent < match.events.length && match.events[nextEvent].minute <= frame.minute) {
        const e = match.events[nextEvent++];
        if (!isRecord(e) || !integer(e.minute) || e.minute < lastEventMinute || e.minute > frame.minute) {
          fail('Evento fuera de orden.'); continue;
        }
        lastEventMinute = e.minute;
        if (e.facts) applyEvent(e,frame);
        else if (['goal','fight','end'].includes(e.kind)) fail('Falta evidencia estructurada para: ' + e.title);
      }
      if (frame.map) {
        const map=frame.map;
        if (map.minute!==frame.minute || !isRecord(map.lanes) || !isRecord(map.riverVision)) {
          fail('Estado de mapa inválido: minuto '+frame.minute);
        } else {
          for (const lane of core.LANES) {
            const data=map.lanes[lane];
            if (!isRecord(data) || !isRecord(data.pressure) || !isRecord(data.vision)) {
              fail('Carril sin presión o visión: '+lane);continue;
            }
            for (const id of [a,b])for (const field of ['pressure','vision'])
              if (!integer(data[field][id]) || data[field][id]>100)
                fail('Valor de mapa fuera de límites: '+lane+' '+field);
            if (data.pressure[a]+data.pressure[b]!==100)
              fail('La presión de carril debe sumar 100: '+lane);
          }
          for(const id of [a,b])if (!integer(map.riverVision[id]) || map.riverVision[id]>100)
            fail('Visión del río fuera de límites.');
        }
      } else fail('Frame sin estado táctico de mapa.');
      if (frame.eventsCount !== nextEvent) fail('Número de eventos del frame incoherente.');
      for (const k of counters) {
        for (const id of [a,b]) {
          if (!isRecord(frame[k]) || !integer(frame[k][id]) || frame[k][id] !== totals[k][id]) {
            fail('Marcador no coincide con eventos: ' + k + ' ' + id + ' min ' + frame.minute);
          }
        }
      }
      validateRows(frame.playerStats,frame.minute);
    }
    if(match.moments){
      for(let i=0;i<match.events.length;i++){
        const f=match.events[i].facts;
        if(f?.action!=='skirmish')continue;
        const moment=match.moments[i];
        if(!moment?.health||moment.health[f.targetId]!==f.hpAfter)
          fail('Vida de escaramuza no coincide con instantánea: '+i);
      }
    }
    if(match.moments&&core.Encounters?.audit){
      for(const err of core.Encounters.audit(match,world))fail(err);
    }
    validateRows(match.playerStats,'final');
    const teamTotal = { [a]:0,[b]:0 }, deaths = { [a]:0,[b]:0 };
    for (const [id,row] of Object.entries(stats)) {
      const teamId = players.get(id)?.teamId;
      if (teamId in teamTotal) {teamTotal[teamId] += row.kills;deaths[teamId] += row.deaths;}
    }
    if (teamTotal[a] !== totals.kills[a] || teamTotal[b] !== totals.kills[b] ||
        deaths[a] !== totals.kills[b] || deaths[b] !== totals.kills[a])
      fail('El total de kills y muertes individuales no coincide con el score.');
    if (nextEvent !== match.events.length) fail('Eventos sin frame asociado.');
    if (match.frames.length < 2 || match.frames[0].minute !== 0) fail('Partido sin comienzo.');
    if (match.frames.at(-1)?.winner !== match.winner) fail('Frame final sin ganador.');
    if (nexusCount !== 1 || match.events.at(-1)?.facts?.action !== 'nexus') {
      fail('Partido sin un único nexo destruido al final.');
    }
    return errors;
  }

  core.auditMatch = auditMatch;
})(globalThis);
