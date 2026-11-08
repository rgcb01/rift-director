/* Rift Director M1.3A — compact, accessible SVG minimap, no dependencies.
 * Consumes the SAME projected match frames as RiftCast; SVG never invents match events.
 */
((root) => {
  'use strict';
  const graph=root.RiftCore.MiniGraph;
  const LANES=['TOP','MID','BOT'];
  const labels={TOP:'Superior',MID:'Central',BOT:'Inferior',
    gank:'Gank',lane_trade:'Intercambio de línea',clash:'Pelea sin bajas',tower:'Torre',dragon:'Dragón',baron:'Barón',teamfight:'Teamfight',skirmish:'Escaramuza',nexus:'Asedio al nexo'};
  const color=['#45c7f4','#f27e91'];
  const safe=text=>String(text??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
  const num=n=>Number.isFinite(n)?Math.round(n*10)/10:0;
  const fixedColor = (str,backup) => /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(str||'')?str:backup;
  const total={TOP:512,MID:Math.hypot(256,256),BOT:512};
  function lanePath(lane){
    return 'M'+graph.routes[lane].map(p=>p.join(' ')).join(' L');
  }
  function influence(map) {
    return LANES.map(lane=>{
      const ratio=map.territory[lane],length=total[lane],blue=Math.round(ratio*length);
      const red=length-blue,d=lanePath(lane);
      return '<path d="'+d+'" class="rift-mini-lane-base"/>'+
        '<path d="'+d+'" class="rift-mini-lane-blue" stroke-dasharray="'+blue+' '+length+'"/>'+
        '<path d="'+d+'" class="rift-mini-lane-red" stroke-dasharray="'+red+' '+length+'" stroke-dashoffset="-'+blue+'"/>';
    }).join('');
  }
  function structures(minimap,previous,teamIds) {
    const out=[];
    for(const [index,id] of teamIds.entries()){
      const side=index===0?'blue':'red',clr=color[index];
      for(const lane of LANES)for(let stage=1;stage<=3;stage++){
        const p=graph.towerPoint(side,lane,stage);
        const gone=minimap.structures[id]?.[lane]>=stage;
        const justGone=gone&&(previous?.structures?.[id]?.[lane]??0)<stage;
        const label=(gone?'Caída: ':'En pie: ')+'torre '+labels[lane]+' '+stage+' de '+side;
        out.push('<g class="rift-mini-tower'+(gone?' is-destroyed':'')+(justGone?' just-fallen':'')+
          '" transform="translate('+p.x+' '+p.y+')"><title>'+safe(label)+'</title>'+
          '<rect x="-5.2" y="-5.2" width="10.4" height="10.4" rx="1.5" fill="'+(gone?'#3f5260':'#101f2f')+
          '" stroke="'+(gone?'#80909d':clr)+'" stroke-width="'+(gone?'1':'2')+'"/>'+
          (gone?'<path d="M-3.5 -3.5l7 7m0 -7l-7 7" stroke="#a3b1ba" stroke-width="1.2"/>':
          '<path d="M-2.5 0h5m-2.5 -2.5v5" stroke="'+clr+'" stroke-width="1.2"/>')+'</g>');
      }
    }
    return out.join('');
  }
  function wardMarkers(map,ids){
    return (map.wards||[]).map(w=>{
      if(!graph.nodes[w.node])return '';
      const p=graph.pointAt(w.node),side=w.teamId===ids[0]?0:1;
      return '<g class="rift-mini-ward" data-ward-id="'+safe(w.id)+
        '"><title>'+safe('Ward del equipo '+(side===0?'azul':'rojo')+
        ' · expira en minuto '+w.expires)+'</title>'+
        '<circle cx="'+p.x+'" cy="'+p.y+'" r="15" fill="'+color[side]+
        '" opacity=".12"/><path d="M'+p.x+' '+(p.y-6)+
        'l6 6 -6 6 -6 -6z" fill="#10242b" stroke="'+color[side]+
        '" stroke-width="1.7"/></g>';
    }).join('');
  }
  function avatars(map,previous,world,ids){
    const roster=new Map(world.players.map(p=>[p.id,p]));
    const motion=typeof root.matchMedia==='function' && !root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const result=[];
    // Dead players are translucent and marked with a cross at their fountain.
    for(const id of Object.keys(map.players)){
      const p=map.players[id],player=roster.get(id);
      if(!player)continue;
      const side=p.teamId===ids[0]?0:1,theme=color[side];
      const prior=previous?.players?.[id];
      const animate=motion&&prior&&prior.x!==undefined&&
        (Math.abs(prior.x-p.x)>1||Math.abs(prior.y-p.y)>1)?
        '<animateTransform attributeName="transform" type="translate" from="'+num(prior.x)+' '+num(prior.y)+
        '" to="'+num(p.x)+' '+num(p.y)+'" dur=".45s" fill="freeze"/>':'';
      const skin=['#e9b68d','#c68f6e','#b77e5c','#e8c3a0','#c99976'][String(id).length%5];
  const health=Number.isFinite(p.hp)?Math.max(0,Math.min(100,p.hp)):null;
  const lifeBar=health===null?'':'<g data-health="'+health+'"><rect x="-12" y="16" width="24" height="4" rx="2" fill="#07111c"/><rect x="-12" y="16" width="'+num(24*health/100)+'" height="4" rx="2" fill="'+(health<=30?'#ed6974':health<=60?'#e3bd74':'#58d6a9')+'"/></g>';
      result.push('<g class="rift-mini-avatar'+(p.sceneRole?' is-event-player':'')+
        (p.fallen?' is-fallen':!p.alive?' is-dead':'')+
        '" data-player-id="'+safe(id)+'" data-event-role="'+safe(p.sceneRole||'')+
        '" transform="translate('+num(p.x)+' '+num(p.y)+
        ')"><title>'+safe(player.name+' · '+p.role+(p.alive?' · vivo':' · eliminado')+(health!==null?' · vida '+health+'%':''))+'</title>'+
        animate+(p.sceneRole?'<circle r="16.5" fill="none" stroke="'+
          (p.fallen?'#ff9d84':'#ffe4a0')+'" stroke-width="2" stroke-dasharray="'+
          (p.fallen?'2 3':'0')+'"/>':'')+
        '<circle r="12.4" fill="#0c1725" stroke="'+theme+'" stroke-width="2"/>'+
        '<ellipse cx="0" cy="1" rx="7" ry="7.5" fill="'+skin+'"/>'+
        '<path d="M-7 -2 Q-6 -11 0 -9 Q7 -10 7 -2 Q3 -7 -1 -5 L-6 -1Z" fill="#283441"/>'+
        '<circle cx="-2.5" cy="1" r=".8" fill="#16232c"/><circle cx="2.5" cy="1" r=".8" fill="#16232c"/>'+
        '<rect x="4.6" y="7" rx="3" width="11" height="10" fill="'+theme+'" stroke="#101b2b" stroke-width=".8"/>'+
        '<text x="10" y="14.5" fill="#071522" text-anchor="middle" font-size="8" font-weight="900">'+
        ({TOP:'T',JUN:'J',MID:'M',ADC:'A',SUP:'S'}[p.role]||'?')+'</text>'+
        ((!p.alive||p.fallen)?'<path d="M-7 -7l14 14m0 -14l-14 14" stroke="#f8fafc" stroke-width="2.3"/>':'')+
        lifeBar+'</g>');
    }
    return result.join('');
  }
  function nexus(map,teamIds){
    return teamIds.map((id,i)=>{
      const node=i===0?'blue_nexus':'red_nexus',p=graph.pointAt(node);
      const broken=map.focus?.action==='nexus' && map.focus.teamId!==id;
      const stroke=broken?'#fbd19b':color[i];
      return '<g class="rift-mini-nexus'+(broken?' is-destroyed':'')+'" transform="translate('+p.x+' '+p.y+')">'+
        '<title>'+safe((broken?'Nexo destruido':'Nexo')+' de '+(i===0?'azul':'rojo'))+'</title>'+
        '<path d="M0 -15L13 0L0 15L-13 0Z" fill="'+(broken?'#6b423d':'#132d42')+
        '" stroke="'+stroke+'" stroke-width="2.2"/>'+
        (broken?'<path d="M-8 -8L8 8M8 -8L-8 8" stroke="#ffe1af" stroke-width="2"/>':
        '<path d="M-5 0h10M0 -5v10" stroke="'+stroke+'" stroke-width="1.5"/>')+'</g>';
    }).join('');
  }
  function focusMarker(event,match){
    if(!event)return '';
    const f=event.facts;
    let loc=null;
    if(f){
      if(f.action==='tower')loc=graph.towerPoint(event.teamId===match.fixture.a?'red':'blue',f.lane,f.stage);
      else if((f.action==='gank'||f.action==='gank_avoided')&&graph.nodes[f.action==='gank'?f.victimNode:f.targetNode])loc=graph.pointAt(f.action==='gank'?f.victimNode:f.targetNode);
      else if((f.action==='lane_trade'||f.action==='clash'||(f.combatVersion===1&&f.action==='teamfight'))&&graph.nodes[f.targetNode])loc=graph.pointAt(f.targetNode);
      else if((f.action==='teamfight'||f.action==='skirmish')&&graph.nodes[f.node])loc=graph.pointAt(f.node);
      else if(f.action==='dragon'||f.action==='baron')loc=graph.pointAt(f.action==='dragon'?'dragon_pit':'baron_pit');
      else if(f.action==='nexus')loc=graph.pointAt(event.teamId===match.fixture.a?'red_nexus':'blue_nexus');
    }else if(event.evidence?.lane){
      const node={TOP:'top_corner',MID:'mid_center',BOT:'bot_corner'}[event.evidence.lane];
      if(node)loc=graph.pointAt(node);
    }
    if(!loc)return '';
    return '<g class="rift-mini-event-focus" data-focus-action="'+safe(f?.action||'insight')+
      '"><title>Jugada seleccionada: '+safe(event.title)+'</title>'+
      '<circle cx="'+loc.x+'" cy="'+loc.y+'" r="23" fill="#fff3c2" fill-opacity=".12" stroke="#ffe4a0" stroke-width="2.4" stroke-dasharray="5 4"/>'+
      '<circle cx="'+loc.x+'" cy="'+loc.y+'" r="4" fill="#ffe4a0"/></g>';
  }
  function drawMap(match,frame,world,previousFrame,selectedEvent,scene){
    const map=frame?.minimap;
    if(!map)return '<div class="rift-mini-legacy">Este partido se guardó antes del minimapa. Puedes terminarlo normalmente y probar una exhibición nueva para ver el mapa animado.</div>';
    const ids=[match.fixture.a,match.fixture.b];
    const clubs=ids.map(id=>world.clubs.find(c=>c.id===id));
    if(clubs.some(c=>!c))return '<p>Los equipos del minimapa ya no están disponibles.</p>';
    const river=map.territory.upperRiver;
    const pulses=[['baron_pit',20],['dragon_pit',5]].map(([node,start],index)=>{
      const p=graph.pointAt(node),active=frame.minute>=start;
      const isFocus=map.focus?.action===(index===0?'baron':'dragon');
      return '<g class="rift-mini-objective'+(isFocus?' is-focused':'')+'" opacity="'+(active?'1':'.35')+
        '"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+(isFocus?'17':'13')+
        '" fill="#142b36" stroke="#d5c184" stroke-width="1.5" stroke-dasharray="3 4"/>'+
        '<text x="'+p.x+'" y="'+(p.y+4)+'" font-size="12" text-anchor="middle" font-weight="800" fill="#ffe4ae">'+
        (index===0?'B':'D')+'</text></g>';
    }).join('');
    const focus=selectedEvent?.title||(map.focus?.action ? labels[map.focus.action]||'Jugada' : 'Fase de líneas');
    return '<div class="rift-minimap" data-minimap-minute="'+frame.minute+'">'+
      '<svg viewBox="0 0 340 340" role="img" aria-label="'+safe('Minimapa de '+clubs[0].name+' contra '+clubs[1].name+'; minuto '+frame.minute)+'" xmlns="http://www.w3.org/2000/svg">'+
      '<defs><radialGradient id="riftMiniBlue"><stop offset="0%" stop-color="#2c98cd" stop-opacity=".19"/><stop offset="100%" stop-color="#2c98cd" stop-opacity="0"/></radialGradient>'+
      '<radialGradient id="riftMiniRed"><stop offset="0%" stop-color="#d9647d" stop-opacity=".19"/><stop offset="100%" stop-color="#d9647d" stop-opacity="0"/></radialGradient></defs>'+
      '<rect x="6" y="6" width="328" height="328" rx="14" fill="#13242f" stroke="#496270" stroke-width="1"/>'+
      '<circle cx="64" cy="275" r="130" fill="url(#riftMiniBlue)"/>'+
      '<circle cx="276" cy="65" r="130" fill="url(#riftMiniRed)"/>'+
      '<circle cx="133" cy="132" r="48" fill="'+(river>=.5?'#2c98cd':'#d9647d')+'" opacity="'+num(Math.abs(river-.5)*.22)+
      '"/><circle cx="207" cy="214" r="48" fill="'+(river>=.5?'#2c98cd':'#d9647d')+
      '" opacity="'+num(Math.abs(river-.5)*.22)+'"/>'+
      influence(map)+
      '<path d="M60 202L131 128L217 211L273 134" stroke="#738c84" stroke-width="1" stroke-dasharray="4 8" fill="none" opacity=".5"/>'+
      pulses+wardMarkers(map,ids)+
      structures(map,previousFrame?.minimap,ids)+nexus(map,ids)+
      avatars(map,previousFrame?.minimap,world,ids)+focusMarker(selectedEvent,match)+
      '<rect x="12" y="12" width="101" height="24" rx="6" fill="#091720" opacity=".94"/>'+
      '<text x="20" y="29" fill="#e4f0f3" font-size="12" font-weight="700">MAPA · '+safe(selectedEvent?.time||String(frame.minute).padStart(2,'0')+':00')+'</text>'+
      '</svg>'+
      '<div class="rift-mini-legend"><span><i class="rift-mini-key blue"></i>'+safe(clubs[0].name)+'</span><span><i class="rift-mini-key red"></i>'+safe(clubs[1].name)+'</span></div>'+
      '<div class="rift-mini-foot">Foco: <b>'+safe(focus)+'</b> · '+Object.values(map.players).filter(p=>p.alive).length+'/10 visibles como vivos</div>'+
      (scene?.participants?.length ? '<div class="rift-mini-scene">'+scene.participants.map(id=>{
        const p=map.players[id],entry=world.players.find(q=>q.id===id);
        const label={jungla:'Jungla',asesino:'Eliminó',victima:'Víctima',objetivo:'Rival',retirada:'Se retira',apoyo:'Apoyo'}[p?.sceneRole]||'Participó';
        return '<span><b>'+safe(label)+':</b> '+safe(entry?.name||id)+
          (p?.fallen?' · cayó aquí':'')+'</span>';
       }).join('')+'</div>':'')+
      '</div>';
  }
  root.RiftMinimap={render:drawMap};
})(globalThis);
