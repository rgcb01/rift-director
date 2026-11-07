/* Rift Director M1.3A — deterministic minimap projection of existing match events.
 * Render-only layer: it does NOT decide, create or validate sporting actions.
 * M1.3B will make spatial travel a gameplay constraint; do not infer travel realism here.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const graph = core.MiniGraph;
  const roles = ['TOP','JUN','MID','ADC','SUP'];
  const lanes = ['TOP','MID','BOT'];
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const clone = x => JSON.parse(JSON.stringify(x));
  const patterns = [[-17,-10],[0,-20],[17,-10],[-11,10],[12,12]];
  const duration = minute => minute<16 ? 2 : minute<29 ? 3 : 4;
  const point = (node) => graph.pointAt(node);
  const xy=(x,y)=>({x:Math.round(clamp(x,12,328)*10)/10,y:Math.round(clamp(y,12,328)*10)/10});
  const sideName = (teamId,a,b) => teamId===a ? 'blue' : teamId===b ? 'red' : null;
  function createProjector(match,world) {
    if(!match?.frames?.length || !Array.isArray(match.events))throw new Error('Partido sin frames o eventos');
    const [a,b]=[match.fixture.a,match.fixture.b];
    const clubA=world.clubs.find(c=>c.id===a),clubB=world.clubs.find(c=>c.id===b);
    if(!clubA||!clubB||a===b)throw new Error('Equipos de minimapa inválidos');
    const byTeam = {[a]:clubA,[b]:clubB};
    const playerIndex=new Map(),playersByTeam={[a]:[],[b]:[]};
    for(const team of [clubA,clubB]){
      for(const role of roles){
        const id=team.lineup[role],p=world.players.find(q=>q.id===id);
        if(!p || p.role!==role || p.teamId!==team.id || playerIndex.has(id))
          throw new Error('Alineación inválida del minimapa: '+team.id+' / '+role);
        playerIndex.set(id,{teamId:team.id,role});
        playersByTeam[team.id].push(id);
      }
    }
    return {a,b,byTeam,playerIndex,playersByTeam,events:match.events};
  }
  function nominalPosition(teamId,role,minute,frame,ctx,towers) {
    const {a,b}=ctx,side=teamId===a?'blue':'red';
    const opponent=teamId===a?b:a;
    if(role==='JUN' && minute<20) {
      const node=minute%9<5
        ? (side==='blue'?'blue_jungle_upper':'red_jungle_upper')
        : (side==='blue'?'blue_jungle_lower':'red_jungle_lower');
      return {...point(node),node};
    }
    const lane=role==='ADC'||role==='SUP'?'BOT':role==='JUN'?'MID':role;
    const pressure=frame.map?.lanes?.[lane]?.pressure?.[a] ?? 50;
    const takenA=towers[a][lane],takenB=towers[b][lane];
    const shift=clamp((pressure-50)*.0025 + (takenB-takenA)*.018,-.16,.16);
    const early=minute<12;
    const mid=minute>=12&&minute<26;
    let progress=(teamId===a?(early?.445:.46):(early?.555:.54))+shift;
    if(mid && role==='SUP'){
      const node=side==='blue'?'blue_jungle_lower':'red_jungle_upper';
      return {...point(node),node};
    }
    if(!early&&!mid && role!=='TOP'){
      // Late game: carry, support, jungler and mid move together towards a push.
      const midPressure=frame.map?.lanes?.MID?.pressure?.[a]??50;
      const lead=clamp((frame.gold[a]-frame.gold[b])/50000,-.11,.11);
      progress=clamp((teamId===a?.43:.57)+(midPressure-50)*.0018+lead,.24,.76);
      const p=graph.pointOnLane('MID',progress);
      const delta={JUN:[-13,-16],MID:[0,0],ADC:[14,11],SUP:[-13,14]}[role]||[0,0];
      return {...xy(p.x+delta[0],p.y+delta[1]),node:'mid_group'};
    }
    progress=clamp(progress,.27,.73);
    const p=graph.pointOnLane(lane,progress);
    const offset=role==='SUP' ? (teamId===a?[-14,-10]:[14,10]) : [0,0];
    return {...xy(p.x+offset[0],p.y+offset[1]),node:lane.toLowerCase()+'_lane'};
  }
  function overlayGroup(positions,ids,center,node){
    const valid=[...new Set(ids)].filter(id=>positions[id]?.alive);
    valid.forEach((id,index)=>{
      const [dx,dy]=patterns[index%patterns.length];
      positions[id]={...positions[id],...xy(center.x+dx,center.y+dy),node};
    });
  }
  function finalSiege(positions,ctx,event){
    const owner=event.teamId,target=owner===ctx.a?ctx.b:ctx.a;
    const targetSide=sideName(target,ctx.a,ctx.b);
    const nexus=point(targetSide+'_nexus');
    const approaching=ctx.playersByTeam[owner].filter(id=>positions[id].alive);
    const siegeOffsets=targetSide==='red'
      ? [[-40,13],[-28,40],[-4,52],[17,43],[13,17]]
      : [[-12,-33],[14,-48],[39,-28],[50,-6],[22,8]];
    approaching.forEach((id,index)=>{
      const [dx,dy]=siegeOffsets[index];
      positions[id]={...positions[id],...xy(nexus.x+dx,nexus.y+dy),node:targetSide+'_nexus'};
    });
    // Surviving defenders stay in their own base, never falsify a death.
    const defenders=ctx.playersByTeam[target].filter(id=>positions[id].alive);
    overlayGroup(positions,defenders,nexus,targetSide+'_nexus');
  }
  function projectMinute(frame,ctx,state){
    const {a,b}=ctx,t=frame.minute;
    const positions={};
    const spatial=Boolean(frame.navigation?.after);
    if(spatial){
      // Physical source of truth: same node before and after a fight unless the
      // fighter died. Offsets are presentational only, not a second location.
      const collisions=new Map();
      for(const teamId of [a,b])for(const id of ctx.playersByTeam[teamId]){
        const n=frame.navigation.after[id];
        if(!n||!graph.nodes[n.node])throw Error('Navegación inválida del jugador '+id);
        const current=collisions.get(n.node)||0;collisions.set(n.node,current+1);
        const offsets=[[0,0],[12,-10],[-12,10],[12,12],[-12,-12],[0,17],
          [17,0],[-17,0],[0,-17],[18,18]];
        const [dx,dy]=offsets[current%offsets.length],p=point(n.node);
        positions[id]={...xy(p.x+dx,p.y+dy),node:n.node,role:n.role,
          teamId,alive:n.alive,intent:n.intent,goal:n.goal,
          ...(Number.isInteger(frame.health?.[id])?{hp:frame.health[id]}:{})};
      }
    }else{
      for(const teamId of [a,b]){
        for(const id of ctx.playersByTeam[teamId]){
          const role=ctx.playerIndex.get(id).role;
          const alive=(state.deadUntil[id]||0)<=t;
          const base=alive?nominalPosition(teamId,role,t,frame,ctx,state.towers):
            {...point((teamId===a?'blue':'red')+'_fountain'),node:(teamId===a?'blue':'red')+'_fountain'};
          positions[id]={...base,role,teamId,alive};
        }
      }
    }
    let focused=null;
    for(const e of state.minuteEvents){
      const f=e.facts;
      if(!f)continue;
      focused={action:f.action,teamId:e.teamId,minute:e.minute};
      const foes=e.teamId===a?b:a;
      if(spatial)continue;
      if(f.action==='gank'){
        const location=graph.pointOnLane(f.lane,.5);
        const participating=[f.initiatorId,f.actorId,...(f.assistIds||[])];
        overlayGroup(positions,participating,location,f.lane.toLowerCase()+'_gank');
      }else if(f.action==='tower'){
        const loc=graph.towerPoint(sideName(foes,a,b),f.lane,f.stage);
        overlayGroup(positions,f.participantIds||[f.actorId],loc,f.lane.toLowerCase()+'_tower');
      }else if(f.action==='dragon'||f.action==='baron'){
        const node=f.action==='dragon'?'dragon_pit':'baron_pit';
        overlayGroup(positions,f.participantIds||[f.actorId],point(node),node);
        if(f.stolen){
          const j=ctx.playersByTeam[f.initiatorTeamId]?.find(id=>ctx.playerIndex.get(id).role==='JUN');
          if(j)overlayGroup(positions,[j],point(node),node);
        }
      }else if(f.action==='teamfight'){
        const lane=frame.map?.lanes?.MID;
        const pressure=lane?.pressure?.[a]??50;
        const center=graph.pointOnLane('MID',clamp(.5+(pressure-50)*.002,.39,.61));
        overlayGroup(positions,[f.actorId,...(f.assistIds||[])],center,'teamfight');
      }else if(f.action==='nexus'){
        finalSiege(positions,ctx,e);
      }
    }
    // Killed players must never appear active in an objective, gank or siege.
    for(const [id,p] of Object.entries(positions)){
      if(p.alive)continue;
      const node=(p.teamId===a?'blue':'red')+'_fountain';
      if(!spatial)positions[id]={...p,...point(node),node};
      else if(p.node!==node)throw Error('Muerto desplazado fuera de fuente');
    }
    const territory={};
    for(const lane of lanes)
      territory[lane]=clamp((frame.map?.lanes?.[lane]?.pressure?.[a]??50)/100,.05,.95);
    const riverA=frame.map?.riverVision?.[a]??50;
    const riverB=frame.map?.riverVision?.[b]??50;
    territory.upperRiver=clamp(riverA/(riverA+riverB),.05,.95);
    territory.lowerRiver=territory.upperRiver;
    return {
      minute:t,players:positions,structures:clone(state.towers),
      territory,focus:focused
    };
  }
  function attachMinimap(match,world){
    const ctx=createProjector(match,world),state={
      deadUntil:{},towers:{
        [ctx.a]:{TOP:0,MID:0,BOT:0},
        [ctx.b]:{TOP:0,MID:0,BOT:0}
      },minuteEvents:[]
    };
    let next=0;
    for(const frame of match.frames){
      state.minuteEvents=[];
      while(next<frame.eventsCount){
        const e=match.events[next++];
        if(!e)throw new Error('Índice de evento fuera del partido');
        if(e.minute>frame.minute)throw new Error('Evento posterior al frame');
        const f=e.facts;
        if(!f)continue;
        if(f.action==='tower'){
          const defending=e.teamId===ctx.a?ctx.b:ctx.a;
          if(!lanes.includes(f.lane)||state.towers[defending][f.lane]+1!==f.stage)
            throw new Error('Torre del minimapa fuera de secuencia');
          state.towers[defending][f.lane]=f.stage;
        }
        if(f.action==='gank'||f.action==='teamfight'||
          (f.action==='skirmish'&&f.outcome==='kill'))
          for(const id of f.victimIds){
            if(!ctx.playerIndex.has(id))throw new Error('Víctima no es participante');
            state.deadUntil[id]=e.minute+duration(e.minute);
          }
        if(e.minute===frame.minute)state.minuteEvents.push(e);
      }
      if(next!==frame.eventsCount)throw new Error('Cantidad de eventos incorrecta');
      const takenA=Object.values(state.towers[ctx.b]).reduce((n,v)=>n+v,0);
      const takenB=Object.values(state.towers[ctx.a]).reduce((n,v)=>n+v,0);
      if(frame.towers[ctx.a]!==takenA||frame.towers[ctx.b]!==takenB)
        throw new Error('Torres del minimapa no coinciden con el marcador');
      frame.minimap=projectMinute(frame,ctx,state);
    }
    return match;
  }
  function auditMinimap(match,world){
    const errors=[];
    if(!match?.frames?.length)return ['Partido sin frames'];
    let reprojected;
    try {
      // Project on a detached object; never mutate saved match or RNG while auditing.
      reprojected={...match,frames:match.frames.map(frame=>({...frame}))};
      attachMinimap(reprojected,world);
    }catch(e){return ['Error de proyección: '+e.message]}
    for(let i=0;i<match.frames.length;i++){
      const current=match.frames[i].minimap,expected=reprojected.frames[i].minimap;
      if(!current){errors.push('Frame sin minimapa en minuto '+match.frames[i].minute);continue;}
      if(JSON.stringify(current)!==JSON.stringify(expected))
        errors.push('Minimapa no coincide con eventos en minuto '+match.frames[i].minute);
      const positions=current.players||{};
      if(Object.keys(positions).length!==10)errors.push('No hay diez participantes en minuto '+current.minute);
      for(const p of Object.values(positions)){
        if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<12||p.x>328||p.y<12||p.y>328)
          errors.push('Posición visual inválida en minuto '+current.minute);
      }
    }
    const last=match.frames.at(-1)?.minimap;
    if(last?.focus?.action!=='nexus')errors.push('No hubo asedio final al nexo');
    return errors;
  }
  core.attachMinimap=attachMinimap;
  core.auditMinimap=auditMinimap;
})(globalThis);
