/* Rift Director — lightweight lane pressure and vision model.
 * Deterministic, no RNG, no DOM, no mutation; meant for low-end mobile.
 * These are abstract tactical estimates, not per-character coordinates.
 */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});
  const clamp = (x,min,max) => Math.max(min,Math.min(max,x));
  const LANES = Object.freeze(['TOP','MID','BOT']);
  const skill = (p,k) => p?.a?.[k] ?? 50;
  function computeMapState({ clubs, teams, gold, lanes, minute, userClub, style }) {
    const [a,b] = clubs;
    const ids = [a.id,b.id];
    const byRole = (club,role) => (teams[club.id] || []).find(p => p.role === role);
    const result = { minute, lanes:{}, riverVision:{} };
    const laners = (club,lane) => lane === 'BOT'
      ? [byRole(club,'ADC'),byRole(club,'SUP')]
      : [byRole(club,lane)];
    function strength(club,lane) {
      const ps=laners(club,lane);
      const avg=ps.reduce((n,p)=>n+skill(p,'lane')*.52+skill(p,'macro')*.27+skill(p,'mech')*.21,0)/ps.length;
      const missing=ps.reduce((n,p)=>n+(p?.fatigue??0),0)/ps.length;
      return avg-missing*.08;
    }
    function vision(club,lane) {
      const laner = laners(club,lane);
      const laneVision=laner.reduce((n,p)=>n+skill(p,'vision'),0)/laner.length;
      const support=byRole(club,'SUP'), jungler=byRole(club,'JUN');
      const bonus=club.id===userClub && style==='objectives' ? 5 : 0;
      const towerBonus=(lanes[ids.find(id=>id!==club.id)]?.[lane]||0)*3;
      return clamp(Math.round(laneVision*.39 + skill(jungler,'vision')*.29 +
        skill(support,'vision')*.32 + bonus + towerBonus),5,99);
    }
    for (const lane of LANES) {
      const rawDiff=strength(a,lane)-strength(b,lane);
      const goldDiff=(gold[a.id]-gold[b.id])/2200;
      const towerDiff=(lanes[b.id]?.[lane]||0)-(lanes[a.id]?.[lane]||0);
      const pressureA=clamp(Math.round(50+rawDiff*.45+goldDiff+towerDiff*3),5,95);
      result.lanes[lane]={
        pressure:{[a.id]:pressureA,[b.id]:100-pressureA},
        vision:{[a.id]:vision(a,lane),[b.id]:vision(b,lane)}
      };
    }
    for (const c of clubs) {
      const jungler=byRole(c,'JUN'),support=byRole(c,'SUP');
      const bonus=c.id===userClub && style==='objectives'?6:0;
      result.riverVision[c.id]=clamp(Math.round(skill(jungler,'vision')*.53+
        skill(support,'vision')*.47+bonus),5,99);
    }
    return result;
  }
  function gankChance(base, laneContext, attackerId, defenderId) {
    const pressureDiff=laneContext.pressure[attackerId]-laneContext.pressure[defenderId];
    const visionDiff=laneContext.vision[attackerId]-laneContext.vision[defenderId];
    return clamp(base+pressureDiff*.0014+visionDiff*.0022,.15,.81);
  }
  function gankRoute(lane, context, attackerId, defenderId) {
    const defenderVision=context.vision[defenderId];
    if (lane==='BOT' && defenderVision<67) return 'tribush';
    return defenderVision>=78 ? 'flanco' : 'rio';
  }
  function cloneMapState(value) {
    if(!value)return null;
    return {
      minute:value.minute,
      riverVision:{...value.riverVision},
      lanes:Object.fromEntries(LANES.map(l => [l,{
        pressure:{...value.lanes[l].pressure},
        vision:{...value.lanes[l].vision}
      }]))
    };
  }
  core.LANES = LANES;
  core.computeMapState=computeMapState;
  core.gankChance=gankChance;
  core.gankRoute=gankRoute;
  core.cloneMapState=cloneMapState;
})(globalThis);
