/* Rift Director M1.3A — original stylized 3-lane map graph.
 * Pure coordinates; no licensed map assets, pathfinding or randomness.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const nodes = Object.freeze({
    blue_fountain:[20,320], blue_nexus:[42,298],
    blue_top_base:[42,269], blue_top_inner:[42,226], blue_top_outer:[42,154],
    blue_mid_base:[61,279],blue_mid_inner:[83,257],blue_mid_outer:[110,230],
    blue_bot_base:[62,298],blue_bot_inner:[100,298],blue_bot_outer:[164,298],
    blue_jungle_upper:[100,206],blue_jungle_lower:[149,267],
    red_fountain:[320,20],red_nexus:[298,42],
    red_top_base:[276,42],red_top_inner:[234,42],red_top_outer:[164,42],
    red_mid_base:[279,61],red_mid_inner:[257,83],red_mid_outer:[230,110],
    red_bot_base:[298,62],red_bot_inner:[298,100],red_bot_outer:[298,164],
    red_jungle_upper:[192,73],red_jungle_lower:[253,143],
    top_corner:[42,42],bot_corner:[298,298],
    top_center:[92,42],mid_center:[170,170],bot_center:[298,244],
    upper_river:[134,119],lower_river:[211,224],
    baron_pit:[126,119],dragon_pit:[214,225],
    blue_gate:[74,275],red_gate:[271,74]
  });
  const routes = Object.freeze({
    TOP:[[42,298],[42,42],[298,42]],
    MID:[[42,298],[298,42]],
    BOT:[[42,298],[298,298],[298,42]]
  });
  const links = Object.freeze([
    ['blue_nexus','blue_top_base'],['blue_top_base','blue_top_inner'],['blue_top_inner','blue_top_outer'],
    ['blue_top_outer','top_corner'],['top_corner','top_center'],['top_center','red_top_outer'],
    ['red_top_outer','red_top_inner'],['red_top_inner','red_top_base'],['red_top_base','red_nexus'],
    ['blue_nexus','blue_mid_base'],['blue_mid_base','blue_mid_inner'],['blue_mid_inner','blue_mid_outer'],
    ['blue_mid_outer','mid_center'],['mid_center','red_mid_outer'],
    ['red_mid_outer','red_mid_inner'],['red_mid_inner','red_mid_base'],['red_mid_base','red_nexus'],
    ['blue_nexus','blue_bot_base'],['blue_bot_base','blue_bot_inner'],['blue_bot_inner','blue_bot_outer'],
    ['blue_bot_outer','bot_corner'],['bot_corner','bot_center'],['bot_center','red_bot_outer'],
    ['red_bot_outer','red_bot_inner'],['red_bot_inner','red_bot_base'],['red_bot_base','red_nexus'],
    ['blue_nexus','blue_jungle_lower'],['blue_jungle_lower','dragon_pit'],
    ['blue_jungle_upper','upper_river'],['upper_river','baron_pit'],
    ['red_nexus','red_jungle_upper'],['red_jungle_upper','upper_river'],
    ['red_jungle_lower','lower_river'],['lower_river','dragon_pit'],
    ['blue_jungle_upper','blue_mid_outer'],['blue_jungle_lower','blue_bot_outer'],
    ['red_jungle_upper','red_top_outer'],['red_jungle_lower','red_bot_outer'],
    ['upper_river','mid_center'],['lower_river','mid_center']
  ]);
  const towerLocations = Object.freeze({
    blue:{
      TOP:[[42,154],[42,226],[42,269]],
      MID:[[110,230],[83,257],[61,279]],
      BOT:[[164,298],[100,298],[62,298]]
    },
    red:{
      TOP:[[164,42],[234,42],[276,42]],
      MID:[[230,110],[257,83],[279,61]],
      BOT:[[298,164],[298,100],[298,62]]
    }
  });
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  function pointOnLane(lane,progress) {
    const segments = routes[lane];
    if (!segments) throw new Error('Carril desconocido: '+lane);
    let length=0;
    for(let i=1;i<segments.length;i++)
      length+=Math.hypot(segments[i][0]-segments[i-1][0],segments[i][1]-segments[i-1][1]);
    let distance=clamp(progress,0,1)*length;
    for(let i=1;i<segments.length;i++){
      const [x1,y1]=segments[i-1],[x2,y2]=segments[i];
      const size=Math.hypot(x2-x1,y2-y1);
      if(distance<=size || i===segments.length-1){
        const t=clamp(distance/size,0,1);
        return {x:Math.round((x1+(x2-x1)*t)*10)/10,y:Math.round((y1+(y2-y1)*t)*10)/10};
      }
      distance-=size;
    }
  }
  function towerPoint(side,lane,stage) {
    const coords=towerLocations[side]?.[lane]?.[stage-1];
    if (!coords) throw new Error('Torre desconocida: '+side+'/'+lane+'/'+stage);
    return {x:coords[0],y:coords[1]};
  }
  function pointAt(node) {
    const coords=nodes[node];
    if (!coords) throw new Error('Nodo desconocido: '+node);
    return {x:coords[0],y:coords[1]};
  }
  core.MiniGraph=Object.freeze({
    width:340,height:340,nodes,routes,links,towerLocations,
    pointOnLane,towerPoint,pointAt
  });
})(globalThis);
