(()=>{'use strict';
const KEY=RiftCore.SAVE_KEY;
const ROLES=RiftCore.ROLES;
const ROLE_NAME={TOP:'Top',JUN:'Jungla',MID:'Mid',ADC:'Tirador',SUP:'Support'};
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ICONS={home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',users:'<circle cx="9" cy="7" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2"/><path d="M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5"/>',market:'<path d="M3 9h18l-2-6H5zM5 9v12h14V9M9 21v-7h6v7"/>',match:'<path d="M4 20 20 4M5 4l15 16"/><path d="M2 5l5-3m10 20 5-3"/>',money:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',play:'<path d="m8 5 12 7-12 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/>',spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',news:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h4M7 15h10M7 18h10M14 11h3v3h-3z"/>'};
const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`;
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>{const sign=n<0?'-':'';let x=Math.abs(Math.round(n));return sign+'$'+(x>=1000000?(x/1000000).toFixed(2)+'M':x>=1000?Math.round(x/1000)+'k':x.toLocaleString('es-MX'));};
const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
let draftBrand={};
let s=null,view='home',modal=null,timer=null,toastTimer=null,theme='balanced',draftName='Aurora Esports';
let demoBackup=null; // Only in-memory: the save in localStorage is never replaced by a demo.
const rnd=()=>RiftCore.nextRandom(s);
const ri=(a,b)=>Math.floor(rnd()*(b-a+1))+a;
const chance=p=>rnd()<p;
const pick=arr=>arr[Math.floor(rnd()*arr.length)];
const uid=p=>p+(++s.nextId);
const colours=['#5bd4b6','#f09d70','#71a5fc','#df88ca','#e3b96f','#7fceec','#bba1ff','#da7f91','#a6c974','#f5a8a1'];
const clubNames=['Obsidian Foxes','Solar Knights','Northstar','Crimson Circuit','Astra Wolves','Nexus Forge','Velvet Comets','Silver Lotus','Iron Harbor','Arcadia Five','Polar Rift','Kings of Neon','Eclipse Union','Azure Vipers','Orchid Pulse','Black Meridian','Nova Dynasty','Royal Ravens','Halcyon Esports','Quartz Legion','Silent Lantern','Orbit Nine'];
const sponsors=['Horizon Mobile','Prisma Energy','KairoTech','Nova Audio','Axiom Wear','Zenith Cloud','Orbit Telecom','Velocity Gear','Polar Drinks','Nimbus Data','Cobalt Games','Meridian Bank'];
const stems1=['K','R','V','Z','N','S','M','T','J','D','L','F','X','Ar','Zen','Val','Neo','Kai','Sor','Ry','Lum','Ash'];
const stems2=['aro','ix','en','on','ur','yx','iro','a','is','eko','ian','orn','ek','in','aris','ox','ali','um','ven','ra'];
function newName(){let n='';for(let i=0;i<16;i++){n=pick(stems1)+pick(stems2)+(chance(.16)?pick(['7','X','i']):'');if(!s.usedNames.includes(n))break}if(s.usedNames.includes(n))n+='-'+ri(10,99);s.usedNames.push(n);return n}
function playerRating(p){let a=p.a;return Math.round((a.mech+a.lane+a.macro+a.fight+a.vision+a.comm+a.adapt)/7)}
function generatePlayer(role,teamId,quality=0){let a={};const basis=clamp(Math.round(65+quality+ri(-16,16)),40,91);
 for(const key of ['mech','lane','macro','fight','vision','comm','adapt'])a[key]=clamp(basis+ri(-21,21),30,96);
 if(role==='ADC'){a.mech=clamp(a.mech+7,30,97);a.fight=clamp(a.fight+6,30,97)}
 if(role==='SUP'){a.vision=clamp(a.vision+8,30,97);a.comm=clamp(a.comm+6,30,97)}
 if(role==='JUN'){a.macro=clamp(a.macro+6,30,97)}
 let p={id:uid('p'),name:newName(),role,age:ri(17,31),teamId,a,beh:{risk:ri(13,93),agg:ri(12,95),lead:ri(12,94),team:ri(14,96),nerve:ri(12,94)},potential:ri(66,98),observed:teamId?ri(0,2):0,fatigue:ri(5,17),morale:ri(58,88),games:0,history:[],contract:ri(6,28)};
 p.wage=clamp(Math.round((playerRating(p)-38)*460+ri(-3700,4500)),6000,44000);
 p.value=Math.round(clamp((playerRating(p)-38)*8500+(23-p.age)*5000+ri(0,65000),24000,620000));
 return p}
function makeClub(name,region,color,kind='rival',cash=null){const club={id:uid('c'),name,region,color,logo:ri(0,5),kind,roster:[],lineup:{},cash:cash??ri(700000,2500000),fans:ri(75000,260000),prestige:ri(25,72),chemistry:ri(48,78),staff:ri(2,5),hype:0,sponsor:{name:pick(sponsors),monthly:ri(82000,132000),obligation:pick(['content','community']),remaining:ri(3,12)},history:[],wins:0,losses:0};
 for(const role of ROLES){let p=generatePlayer(role,club.id,ri(-4,6));s.players.push(p);club.roster.push(p.id);club.lineup[role]=p.id}
 if(kind==='user'){for(const role of ['JUN','MID']){let p=generatePlayer(role,club.id,ri(-7,2));s.players.push(p);club.roster.push(p.id)}}
 return club}
function generateFixtures(ids){return RiftCore.generateFixtures(ids)}
function standingsFor(ids){return RiftCore.standingsFor(ids)}
function club(id){return s.clubs.find(c=>c.id===id)}
function player(id){return s.players.find(p=>p.id===id)}
function teamPlayers(c){return ROLES.map(r=>player(c.lineup[r])).filter(Boolean)}
function currentClub(){return club(s.userClub)}
function nextFixtures(){return RiftCore.pendingUserFixtures(s)}
function opponentOf(f){return club(f.a===s.userClub?f.b:f.a)}
function totalWages(c){return RiftCore.totalWages(c,player)}
function userContractExpense(){return totalWages(currentClub())+currentClub().staff*9000+34000}
function monthPlanCost(){return RiftCore.monthPlanCost(s.plan)}
function sumPlan(){return Object.values(s.plan).reduce((a,b)=>a+b,0)}
function marketPrice(p){return RiftCore.marketPrice(p)}
function computeTraits(p){const b=p.beh,res=[];if(b.risk>=75)res.push(['Arriesgado','neg']);else if(b.risk<=31)res.push(['Metódico','pos']);
 if(b.agg>=72)res.push(['Agresivo','mix']);else if(b.agg<=31)res.push(['Conservador','mix']);
 if(b.lead>=73&&p.a.comm>=60)res.push(['Shotcaller','pos']);else if(b.lead<=30)res.push(['Liderazgo discreto','mix']);
 if(b.team<=33)res.push(['Individualista','neg']);else if(b.team>=76)res.push(['Cooperativo','pos']);
 if(b.nerve>=80)res.push(['Clutch','pos']);else if(b.nerve<=31)res.push(['Sensible a presión','neg']);
 if(p.a.adapt>=82)res.push(['Flexible','pos']);else if(p.a.adapt<=43)res.push(['Especialista','mix']);
 return res.length?res:[['Equilibrado','mix']]}
function visibleTraits(p){let known=Math.max(0,Math.floor(p.observed/2));return computeTraits(p).slice(0,known)}
function unknownTraits(p){return Math.max(0,Math.min(3,computeTraits(p).length-visibleTraits(p).length))}
function fitScore(p,c){let coachStyle=s.style||'balanced';let v=playerRating(p)*.5+p.a.adapt*.17+p.a.macro*.12+p.a.comm*.07+p.beh.team*.12;
 if(coachStyle==='aggressive')v+=p.beh.agg*.13+p.beh.risk*.03;
 if(coachStyle==='scaling')v+=p.beh.nerve*.1+(100-p.beh.risk)*.09;
 if(coachStyle==='objectives')v+=p.a.vision*.08+p.beh.lead*.07;
 return Math.round(v/1.03)}
function teamPower(c,stage='mid'){const ps=teamPlayers(c);let skill=avg(ps.map(p=>p.a.mech*.2+p.a.macro*.23+p.a.fight*.23+p.a.lane*.16+p.a.vision*.1+p.a.comm*.08));
 let team=avg(ps.map(p=>p.beh.team)),leaders=ps.filter(p=>p.beh.lead>=70&&p.a.comm>=62).length;
 let val=skill+(c.chemistry-50)*.12+(team-50)*.07+Math.min(leaders,2)*1.2;
 if(stage==='early')val+=avg(ps.map(p=>p.a.lane))*.12-8;
 if(stage==='late')val+=avg(ps.map(p=>p.a.fight))*.12-8;
 if(c.id===s.userClub){val+=s.plan.scrims*1.25-s.plan.content*.3;val+=s.plan.rest*.5;val+=(s.meta===s.style?2.5:0)}
 val-=avg(ps.map(p=>p.fatigue))*.11;
 return val}
function addNews(title,body,type='world',teamId=null,importance=1){let n={id:uid('n'),year:s.year,month:s.month,title,body,type,teamId,importance};s.news.unshift(n);s.news=s.news.slice(0,130);return n}
function newGame(chosen='balanced',orgName='Aurora Esports'){
 s=RiftCore.createInitialState(chosen);
 s.meta=pick(['aggressive','objectives','scaling']);
 const yourClub=makeClub(orgName,'Aurora',colours[0],'user',chosen==='rich'?2600000:chosen==='academy'?1050000:1600000);
 yourClub.fans=chosen==='rich'?195000:chosen==='academy'?88000:148000;
 yourClub.prestige=chosen==='rich'?62:chosen==='academy'?29:44;
 yourClub.staff=chosen==='rich'?5:chosen==='academy'?2:3;
 yourClub.sponsor={name:'Horizon Mobile',monthly:chosen==='rich'?150000:chosen==='academy'?90000:121000,obligation:'content',remaining:6};
 s.clubs.push(yourClub);s.userClub=yourClub.id;
 clubNames.slice(0,7).forEach((name,i)=>s.clubs.push(makeClub(name,'Aurora',colours[(i+1)%colours.length])));
 clubNames.slice(8,16).forEach((name,i)=>s.clubs.push(makeClub(name,'Boreal',colours[(i+2)%colours.length])));
 for(let i=0;i<17;i++){let p=generatePlayer(pick(ROLES),null,ri(-12,7));s.players.push(p)}
 // A few stars become long-lived narratives.
 for(const c of s.clubs.filter(c=>c.region==='Boreal').slice(0,2)){
  let p=player(c.lineup.MID);Object.keys(p.a).forEach(key=>p.a[key]=clamp(p.a[key]+ri(10,22),50,97));p.value=510000;p.wage=44000;p.observed=9;p.age=ri(23,27);c.prestige+=12;
 }
 s.fixtures=generateFixtures(s.clubs.filter(c=>c.region==='Aurora').map(c=>c.id));
 s.otherFixtures=generateFixtures(s.clubs.filter(c=>c.region==='Boreal').map(c=>c.id));
 s.standings=standingsFor(s.clubs.filter(c=>c.region==='Aurora').map(c=>c.id));
 s.otherStandings=standingsFor(s.clubs.filter(c=>c.region==='Boreal').map(c=>c.id));
 s.focus=yourClub.lineup.MID;
 s.offers=generateOffers();
 addNews('Comienza una nueva era en los esports',`La ${s.leagueName} presenta una temporada con ocho organizaciones. ${yourClub.name} debuta con la misión de crecer sin comprometer sus finanzas.`,'league',yourClub.id,3);
 addNews('Un midlaner causa sensación en el Circuito Boreal','Los analistas vigilan a varias estrellas internacionales. El mercado podría moverse en los próximos meses.','rumor',null,2);
 return s
}
function generateOffers(){return [0,1,2].map((i)=>({id:uid('offer'),name:pick(sponsors),monthly:Math.round((79000+i*23000+ri(-7000,18000))*(.75+currentClub().fans/480000)),obligation:i===0?'none':i===1?'community':'content',length:ri(5,11)}))}
const defaultPlan=()=>({scrims:2,development:1,rest:1,content:1,community:1,scout:1});
function save(){if(demoBackup)return;try{RiftCore.saveWorld(localStorage,s)}catch(e){console.warn('Guardado no disponible',e)}}
function load(){try{const data=RiftCore.loadWorld(localStorage);if(data){s=data;return true}}catch(e){console.warn('Guardado inválido',e)}return false}
function brand(id,size=24){return globalThis.RiftBranding?.svg(id,size)||''}
function crest(c,size=46){return globalThis.RiftBranding?.club(c,size)||legacyCrest(c,size)}
function competition(f){const original=s?.playoffs?.find(p=>p.a===f?.a&&p.b===f?.b&&p.round===f?.round);return brand(globalThis.RiftBranding?.phase(original||f)||'regular_season',24)}
function legacyCrest(c,size=46){if(!c)return'';let shape='';const fill=esc(c.color);switch(c.logo%6){case 0:shape='<path d="M25 3 43 12 40 33 25 48 10 33 7 12z"/><path d="M25 13 33 32 25 28 17 32z" fill="none" stroke="#fff" stroke-width="2"/>';break;case 1:shape='<path d="M25 4 46 24 25 47 4 24z"/><path d="M15 25h20M25 13v24" stroke="#fff" stroke-width="3"/>';break;case 2:shape='<path d="M25 4 45 13v23L25 48 5 36V13z"/><path d="M12 29 25 12 38 29 25 39z" fill="#081421"/>';break;case 3:shape='<circle cx="25" cy="25" r="22"/><path d="m12 30 13-20 13 20-13 9z" fill="#071523"/>';break;case 4:shape='<path d="M10 5h30v25L25 47 10 30z"/><path d="M15 23h20M25 13v20" stroke="#071523" stroke-width="4"/>';break;default:shape='<path d="M25 3 44 18 37 42 13 42 6 18z"/><circle cx="25" cy="24" r="10" fill="#081421"/>'}
 return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 50 52" aria-label="Escudo de ${esc(c.name)}"><defs><linearGradient id="lg${esc(c.id)}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${fill}"/><stop offset="1" stop-color="#2f5068"/></linearGradient></defs><g fill="url(#lg${esc(c.id)})" stroke="#cce7ee" stroke-width="1.3">${shape}</g></svg>`}
function readBrandDraft(){for(const key of ['shape','symbol','primaryColor','secondaryColor','accent']){const value=document.getElementById('brand-'+key)?.value;if(value)draftBrand[key]=value}}
function brandingForm(){
 const b=globalThis.RiftBranding;if(!b)return '';
 const identity=b.identity({name:draftName,color:'#5bd4b6'},draftBrand);
 const select=(key,values,names,label)=>'<div class="field"><label for="brand-'+key+'">'+label+'</label><select id="brand-'+key+'">'+values.map(id=>'<option value="'+id+'" '+(identity[key]===id?'selected':'')+'>'+names[id]+'</option>').join('')+'</select></div>';
 return '<details class="identity-options"><summary>Identidad de tu organización</summary><div class="identity-form"><div id="brand-preview">'+b.modular(identity,draftName,80)+'</div><div>'+select('shape',Object.keys(b.shapes),b.shapeNames,'Silueta')+select('symbol',b.symbols,b.symbolNames,'Símbolo')+'</div><div>'+[['primaryColor','Color principal'],['secondaryColor','Color secundario'],['accent','Acento']].map(([key,label])=>'<div class="field"><label for="brand-'+key+'">'+label+'</label><input type="color" id="brand-'+key+'" value="'+identity[key]+'"></div>').join('')+'</div></div></details>';
}
function handleBrandInput(ev){
 if(!ev.target.id?.startsWith('brand-')&&ev.target.id!=='new-club-name')return;
 draftName=document.getElementById('new-club-name')?.value||draftName;readBrandDraft();
 const preview=document.getElementById('brand-preview'),b=globalThis.RiftBranding;
 if(preview&&b)preview.innerHTML=b.modular(b.identity({name:draftName,color:'#5bd4b6'},draftBrand),draftName,80);
}
function avatar(p,c){let q=(Number(p.id.replace(/\D/g,''))||12)*137;const skin=['#e9b68d','#b9876a','#d6a17f','#f0cbac','#ad7859','#d59c77'][q%6];const hair=['#151b25','#3a2826','#51372b','#252b30','#775847','#1b1b24'][(q>>2)%6];const eyex=q%2?`<rect x="43" y="43" width="33" height="10" rx="5" fill="none" stroke="#a9d2dc" stroke-width="3"/><path d="M59 46h-2" stroke="#a9d2dc" stroke-width="2"/>`:'';const tint=c?.color||'#7395ab';const hairStyle=q%4;let hairPath=['M35 40Q31 15 58 18Q89 13 83 43Q66 28 44 36z','M34 42Q28 10 61 16Q87 17 84 40L69 27 52 32 39 37z','M35 42Q40 18 60 18Q86 17 82 39L73 30 46 32z','M33 43Q29 18 54 17Q79 11 84 36L77 34Q62 16 41 37z'][hairStyle];return `<svg viewBox="0 0 120 140" role="img" aria-label="Retrato vectorial de ${esc(p.name)}"><path d="M6 140Q10 104 37 95L84 95Q113 104 116 140Z" fill="${esc(tint)}"/><path d="M23 140 31 104 46 99 59 120 76 99 89 104 98 140Z" fill="#111f30" opacity=".58"/><path d="M53 91h16v21l-8 8-8-8z" fill="${skin}"/><ellipse cx="60" cy="56" rx="26" ry="35" fill="${skin}"/><path d="${hairPath}" fill="${hair}"/><path d="M47 57h7M67 57h7" stroke="#1f252a" stroke-width="2.5" stroke-linecap="round"/><path d="M56 73q5 3 10 0" fill="none" stroke="#8f5144" stroke-width="2"/>${eyex}<path d="M38 104q21 20 44 0" fill="none" stroke="#e4f1f4" stroke-width="2" opacity=".45"/></svg>`}
function tagHtml(p){let items=visibleTraits(p).map(([t,k])=>`<span class="tag ${k==='mix'?'':k}">${esc(t)}</span>`);if(unknownTraits(p))items.push(`<span class="tag unk">${unknownTraits(p)} oculto${unknownTraits(p)>1?'s':''}</span>`);return items.join('')}
function record(sType,amount,note=''){s.history.unshift({year:s.year,month:s.month,type:sType,amount,note});s.history=s.history.slice(0,100)}
function notify(t){let d=document.getElementById('toast');if(d)d.remove();d=document.createElement('div');d.className='toast';d.id='toast';d.textContent=t;document.body.appendChild(d);clearTimeout(toastTimer);toastTimer=setTimeout(()=>d.remove(),3600)}
// MATCH ENGINE — deterministic events first; commentary describes validated state.
function simulateMatch(f){
 // One stable world-level draw reserves a fresh match seed. All tactical
 // rolls are then private to this fixture, so adding plates/rotations
 // cannot randomly alter future transfers, finances or world news.
 const commentarySeed=s.rng;
 RiftCore.nextRandom(s);
 const matchRandom={rng:commentarySeed};
 const rnd=()=>RiftCore.nextRandom(matchRandom);
 const ri=(a,b)=>Math.floor(rnd()*(b-a+1))+a;
 const chance=p=>rnd()<p;
 const pick=arr=>arr[Math.floor(rnd()*arr.length)];
 const a=club(f.a),b=club(f.b),aP=teamPlayers(a),bP=teamPlayers(b);
 const champions=RiftMatchTab.assign([...aP,...bP]);
 const m={minute:0,kills:{[a.id]:0,[b.id]:0},gold:{[a.id]:500,[b.id]:500},towers:{[a.id]:0,[b.id]:0},lanes:{[a.id]:{TOP:0,MID:0,BOT:0},[b.id]:{TOP:0,MID:0,BOT:0}},dragons:{[a.id]:0,[b.id]:0},barons:{[a.id]:0,[b.id]:0},dead:{},winner:null,events:[],frames:[],moments:[],nextDragon:5,nextBaron:20,baronBuff:{[a.id]:0,[b.id]:0}};
 m.nexusIntegrity={[a.id]:1,[b.id]:1};
 const all=[a,b],teams={[a.id]:aP,[b.id]:bP};
 const laneEconomy=RiftCore.LaneEconomy.create(a.id,b.id);
 const powerEconomy=RiftCore.PowerEconomy.create([...aP,...bP],champions);
 const shutdowns=RiftCore.Shutdowns.create([...aP,...bP]);
 m.waves=laneEconomy.lanes;
 m.powerEconomy=powerEconomy;
 const navigation=RiftCore.Navigation.createNavigation(all,teams,commentarySeed);
 const nexusSiege=RiftCore.NexusSiege.create(a.id,b.id);
 const health=RiftCore.Encounters.create([...aP,...bP]);
 const lastSkirmish={};
 let movementBefore=RiftCore.Navigation.snapshot(navigation,{},0);
 const nav=RiftCore.Navigation;
 const positioned=(c,node,depth=1)=>nav.participants(navigation,c.id,node,depth)
   .filter(a=>a.intent!=='retreat'&&(m.dead[a.id]||0)<=m.minute);
 const aliveAt=(id,t)=>nav.getAgent(navigation,id)?.alive&&(m.dead[id]||0)<=t;
 const near=(x,y,depth=2)=>aliveAt(x.id,m.minute)&&aliveAt(y.id,m.minute)&&
   nav.combatRange(nav.getAgent(navigation,x.id).node,nav.getAgent(navigation,y.id).node,depth);
 const updateMap=t=>RiftCore.computeMapState({clubs:all,teams,gold:m.gold,lanes:m.lanes,minute:t,userClub:s.userClub,style:s.style});
 m.map=updateMap(0);
 const playerStats=RiftCore.createPlayerStats([...aP,...bP]);
 const living=(c,t)=>teams[c.id].filter(p=>(m.dead[p.id]||0)<=t);
 const enemy=c=>c.id===a.id?b:a;
 const byRole=(c,r,t)=>living(c,t).find(p=>p.role===r&&nav.getAgent(navigation,p.id)?.intent!=='retreat');
 // Only living, same-team professionals are considered present at the objective.
 // Pick helpers deterministically from role/vision/teamplay, without consuming RNG.
 const presentWith=(c,t,actor,node,preferred=[])=>{
  const companions=positioned(c,node).filter(a=>a.id!==actor.id)
    .map(a=>player(a.id))
    .sort((x,y)=>((preferred.includes(y.role)?20:0)+y.a.vision*.1+y.beh.team*.08+y.a.comm*.05)-
                 ((preferred.includes(x.role)?20:0)+x.a.vision*.1+x.beh.team*.08+x.a.comm*.05)||x.id.localeCompare(y.id));
  return [actor.id,...companions.slice(0,2).map(p=>p.id)];
 };
 const makeEv=(minute,title,body,kind='normal',team=null,facts=null)=>{
  const prior=m.events[m.events.length-1];
  // New encounter timestamps use their own deterministic clock: no additional
  // gameplay RNG is consumed by an incidental 2v1 commentary.
  const skirmish=['plate','tower_damage','tower','item_purchase','ward_place','nexus_damage','nexus'].includes(facts?.action)||facts?.action==='skirmish'||facts?.combatVersion===1;
  const stamp=skirmish?(Math.imul((commentarySeed^minute)>>>0,1664525)+
    Math.imul(m.events.length+1,1013904223))>>>0:0;
  const sec=minute===0?0:prior?.minute===minute?
    Math.min(59,Number(prior.time.slice(3))+(skirmish?1+stamp%8:ri(1,8))):
    skirmish?stamp%30:ri(0,29);
  const event={minute,time:`${String(minute).padStart(2,'0')}:${String(sec).padStart(2,'0')}`,
    title,body,kind,teamId:team?.id||null};
  if(facts){
   event.facts=facts;
   const bounty=RiftCore.Shutdowns.apply(shutdowns,event);
   if(bounty>0){
    m.gold[team.id]+=bounty;
    event.body+=' ¡Recompensa de '+bounty+' de oro por terminar una racha rival!';
   }
   // A verified kill against a richer club may carry an earned comeback
   // bounty. The exact public deficit and paid amount are replay-auditable;
   // no gold is created by a plan, retreat, wall-clock or unconfirmed fight.
   if(facts.victimIds?.length){
    facts.comebackDeficit=m.gold[enemy(team).id]-m.gold[team.id];
    facts.comebackGold=RiftCore.Shutdowns.comebackBounty(
     facts.comebackDeficit,facts.victimIds.length);
    if(facts.comebackGold>0){
     m.gold[team.id]+=facts.comebackGold;
     event.body+=' ¡Bonificación de '+facts.comebackGold+
      ' de oro por una eliminación real estando en desventaja!';
    }
   }
   RiftCore.applyPlayerEvent(playerStats,event);
   RiftCore.PowerEconomy.rewardEvent(powerEconomy,event);
  }
  m.events.push(event);
  // Snapshot immediately after the actual event: no new RNG or invented kills.
  m.moments.push({minute,time:event.time,eventsCount:m.events.length,
    kills:{...m.kills},gold:{...m.gold},towers:{...m.towers},
    dragons:{...m.dragons},barons:{...m.barons},winner:m.winner,
    map:RiftCore.cloneMapState(m.map),playerStats:RiftCore.clonePlayerStats(playerStats),
    health:{...health},laneEconomy:RiftCore.LaneEconomy.snapshot(laneEconomy),
    powerEconomy:RiftCore.PowerEconomy.snapshot(powerEconomy),
    shutdowns:RiftCore.Shutdowns.snapshot(shutdowns),
    siege:RiftCore.NexusSiege.snapshot(nexusSiege),
    vision:RiftCore.Vision.snapshot(navigation.vision,minute),
    macro:RiftCore.MacroPolicy.snapshot(navigation,minute),
    navigation:{before:movementBefore,after:nav.snapshot(navigation,m.dead,minute)}});
 };
 const balance=(c,t)=>{let stage=t<12?'early':t<25?'mid':'late';let z=teamPower(c,stage)+(m.gold[c.id]-m.gold[enemy(c).id])/2800+m.barons[c.id]*1.3;
 let pref=c.id===s.userClub?s.style:(c.id.charCodeAt(c.id.length-1)%3===0?'aggressive':c.id.charCodeAt(c.id.length-1)%3===1?'objectives':'scaling');
 if(pref==='aggressive'&&t<=15)z+=4;if(pref==='scaling'&&t>=25)z+=4;if(pref==='objectives')z+=m.dragons[c.id]*.7;
 z+=(s.meta===pref?2:0);
 return z};
 const decide=(ca,cb,t,bonus=0)=>chance(clamp(.5+(balance(ca,t)-balance(cb,t)+bonus)*.018,.13,.87))?ca:cb;
 const addKill=(killer,victim,t)=>{if(!killer||!victim||(m.dead[killer.id]||0)>t||(m.dead[victim.id]||0)>t)return false;const c=club(killer.teamId);m.kills[c.id]++;m.gold[c.id]+=320;m.dead[victim.id]=t+(t<16?2:t<29?3:4);health[victim.id]=0;return true};
 // Every injury in lanes, ganks and fights goes through the same HP ledger.
 // No one can be awarded a kill without 0 HP, and a retreat changes the
 // agent's actual next path instead of teleporting on the minimap.
 const applyCombat=(facts,t)=>{
  for(const impact of facts.impacts){
   const target=player(impact.id);
   if(!target||health[target.id]!==impact.hpBefore)
    throw Error('Estado de vida anterior al combate incorrecto');
   if(impact.hpAfter===0){
    if(!addKill(player(facts.actorId),target,t))
     throw Error('Combat kill without living victim');
   }else{
    health[target.id]=impact.hpAfter;
    if(impact.retreat&&!nav.forceRetreat(navigation,target.id,t,impact.retreatGoal))
     throw Error('Combat retreat without living target');
   }
  }
  // Lane kills and ganks previously ended in a dead rival but rarely
  // supplied a tower order. Convert the *observed* kill to a short,
  // reversible lane plan; no damage, gold or tower is awarded here.
  // Counterplay teamfights keep their existing followup ownership below.
  if(facts.victimIds?.length&&['lane','gank'].includes(facts.mode)){
   const plan=RiftCore.Counterplay.pressureAfterKill(navigation,facts,t,m);
   if(plan)facts.counterPressure={...plan,
    sourceVictims:[...plan.sourceVictims],allowed:[...plan.allowed]};
  }
 };
 const affected=(facts)=>facts.impacts.map(q=>
    player(q.id).name+' '+q.hpBefore+'% → '+q.hpAfter+'%'+
    (q.hpAfter===0?' (eliminado)':q.retreat?' (se retira)':'')).join('; ');
 const combatDetails=(facts)=>affected(facts)+'. '+
    (facts.victimIds.length?'Eliminación confirmada.':
     facts.outcome==='retreat'?'El rival cede espacio y se retira.':'Ambos siguen en el mapa.');
 const attackTower=(c,t,lane)=>{
  const target=enemy(c),stage=m.lanes[target.id][lane]+1;
  if(stage>3)return false;
  const node=nav.towerNode(target.id===a.id?'blue':'red',lane,stage);
  const present=positioned(c,node);
  if(!present.length)return false;
  const defenders=positioned(target,node);
  const wave=RiftCore.LaneEconomy.pressureFor(laneEconomy,c.id,lane);
  const solo=present.length===1&&
   ['splitpush','counterpush'].includes(present[0].intent)&&
   present[0].lane===lane&&wave>=1.45&&defenders.length===0&&
   !Object.entries(movementBefore).some(([id,p])=>
    p.teamId===target.id&&p.alive&&p.intent!=='retreat'&&
    (m.dead[id]||0)<=t&&nav.at(navigation,id,node));
  const baron=m.baronBuff[c.id]>0;
  const hit=RiftCore.LaneEconomy.damageTower(laneEconomy,{
   teamId:c.id,defenderId:target.id,lane,stage,minute:t,
   attackers:present.length,defenders:defenders.length,soloAllowed:solo,baron});
  if(!hit)return false;
  const priority=lane==='BOT'?'ADC':lane;
  const who=player((present.find(p=>p.role===priority)||present[0]).id);
  const participants=present.map(p=>p.id),defenderIds=defenders.map(p=>p.id);
  const facts={action:'tower_damage',towerVersion:1,actorId:who.id,
   participantIds:participants,defenderIds,lane,stage,node,
   before:hit.before,after:hit.after,damage:hit.damage,rawDamage:hit.rawDamage,
   wave:hit.wave,baron,soloAllowed:solo};
  // Plate and its HP damage are one editorial event. Only non-plate chip
  // damage receives a separate tower_damage event, avoiding duplicate news.
  if(!hit.plate)makeEv(t,'¡Asedio a torre en '+lane+'!',
   c.name+' golpea la torre '+stage+' de '+lane+' por '+hit.damage+
   ' puntos con '+present.length+' atacantes presentes; conserva '+
   hit.after+' de '+RiftCore.LaneEconomy.TOWER_HP[stage-1]+' de vida.',
   'normal',c,facts);
  const earnedFightPressure=!!(navigation.counterPressure?.[c.id]&&
   navigation.counterPressure[c.id].lane===lane&&
   t<=navigation.counterPressure[c.id].until&&
   present.some(p=>p.intent==='counterpush'));
  const crossmapTrade=lane==='TOP'&&
   navigation.neutralPlans?.[c.id]?.action==='trade'&&t>=m.nextDragon;
  if(hit.plate){
   m.gold[c.id]+=hit.goldReward;
   makeEv(t,'¡Placa conquistada en '+lane+'!',
    c.name+' obtiene la placa '+hit.plate+' de la torre '+stage+
    ' en '+lane+' tras daño comprobado. El club recibe '+hit.goldReward+' de oro.',
    'goal',c,{...facts,action:'plate',plate:hit.plate,
     goldReward:hit.goldReward,earnedFightPressure,crossmapTrade});
  }
  if(hit.destroyed){
   const bonus=RiftCore.LaneEconomy.firstTowerBonus(laneEconomy,c.id,t);
   m.lanes[target.id][lane]++;m.towers[c.id]++;m.gold[c.id]+=420+bonus;
   const place=lane==='BOT'?'inferior':lane==='TOP'?'superior':'central';
   makeEv(t,'¡Cae una torre '+place+'!',
    c.name+' derriba la '+['exterior','interior','de base'][stage-1]+
    ' del carril '+place+' tras daño persistente. '+who.name+' participa.',
    'goal',c,{action:'tower',actorId:who.id,
     participantIds:solo?[who.id]:participants,lane,stage,node,
     firstTower:bonus>0,firstTowerBonus:bonus,
     soloSplitpush:solo,wave:hit.wave,earnedFightPressure,crossmapTrade,
     towerVersion:1,towerHpAfter:hit.after});
  }
  return true;
 };
 const nextSnapshot=t=>m.frames.push({minute:t,kills:{...m.kills},gold:{...m.gold},towers:{...m.towers},dragons:{...m.dragons},barons:{...m.barons},winner:m.winner,eventsCount:m.events.length,
  nexusIntegrity:{...m.nexusIntegrity},
  laneEconomy:RiftCore.LaneEconomy.snapshot(laneEconomy),
  powerEconomy:RiftCore.PowerEconomy.snapshot(powerEconomy),
  shutdowns:RiftCore.Shutdowns.snapshot(shutdowns),
  siege:RiftCore.NexusSiege.snapshot(nexusSiege),
  vision:RiftCore.Vision.snapshot(navigation.vision,t),
  macro:RiftCore.MacroPolicy.snapshot(navigation,t),
  playerStats:RiftCore.clonePlayerStats(playerStats),map:RiftCore.cloneMapState(m.map),
  health:{...health},navigation:{before:movementBefore,after:nav.snapshot(navigation,m.dead,t)}});
 makeEv(0,'Comienza el mapa',`${a.name} y ${b.name} entran a la Grieta. Ambos equipos buscan imponer su plan de juego.`, 'normal');nextSnapshot(0);
 const lastLaneTrade={TOP:-10,MID:-10,BOT:-10};
 const lastGankAttempt=Object.create(null);
 let lastCounterFight=-10;
 for(let t=1;t<=76&&!m.winner;t++){
  m.minute=t;
  const teamIncome={};
  for(const c of all){
   const earned=ri(790,1080)+Math.round((balance(c,t)-65)*2);
   teamIncome[c.id]=earned;
   m.gold[c.id]+=earned;
   if(m.baronBuff[c.id]>0)m.baronBuff[c.id]--;
  }
  nav.advance(navigation,t,m.dead,m,{health,map:m.map});
  RiftCore.Encounters.recover(health,navigation,m.dead,t);
  const farmIncome=RiftCore.LaneEconomy.advance(laneEconomy,
    {minute:t,nav:navigation,map:m.map,health,gold:m.gold,structures:m.lanes});
  RiftCore.PowerEconomy.advance(powerEconomy,
    {minute:t,nav:navigation,dead:m.dead,health,teamIncome});
  for(const earning of farmIncome)
   RiftCore.PowerEconomy.awardFarm(powerEconomy,earning,navigation,health);
  movementBefore=nav.snapshot(navigation,m.dead,t);
  m.map=updateMap(t);
  // Wards are placed by physical, living JUN/SUP agents at contested nodes.
  // Their sight can inform later decisions but cannot reveal hidden global HP.
  const wards=RiftCore.Vision.advance(navigation.vision,navigation,t);
  for(const ward of wards){
   const owner=club(ward.teamId),actor=player(ward.actorId);
   makeEv(t,'Visión asegurada',
    actor.name+' coloca visión para '+owner.name+
    ' en '+ward.node.replaceAll('_',' ')+'. La cobertura expira en el minuto '+ward.expires+'.',
    'normal',owner,{action:'ward_place',visionVersion:1,
     actorId:ward.actorId,participantIds:[ward.actorId],
     node:ward.node,wardId:ward.id,expires:ward.expires});
  }
  // Every purchase requires a physically present professional at their
  // own nexus/fountain, a funded personal wallet and an available item slot.
  for(const agent of Object.values(navigation.agents)){
   if(!agent.alive||(m.dead[agent.id]||0)>t)continue;
   const purchase=RiftCore.PowerEconomy.purchase(powerEconomy,navigation,agent,t,m);
   if(!purchase)continue;
   const buyer=player(agent.id);
   makeEv(t,'Compra de equipamiento',
     buyer.name+(purchase.voluntaryRecall?' completa un regreso táctico y compra ':' aprovecha su presencia en base para comprar ')+purchase.itemName+
     ' por '+purchase.goldCost+' de oro, alcanzando nivel '+purchase.level+'.',
     'normal',club(agent.teamId),purchase);
  }
  // Early lane trades are genuine ranged/close combat, including 2v2 bot.
  // The two opposing laners must belong to the narrated lane, be in lane
  // trading range and have enough health to participate. No fake kill rolls.
  if(t>=3&&t<=35){
   for(const [index,lane] of ['TOP','MID','BOT'].entries()){
    if((t+index)%4!==0||t-lastLaneTrade[lane]<4)continue;
    const attacker=((commentarySeed+t+index)%2===0)?a:b,defender=enemy(attacker);
    const laneRoles=lane==='BOT'?['ADC','SUP']:[lane];
    const offense=laneRoles.map(r=>byRole(attacker,r,t)).filter(Boolean);
    const defense=laneRoles.map(r=>byRole(defender,r,t)).filter(Boolean);
    if(!offense.length||!defense.length)continue;
    const facts=RiftCore.Encounters.resolveCombat({
     nav:navigation,dead:m.dead,minute:t,players:Object.fromEntries([...aP,...bP].map(p=>[p.id,p])),
     health,seed:commentarySeed,powerState:powerEconomy,mode:'lane',teamId:attacker.id,
     attackerIds:offense.map(p=>p.id),targetIds:defense.map(p=>p.id),lane
    });
    if(!facts)continue;
    lastLaneTrade[lane]=t;
    facts.action='lane_trade';
    applyCombat(facts,t);
    const nameLane={TOP:'superior',MID:'central',BOT:'inferior'}[lane];
    makeEv(t,facts.outcome==='kill'?'¡Eliminación en '+nameLane+'!':
      facts.outcome==='retreat'?'Retrocede el carril '+nameLane:
      'Intercambio de daño en '+nameLane,
      player(facts.actorId).name+' intercambia daño en el carril '+nameLane+
      ' con '+player(facts.targetId).name+'. '+combatDetails(facts),
      facts.outcome==='kill'?'fight':'normal',attacker,facts);
   }
  }
  // Only stage ganks for a JUN who actually has a planned lane and is
  // physically close to that opponent. A random unrelated lane cannot fire.
  if(t>=4&&t<=22){
   const eligible=all.map(attacker=>{
    const j=byRole(attacker,'JUN',t),agent=j&&nav.getAgent(navigation,j.id);
    if(!j||!agent?.alive||agent.intent!=='gank_setup'||!agent.lane||
       (lastGankAttempt[attacker.id]??-10)>=t-3)return null;
    const lane=agent.lane,lanerRole=lane==='BOT'?'ADC':lane;
    const victimTeam=enemy(attacker),v=byRole(victimTeam,lanerRole,t);
    if(!v||!nav.isLaneNode(nav.getAgent(navigation,v.id)?.node,lane)||
       !nav.combatRange(agent.node,nav.getAgent(navigation,v.id)?.node,2))return null;
    return {attacker,j,agent,lane,lanerRole,v,victimTeam};
   }).filter(Boolean);
   if(eligible.length&&chance(t<13?.65:.55)){
    const {attacker,j,agent,lane,lanerRole,v,victimTeam}=pick(eligible);
    lastGankAttempt[attacker.id]=t;
    const context=m.map.lanes[lane];
    const closeGank=(x,y)=>Boolean(x&&y&&
      nav.combatRange(nav.getAgent(navigation,x.id)?.node,
                      nav.getAgent(navigation,y.id)?.node,2));
    const support=byRole(attacker,lanerRole,t);
    const helper=support&&closeGank(support,v)?support:null;
    const combat=RiftCore.Encounters.resolveCombat({
      nav:navigation,dead:m.dead,minute:t,
      players:Object.fromEntries([...aP,...bP].map(p=>[p.id,p])),
      health,seed:commentarySeed,powerState:powerEconomy,mode:'gank',teamId:attacker.id,
      attackerIds:[j.id,...(helper?[helper.id]:[])],targetIds:[v.id],lane
    });
    if(!combat)throw Error('Gank elegible sin daño resoluble');
    const approach=nav.gankApproach(agent.node,lane);
    const nameLane={TOP:'superior',MID:'central',BOT:'inferior'}[lane];
    combat.action=combat.victimIds.length?'gank':'gank_avoided';
    combat.initiatorId=j.id;
    combat.initiatorNode=agent.node;
    combat.spatialVersion=2;combat.plannedGankVersion=1;
    combat.route=approach;combat.supportId=helper?.id||j.id;
    combat.victimNode=nav.getAgent(navigation,v.id).node;
    combat.attackerPressure=context.pressure[attacker.id];
    combat.defenderVision=context.vision[victimTeam.id];
    applyCombat(combat,t);
    const entry=j.name+' se acerca por '+({rio:'el río',jungla:'la jungla',flanco:'un flanco',tribush:'el acceso inferior'}[approach]||'la jungla')+
       ' hacia '+v.name+'. '+combatDetails(combat);
    makeEv(t,combat.victimIds.length?'¡Gank con eliminación en '+nameLane+'!':
      combat.outcome==='retreat'?'Gank obliga a retirarse en '+nameLane:
      'Gank resistido en '+nameLane,
      entry,combat.victimIds.length?'fight':'normal',attacker,combat);
   }
  }
  // Causal objective skirmishes. A numerical 2v1 near Dragon/Baron
  // becomes actual damage, a possible kill, or a forced, visible retreat.
  // It never disappears behind an unrelated lane-pressure commentary.
  if(t>=5){
   const roster=Object.fromEntries([...aP,...bP].map(p=>[p.id,p]));
   for(const zone of ['dragon_pit','baron_pit']){
    if(zone==='baron_pit'&&t<20)continue;
    const facts=RiftCore.Encounters.resolve({
      nav:navigation,dead:m.dead,minute:t,zone,
      players:roster,health,seed:commentarySeed,powerState:powerEconomy,previous:lastSkirmish
    });
    if(!facts)continue;
    const attacker=club(facts.teamId),defender=player(facts.targetId);
    const leader=player(facts.actorId);
    const zoneName=zone==='dragon_pit'?'Dragón':'Barón';
    lastSkirmish[zone]=t;
    if(facts.outcome==='kill'){
      if(!addKill(leader,defender,t))throw Error('Kill de escaramuza sin víctima viva');
      facts.hpAfter=0;
      makeEv(t,'¡Escaramuza ganada en '+zoneName+'!',
        attacker.name+' sorprende a '+defender.name+' con '+facts.attackerCount+
        ' atacantes contra '+facts.defenderCount+
        '. '+leader.name+' consigue la eliminación cerca de '+zoneName+'.',
        'fight',attacker,facts);
    }else{
      health[defender.id]=facts.hpAfter;
      if(!nav.forceRetreat(navigation,defender.id,t,facts.retreatGoal))
        throw Error('Retirada sin jugador activo');
      makeEv(t,'¡'+defender.name+' escapa de '+zoneName+'!',
        attacker.name+' presiona con '+facts.attackerCount+' profesionales contra '+
        facts.defenderCount+'. '+defender.name+' recibe '+facts.damage+
        ' de daño, sobrevive con '+facts.hpAfter+
        '% de vida y se retira; no se registra una eliminación.',
        'fight',attacker,facts);
    }
   }
  }
  // Every tower stores real HP. Damage and plates require wave pressure and
  // actual players at the structure; no instant destruction or clock roll.
  if(t>=8)for(const c of [a,b])for(const lane of ['TOP','MID','BOT'])
   attackTower(c,t,lane);
  // The Dragon is earned at the actual pit, not by a scheduled owner roll.
  // Teams choose objective/contest/trade before moving; either can fail to
  // arrive, and a lone enemy JUN can attempt a physically valid Smite steal.
  if(t>=m.nextDragon){
   const candidates=RiftCore.NeutralObjectives.captureCandidates(
     navigation,m.dead,t,health,(id,node)=>positioned(club(id),node),m);
   const eligible=candidates.filter(x=>x.eligible);
   if(eligible.length){
    const contested=candidates.every(x=>x.agents.length>0);
    const initiator=eligible.length===2?
      (chance(clamp(.5+(eligible[0].score-eligible[1].score)*.025,.2,.8))?
       eligible[0]:eligible[1]):eligible[0];
    const captureChance=clamp(.65+(initiator.agents.length-2)*.06+
      (initiator.jungler?.08:-.1)-(contested?.1:0),.35,.9);
    if(chance(captureChance)){
     const challenger=candidates.find(x=>x.id!==initiator.id);
     const steal=Boolean(challenger?.jungler&&
       chance(clamp(.085+(challenger.lanePressure-50)*.0015,.045,.17)));
     const winner=steal?challenger:initiator;
     const actorAgent=steal?challenger.jungler:
       initiator.jungler||initiator.agents[0];
     const owner=club(winner.id),actor=player(actorAgent.id);
     const source=navigation.neutralPlans?.[owner.id]?.action||'hold';
     const strategy=['take','contest'].includes(source)?source:'opportunistic';
     m.dragons[owner.id]++;m.gold[owner.id]+=230;m.nextDragon=t+5;
     makeEv(t,steal?'¡ROBO DE DRAGÓN!':'Dragón asegurado',
      steal?`${club(initiator.id).name} inició el Dragón, pero ${actor.name} llegó al foso y lo robó con Smite.`:
       `${owner.name} completa la toma del Dragón con jugadores presentes. ${actor.name} participa en el objetivo número ${m.dragons[owner.id]}.`,
      'goal',owner,{action:'dragon',actorId:actor.id,
       participantIds:presentWith(owner,t,actor,'dragon_pit',['JUN','SUP']),
       ordinal:m.dragons[owner.id],node:'dragon_pit',
       objectiveVersion:2,plan:strategy,
       contested,stolen:steal,smite:steal,smiteBy:steal?actor.id:null,
       initiatorTeamId:steal?initiator.id:null,
       score:+winner.score.toFixed(2),
       opponentPresent:(steal?initiator:challenger)?.agents.length||0});
    }
   }
  }
  // Alpha 0.7.12: each team reads actual visible opponents, local numbers,
  // HP and bounties. No synthetic kill or winning-team roll is permitted.
  // The existing damage contract still decides whether a fight kills.
  if(t>=12&&t<57){
   const call=RiftCore.Counterplay.choose({
    nav:navigation,minute:t,health,map:m.map,gold:m.gold,
    shutdowns,previous:lastCounterFight
   });
   if(call){
    const attacker=club(call.teamId);
    const facts=RiftCore.Encounters.resolveCombat({
     nav:navigation,dead:m.dead,minute:t,
     players:Object.fromEntries([...aP,...bP].map(p=>[p.id,p])),
     health,seed:commentarySeed,powerState:powerEconomy,
     mode:'teamfight',teamId:attacker.id,
     attackerIds:call.attackerIds,targetIds:call.targetIds
    });
    if(facts){
     lastCounterFight=t;
     facts.action=facts.victimIds.length?'teamfight':'clash';
     facts.node=nav.getAgent(navigation,facts.actorId).node;
     facts.counterplayVersion=1;
     facts.counterplay={
      reason:call.reason,targetId:call.targetId,
      targetIds:[...call.targetIds],
      observedNode:call.observedNode,observedHp:call.observedHp,
      localEdge:call.localEdge,score:call.score,
      targetStreak:call.streak,bountyAtPlan:call.bounty,
      goldDeficitAtPlan:call.deficit
     };
     applyCombat(facts,t);
     facts.multiKill=facts.victimIds.length;
     facts.ace=facts.victimIds.length>0&&living(enemy(attacker),t).length===0;
     const pressure=RiftCore.Counterplay.pressureAfterKill(
      navigation,facts,t,m);
     if(pressure)facts.counterPressure={
      ...pressure,sourceVictims:[...pressure.sourceVictims],
      allowed:[...pressure.allowed]
     };
     const multi=facts.victimIds.length===5?'¡PENTAKILL! ':
       facts.victimIds.length===4?'¡CUÁDRUPLE! ':
       facts.victimIds.length===3?'¡TRIPLE KILL! ':'';
     const label=call.reason==='shutdown_hunt'?'¡Cazan al rival con recompensa!':
      call.reason==='isolated_pick'?'¡Castigan a un rival aislado!':
      call.reason==='trailing_counterattack'?'¡Contraataque del equipo rezagado!':
      '¡Pelea por ventaja local!';
     makeEv(t,multi+(facts.victimIds.length?label:
       facts.outcome==='retreat'?'Choque que obliga a retroceder':
       'Combate sin eliminación'),
       player(facts.actorId).name+' coordina el ataque tras detectar a '+
       player(call.targetId).name+'. '+combatDetails(facts)+
       (pressure?' El equipo identifica una oportunidad real de presionar '+pressure.lane+'.':''),
       facts.victimIds.length?'fight':'normal',attacker,facts);
    }
   }
  }
  if(t>=m.nextBaron&&chance(.64)){
   const proposed=decide(a,b,t),eligible=all.filter(c=>positioned(c,'baron_pit').length>=2);
   const initiator=eligible.includes(proposed)?proposed:eligible.find(c=>c.id!==proposed.id);
   if(initiator){
    const challenger=enemy(initiator),j1=positioned(initiator,'baron_pit').find(p=>p.role==='JUN');
    const j2=positioned(challenger,'baron_pit').find(p=>p.role==='JUN');
    // A jungler can steal Baron alone with Smite when physically in reach.
    // Requiring two challengers removed legitimate surprise steals in many
    // deterministic fixtures; the solo play is risky but causally verifiable.
    const steal=j2&&
     chance(clamp(.11+(player(j2.id).beh.risk-50)*.0018,.055,.22));
    const owner=steal?challenger:initiator;
    const actor=player((steal?j2:j1||positioned(initiator,'baron_pit')[0]).id);
    m.barons[owner.id]++;m.gold[owner.id]+=450;m.baronBuff[owner.id]=5;m.nextBaron=t+7;
    const headline=steal?'¡ROBO DE BARÓN!':'Barón asegurado';
    const body=steal?`${initiator.name} inicia el Barón, pero ${actor.name}, jungla de ${challenger.name}, llega al foso y lo roba con Smite.`:
     `${owner.name} asegura el Barón con profesionales presentes en el foso. ${actor.name} figura en la toma del objetivo.`;
    makeEv(t,headline,body,'goal',owner,{action:'baron',actorId:actor.id,
      participantIds:presentWith(owner,t,actor,'baron_pit',['JUN','SUP']),
      stolen:!!steal,smite:!!steal,smiteBy:steal?actor.id:null,
      initiatorTeamId:initiator.id,node:'baron_pit'});
   }
  }
  if([6,14,24,33].includes(t)){
   const leader=m.gold[a.id]>m.gold[b.id]?a:b;const dif=Math.abs(m.gold[a.id]-m.gold[b.id]);
   makeEv(t,dif<1800?'Máxima igualdad en la Grieta':'Lectura del mapa',dif<1800?'Los equipos intercambian oleadas y control de visión. La diferencia económica sigue siendo reducida.':`${leader.name} mantiene una ventaja aproximada de ${(dif/1000).toFixed(1)}k de oro. El rival debe elegir cuidadosamente sus próximos objetivos.`,'normal')
  }
  // The Nexus has its own persistent HP. Only a physically escorted wave
  // in a broken lane can damage it. No minute-based random winner roll.
  for(const hit of RiftCore.NexusSiege.advance(
   nexusSiege,navigation,m,t,health,m.dead)){
   const winner=club(hit.teamId),actorId=hit.participantIds.find(id=>
     player(id).role==='ADC')||hit.participantIds[0];
   const actor=player(actorId);
   const finished=hit.after===0;
   if(finished)m.winner=winner.id;
   const title=finished?'¡NEXO DESTRUIDO!':'¡El Nexo recibe daño!';
   const body=finished?
    winner.name+' destruye el Nexo enemigo con un asedio real. '+
    actor.name+' y los atacantes presentes completan los últimos '+
    hit.damage+' puntos de daño al minuto '+t+'.':
    winner.name+' avanza con una oleada en '+hit.lane+' y '+actor.name+
    ' participa en el asedio. El Nexo pierde '+hit.damage+
    ' de vida y conserva '+hit.after+' de '+nexusSiege.maxHp+'.';
   makeEv(t,title,body,finished?'end':'normal',winner,
    {...hit,action:finished?'nexus':'nexus_damage',
     actorId,participantIds:hit.participantIds,
     siegeVersion:1});
  }
  nextSnapshot(t)
 }
 const report={champions,fixture:{a:f.a,b:f.b,round:f.round,playoff:!!f.playoff},frames:m.frames,events:m.events,moments:m.moments,health:{...health},powerEconomy:RiftCore.PowerEconomy.snapshot(powerEconomy),shutdowns:RiftCore.Shutdowns.snapshot(shutdowns),playerStats:RiftCore.clonePlayerStats(playerStats),elapsed:0,speed:1,running:true,committed:false,winner:m.winner,finished:false};
 RiftCore.attachMinimap(report,s);RiftCore.attachBroadcast(report,s,commentarySeed);
 RiftCore.MatchReplay.attachReplay(report,s);return report
}
function quickGame(a,b){let pa=teamPower(club(a)),pb=teamPower(club(b));return chance(clamp(.5+(pa-pb)*.022,.12,.88))?a:b}
function award(a,b,winner,kind='league'){
 const loser=winner===a?b:a;const isOther=club(a).region==='Boreal';const table=isOther?s.otherStandings:s.standings;
 if(kind==='league'){table[winner].w++;table[winner].points+=3;table[loser].l++;club(winner).wins++;club(loser).losses++}
 if(kind==='playoff'){club(winner).history.push({year:s.year,event:'Victoria de playoff'})}
}
function quickSeasonGame(f){const w=quickGame(f.a,f.b);award(f.a,f.b,w,'league');f.played=true;return w}
function quickPlayoffGame(f){const w=quickGame(f.a,f.b);f.played=true;f.winner=w;return w}
function resolveOtherRound(f){const all=[...(s.fixtures[s.month]||[])];for(let game of all.filter(g=>g.round===f.round&&!g.played)){if(game.a===s.userClub||game.b===s.userClub)continue;quickSeasonGame(game)} }
function rankTable(region='Aurora'){let tab=region==='Aurora'?s.standings:s.otherStandings;return s.clubs.filter(c=>c.region===region).sort((a,b)=>(tab[b.id]?.points||0)-(tab[a.id]?.points||0)||((tab[b.id]?.w||0)-(tab[a.id]?.w||0))||teamPower(b)-teamPower(a))}
function finishMatch(){const live=s.live;if(!live||live.committed)return;live.running=false;live.committed=true;live.finished=true;
 if(demoBackup){stopTimer();render();return;}
 const f=live.fixture,w=live.winner,c=currentClub(),won=w===c.id,enemyId=f.a===c.id?f.b:f.a,opp=club(enemyId);
 let scheduled=(f.playoff?s.playoffs:s.fixtures[s.month]||[]).find(x=>x.a===f.a&&x.b===f.b&&!x.played);
 if(scheduled){scheduled.played=true;scheduled.winner=w;if(!f.playoff)resolveOtherRound(scheduled)}
 if(!f.playoff)award(f.a,f.b,w,'league');else award(f.a,f.b,w,'playoff');
 let prize=f.playoff?(won?68000:14000):(won?24000:7000);
 RiftCore.adjustCash(c,prize);record('premio',prize,won?'Victoria ante '+opp.name:'Participación ante '+opp.name);
 c.fans=clamp(c.fans+(won?ri(2700,6500):-ri(600,2300)),10000,1200000);
 c.chemistry=clamp(c.chemistry+(won?1.5:.4),20,98);
 for(let p of teamPlayers(c)){p.games++;p.observed=clamp(p.observed+1,0,30);p.fatigue=clamp(p.fatigue+ri(3,7)-s.plan.rest*2,0,100);p.morale=clamp(p.morale+(won?ri(1,5):-ri(1,4)),5,100)}
 let frame=live.frames[live.frames.length-1],kills=frame.kills;
 let outcome={year:s.year,month:s.month,against:opp.name,win:won,killsFor:kills[c.id],killsAgainst:kills[opp.id],length:frame.minute,playoff:!!f.playoff,events:live.events.filter(e=>e.kind!=='normal').slice(-6)};
 // v2 legacy matches lack individual data, and remain playable without migration.
 if(live.playerStats){
  outcome.playerStats=RiftCore.clonePlayerStats(live.playerStats);
  for(const teamId of [f.a,f.b])for(const q of teamPlayers(club(teamId))){
   if(live.playerStats[q.id])RiftCore.addBroadcastGame(q,live.playerStats[q.id]);
  }
 }
 s.matchReports.unshift(outcome);s.matchReports=s.matchReports.slice(0,40);
 if(f.playoff){if(scheduled&&scheduled.phase==='semi'){let semis=s.playoffs.filter(x=>x.phase==='semi');for(const semifinal of semis.filter(x=>!x.played))quickPlayoffGame(semifinal);if(semis.every(x=>x.played))makeFinalAfterSemis()}
  else if(scheduled&&scheduled.phase==='final'){s.champion=w;addNews('¡Nuevo campeón de la Liga Aurora!',`${club(w).name} conquista el campeonato de ${s.year} tras superar a ${club(w===f.a?f.b:f.a).name} en la gran final.`, 'league',w,3);club(w).prestige+=4;club(w).fans+=22000}}
 if(won&&f.playoff)notify('¡Victoria en playoffs! Has ganado '+fmt(prize)+' en premios.');
 else notify((won?'Victoria':'Derrota')+' ante '+opp.name+'. '+(won?'Premio: ':'Participación: ')+fmt(prize));
 save();render()
}
function updateReplayCursor(){
 const l=s?.live;if(!l)return;
 const state=RiftCore.MatchReplay.ensure(l);
 const step=state.list[state.cursor];
 if(step){
  const offset=l.frames.findIndex(f=>f.minute>=step.event.minute);
  l.elapsed=offset>=0?offset:l.frames.length-1;
 }
 l.visibleCount=state.progress+1;
}
function seekReplay(index){
 if(!s?.live||!RiftCore.MatchReplay.seek(s.live,index))return false;
 updateReplayCursor();save();render();return true;
}
function nextReplay(){
 const l=s?.live;if(!l)return;
 if(l.finished){
  const state=RiftCore.MatchReplay.ensure(l);
  if(state.cursor<state.progress)seekReplay(state.cursor+1);
  return;
 }
 const atEnd=RiftCore.MatchReplay.next(l);
 updateReplayCursor();
 if(atEnd){finishMatch();return}
 save();render();
}
function tick(){nextReplay()}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
function playTimer(){stopTimer()} // Old saves remain readable, but no interval advances the match.
// A disposable match: no writes, transfers, rewards, months or changes to the existing save.
function startDemoMatch(){
 if(demoBackup)return replayDemoMatch();
 stopTimer();
 const backup={state:s,view,modal};
 demoBackup=backup;
 try{
  newGame('balanced','Rift Demo');
  const fixture=(s.fixtures[2]||[]).find(f=>f.a===s.userClub||f.b===s.userClub);
  if(!fixture)throw Error('No hay rival para la exhibición');
  s.live=simulateMatch(fixture);
  updateReplayCursor();
  modal=null;view='match';render();
 }catch(error){
  demoBackup=null;s=backup.state;view=backup.view;modal=backup.modal;
  render();console.warn('Error en la exhibición:',error);
 }
}
function replayDemoMatch(){
 if(!demoBackup||!s?.live)return;
 stopTimer();
 s.live=simulateMatch(s.live.fixture);
 updateReplayCursor();
 view='match';modal=null;render();
}
function exitDemoMatch(){
 if(!demoBackup)return;
 stopTimer();
 const prior=demoBackup;demoBackup=null;
 s=prior.state;view=prior.view;modal=prior.modal;
 render();
}
function startMatch(){if(s.over||(s.live&&!s.live.finished))return;const f=nextFixtures()[0];if(!f){notify('No hay partidos pendientes este mes.');return}s.live=simulateMatch(f);updateReplayCursor();view='match';save();render()}
function liveControl(action){
 const l=s?.live;if(!l)return;
 if(action==='next'){nextReplay();return}
 if(action==='instant'){
  if(!RiftCore.MatchReplay.complete(l))return;
  updateReplayCursor();
  if(!l.finished){finishMatch();return}
  save();render();return;
 }
 // Compatibility with prior v2 saves; these controls never schedule a timer.
 if(action==='pause'||action==='resume')l.running=false;
 else if(action.startsWith('speed-'))l.speed=Number(action.split('-')[1]);
 save();render();
}
function beginPlayoffs(){if(s.playoffsSetup)return;s.playoffsSetup=true;const rank=rankTable('Aurora');const pairs=[[rank[0],rank[3]],[rank[1],rank[2]]];s.playoffs=pairs.map(([a,b],j)=>({a:a.id,b:b.id,round:50+j,phase:'semi',playoff:true,played:false}));
 addNews('Playoffs: cuatro equipos, un título',`${rank.slice(0,4).map(c=>c.name).join(', ')} competirán por el campeonato regional.`,'league',null,3);
 if(!s.playoffs.some(f=>f.a===s.userClub||f.b===s.userClub)){for(const f of s.playoffs)quickPlayoffGame(f);makeFinalAfterSemis(true)}}
function makeFinalAfterSemis(auto=false){if(s.playoffs.some(f=>f.phase==='final'))return;const semis=s.playoffs.filter(f=>f.phase==='semi');if(semis.length!==2||!semis.every(f=>f.played))return;
 let final={a:semis[0].winner,b:semis[1].winner,round:53,phase:'final',playoff:true,played:false};s.playoffs.push(final);
 if(auto||![final.a,final.b].includes(s.userClub)){let win=quickPlayoffGame(final);s.champion=win;club(win).prestige+=4;club(win).fans+=18000;addNews('La Liga Aurora ya tiene campeón',`${club(win).name} gana la final regional de ${s.year}.`, 'league',win,3)}else addNews('Todo listo para la gran final',`${club(final.a).name} y ${club(final.b).name} disputarán el título de la Liga Aurora.`, 'league',null,3)
}
function simulateOtherMonth(){for(const f of (s.otherFixtures[s.month]||[]))if(!f.played)quickSeasonGame(f)}
// THE WORLD — month-by-month finances and causal news.
function replaceOnClub(target,newP){let old=player(target.lineup[newP.role]);if(old){target.roster=target.roster.filter(id=>id!==old.id);old.teamId=null;old.contract=0}
 newP.teamId=target.id;newP.contract=ri(10,28);if(!target.roster.includes(newP.id))target.roster.push(newP.id);target.lineup[newP.role]=newP.id;target.chemistry=clamp(target.chemistry-ri(3,8),30,95);return old}
function simulateWorld(){let rivals=s.clubs.filter(c=>c.id!==s.userClub);s.leagueHype=clamp(s.leagueHype+ri(-2,2),20,100);
 // Existing rumors either become real contract moves or fail; neither is invented as fact.
 for(const rumor of s.rumors.filter(r=>!r.resolved&&r.year===s.year&&r.month<s.month)){
  rumor.resolved=true;let target=club(rumor.clubId),p=player(rumor.playerId);
  if(target&&p&&p.teamId===null&&chance(.57)&&target.cash>p.value*.4+250000){let price=marketPrice(p);RiftCore.adjustCash(target,-price);let old=replaceOnClub(target,p);
   addNews('Rumor confirmado: llega un refuerzo',`${target.name} ficha a ${p.name} (${ROLE_NAME[p.role]}) por ${fmt(price)}. ${old?.name||'Un titular'} abandona la plantilla.`,'transfer',target.id,2)
  }else addNews('La negociación se enfría',`Las conversaciones relacionadas con ${p?.name||'un jugador'} no prosperan. El mercado continúa abierto.`,'rumor',target?.id||null)
 }
 s.rumors=s.rumors.filter(r=>!r.resolved);
 if(chance(.42)){
  let target=pick(rivals);let agents=s.players.filter(p=>!p.teamId&&!p.retired&&p.age<34&&playerRating(p)>=60);
  let role=pick(ROLES),free=agents.filter(p=>p.role===role&&p.wage<target.sponsor.monthly*.5);
  if(free.length&&target.cash>400000){let incoming=pick(free),fee=marketPrice(incoming);RiftCore.adjustCash(target,-fee);let old=replaceOnClub(target,incoming);
   let change=playerRating(incoming)-playerRating(old);if(change>=5)target.prestige=clamp(target.prestige+2,0,100);
   addNews('Movimiento oficial de mercado',`${target.name} incorpora al ${ROLE_NAME[role]} ${incoming.name} por ${fmt(fee)}. ${old.name} queda libre.`, 'transfer',target.id,2)
  }
 }
 if(chance(.3)){
  let target=pick(rivals),boost=ri(7000,26000),name=pick(sponsors);target.sponsor={name,monthly:target.sponsor.monthly+ri(5000,16000),obligation:target.sponsor.obligation,remaining:12};RiftCore.adjustCash(target,boost);
  addNews('Nuevo patrocinio regional',`${name} firma un acuerdo con ${target.name}. El club refuerza sus ingresos comerciales y recibe un adelanto de ${fmt(boost)}.`, 'sponsor',target.id,2)
 }
 if(chance(.27)){
  const target=pick(rivals),p=pick(s.players.filter(x=>!x.teamId&&!x.retired&&x.age<=28&&x.wage<35000)||[]);
  if(p){s.rumors.push({clubId:target.id,playerId:p.id,month:s.month,year:s.year,resolved:false});addNews('Filtración del mercado',`Fuentes cercanas a la negociación aseguran que ${target.name} estudia fichar a ${p.name}. No hay acuerdo confirmado.`, 'rumor',target.id,1)}
 }
 if(chance(.11)){let target=pick(s.clubs.filter(c=>c.region==='Aurora'&&c.id!==s.userClub));let source=pick(s.clubs.filter(c=>c.region==='Boreal'));let star=player(source.lineup.MID),old=player(target.lineup.MID);
  if(star&&old&&target.cash>650000&&target.cash>=Math.round(star.value*1.08)){let fee=Math.round(star.value*1.08);RiftCore.transferCash(target,source,fee);source.roster=source.roster.filter(id=>id!==star.id);let filler=s.players.find(p=>!p.teamId&&!p.retired&&p.role==='MID');if(!filler){filler=generatePlayer('MID',null,-5);s.players.push(filler)}filler.teamId=source.id;source.roster.push(filler.id);source.lineup.MID=filler.id;
   replaceOnClub(target,star);target.fans+=35000;s.leagueHype=clamp(s.leagueHype+ri(7,15),20,100);
   s.clubs.filter(c=>c.region==='Aurora').forEach(c=>c.fans+=ri(1500,5000));
   addNews('¡FICHAJE QUE SACUDE LA LIGA!',`${target.name} contrata al midlaner ${star.name}, una figura del Circuito Boreal, por ${fmt(fee)}. La audiencia de la Liga Aurora crece, pero la competencia se endurece.`, 'transfer',target.id,3)
  }
 }
 if(chance(.1)){let target=pick(rivals),lost=ri(80000,300000);RiftCore.adjustCash(target,-lost);target.fans=Math.max(8000,target.fans-ri(4000,18000));
  addNews('Crisis corporativa en la escena',`${target.name} pierde un acuerdo comercial tras un conflicto contractual ficticio. La organización estima un impacto de ${fmt(lost)} y anuncia una revisión de sus operaciones.`, 'crisis',target.id,2)
 }
 // League-wide financial changes affect everyone, not just the player.
 if(chance(.15)){let delta=ri(5,12)*(chance(.5)?1:-1);s.leagueHype=clamp(s.leagueHype+delta,20,100);
  addNews(delta>0?'La liga gana audiencia':'Retroceso de audiencia',delta>0?`Una buena racha de enfrentamientos y nuevos acuerdos elevan el interés por la ${s.leagueName}. Los patrocinios regionales podrían mejorar.`:`La ${s.leagueName} registra una caída de audiencia. Los responsables revisan su estrategia de distribución y los sponsors muestran mayor cautela.`, 'league',null,2)
 }
 // Rare, actionable financial risk for the player; no serious wrongdoing is invented.
 if(!s.crisis&&chance(.027)){s.crisis={id:uid('crisis'),kind:'sponsor',amount:ri(85000,310000)};
  addNews('Alerta para tu dirección financiera',`Un proveedor comercial clave entra en una disputa contractual y congela pagos comprometidos con ${currentClub().name}. Necesitas decidir cómo responder.`, 'crisis',s.userClub,3)
 }
 // AI clubs are subject to ordinary payroll and revenues, too.
 for(const c of rivals){let income=(c.sponsor?.monthly||0)+c.fans*.18+40000+(c.region==='Aurora'?s.leagueHype*180:8000),spent=totalWages(c)+c.staff*9000+34000;
  RiftCore.adjustCash(c,Math.round(income-spent));if(c.sponsor?.remaining>0)c.sponsor.remaining--;
  if(c.cash<180000&&c.roster.length>5){const spare=c.roster.map(player).filter(p=>!Object.values(c.lineup).includes(p.id));if(spare.length){let released=spare.sort((a,b)=>b.wage-a.wage)[0];c.roster=c.roster.filter(id=>id!==released.id);released.teamId=null;addNews('Ajustes por presión financiera',`${c.name} libera a ${released.name} para reducir su masa salarial.`, 'finance',c.id,1)}}
 }
}
function applyMonth(){const c=currentClub(),p=s.plan;
 const oldCash=c.cash;
 const {sponsor,merch,league,media,income,salaries,staff,ops,program,expenses,fulfilled}=RiftCore.quoteMonth(s,c,player);
 RiftCore.adjustCash(c,income-expenses);
 c.fans=clamp(c.fans+Math.round(p.content*1450+p.community*1950+ri(-2300,800))+(fulfilled?400:-1500),7000,2000000);
 c.chemistry=clamp(c.chemistry+p.scrims*.42+p.community*.18-((p.content>=3)?1:0),20,99);
 for(const id of c.roster){const q=player(id);q.fatigue=clamp(q.fatigue+p.scrims*2+p.content+ri(0,3)-p.rest*7,0,100);q.morale=clamp(q.morale+(p.community>0?1:0)+ri(-1,1),10,100)}
 if(p.development>=1){const q=player(s.focus);if(q&&q.teamId===c.id){let bonus=p.development+(c.staff>=4?1:0),attr=s.focusAttr||'macro';if(attr==='risk')q.beh.risk=clamp(q.beh.risk-Math.round(bonus*1.3),8,97);
 else if(attr==='team')q.beh.team=clamp(q.beh.team+bonus*1.5,8,97);
 else if(attr==='lead')q.beh.lead=clamp(q.beh.lead+bonus,8,97);
 else if(attr==='nerve')q.beh.nerve=clamp(q.beh.nerve+bonus,8,97);
 else if(attr==='aggressive')q.beh.agg=clamp(q.beh.agg+bonus,8,97);
 else if(q.a[attr]!=null)q.a[attr]=clamp(q.a[attr]+Math.max(0,Math.round(bonus*(q.potential/100)*(q.age>29?.45:.8))),25,99);
 q.observed=Math.min(30,q.observed+1)}}
 if(c.sponsor?.remaining>0){c.sponsor.remaining--;if(c.sponsor.remaining===0){addNews('Patrocinador finaliza contrato',`${c.sponsor.name} termina su acuerdo con ${c.name}. Necesitas buscar un nuevo sponsor para mantener ingresos recurrentes.`, 'finance',c.id,3);c.sponsor={name:'Sin patrocinador',monthly:0,obligation:'none',remaining:0}}}
 let report={year:s.year,month:s.month,income,expenses,net:income-expenses,items:{sponsor,merch,league,media,salaries,staff,ops,program},cashBefore:oldCash,cashAfter:c.cash,fulfilled};
 s.monthlyReports.unshift(report);s.monthlyReports=s.monthlyReports.slice(0,30);
 record('mes',income-expenses,`Cierre de ${MONTHS[s.month-1]} ${s.year}`);
 if(!fulfilled)addNews('Penalización de patrocinio',`${c.name} no cumplió todos los compromisos de ${c.sponsor.name} y recibió un pago reducido este mes.`, 'finance',c.id,2);
 if(c.cash<=0){c.cash=0;s.over=true;stopTimer();addNews('Cese de operaciones',`${c.name} no puede atender sus obligaciones y entra en insolvencia.`, 'finance',c.id,3)}
 return report
}
function simulateOtherPlayoffs(){let ranks=rankTable('Boreal');const a=quickGame(ranks[0].id,ranks[3].id),b=quickGame(ranks[1].id,ranks[2].id),champ=quickGame(a,b);s.otherChampion=champ;
 addNews('Campeón del Circuito Boreal',`${club(champ).name} gana la final en ${s.year}. Los observadores internacionales se preparan para un mercado de fichajes movido.`, 'league',champ,2)
}
function annualProgress(){
 for(const p of s.players.filter(p=>!p.retired)){p.age++;p.contract=Math.max(0,p.contract-12);if(p.age>26&&chance((p.age-25)*.014)){const key=pick(Object.keys(p.a));p.a[key]=clamp(p.a[key]-ri(1,3),25,98)}else if(p.age<25&&chance(.45)){const key=pick(Object.keys(p.a));p.a[key]=clamp(p.a[key]+ri(1,3),25,p.potential)}
  if(p.age>=34&&chance(clamp((p.age-32)*.16,.08,.84))){let team=p.teamId?club(p.teamId):null;
   if(team){let replacement=s.players.find(q=>!q.teamId&&!q.retired&&q.role===p.role&&q.id!==p.id);if(!replacement){replacement=generatePlayer(p.role,null,-5);s.players.push(replacement)}replaceOnClub(team,replacement)}
   p.retired=true;p.teamId=null;addNews('Una carrera llega a su fin',`${p.name}, ${ROLE_NAME[p.role]} de ${p.age} años, anuncia su retiro profesional.`, 'retirement',team?.id||null,1)
  }
 }
 for(let i=0;i<ri(10,15);i++){let rookie=generatePlayer(pick(ROLES),null,ri(-13,6));rookie.age=ri(17,20);rookie.wage=Math.max(5000,Math.round(rookie.wage*.68));s.players.push(rookie)}
 addNews('Nueva generación de talento',`Las academias publican sus promociones: llegan nuevas promesas al mercado de ${s.year+1}.`, 'rookies',null,2);
 for(const c of s.clubs){c.chemistry=clamp(c.chemistry+ri(-4,2),20,99);c.hype=0}
 // Genuine expansion: only between seasons, with new fixtures generated next year.
 if(chance(.17)){let region=pick(['Aurora','Boreal']);let count=s.clubs.filter(c=>c.region===region).length;
  if(count<10){let name=clubNames.find(n=>!s.clubs.some(c=>c.name===n))||'Club '+ri(100,999);let newC=makeClub(name,region,pick(colours));s.clubs.push(newC);
   addNews('La liga aprueba una plaza de expansión',`${region==='Aurora'?s.leagueName:s.otherName} incorpora a ${newC.name} a partir de la próxima temporada. La estructura competitiva se amplía.`, 'league',newC.id,3)
  }
 }
 // Insolvent autonomous organizations can be replaced by new entrants.
 for(let c of [...s.clubs].filter(c=>c.id!==s.userClub&&c.cash<=0)){
  const name=clubNames.find(n=>!s.clubs.some(v=>v.name===n))||'Zenith '+ri(11,99);
  const entrant=makeClub(name,c.region,pick(colours));let teamIndex=s.clubs.findIndex(x=>x.id===c.id);s.clubs[teamIndex]=entrant;
  c.roster.forEach(id=>{const p=player(id);if(p)p.teamId=null});
  addNews('Nueva organización ocupa una plaza',`${c.name} no logra sostener su actividad y abandona la liga. ${entrant.name} compra la plaza para la temporada siguiente.`, 'league',entrant.id,3)
 }
 for(const c of s.clubs){c.wins=0;c.losses=0}
}
function nextYear(){annualProgress();s.year++;s.season++;s.month=1;s.meta=pick(['aggressive','objectives','scaling']);s.fixtures=generateFixtures(s.clubs.filter(c=>c.region==='Aurora').map(c=>c.id));s.otherFixtures=generateFixtures(s.clubs.filter(c=>c.region==='Boreal').map(c=>c.id));s.standings=standingsFor(s.clubs.filter(c=>c.region==='Aurora').map(c=>c.id));s.otherStandings=standingsFor(s.clubs.filter(c=>c.region==='Boreal').map(c=>c.id));s.playoffs=[];s.playoffsSetup=false;s.champion=null;s.otherChampion=null;
 addNews('¡Nueva temporada!',`Comienza ${s.year}. El meta ahora favorece ${s.meta==='aggressive'?'la presión temprana':s.meta==='objectives'?'el control de objetivos':'las composiciones de escalado'}. Los clubes presentan sus objetivos.`, 'league',null,3)
}
function closeMonth(){if(s.over)return;if(s.crisis){notify('Resuelve la crisis comercial antes de cerrar el mes.');modal={type:'crisis'};render();return}
 if(s.live&&!s.live.finished){notify('Termina el partido antes de avanzar el calendario.');return}
 if(nextFixtures().length){notify('Todavía tienes partidos pendientes este mes.');return}
 if(s.month===9&&s.playoffs.some(f=>!f.played)){notify('Los playoffs todavía tienen partidos pendientes.');return}
 simulateOtherMonth();if(s.month===9)simulateOtherPlayoffs();
 const previous=s.month;const report=applyMonth();if(s.over){view='finance';save();render();return}
 const next=RiftCore.nextDate(s.year,previous);if(next.year!==s.year){nextYear()}else s.month=next.month;
 s.plan=defaultPlan();s.live=null;
 if(previous===8)beginPlayoffs();
 if([1,4,7,10].includes(s.month))s.offers=generateOffers();
 simulateWorld();
 // Multiple matches may be on the calendar, so other leagues advance independently.
 save();render();notify(`${MONTHS[previous-1]} cerrado. Balance ${report.net>=0?'+':''}${fmt(report.net)}. ${MONTHS[s.month-1]} ${s.year}.`)
}
function resolveCrisis(action){if(!s.crisis)return;let c=currentClub(),amount=s.crisis.amount,loss=action==='audit'?Math.round(amount*.44):action==='negotiate'?Math.round(amount*.7):amount;
 if(action==='audit'){c.fans+=4500;c.prestige=clamp(c.prestige+1,0,100)}else if(action==='negotiate'){c.fans=Math.max(10000,c.fans-3500)}else{c.fans=Math.max(10000,c.fans-9000);c.prestige=clamp(c.prestige-3,0,100)}
 RiftCore.adjustCash(c,-loss);record('crisis',-loss,'Resolución de disputa comercial');addNews('Se resuelve la disputa comercial',`${c.name} ${action==='audit'?'realiza una auditoría y logra recuperar parte del dinero':action==='negotiate'?'negocia una salida y limita los daños':'asume la pérdida completa'}: impacto ${fmt(loss)}.`, 'finance',c.id,2);s.crisis=null;modal=null;if(c.cash<=0){c.cash=0;s.over=true}save();render();notify('Crisis resuelta: '+fmt(-loss))
}
function signFreeAgent(id){if(s.live&&!s.live.finished)return notify('Termina el partido para realizar fichajes.');const p=player(id),c=currentClub();if(!p||p.retired||p.teamId||c.roster.length>=10)return notify('No puedes realizar este fichaje.');const fee=marketPrice(p);if(c.cash<=fee)return notify('No tienes dinero suficiente para la prima de firma.');RiftCore.adjustCash(c,-fee);p.teamId=c.id;p.contract=ri(8,24);p.observed=1;p.signedAt=s.year*12+s.month;c.roster.push(p.id);c.chemistry=clamp(c.chemistry-3,20,99);record('fichaje',-fee,p.name);addNews('Tu organización anuncia fichaje',`${c.name} incorpora al ${ROLE_NAME[p.role]} ${p.name} por ${fmt(fee)} de prima de firma.`, 'transfer',c.id,2);save();render();notify(`${p.name} fichado por ${fmt(fee)}. Ya puedes ponerlo como titular.`)}
function sellPlayer(id){if(s.live&&!s.live.finished)return notify('Termina el partido antes de negociar ventas.');let p=player(id),c=currentClub();if(!p||p.teamId!==c.id||c.roster.length<=5)return notify('La plantilla debe conservar al menos cinco jugadores.');if(c.lineup[p.role]===p.id&&!c.roster.some(x=>x!==p.id&&player(x).role===p.role))return notify('Necesitas un reemplazo del mismo rol antes de transferir a tu titular.');
 const age=s.year*12+s.month,fee=RiftCore.salePrice(p,age);
 let buyers=s.clubs.filter(x=>x.id!==c.id&&x.cash>650000&&x.cash>=fee&&x.region===c.region);
 if(!buyers.length)return notify('No hay clubes con capacidad para presentar una oferta ahora.');let buyer=pick(buyers);
 if(!RiftCore.transferCash(buyer,c,fee))return notify('El comprador no dispone de fondos suficientes.');
 c.roster=c.roster.filter(x=>x!==p.id);if(c.lineup[p.role]===p.id)c.lineup[p.role]=c.roster.find(x=>player(x).role===p.role);
 let outgoing=replaceOnClub(buyer,p);c.chemistry=clamp(c.chemistry-ri(1,5),20,99);
 record('venta',fee,p.name);addNews('Transferencia de tu club',`${buyer.name} contrata a ${p.name} procedente de ${c.name} por ${fmt(fee)}. ${outgoing?.name||'Un jugador'} queda libre.`, 'transfer',c.id,2);modal=null;save();render();notify(`${p.name} transferido. Ingreso: ${fmt(fee)}.`)
}
function setLineup(id){if(s.live&&!s.live.finished)return notify('La alineación está cerrada durante el encuentro.');const p=player(id),c=currentClub();if(!p||p.teamId!==c.id)return;const old=player(c.lineup[p.role]);if(old?.id===p.id)return;c.lineup[p.role]=p.id;c.chemistry=clamp(c.chemistry-1,20,99);save();render();notify(`${p.name} será titular como ${ROLE_NAME[p.role]}.`)}
function scoutPlayer(id){const p=player(id),c=currentClub();if(!p)return;if(c.cash<=8500)return notify('No hay presupuesto disponible para scouting.');RiftCore.adjustCash(c,-8500);p.observed=clamp(p.observed+3+s.plan.scout,0,30);record('scouting',-8500,p.name);save();render();notify(`Reporte ampliado sobre ${p.name}.`)}
function chooseSponsor(id){let c=currentClub(),offer=s.offers.find(o=>o.id===id);if(!offer)return;let fee=c.sponsor?.remaining>0?Math.round(c.sponsor.monthly*.65):0;if(c.cash<=fee)return notify('No tienes suficiente liquidez para terminar tu contrato vigente.');RiftCore.adjustCash(c,-fee);c.sponsor={name:offer.name,monthly:offer.monthly,obligation:offer.obligation,remaining:offer.length};s.offers=generateOffers();record('sponsor',-fee,'Cambio comercial');addNews('Nuevo acuerdo comercial',`${offer.name} patrocinará a ${c.name} durante ${offer.length} meses. Retainer mensual: ${fmt(offer.monthly)}.`, 'sponsor',c.id,2);save();render();notify('Patrocinio firmado con '+offer.name)}
function upgrade(type){const c=currentClub(),cost=type==='staff'?170000:220000;if(c.cash<=cost)return notify('Necesitas más liquidez para esta inversión.');if(type==='staff'){if(c.staff>=7)return notify('Tu staff ya tiene el nivel máximo.');c.staff++}else{if((s.merchTier||0)>=3)return notify('La tienda ya está desarrollada al máximo.');s.merchTier=(s.merchTier||0)+1}RiftCore.adjustCash(c,-cost);record('inversion',-cost,type==='staff'?'Mejora staff':'Ampliación merchandising');save();render();notify('Inversión completada: '+fmt(-cost))}
// USER INTERFACE
function pageTitle(title,sub,right=''){return `<div class="pagehead"><div><div class="eyebrow">${MONTHS[s.month-1]} ${s.year} · Temporada ${s.season}</div><h1 style="margin:5px 0">${title}</h1><p>${sub}</p></div>${right}</div>`}
function kpis(){const c=currentClub(),last=s.monthlyReports[0],tab=s.standings[c.id];return `<div class="kpis">
 <div class="kpi"><div class="eyebrow">Dinero disponible</div><div class="value ${c.cash<250000?'bad':''}">${fmt(c.cash)}</div><div class="meta">Si llega a $0, termina la partida</div></div>
 <div class="kpi"><div class="eyebrow">Balance último mes</div><div class="value ${last?.net<0?'bad':'good'}">${last?(last.net>=0?'+':'')+fmt(last.net):'—'}</div><div class="meta">Cobros, salarios y gastos</div></div>
 <div class="kpi"><div class="eyebrow">Temporada actual</div><div class="value">${tab?.w||0}<span class="muted" style="font-size:15px"> V / </span>${tab?.l||0}<span class="muted" style="font-size:15px"> D</span></div><div class="meta">${rankTable().findIndex(x=>x.id===c.id)+1}º en ${s.leagueName}</div></div>
 <div class="kpi"><div class="eyebrow">Afición</div><div class="value">${Math.round(c.fans/1000)}k</div><div class="meta">Interés regional ${s.leagueHype}/100</div></div>
 </div>`}
function miniNews(max=5){return s.news.slice(0,max).map(n=>`<div class="newsitem"><div class="symbol">${n.teamId&&club(n.teamId)?crest(club(n.teamId),30):n.type==='transfer'?'⇄':n.type==='crisis'?'!':n.type==='rumor'?'?':n.type==='sponsor'?'◆':n.type==='finance'?'$':'✦'}</div><div style="flex:1;min-width:0"><div class="eyebrow">${n.type==='rumor'?'FILTRACIÓN · NO CONFIRMADO':n.type==='transfer'?'MERCADO':n.type==='crisis'?'ALERTA':n.type==='finance'?'ECONOMÍA':'NOTICIAS'} <span class="when"> · ${MONTHS[n.month-1]} ${n.year}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div></div>`).join('')}
function standingsHTML(region='Aurora',limit=50){let tab=region==='Aurora'?s.standings:s.otherStandings;let ranks=rankTable(region).slice(0,limit);return `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Organización</th><th class="right">V</th><th class="right">D</th><th class="right">Pts</th></tr></thead><tbody>${ranks.map((c,i)=>`<tr class="${c.id===s.userClub?'you':''}"><td class="rank">${i+1}</td><td><div class="flex">${crest(c,25)}<strong>${esc(c.name)}</strong></div></td><td class="right num">${tab[c.id]?.w||0}</td><td class="right num">${tab[c.id]?.l||0}</td><td class="right num"><b>${tab[c.id]?.points||0}</b></td></tr>`).join('')}</tbody></table></div>`}
const planDefs=[['scrims','Scrims competitivos','Mejoran coordinación y preparación, pero generan cansancio.'],['development','Desarrollo individual','Mejora lentamente un atributo o hábito del jugador elegido.'],['rest','Descanso','Recupera fatiga, reduce carga competitiva.'],['content','Contenido y publicidad','Aumenta fans, merchandising e ingresos comerciales.'],['community','Eventos y comunidad','Mejora el vínculo con la afición; implica un coste.'],['scout','Scouting e inteligencia','Reportes y descubrimiento de rasgos; supone inversión.']];
function planPanel(){return `<section class="panel" id="club-agenda"><div class="panel-head"><h2>Agenda del mes</h2><span class="chip ${sumPlan()>=8?'gold':''}">${sumPlan()} / 8 bloques</span></div>
 <p class="helper">Distribuye el tiempo del club. No puedes entrenar y producir contenido comercial sin límites. Los bloques se ejecutan al cerrar el mes; la preparación para el partido se aplica inmediatamente.</p>
 <div class="stack">${planDefs.map(([id,title,description])=>`<div class="planrow"><div class="grow"><strong>${title}</strong><div class="helper">${description}</div></div><div class="stepper"><button data-action="plan-minus" data-kind="${id}" aria-label="Reducir ${title}" ${s.plan[id]<=0?'disabled':''}>−</button><span>${s.plan[id]}</span><button data-action="plan-plus" data-kind="${id}" aria-label="Aumentar ${title}" ${sumPlan()>=8?'disabled':''}>+</button></div></div>`).join('')}</div>
 <div class="banner" style="margin-top:11px">Contrato: ${sponsorObligationText()} · Costo adicional estimado: <b>${fmt(monthPlanCost())}</b>.</div></section>`}
function sponsorObligationText(){const sp=currentClub().sponsor;if(!sp||!sp.monthly)return 'sin sponsor activo';return sp.obligation==='content'?'al menos 1 bloque de contenido/mes':sp.obligation==='community'?'al menos 1 evento de comunidad/mes':'sin entregables obligatorios'}
function matchupPanel(){let games=nextFixtures();if(s.live&&!s.live.finished)return `<div class="banner">Tienes un partido en curso. <button class="btn secondary small" data-nav="match">Ver retransmisión</button></div>`;
 if(!games.length)return `<section class="panel"><div class="panel-head"><h2>${brand('regular_season')} Calendario competitivo</h2><span class="chip">Sin encuentros pendientes</span></div><p class="helper">${s.month===1?'Pretemporada: aprovecha para planificar, firmar contratos y explorar el mercado.':s.month>=10?'Offseason: el mundo sigue moviéndose. Ficha, vende y construye la próxima plantilla.':s.month===9?'Los playoffs de este año ya no tienen partidos pendientes para tu organización.':'Has disputado tus encuentros del mes.'}</p></section>`;
 const f=games[0],opp=opponentOf(f),c=currentClub();return `<section class="panel"><div class="panel-head"><h2>Próximo partido</h2><span class="chip gold">${competition(f)} ${f.playoff?f.phase==='semi'?'SEMIFINAL':'GRAN FINAL':'Liga · Jornada '+(f.round+1)}</span></div>
 <div class="matchup"><div class="side-team">${crest(c,43)}<strong>${esc(c.name)}</strong></div><span class="versus">VS</span><div class="side-team"><strong>${esc(opp.name)}</strong>${crest(opp,43)}</div></div>
 <div class="split" style="margin-top:12px;flex-wrap:wrap"><span class="helper">${games.length} encuentro${games.length>1?'s':''} pendiente${games.length>1?'s':''} este mes · Tu plan: ${strategyName(s.style)}</span><button class="btn" data-action="start">${icon('play',14)} Jugar partido</button></div>
 </section>`}
function strategyName(x){return {balanced:'Equilibrado',aggressive:'Presión temprana',objectives:'Control de objetivos',scaling:'Escalado y teamfight'}[x]||'Equilibrado'}
function strategyPanel(){let styles=[['balanced','Equilibrado','Adaptación y flexibilidad.'],['aggressive','Presión temprana','Ganks y ventaja de líneas.'],['objectives','Control de objetivos','Visión, dragones y Barón.'],['scaling','Escalado','Proteger carries y dominar late.']];return `<section class="panel" id="club-strategy"><div class="panel-head"><h2>Plan del entrenador</h2><span class="chip green">Meta actual: ${strategyName(s.meta)}</span></div><p class="helper">Tus cinco profesionales ejecutarán esta filosofía por cuenta propia. No controla sus acciones individuales ni garantiza victorias.</p>
 <div class="grid2">${styles.map(([id,name,desc])=>`<button data-action="style" data-id="${id}" class="choice-tile ${s.style===id?'sel':''}"><strong>${name}</strong><small>${desc}</small></button>`).join('')}</div></section>`}
function rosterSmall(){const c=currentClub();return `<section class="panel"><div class="panel-head"><h2>Tus cinco titulares</h2><button class="btn ghost small" data-nav="roster">Gestionar</button></div>${ROLES.map(role=>{let p=player(c.lineup[role]);return `<div class="compact-player"><div class="face-small">${avatar(p,c)}</div><div style="flex:1;min-width:0"><div class="split"><b>${esc(p.name)}</b><span class="eyebrow">${role}</span></div><small>${visibleTraits(p).map(t=>t[0]).join(' · ')||'Traits por descubrir'}</small></div><span class="chip">${playerRating(p)}</span></div>`}).join('')}</section>`}
function renderHome(){
 const c=currentClub(),live=s.live;
 const salary=totalWages(c),agendaCost=monthPlanCost();
 return `${pageTitle('Dirección general','Prepara el equipo, toma decisiones y avanza la temporada solo cuando el calendario lo permita.')}
 ${RiftClubCommand.render({
  dateLabel:MONTHS[s.month-1]+' '+s.year,
  cash:c.cash,cashLabel:fmt(c.cash),
  payroll:salary,payrollLabel:fmt(salary),
  planCost:agendaCost,planCostLabel:fmt(agendaCost),
  sponsorLabel:fmt(c.sponsor?.monthly||0),
  sponsorRequirement:c.sponsor?.obligation||'none',
  contentBlocks:s.plan.content||0,communityBlocks:s.plan.community||0,
  usedBlocks:sumPlan(),strategy:strategyName(s.style),
  pendingFixtures:nextFixtures().length,
  matchRunning:Boolean(live&&!live.finished),
  playoffsPending:s.month===9&&s.playoffs.some(f=>!f.played),
  crisis:Boolean(s.crisis),over:Boolean(s.over)
 })}${kpis()} <div class="cols"><div>
 ${matchupPanel()}${strategyPanel()}${planPanel()}</div><div>${rosterSmall()}<section class="panel"><div class="panel-head"><h2>RiftWire · Últimas noticias</h2><button class="btn ghost small" data-nav="world">Todas</button></div><div class="news">${miniNews(4)}</div></section>
 <section class="panel"><div class="panel-head"><h2>Tabla de liga</h2><span class="chip">${brand('liga_aurora')} ${esc(s.leagueName)}</span></div>${standingsHTML('Aurora',8)}</section></div></div>`}
function playerCard(p){let c=p.teamId?club(p.teamId):null,own=p.teamId===s.userClub,main=own&&currentClub().lineup[p.role]===p.id;let rating=playerRating(p);
 const observed=p.broadcastStats?.games>0?
  `<div class="helper" style="margin-top:6px">K/D/A ${p.broadcastStats.kills}/${p.broadcastStats.deaths}/${p.broadcastStats.assists} · KDA ${RiftCore.playerKda(p.broadcastStats)} <small>(${p.broadcastStats.games} mapas narrados)</small></div>`:'';
 return `<button class="player-card" data-action="profile" data-id="${p.id}"><div class="card-art">${avatar(p,c)}<span class="over">${p.role}${main?' · TITULAR':''}</span><span class="rate">${own||p.observed>=4?'':'≈'}${own||p.observed>=4?rating:Math.round(rating/5)*5}</span></div><div class="card-name"><span>${esc(p.name)}</span><span class="muted" style="font-size:10px">${p.age}a</span></div><div class="helper">${c?crest(c,24)+esc(c.name):'Agente libre'} · ${fmt(p.wage)}/mes</div>${observed}<div class="tags">${tagHtml(p)}</div></button>`}
function renderRoster(){let c=currentClub(),players=c.roster.map(player);let starters=ROLES.map(role=>player(c.lineup[role]));let bench=players.filter(p=>!starters.some(x=>x.id===p.id));let focus=player(s.focus);
 return `${pageTitle('Plantilla y desarrollo','Descubre cartas, estudia sus rasgos y construye una alineación con identidad propia.',`<span class="chip green">Química ${Math.round(c.chemistry)}/100</span>`)}
 <section class="panel"><div class="panel-head"><h2>${crest(c,28)} Quinteto titular</h2><span class="chip">${fmt(totalWages(c))}/mes en salarios totales</span></div><div class="card-grid">${starters.map(playerCard).join('')}</div></section>
 <section class="panel"><div class="panel-head"><h2>Suplentes y cantera inmediata</h2><span class="helper">Fichar agentes libres amplía tu plantilla hasta diez jugadores.</span></div>${bench.length?`<div class="card-grid">${bench.map(playerCard).join('')}</div>`:'<div class="empty">No tienes suplentes. Contrata jugadores en el Mercado.</div>'}</section>
 <section class="panel"><div class="panel-head"><h2>Proyecto de entrenamiento</h2><span class="chip">${s.plan.development} bloques de desarrollo</span></div><div class="grid2"><div class="field"><label>Jugador que recibirá atención individual</label><select data-change="focus">${players.map(p=>`<option value="${p.id}" ${s.focus===p.id?'selected':''}>${esc(p.name)} · ${p.role}</option>`).join('')}</select></div>
 <div class="field"><label>Habilidad o hábito a trabajar</label><select data-change="focusAttr">${[['macro','Macrojuego'],['mech','Mecánicas'],['lane','Laning'],['fight','Teamfighting'],['vision','Visión'],['comm','Comunicación'],['adapt','Adaptación'],['risk','Controlar impulsividad'],['team','Cooperación'],['lead','Liderazgo'],['nerve','Jugar bajo presión'],['aggressive','Desarrollar iniciativa']].map(([id,n])=>`<option value="${id}" ${s.focusAttr===id?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <div class="banner">${focus?`${esc(focus.name)} trabajará en ${esc(s.focusAttr||'macro')} cuando cierres el mes. Los cambios son graduales y dependen del staff, la edad y el potencial.`:'Elige a un jugador.'}</div></section>`}
function renderMarket(){let free=s.players.filter(p=>!p.teamId&&!p.retired&&p.age<37).sort((a,b)=>playerRating(b)-playerRating(a)).slice(0,20);
 return `${pageTitle('Mercado de fichajes','El mejor jugador no siempre es el mejor contrato. Evalúa roles, encaje, riesgos y salarios.',`<span class="chip">${free.length} agentes destacados</span>`)}
 <div class="cols"><div><section class="panel"><div class="panel-head"><h2>Agentes libres</h2><span class="helper">Haz clic en una carta para investigar, contratar o ver sus traits.</span></div><div class="card-grid">${free.map(playerCard).join('')}</div></section></div>
 <div><section class="panel"><h2>Tu situación contractual</h2><div class="ledger" style="margin-top:12px"><div><span>Dinero disponible</span><b>${fmt(currentClub().cash)}</b></div><div><span>Salarios mensuales</span><b>${fmt(totalWages(currentClub()))}</b></div><div><span>Plazas ocupadas</span><b>${currentClub().roster.length} / 10</b></div><div><span>Química del club</span><b>${Math.round(currentClub().chemistry)} / 100</b></div></div><p class="helper" style="margin-top:12px">Las primas de firma se pagan al instante. Los salarios se descuentan cada mes. Puedes transferir un jugador que tenga reemplazo.</p></section>
 <section class="panel"><h2>Filtraciones del mercado</h2><div class="news" style="margin-top:12px">${s.news.filter(n=>n.type==='rumor'||n.type==='transfer').slice(0,5).map(n=>`<div class="activity"><span>${esc(n.title)}</span><small>${MONTHS[n.month-1]} ${n.year}</small></div>`).join('')||'<p class="helper">Todavía no hay movimientos relevantes.</p>'}</div></section></div></div>`}
function matchEventDetail(e){
 const f=e.facts;
 if(!f)return '';
 const who=id=>player(id)?.name||'Profesional desconocido';
 let detail='';
 if(f.combatVersion===1)detail=`${f.mode==='gank'?'Gank':f.mode==='lane'?'Línea '+f.lane:'Pelea'} · ${f.attackerCount} atacante(s) · ${f.impacts.map(p=>who(p.id)+' '+p.hpBefore+'%→'+p.hpAfter+'%').join('; ')} · ${f.victimIds.length?'Baja(s): '+f.victimIds.length:f.outcome==='retreat'?'Retirada confirmada':'Intercambio sin baja'}`;
 else if(f.action==='gank')detail=`${f.lane||'Carril'} · Ruta ${f.route||'desconocida'} · Jungla: ${who(f.initiatorId)} · Kill: ${who(f.actorId)} · Visión rival ${f.defenderVision??'—'}/100`;
 else if(f.action==='teamfight')detail=`${who(f.actorId)} · ${f.victimIds.length} eliminaciones${f.ace?' · Exterminio confirmado':''}`;
 if(f.bountyGold>0)detail+=' · Shutdown '+f.bountyGold+' oro contra '+
  f.shutdowns.map(x=>who(x.victimId)+' ('+x.streakBefore+' kills de racha)').join(', ');
 else if(f.action==='skirmish')detail=`${f.zone==='dragon_pit'?'Dragón':'Barón'} · ${f.attackerCount} contra ${f.defenderCount} · ${who(f.targetId)}: ${f.hpBefore}% → ${f.hpAfter}% de vida · ${f.outcome==='kill'?'Eliminación confirmada':'Se retira sin morir'}`;
 else if(f.action==='baron')detail=f.stolen?`Robo con Smite: ${who(f.actorId)} (JUN)`:`Barón asegurado: ${who(f.actorId)}`;
 else if(f.action==='dragon')detail=`Objetivo: ${who(f.actorId)} · Dragón ${f.ordinal}`;
 else if(f.action==='tower')detail=`Presión: ${who(f.actorId)} · Torre ${f.stage} de ${f.lane}`;
 else if(f.action==='nexus')detail=`Último avance: ${who(f.actorId)}`;
 if(Array.isArray(f.assistIds)&&f.assistIds.length)detail+=` · Asistencias: ${f.assistIds.map(who).join(', ')}`;
 if(Array.isArray(f.participantIds)&&f.participantIds.length>1)
  detail+=` · Apoyaron: ${f.participantIds.filter(id=>id!==f.actorId).map(who).join(', ')}`;
 return detail?`<div class="helper" style="margin-top:5px">RiftCast · ${esc(detail)}</div>`:'';
}
function renderMapTactics(match,frame){
 const map=frame?.map;if(!map)return '<p class="helper">Este mapa fue generado antes del modelo táctico de visión.</p>';
 const a=club(match.fixture.a),b=club(match.fixture.b);
 const names={TOP:'Superior',MID:'Medio',BOT:'Inferior'};
 const towerHp=(id,lane)=>{
  const hp=frame.laneEconomy?.lanes?.[lane]?.hp?.[id];
  if(!Array.isArray(hp))return null; // older replay without tower HP
  const stage=hp.findIndex(v=>v>0);
  if(stage<0)return 'todas destruidas';
  const size=frame.laneEconomy?.towerMaxHp?.[stage]||hp[stage];
  return ['exterior','interior','de base'][stage]+' '+hp[stage]+'/'+size+' HP';
 };
 return `<p class="helper" style="margin-top:8px">Estimación abstracta de control por carril; no representa posiciones exactas.</p>`+
   ROLES.filter(r=>r==='TOP'||r==='MID'||r==='ADC').map(r=>{
    const lane=r==='ADC'?'BOT':r,ctx=map.lanes[lane],p=ctx.pressure[a.id];
    return `<div class="activity" style="display:block"><div class="split"><b>${names[lane]}</b><span class="helper">Presión ${esc(a.name)} ${p}% · ${esc(b.name)} ${100-p}%</span></div>
    <div class="track" style="margin-top:5px"><div class="fill" style="width:${p}%"></div></div>
    <small class="helper">Visión: ${ctx.vision[a.id]} / ${ctx.vision[b.id]}</small>`+
    (towerHp(a.id,lane)?`<div class="helper" style="margin-top:4px">Torres en pie · ${esc(a.name)}: ${esc(towerHp(a.id,lane))} · ${esc(b.name)}: ${esc(towerHp(b.id,lane))}</div>`:'')+
    `</div>`;
   }).join('')+
   `<div class="helper" style="margin-top:10px"><b>Visión del río:</b> ${esc(a.name)} ${map.riverVision[a.id]}/100 · ${esc(b.name)} ${map.riverVision[b.id]}/100</div>`;
}
function renderPlayerScoreboard(match,frame){
 if(!frame?.playerStats)return '<p class="helper">Mapa anterior a las estadísticas K/D/A individuales: conserva su marcador y retransmisión original.</p>';
 return [match.fixture.a,match.fixture.b].map(teamId=>{
  const team=club(teamId);
  return `<div class="eyebrow" style="margin:12px 0 6px">${esc(team.name)}</div>`+
   ROLES.map(role=>{
    const q=player(team.lineup[role]),st=frame.playerStats[q.id];
    if(!st)return '';
    const build=frame.powerEconomy?.entries?.[q.id];
    const items=build?.items||[];
    const powerLine=build?`<div class="helper">Nivel ${build.level} · Oro disponible ${build.wallet} · ${items.length?'Ítems: '+items.map((id,i)=>`<span class="match-item-inline">${globalThis.RiftMatchTab?.itemSlot(id,i)||''} ${esc(RiftCore.PowerEconomy.ITEM_CATALOG.find(x=>x.id===id)?.name||id)}</span>`).join(', '):'Sin compras'}</div>`:'';
    return `<div class="activity" style="gap:8px"><div style="min-width:0;flex:1"><b>${role} · ${esc(q.name)}</b>${powerLine}<div class="helper">Torres ${st.towers} · Dragones ${st.dragons} · Barones ${st.barons}${st.pentakills?' · Pentakills '+st.pentakills:''}</div></div><div style="text-align:right"><strong class="num">${st.kills}/${st.deaths}/${st.assists}</strong><div class="helper">KDA ${RiftCore.playerKda(st)}</div></div></div>`;
   }).join('');
 }).join('');
}
function renderMatch(){const c=currentClub(),l=s.live;
 if(!l)return `${pageTitle('Match Center','Escoge tu quinteto y estrategia; los jugadores compiten autónomamente mientras tú disfrutas del encuentro.')}
 <div class="cols"><div>${matchupPanel()}${strategyPanel()}
 <section class="panel"><h2>Probar simulación</h2><p class="helper">Juega un mapa ficticio independiente. No necesitas avanzar meses ni modificar tu temporada.</p><button class="btn secondary" style="margin-top:8px" data-action="demo-start">Simular partida de prueba</button></section>
 ${s.lastReplay?.finished?'<section class="panel"><h2>Repetición guardada</h2><p class="helper">Vuelve al último partido y selecciona cualquier jugada de su historial.</p><button class="btn secondary" data-action="reopen-replay">Revisar último partido</button></section>':''}
 <section class="panel"><h2>Últimos resultados</h2>${s.matchReports.slice(0,8).map(r=>`<div class="activity"><span><b class="${r.win?'good':'bad'}">${r.win?'VICTORIA':'DERROTA'}</b> · ${esc(r.against)} ${r.playoff?'· Playoffs':''}</span><b>${r.killsFor} – ${r.killsAgainst}</b></div>`).join('')||'<div class="empty">Aún no has jugado un mapa.</div>'}</section></div>
 <div><section class="panel"><h2>Cómo funciona</h2><p class="helper" style="margin-top:8px">No controlas al ADC ni al jungla. El simulador calcula ganks, eliminaciones, torres, dragones y Barones usando atributos, traits, roles y el estado real del mapa.</p><div class="banner">El juego narra acontecimientos simulados, no inventa un resultado para justificarlo después.</div></section>${rosterSmall()}</div></div>`;
 const replay=RiftCore.MatchReplay.ensure(l),timeline=replay.list,
 current=timeline[replay.cursor],previous=timeline[Math.max(0,replay.cursor-1)],
 f=l.fixture,a=club(f.a),b=club(f.b),
 frame=current?.frame||l.frames[Math.min(l.elapsed,l.frames.length-1)],
 selectedEvent=current?.event||null,ended=l.finished,
 viewingFinal=ended&&replay.cursor===timeline.length-1,
 events=timeline.slice(0,replay.progress+1),win=club(l.winner),
 scene=selectedEvent?.source==='match'
  ?RiftCore.MatchReplay.eventView(l,selectedEvent.eventIndex):null,
 sceneFrame=scene?.frame||frame;
 return `${demoBackup?'<div class="banner" style="margin-bottom:14px"><b>PARTIDO DE PRUEBA · NO SE GUARDA</b><p class="helper" style="margin:6px 0">Ninguna jugada, premio ni estadística afectará a tu temporada.</p><button class="btn secondary small" data-action="demo-exit">Volver sin guardar</button></div>':''}${pageTitle('Reproductor de jugadas','Avanza por jugadas sin temporizador. Pulsa cualquier momento del historial para regresar a su marcador y minimapa.',`<span class="chip ${ended?'gold':'green'}">${ended?'PARTIDO TERMINADO':'EN REVISIÓN'}</span>`)}
 ${RiftMatchTab.render({match:l,frame,renderCrest:crest,teams:[a,b].map(t=>({id:t.id,name:t.name,color:t.color,logo:t.logo,secondaryColor:t.secondaryColor,branding:t.branding,players:ROLES.map(role=>player(t.lineup[role]))}))})}
 <div class="cols"><div><section class="panel"><div class="scoreboard"><div class="split"><span class="eyebrow">${demoBackup?brand('rift_league'):competition(f)} ${demoBackup?'Exhibición de prueba':f.playoff?'Playoffs':'Liga regular'} · ${MONTHS[s.month-1]} ${s.year}</span><span class="chip ${ended?'gold':'green'}">${esc(selectedEvent?.time||String(frame.minute).padStart(2,'0')+':00')}</span></div>
 <div class="split" style="margin-top:12px;gap:6px"><div class="flex">${crest(a,41)}<div class="scoreteam">${esc(a.name)}</div></div><div class="scoreline num">${frame.kills[a.id]} : ${frame.kills[b.id]}</div><div class="flex"><div class="scoreteam">${esc(b.name)}</div>${crest(b,41)}</div></div>
 <div class="scoregrid"><div><small>ORO</small><strong>${(frame.gold[a.id]/1000).toFixed(1)}k · ${(frame.gold[b.id]/1000).toFixed(1)}k</strong></div><div><small>TORRES</small><strong>${frame.towers[a.id]} · ${frame.towers[b.id]}</strong></div><div><small>DRAGONES</small><strong>${frame.dragons[a.id]} · ${frame.dragons[b.id]}</strong></div><div><small>BARÓN</small><strong>${frame.barons[a.id]} · ${frame.barons[b.id]}</strong></div><div title="Vida restante de cada Nexo"><small>VIDA NEXOS</small><strong>${frame.siege?.hp?`${frame.siege.hp[a.id]} · ${frame.siege.hp[b.id]}`:'—'}</strong></div><div><small>FASE</small><strong>${frame.minute<13?'Early':frame.minute<26?'Mid':'Late'}</strong></div><div><small>STATUS</small><strong>${viewingFinal?'Finalizado':ended?'Revisión histórica':'Por jugar'}</strong></div></div>
 </div><div class="buttons" style="margin-top:13px">
 <button class="btn" data-action="replay-next" ${replay.cursor>=timeline.length-1?'disabled':''}>${icon('play',14)} Siguiente evento</button>
 <button class="btn secondary" data-action="instant" ${ended?'disabled':''}>Terminar partida</button>
 ${ended?demoBackup?`<button class="btn secondary small" data-action="demo-replay">Otra partida</button><button class="btn ghost small" data-action="demo-exit">Salir</button>`:
 `<button class="btn ghost small" data-action="leave-match">Volver al club</button>`:''}
 </div>
 ${viewingFinal?`<div class="banner ${l.winner===s.userClub?'':'warn'}" style="margin-top:13px"><strong>${l.winner===s.userClub?'¡VICTORIA!':'Derrota'}</strong> · ${esc(win.name)} destruyó el nexo. Duración: ${frame.minute} minutos. ${demoBackup?'Exhibición terminada: sin cambios en tu partida.':'Los resultados quedaron registrados en las estadísticas y finanzas.'}</div>`:''}</section>
 <section class="panel"><div class="panel-head"><h2>Historial de jugadas · RiftCast</h2>
 <span class="chip">${replay.progress+1}/${timeline.length} momentos</span></div>
 <p class="helper" style="margin:0 0 9px">Toca una jugada para ver exactamente el mapa y el marcador en ese instante. ${l.moments?'Instantáneas por evento.':'Partido antiguo: reconstrucción por minuto.'}</p>
 <div class="eventlog replay-history" id="eventlog">
 ${events.map(step=>{const e=step.event,i=step.index;return `<button type="button" class="event replay-event ${e.kind==='insight'?'insight':e.kind==='goal'?'goal':e.kind==='fight'||e.kind==='end'?'major':''} ${i===replay.cursor?'is-selected':''}" data-action="replay-seek" data-index="${i}" aria-current="${i===replay.cursor?'step':'false'}">
 <time>${esc(e.time)}</time><span class="body"><b>${esc(e.title)}</b><span class="replay-description">${esc(e.body)}</span>${matchEventDetail(e)}</span></button>`}).join('')}
 </div></section></div>
 <div><section class="panel"><div class="panel-head"><h2>Minimapa táctico</h2><span class="chip">10 profesionales</span></div>
 ${RiftMinimap.render(l,sceneFrame,s,previous?.frame,selectedEvent,scene)}
 ${scene?.legacyLocationWarning?
  '<div class="banner warn" style="margin-top:9px">Esta jugada fue generada con reglas anteriores: la ubicación del jungla no coincide con el carril narrado. Se muestran las posiciones registradas sin mover jugadores artificialmente. Inicia una nueva exhibición para probar las reglas corregidas.</div>':''}
 <p class="helper" style="margin-top:9px">Selecciona cualquier jugada del historial para revisar las posiciones, torres y objetivos de ese momento. Sin wards ni niebla de guerra todavía.</p></section>
 <section class="panel"><h2>Plan deportivo</h2><p class="helper" style="margin-top:9px">${strategyName(s.style)} · IA reactiva, sin órdenes directas.</p>
 ${Object.values(frame.navigation?.before||{}).filter(q=>q.teamId===s.userClub&&q.reason&&
 ['low_health','outnumbered_visible','protect_injured_adc','avoid_bad_gank',
 'opportunity_gank','unsafe_objective','local_advantage','damage_retreat'].includes(q.reason))
 .map(q=>`<div class="activity"><span><b>${esc(q.role)}</b> · ${esc(player(Object.keys(frame.navigation.before).find(id=>frame.navigation.before[id]===q))?.name||q.role)}</span><span class="muted">${esc({
 low_health:'Recupera vida',outnumbered_visible:'Evita inferioridad visible',
 protect_injured_adc:'Protege al ADC herido',avoid_bad_gank:'Cancela gank inseguro',
 opportunity_gank:'Busca carril vulnerable',unsafe_objective:'Evita objetivo arriesgado',
 local_advantage:'Presiona con ventaja',damage_retreat:'Se retira herido'}[q.reason])}</span></div>`).join('')||
 '<div class="banner">El equipo mantiene sus funciones; ninguna decisión excepcional registrada en este instante.</div>'}
 <p class="helper">Decisiones basadas en vida, aliados cercanos y visión estimada. Se muestran las órdenes registradas en esta jugada, no acciones garantizadas.</p></section>
 <section class="panel"><h2>Control del mapa</h2>${renderMapTactics(l,frame)}</section>
 <section class="panel"><h2>Estadísticas individuales</h2><p class="helper">K / D / A · Objetivos: solo se cuentan los profesionales participantes.</p>${renderPlayerScoreboard(l,frame)}</section>
 <section class="panel"><h2>La alineación</h2>${[a,b].map(tc=>`<div class="eyebrow" style="margin-top:12px">${esc(tc.name)}</div>${ROLES.map(role=>{let p=player(tc.lineup[role]);return `<div class="activity"><span>${role} · ${esc(p.name)}</span><span class="muted">${playerRating(p)}</span></div>`}).join('')}`).join('')}</section></div></div>`
}
function renderFinance(){const c=currentClub(),last=s.monthlyReports[0];let projectedSponsor=Math.round((c.sponsor?.monthly||0)*(.76+s.leagueHype/250));let projected=c.cash+(projectedSponsor+c.fans*(.17+.028*s.plan.content)*(1+(s.merchTier||0)*.17)+40000+s.leagueHype*105+s.plan.content*6200+s.plan.community*1200)-(userContractExpense()+monthPlanCost()+(s.merchTier||0)*6800);
 return `${pageTitle('Finanzas y negocio','Los torneos dan prestigio, pero los salarios se pagan cada mes. Tu único game over es llegar a $0.',`<span class="chip ${projected<c.cash?'red':'green'}">Previsión ${fmt(projected)}</span>`)}${kpis()}
 <div class="cols"><div><section class="panel"><div class="panel-head"><h2>Flujo de caja</h2><span class="chip">Último cierre</span></div>${last?`<div class="ledger"><div><span>Patrocinio</span><b class="good">+${fmt(last.items.sponsor)}</b></div><div><span>Merchandising</span><b class="good">+${fmt(last.items.merch)}</b></div><div><span>Acuerdos y reparto de liga</span><b class="good">+${fmt(last.items.league)}</b></div><div><span>Contenido y eventos</span><b class="good">+${fmt(last.items.media)}</b></div><div><span>Salarios profesionales</span><b class="bad">-${fmt(last.items.salaries)}</b></div><div><span>Staff y operación</span><b class="bad">-${fmt(last.items.staff+last.items.ops)}</b></div><div><span>Campañas y scouting</span><b class="bad">-${fmt(last.items.program)}</b></div><div style="border-top:1px solid #47627c;margin-top:6px"><b>Resultado del mes</b><b class="${last.net>=0?'good':'bad'}">${last.net>=0?'+':''}${fmt(last.net)}</b></div></div>`:'<div class="empty">Cierra tu primer mes para ver el balance real.</div>'}</section>
 <section class="panel"><div class="panel-head"><h2>Patrocinadores disponibles</h2><span class="helper">Puedes renegociar, pero romper un contrato vigente cuesta el 65% de una mensualidad.</span></div>
 ${s.offers.map(o=>`<div class="activity"><div><b>${esc(o.name)}</b><div class="helper">${o.length} meses · ${o.obligation==='none'?'Sin entregables':o.obligation==='content'?'Exige contenido mensual':'Exige evento comunitario mensual'}</div></div><div style="text-align:right"><strong class="good">${fmt(o.monthly)}/mes</strong><div style="margin-top:5px"><button class="btn small secondary" data-action="sponsor" data-id="${o.id}">Firmar</button></div></div></div>`).join('')}</section></div>
 <div><section class="panel"><h2>Contrato activo</h2><div class="ledger" style="margin-top:10px"><div><span>Marca</span><b>${esc(c.sponsor?.name||'Ninguna')}</b></div><div><span>Pago mensual base</span><b>${fmt(c.sponsor?.monthly||0)}</b></div><div><span>Meses restantes</span><b>${c.sponsor?.remaining||0}</b></div><div><span>Compromiso</span><b>${sponsorObligationText()}</b></div></div></section>
 <section class="panel"><h2>Inversiones</h2><div class="activity"><div><b>Departamento deportivo</b><div class="helper">Staff nivel ${c.staff}/7. Mejora la formación; añade $9k/mes en nómina.</div></div><button class="btn small secondary" data-action="upgrade" data-kind="staff" ${c.staff>=7?'disabled':''}>${fmt(170000)}</button></div>
 <div class="activity"><div><b>Operación de merchandising</b><div class="helper">Nivel ${(s.merchTier||0)}/3. Aumenta ventas y coste operativo.</div></div><button class="btn small secondary" data-action="upgrade" data-kind="merch" ${(s.merchTier||0)>=3?'disabled':''}>${fmt(220000)}</button></div></section>
 <section class="panel"><h2>Movimientos recientes</h2>${s.history.slice(0,7).map(h=>`<div class="activity"><span>${esc(h.note)}<div class="helper">${MONTHS[h.month-1]} ${h.year}</div></span><b class="${h.amount>=0?'good':'bad'}">${h.amount>=0?'+':''}${fmt(h.amount)}</b></div>`).join('')||'<div class="helper">Todavía no hay movimientos.</div>'}</section></div></div>`}
function championshipPanel(){
 const rows=[['Aurora',s.champion],['Boreal',s.otherChampion]].filter(([,id])=>id&&club(id));
 const playoffs=s.playoffs||[];
 if(!rows.length&&!playoffs.length)return '';
 return '<section class="panel championship-panel"><h2>'+brand('rift_championship',32)+' Campeonatos</h2>'+rows.map(([region,id])=>'<div class="activity">'+brand('league_champion',32)+crest(club(id),36)+'<div><strong>'+esc(club(id).name)+'</strong><div class="helper">Campeón · '+esc(region==='Aurora'?s.leagueName:s.otherName)+'</div></div></div>').join('')+(playoffs.length?'<h3>'+brand('playoffs',24)+' Playoffs</h3>'+playoffs.map(f=>'<div class="activity competition-fixture">'+competition(f)+'<span>'+crest(club(f.a),24)+esc(club(f.a)?.name)+' · '+crest(club(f.b),24)+esc(club(f.b)?.name)+'</span><small>'+(f.phase==='final'?'Gran final':'Semifinal')+(f.played?' · '+esc(club(f.winner)?.name||'Finalizado'):' · Pendiente')+'</small></div>').join(''):'')+'</section>';
}
function renderWorld(){const relevant=s.news.slice(0,24);return `${pageTitle('Mundo vivo · RiftWire','Lo que pasa fuera de tu club importa: fichajes, filtraciones, audiencias, expansiones, patrocinios y retiradas.',`<span class="chip green">${s.clubs.length} organizaciones activas</span>`)}
 <div class="cols"><div><section class="panel"><div class="panel-head"><h2>Noticias del universo</h2><span class="chip">Procedurales, con consecuencias reales</span></div><div class="news">${relevant.map(n=>`<div class="newsitem"><div class="symbol">${n.teamId&&club(n.teamId)?crest(club(n.teamId),30):n.type==='rumor'?'?':n.type==='transfer'?'⇄':n.type==='crisis'?'!':n.type==='finance'?'$':n.type==='rookies'?'★':'✦'}</div><div style="flex:1"><div class="eyebrow">${n.type==='rumor'?'RUMOR NO CONFIRMADO':n.type.toUpperCase()} · ${MONTHS[n.month-1]} ${n.year}</div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div></div>`).join('')}</div></section></div>
 <div><section class="panel"><div class="panel-head"><h2>${brand('liga_aurora',28)} ${esc(s.leagueName)}</h2><span class="chip">Hype ${s.leagueHype}/100</span></div>${standingsHTML('Aurora')}</section>
 <section class="panel"><div class="panel-head"><h2>${brand('liga_boreal',28)} ${esc(s.otherName)}</h2><span class="chip">Región vecina</span></div>${standingsHTML('Boreal')}</section>
 ${championshipPanel()}<section class="panel"><h2>Directorio de organizaciones</h2>${s.clubs.map(c=>`<button class="compact-player" data-action="club" data-id="${c.id}" style="background:transparent;width:100%;border-top:0;border-left:0;border-right:0;color:inherit;cursor:pointer;text-align:left">${crest(c,37)}<div style="flex:1"><b>${esc(c.name)}</b><div class="helper">${c.region} · ${Math.round(c.fans/1000)}k fans</div></div><span class="chip">${Math.round(c.prestige)}</span></button>`).join('')}</section></div></div>`}
function renderSettings(){return `${pageTitle('Partida y accesibilidad','Guardado local automático; el universo es reproducible desde su propio estado, sin servicios externos.')}
 <div class="cols"><div><section class="panel"><h2>Guardar tu universo</h2><p class="helper" style="margin-top:9px">La partida se guarda automáticamente en este navegador. Exporta un archivo JSON si quieres cambiar de dispositivo o conservar una copia.</p><div class="buttons"><button class="btn" data-action="export">Exportar partida</button><button class="btn secondary" data-action="import-prompt">Importar JSON</button></div>
 <div class="banner" style="margin-top:12px"><b>Laboratorio de partidos</b><p class="helper" style="margin:5px 0 9px">Simula una exhibición independiente de tu temporada. No consume dinero ni modifica tus jugadores o guardados.</p><button class="btn secondary" data-action="demo-start">Simular partida de prueba</button></div><input class="hidden" type="file" id="import-file" accept="application/json,.json"/><hr class="hr"/><button class="btn danger" data-action="reset-prompt">Crear partida nueva</button></section></div><div><section class="panel"><h2>Información de esta alfa</h2><div class="ledger"><div><span>Versión</span><b>0.4 · Minimap Lab</b></div><div><span>Año / mes</span><b>${MONTHS[s.month-1]} ${s.year}</b></div><div><span>Jugadores simulados</span><b>${s.players.length}</b></div><div><span>Equipos activos</span><b>${s.clubs.length}</b></div><div><span>Partidos propios</span><b>${s.matchReports.length}</b></div></div><p class="helper" style="margin-top:11px">Proyecto ficticio e independiente, inspirado en la gestión de esports. No utiliza fotos, marcas ni logotipos de organizaciones reales.</p></section></div></div>`}
function renderModal(){if(!s&&modal?.type!=='welcome')modal={type:'welcome'};if(!modal)return'';
 if(modal.type==='welcome')return `<div class="modal-layer"><div class="modal welcome">${brand('rift_director_logo',136)||'<div class="brand-icon">R</div>'}<div class="eyebrow">RIFT DIRECTOR · ALFA 0.4</div><h1 style="margin-top:10px">Tu organización.<br/><span class="gradient-text">Tu historia.</span></h1><p>Gestiona un club de esports en un mundo ficticio: jugadores únicos, dinero limitado, noticias que cambian la liga y partidos narrados en vivo.</p><div class="field"><label>Nombre de tu organización</label><input id="new-club-name" maxlength="32" value="${esc(draftName)}" autocomplete="off"/></div>
 ${brandingForm()}<div class="field"><label>¿Cómo quieres comenzar?</label><div class="choice-grid">${[['balanced','Club equilibrado','Capital $1.6M, sponsor estable y plantilla sólida.'],['academy','Proyecto humilde','Capital $1.05M; menos prestigio, apuesta por la formación.'],['rich','Inversión ambiciosa','Capital $2.6M, más fama y mayores expectativas.']].map(([id,n,desc])=>`<button class="choice-tile ${theme===id?'sel':''}" data-action="choose-start" data-id="${id}"><div class="eyebrow">${id==='balanced'?'RECOMENDADO':id==='academy'?'DIFÍCIL':'MÁS CAPITAL'}</div><strong>${n}</strong><small>${desc}</small></button>`).join('')}</div></div>
 <button class="btn full" data-action="create">Fundar organización ${icon('play',14)}</button>
 <div class="banner" style="margin-top:12px"><b>¿Quieres ver cómo funciona el simulador?</b><p class="helper" style="margin:6px 0 10px">Prueba un mapa completo con cartas, ganks, objetivos y RiftCast sin fundar un club ni guardar nada.</p><button class="btn secondary full" data-action="demo-start">${icon('match',14)} Simular partida de prueba</button></div>
 <p class="helper" style="margin:15px 0 0">Sin inicio de sesión · Guardado local · Nombres y retratos generados · No oficial</p></div></div>`;
 if(modal.type==='profile'){
  let p=player(modal.id);if(!p)return'';const c=p.teamId?club(p.teamId):null,own=p.teamId===s.userClub,free=!p.teamId,main=own&&currentClub().lineup[p.role]===p.id;
  const attrLabels={mech:'Mecánicas',lane:'Laning',macro:'Macro',fight:'Teamfighting',vision:'Visión',comm:'Comunicación',adapt:'Adaptabilidad'};
  return `<div class="modal-layer" data-action="close-backdrop"><div class="modal wide"><button class="btn ghost small close" data-action="close-modal">✕ Cerrar</button><div class="eyebrow">EXPEDIENTE DE JUGADOR · ${p.role}</div><h2>${esc(p.name)} <span class="muted">· ${p.age} años</span></h2><p class="helper">${c?crest(c,24)+esc(c.name):'Agente libre'} · ${main?'Titular · ':''}${p.contract?`${p.contract} meses de contrato`:'Disponible para fichar'}</p>
  <div class="cols" style="margin-top:15px"><div><div class="split"><div style="width:145px;min-width:145px;height:175px;border-radius:12px;overflow:hidden;background:#253951;display:grid;place-items:end center">${avatar(p,c)}</div><div style="flex:1"><div class="eyebrow">Atributos de la carta</div>${Object.entries(attrLabels).map(([key,name])=>{let exact=own||p.observed>=5,v=exact?p.a[key]:Math.round((p.a[key]+((Number(p.id.replace(/\D/g,''))*7+key.length)%11)-5)/5)*5;v=clamp(v,25,99);return `<div class="stat"><span>${name}</span><b>${exact?'':'≈'}${v}</b><div class="track"><div class="fill" style="width:${v}%"></div></div></div>`}).join('')}</div></div>
  <hr class="hr"/><h3>Rasgos observados</h3><div class="tags">${tagHtml(p)}</div><p class="helper" style="margin-top:10px">Los rasgos se revelan viendo partidos o investigando. Representan tendencias, no resultados garantizados.</p>
  <div class="grid2"><div class="reportbox"><div class="eyebrow">Ajuste a tu filosofía</div><h2 style="margin-top:6px">${fitScore(p,currentClub())}/100</h2><small>Estimación basada en atributos y comportamiento. No es un overall universal.</small></div><div class="reportbox"><div class="eyebrow">Conocimiento del perfil</div><h2 style="margin-top:6px">${Math.min(100,Math.round(p.observed*10))}%</h2><small>${p.observed>=8?'Perfil bien documentado':'Todavía quedan incógnitas por resolver.'}</small></div></div></div>
  <div><section class="panel" style="margin-bottom:12px"><h3>Contrato y valoración</h3><div class="ledger" style="margin-top:8px"><div><span>Sueldo mensual</span><b>${fmt(p.wage)}</b></div><div><span>Valor estimado</span><b>${fmt(p.value)}</b></div><div><span>${free?'Prima de firma':'Transferencia orientativa'}</span><b>${fmt(free?marketPrice(p):p.value*.57)}</b></div><div><span>Partidos disputados</span><b>${p.games}</b></div><div><span>Potencial</span><b>${own||p.observed>=8?p.potential+'/100':'Por descubrir'}</b></div></div></section>
  <div class="stack">${free?`<button class="btn" data-action="sign" data-id="${p.id}" ${currentClub().cash<=marketPrice(p)||currentClub().roster.length>=10?'disabled':''}>Fichar por ${fmt(marketPrice(p))}</button>`:''}
  ${own&&!main?`<button class="btn secondary" data-action="starter" data-id="${p.id}">Convertir en titular (${p.role})</button>`:''}
  ${own?`<button class="btn secondary" data-action="train-focus" data-id="${p.id}">Seleccionar para entrenamiento</button><button class="btn danger" data-action="sell" data-id="${p.id}">Negociar transferencia</button>`:''}
  ${!own?`<button class="btn ghost" data-action="scout" data-id="${p.id}">Investigar por $8.5k</button>`:''}</div>
  <div class="banner" style="margin-top:12px">${own?'Tu propio staff observa a este profesional en entrenamientos y partidos.':'Scouting y observación pueden corregir las estimaciones iniciales.'}</div></div></div></div></div>`
 }
 if(modal.type==='club'){let c=club(modal.id);if(!c)return'';return `<div class="modal-layer" data-action="close-backdrop"><div class="modal"><button class="btn ghost small close" data-action="close-modal">✕ Cerrar</button><div class="flex">${crest(c,63)}<div><div class="eyebrow">${c.region} · Organización</div><h2>${esc(c.name)}</h2><small>${c.id===s.userClub?'Tu club':'Rival autónomo'}</small></div></div><hr class="hr"/><div class="grid2"><div class="reportbox"><div class="eyebrow">Aficionados</div><h2>${Math.round(c.fans/1000)}k</h2></div><div class="reportbox"><div class="eyebrow">Prestigio</div><h2>${Math.round(c.prestige)}/100</h2></div></div><h3 style="margin-top:16px">Plantilla actual</h3>${ROLES.map(role=>{const p=player(c.lineup[role]);return `<div class="activity"><span><b>${role}</b> · ${esc(p.name)}</span><span class="chip">${playerRating(p)}</span></div>`}).join('')}<p class="helper" style="margin:12px 0 0">Sus decisiones financieras, fichajes y resultados evolucionan aunque tú no intervengas.</p></div></div>`}
 if(modal.type==='crisis')return `<div class="modal-layer"><div class="modal"><div class="eyebrow">DECISIÓN EJECUTIVA · CRISIS</div><h2>Un proveedor retiene pagos</h2><p>Una disputa comercial pone en riesgo hasta ${fmt(s.crisis?.amount||0)}. La situación no se resolverá sola: elige cómo gestionarla.</p><div class="stack">${[['audit','Auditoría y abogados','Coste inmediato menor; preserva reputación, pero requiere recursos.'],['negotiate','Negociación rápida','Aceptas parte de la pérdida y proteges la continuidad.'],['ignore','Asumir la pérdida','Sin más procedimientos; mayor daño financiero y comercial.']].map(([id,name,desc])=>`<button class="choice-tile" data-action="resolve-crisis" data-id="${id}"><strong>${name}</strong><small>${desc}</small></button>`).join('')}</div></div></div>`;
 if(modal.type==='reset')return `<div class="modal-layer" data-action="close-backdrop"><div class="modal"><button class="btn ghost small close" data-action="close-modal">✕</button><h2>¿Empezar un universo nuevo?</h2><p>Se sustituirá tu partida guardada. Exporta un respaldo antes si quieres conservar la historia.</p><div class="buttons"><button class="btn danger" data-action="reset">Sí, nueva partida</button><button class="btn ghost" data-action="close-modal">Cancelar</button></div></div></div>`;
 if(modal.type==='import')return `<div class="modal-layer" data-action="close-backdrop"><div class="modal"><h2>Importar partida</h2><p>Selecciona un archivo JSON exportado desde Rift Director.</p><input type="file" id="import-file-modal" accept="application/json,.json"/><button class="btn ghost" style="margin-top:10px" data-action="close-modal">Cancelar</button></div></div>`;
 return''
}
function navButton(id,ic,label){return `<button data-nav="${id}" class="${view===id?'active':''}">${icon(ic)} <span>${label}</span></button>`}
function render(){if(!s){document.getElementById('app').innerHTML=renderModal();return}
 const c=currentClub();let body=view==='home'?renderHome():view==='roster'?renderRoster():view==='market'?renderMarket():view==='match'?renderMatch():view==='finance'?renderFinance():view==='world'?renderWorld():renderSettings();
 document.getElementById('app').innerHTML=`<div class="layout"><aside class="sidebar"><div class="brand brand-institutional">${brand('rift_director_wordmark',30)||'<strong>Rift Director</strong>'}<small>GESTIÓN · COMPETICIÓN · HISTORIA</small></div>
 <nav class="nav" aria-label="Navegación">${demoBackup?navButton('match','match','Exhibición'):`${navButton('home','home','Inicio')}${navButton('roster','users','Plantilla')}${navButton('market','market','Mercado')}${navButton('match','match','Partidos')}${navButton('finance','money','Finanzas')}${navButton('world','world','Mundo')}${navButton('settings','settings','Partida')}`}</nav>
 <div class="sidebar-foot"><div class="eyebrow">TEMPORADA ${s.season}</div><div style="margin-top:5px;font-weight:800">${MONTHS[s.month-1]} ${s.year}</div><div class="chip">${s.clubs.length} clubes · ${s.players.filter(p=>!p.retired).length} profesionales</div></div></aside>
 <main class="main"><header class="topbar"><div class="clubhead">${crest(c,46)}<div><div class="clubtitle">${esc(c.name)}</div><div class="helper">${brand('rift_director_symbol',20)} ${esc(s.leagueName)} · Club ${c.kind==='user'?'bajo tu dirección':'autónomo'}</div></div></div><div class="top-actions">${demoBackup?`<span class="chip">MODO PRUEBA</span><button class="btn small secondary" data-action="demo-exit">Volver</button>`:`<span class="chip">${icon('calendar',14)} ${MONTHS[s.month-1]} ${s.year}</span><span class="chip ${c.cash<250000?'red':'green'}">${icon('money',14)} ${fmt(c.cash)}</span><button class="btn small" data-action="close-month" ${s.over||s.crisis||(s.live&&!s.live.finished)||nextFixtures().length||(s.month===9&&s.playoffs.some(f=>!f.played))?'disabled':''}>Siguiente mes</button>`}</div></header>${body}
 <div class="footer">Rift Director Alpha 0.7.16 · Universo y retratos ficticios · Guardado local · Simulador independiente no afiliado a Riot Games</div></main></div>${renderModal()}${s.over?`<div class="modal-layer"><div class="modal end-screen"><div class="eyebrow">FIN DE PARTIDA</div><h1>Insolvencia.</h1><p>Tu club se quedó sin efectivo. El mundo sigue su historia, pero esta gestión termina aquí. Recuerda: ganar torneos nunca fue la única forma de triunfar.</p><div class="buttons" style="justify-content:center"><button class="btn" data-action="export">Exportar historia</button><button class="btn danger" data-action="reset">Nueva organización</button></div></div></div>`:''}`;
 if(view==='match'&&s.live){const log=document.getElementById('eventlog');const selected=log?.querySelector('.is-selected');if(selected&&typeof selected.scrollIntoView==='function')selected.scrollIntoView({block:'nearest'})}
}
function updatePlan(id,delta){if(s.live&&!s.live.finished)return notify('Finaliza el partido para modificar la agenda.');if(!Object.hasOwn(s.plan,id))return;let x=s.plan[id]+delta;if(x<0||x>4||delta>0&&sumPlan()>=8)return;s.plan[id]=x;save();render()}
function exportGame(){let blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`rift-director-${s.year}-${s.month}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Partida exportada en JSON.')}
function importGame(file){if(!file)return;file.text().then(txt=>{let x=RiftCore.parseWorld(txt);stopTimer();s=x;modal=null;view='home';save();render();if(s.live?.running)playTimer();notify('Partida restaurada.')}).catch(e=>notify('No se pudo importar: '+e.message))}
function goTab(id){if(!['home','roster','market','match','finance','world','settings'].includes(id))return;if(demoBackup&&id!=='match'){exitDemoMatch();if(s)goTab(id);return}view=id;modal=null;render();window.scrollTo({top:0,behavior:'instant'})}
function handleClick(ev){let target=ev.target.closest('[data-action],[data-nav]');if(!target)return;
 if(target.dataset.nav){goTab(target.dataset.nav);return}let a=target.dataset.action,id=target.dataset.id;
 if(a==='demo-start'){startDemoMatch();return}
 if(a==='demo-replay'){replayDemoMatch();return}
 if(a==='demo-exit'||(demoBackup&&a==='leave-match')){exitDemoMatch();return}
 if(demoBackup&&!['replay-next','replay-seek','instant'].includes(a))return;
 if(a==='close-backdrop'){if(ev.target===target&&modal?.type!=='crisis'){modal=null;render()}return}
 if(a==='choose-start'){readBrandDraft();draftName=document.getElementById('new-club-name')?.value||draftName;theme=id;render();return}
 if(a==='create'){let name=document.getElementById('new-club-name')?.value.trim().slice(0,32)||'Aurora Esports';readBrandDraft();newGame(theme,name);if(globalThis.RiftBranding){const c=currentClub();c.branding=RiftBranding.identity(c,draftBrand);c.color=c.branding.primaryColor}modal=null;view='home';save();render();return}
 if(a==='reset-prompt'){modal={type:'reset'};render();return}
 if(a==='reset'){stopTimer();s=null;draftName='Aurora Esports';draftBrand={};modal={type:'welcome'};view='home';try{localStorage.removeItem(KEY)}catch(e){}render();return}
 if(a==='close-modal'){modal=null;render();return}
 if(!s)return;
 switch(a){case 'plan-minus':updatePlan(target.dataset.kind,-1);break;case 'plan-plus':updatePlan(target.dataset.kind,1);break;
 case 'close-month':closeMonth();break;case 'start':startMatch();break;case 'instant':liveControl(a);break;
 case 'replay-next':liveControl('next');break;
 case 'replay-seek':seekReplay(Number(target.dataset.index));break;
 case 'reopen-replay':
  if(s.lastReplay?.finished){s.live=s.lastReplay;view='match';updateReplayCursor();save();render()}
  break;
 case 'leave-match':
  if(s.live?.finished)s.lastReplay=s.live;
  view='home';s.live=null;save();render();break;
 case 'profile':modal={type:'profile',id};render();break;case 'club':modal={type:'club',id};render();break;
 case 'style':if(s.live&&!s.live.finished){notify('El plan táctico está cerrado durante este mapa.');break} s.style=id;save();render();notify('Plan de juego: '+strategyName(id));break;
 case 'sign':signFreeAgent(id);modal=null;render();break;case 'sell':sellPlayer(id);break;
 case 'starter':setLineup(id);modal=null;render();break;
 case 'scout':scoutPlayer(id);modal={type:'profile',id};render();break;
 case 'train-focus':s.focus=id;modal=null;view='roster';save();render();notify('Jugador seleccionado para desarrollo.');break;
 case 'sponsor':chooseSponsor(id);break;case 'upgrade':upgrade(target.dataset.kind);break;
 case 'crisis':modal={type:'crisis'};render();break;case 'resolve-crisis':resolveCrisis(id);break;
 case 'export':exportGame();break;case 'import-prompt':modal={type:'import'};render();break;
 }}
function handleChange(ev){handleBrandInput(ev);let el=ev.target;if(el.dataset.change==='focus'){s.focus=el.value;save();render()}if(el.dataset.change==='focusAttr'){s.focusAttr=el.value;save();render()}
 if(el.id==='import-file'||el.id==='import-file-modal')importGame(el.files[0])}
document.addEventListener('input',handleBrandInput);
document.addEventListener('click',handleClick);document.addEventListener('change',handleChange);
if(!load()){modal={type:'welcome'}}else{if(s.crisis)modal={type:'crisis'};if(s.live?.running&&!s.live.finished)playTimer()}
render();
})();
