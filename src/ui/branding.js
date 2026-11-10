/* Art Pack 03. Original SVG masters and pure identity resolution.
 * No world RNG, IDs, calendar, economy or simulation mutations. */
((root)=>{
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
const path=(d,fill,stroke='',width=1)=>`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"`:''}/>`;
const poly=(points,fill)=>`<polygon points="${points}" fill="${fill}"/>`;
const ring=(cx,cy,r,fill,stroke,width)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const N='#0B1727',S='#192C43',H='#F0E9DA',G='#D7AC65',B='#5EAFE8',R='#E87482';
// Each motif is drawn in a 64-unit field with clear space around its silhouette.
const motifs={
 fox:({p,s,a})=>path('M8 8 25 18 32 15 39 18 56 8 51 39 32 56 13 39Z',s,N,2)+poly('10,11 27,23 18,37 15,37',p)+poly('54,11 37,23 46,37 49,37',p)+poly('18,37 27,23 32,28 37,23 46,37 32,52',N)+poly('15,31 27,34 23,39',a)+poly('49,31 37,34 41,39',a)+poly('27,44 37,44 32,49',s),
 solar:({p,s,a})=>poly('32,5 38,13 49,9 49,21 59,27 52,36 55,47 43,47 32,59 21,47 9,47 12,36 5,27 15,21 15,9 26,13',p)+path('M32 13 46 22 44 43 32 51 20 43 18 22Z',N,s,2)+poly('32,16 43,23 40,31 32,28',s)+poly('32,16 21,23 24,31 32,28',a)+path('M23 33H41L37 38H27Z',p)+poly('30,30 34,30 34,46 30,46',s),
 star:({p,s,a})=>path('M32 5 39 23 56 14 44 29 59 32 42 38 50 54 35 44 32 59 26 42 9 50 21 35 5 32 23 26 14 9 29 21Z',s,N,2)+poly('32,8 32,32 25,26',a)+poly('32,32 56,32 41,37',p)+poly('32,32 32,56 27,41',p)+poly('32,32 8,32 23,27',B)+poly('32,23 41,32 32,41 23,32',N)+poly('32,27 37,32 32,37 27,32',s),
 circuit:({p,s,a})=>path('M12 10H25L32 18 39 10H52V23L43 32 52 41V54H39L32 46 25 54H12V41L21 32 12 23Z',N,s,2)+path('M16 14H23L32 23 41 14H48V21L37 32 48 43V50H41L32 41 23 50H16V43L27 32 16 21Z',p)+poly('32,25 39,32 32,39 25,32',a)+path('M8 29H16V35H8ZM48 29H56V35H48Z',s),
 wolf:({p,s,a})=>path('M10 7 26 17 32 12 38 17 54 7 51 28 57 36 45 38 43 49 32 57 21 49 19 38 7 36 13 28Z',s,N,2)+poly('12,10 26,21 19,33 15,27',p)+poly('52,10 38,21 45,33 49,27',p)+poly('26,21 32,17 38,21 43,39 32,52 21,39',p)+poly('21,31 29,34 24,37',a)+poly('43,31 35,34 40,37',a)+poly('32,35 38,43 32,47 26,43',N)+poly('28,46 32,50 36,46 32,55',s),
 forge:({p,s,a})=>path('M7 19H57L49 29H39V35L48 45V53H16V45L25 35V29H15Z',s,N,2)+poly('9,21 53,21 47,26 17,26',a)+poly('25,29 32,29 32,46 18,46',p)+poly('32,29 39,29 36,35 46,46 32,46',N)+poly('32,6 39,13 32,20 25,13',p)+poly('19,48 45,48 45,51 19,51',a),
 comet:({p,s,a})=>path('M7 9 40 17 56 35 49 53 31 57 15 42Z',s,N,2)+poly('10,12 35,22 25,30',p)+poly('10,12 25,34 18,40',a)+poly('15,19 41,26 49,36 41,30',N)+poly('36,25 49,34 47,47 33,51 24,41 27,29',p)+poly('36,25 47,35 36,38 27,29',s)+poly('36,38 47,35 47,47 33,51',N)+poly('36,33 41,38 36,43 31,38',a),
 lotus:({p,s,a})=>path('M32 7 43 24 55 19 53 38 44 49 32 56 20 49 11 38 9 19 21 24Z',s,N,2)+poly('32,10 40,26 32,45 24,26',p)+poly('12,23 25,30 30,49 18,39',a)+poly('52,23 39,30 34,49 46,39',p)+poly('9,39 23,45 32,53 17,49',p)+poly('55,39 41,45 32,53 47,49',s)+poly('32,10 32,45 24,26',s),
 harbor:({p,s,a})=>path('M27 8H37V17H33V24H48V31H36V45L47 39 46 34 58 36 51 48 32 58 13 48 6 36 18 34 17 39 28 45V31H16V24H28V17H27Z',s,N,2)+poly('30,10 34,10 34,49 32,53 30,49',p)+poly('9,38 15,40 32,53 49,40 55,38 49,46 32,55 15,46',p)+poly('19,26 45,26 45,28 19,28',a),
 five:({p,s,a})=>path('M32 6 40 23 58 25 45 38 48 56 32 47 16 56 19 38 6 25 24 23Z',s,N,2)+poly('32,9 32,33 25,25',a)+poly('55,26 32,33 39,25',p)+poly('45,52 32,33 43,38',a)+poly('19,52 32,33 32,45',p)+poly('9,26 32,33 21,37',p)+poly('32,26 39,32 36,40 28,40 25,32',N),
 polar:({p,s,a})=>path('M32 6 57 31 32 58 7 31Z',s,N,2)+poly('32,9 53,31 32,53 11,31',p)+poly('13,34 25,17 33,29 39,22 51,39 32,50',N)+poly('25,20 20,29 26,27 30,31',s)+poly('39,25 34,34 40,31 46,36',a)+poly('17,39 32,50 47,40 31,44',s),
 crown:({p,s,a})=>path('M8 15 22 24 32 8 42 24 56 15 50 46 43 54H21L14 46Z',s,N,2)+poly('11,19 24,29 32,13 32,43 17,43',p)+poly('32,13 40,29 53,19 47,43 32,43',N)+poly('18,46 46,46 41,51 23,51',a)+poly('32,28 38,35 32,41 26,35',a),
 eclipse:({p,s,a})=>path('M45 7 53 16 58 32 52 49 38 57 22 55 9 43 6 27 14 12 29 6 24 17 23 31 30 42 43 45 52 39 48 49 37 53 24 50 14 40 11 28 17 17 27 11Z',s,N,2)+path('M29 7 20 20 20 34 29 46 43 49 33 54 20 48 11 36 11 23 18 13Z',p)+poly('43,15 48,26 59,30 48,34 43,44 39,34 29,30 39,26',a),
 viper:({p,s,a})=>path('M9 18 25 7 44 9 56 22 47 35 34 31 42 23 32 18 22 23 25 34 43 40 49 52 31 58 13 51 8 41 20 43 31 49 36 46 19 40 11 30Z',s,N,2)+poly('12,20 25,10 43,12 52,22 43,28 32,16 20,21 22,34 14,29',p)+poly('25,36 43,43 45,50 31,55 16,49 12,44 30,51 39,47',p)+poly('38,15 47,20 40,22',a)+poly('44,29 49,29 45,36',N),
 orchid:({p,s,a})=>path('M32 27C9 0 0 29 21 35 0 49 23 64 32 43 42 65 65 49 43 35 64 27 54 0 32 27Z',p,s,2)+poly('32,27 17,12 22,29 29,34',s)+poly('35,29 48,12 46,28 37,34',a)+poly('21,40 28,37 31,43 22,52',N)+poly('43,40 36,37 33,43 42,52',N)+poly('32,28 40,35 32,43 24,35',a),
 meridian:({p,s,a})=>path('M24 7H40L54 21V43L40 57H24L10 43V21Z',N,s,2)+poly('32,9 47,24 38,24 32,17 26,24 17,24',p)+poly('32,55 17,40 26,40 32,47 38,40 47,40',p)+poly('29,19 35,19 35,45 29,45',a)+poly('13,29 51,29 51,35 13,35',s)+poly('32,25 39,32 32,39 25,32',N),
 dynasty:({p,s,a})=>path('M32 5 53 17 57 40 43 55H21L7 40 11 17Z',s,N,2)+poly('32,9 49,19 52,38 40,51 24,51 12,38 15,19',N)+poly('17,25 25,31 32,17 39,31 47,25 42,42 22,42',p)+poly('24,45 40,45 37,49 27,49',a)+poly('32,26 36,33 32,39 28,33',s),
 raven:({p,s,a})=>path('M6 12 25 22 32 17 39 22 58 12 52 36 42 33 45 43 35 40 32 57 29 40 19 43 22 33 12 36Z',s,N,2)+poly('9,16 26,26 29,35 15,31',p)+poly('55,16 38,26 35,35 49,31',p)+poly('25,25 32,20 39,25 37,36 32,47 27,36',N)+poly('32,27 41,30 33,34',a)+poly('28,25 31,26 29,28',s),
 halcyon:({p,s,a})=>path('M7 43 24 18 40 9 52 17 45 25 58 28 41 33 33 47 13 55Z',s,N,2)+poly('10,43 27,21 38,13 35,29 22,45',p)+poly('15,51 28,42 38,31 41,34 31,45',a)+poly('39,14 49,18 41,23 36,28',p)+poly('44,25 55,28 40,30',a)+poly('41,17 45,18 42,20',N),
 quartz:({p,s,a})=>path('M17 13 29 6 41 11 50 24 55 45 40 55 22 56 9 43Z',s,N,2)+poly('29,9 36,24 31,51 20,35',p)+poly('17,17 20,35 13,41 11,40',a)+poly('39,15 47,26 51,43 36,50 39,29',p)+poly('36,24 39,15 39,29 31,51',N)+poly('22,38 31,51 23,53 14,43',s),
 lantern:({p,s,a})=>path('M26 6H38L44 15 50 21 47 47 38 56H26L17 47 14 21 20 15Z',s,N,2)+path('M28 9H36L39 15H25Z',N)+poly('18,23 46,23 43,44 36,51 28,51 21,44',N)+poly('32,25 40,36 37,45 32,49 25,43 24,37',p)+poly('32,31 35,39 32,45 29,40',a)+poly('19,17 45,17 48,21 16,21',p),
 orbit:({p,s,a})=>path('M9 36 17 15 36 6 54 18 58 39 44 55 23 58 7 46Z',N,s,2)+path('M13 39 22 20 38 12 50 21 52 37 41 49 25 52 15 45Z',p)+path('M21 36 28 23 39 20 44 27 43 37 35 44 26 44Z',N)+poly('31,27 39,31 36,39 28,36',a)+poly('7,31 14,27 19,33 12,39',s)+poly('45,47 51,43 57,49 51,55',a),
 dawn:({p,s,a})=>path('M7 43 16 21 32 7 48 21 57 43 47 55H17Z',s,N,2)+poly('32,11 46,24 53,41 11,41 18,24',N)+poly('32,16 35,28 44,21 40,33 51,34 41,39 23,39 13,34 24,33 20,21 29,28',p)+poly('13,44 51,44 46,50 18,50',a)+poly('20,52 44,52 40,55 24,55',p)
};
const shapes=Object.freeze({
 kite:'M32 4 56 14 52 42 32 60 12 42 8 14Z',
 hexagon:'M32 4 56 18 56 46 32 60 8 46 8 18Z',
 diamond:'M32 3 60 32 32 61 4 32Z',
 round:'M32 4A28 28 0 1 1 31.99 4Z',
 banner:'M10 5H54V48L32 60 10 48Z',
 bastion:'M7 7H20V12H44V7H57V35L48 49 32 59 16 49 7 35Z',
 wing:'M4 13 20 9 32 4 44 9 60 13 52 39 42 46 32 60 22 46 12 39Z',
 octagon:'M20 5H44L59 20V44L44 59H20L5 44V20Z'
});
const symbols=Object.freeze(['fox','wolf','forge','comet','lotus','harbor','star','circuit','polar','crown','viper','orchid','raven','lantern','orbit','dawn']);
const symbolNames=Object.freeze({fox:'Zorro',wolf:'Lobo',forge:'Forja',comet:'Cometa',lotus:'Loto',harbor:'Ancla',star:'Estrella',circuit:'Circuito',polar:'Montaña',crown:'Corona',viper:'Serpiente',orchid:'Orquídea',raven:'Cuervo',lantern:'Linterna',orbit:'Órbita',dawn:'Aurora'});
const shapeNames=Object.freeze({kite:'Escudo',hexagon:'Hexágono',diamond:'Rombo',round:'Medallón',banner:'Estandarte',bastion:'Bastión',wing:'Alado',octagon:'Octágono'});
const clubDefs=[
 ['aurora_esports','Aurora Esports','dawn','#5bd4b6','#d9f4eb'],
 ['obsidian_foxes','Obsidian Foxes','fox','#263342','#B9C7D6'],
 ['solar_knights','Solar Knights','solar','#e3b96f','#f3dfb0'],
 ['northstar','Northstar','star','#7fceec','#dcecff'],
 ['crimson_circuit','Crimson Circuit','circuit','#E87482','#e9c6cb'],
 ['astra_wolves','Astra Wolves','wolf','#71a5fc','#c4d4f3'],
 ['nexus_forge','Nexus Forge','forge','#5EAFE8','#a8b9c8'],
 ['velvet_comets','Velvet Comets','comet','#bba1ff','#e7d5ff'],
 ['silver_lotus','Silver Lotus','lotus','#a9c6c9','#e1edf0'],
 ['iron_harbor','Iron Harbor','harbor','#71a5fc','#bccbd9'],
 ['arcadia_five','Arcadia Five','five','#df88ca','#f3d6e8'],
 ['polar_rift','Polar Rift','polar','#7fceec','#e2f5ff'],
 ['kings_of_neon','Kings of Neon','crown','#5bd4b6','#b8f5e5'],
 ['eclipse_union','Eclipse Union','eclipse','#bba1ff','#e7d5ff'],
 ['azure_vipers','Azure Vipers','viper','#5EAFE8','#d1edff'],
 ['orchid_pulse','Orchid Pulse','orchid','#df88ca','#f8dbef'],
 ['black_meridian','Black Meridian','meridian','#61758c','#c4ced9'],
 ['nova_dynasty','Nova Dynasty','dynasty','#e3b96f','#fae1ae'],
 ['royal_ravens','Royal Ravens','raven','#9473ca','#d5c8ef'],
 ['halcyon_esports','Halcyon Esports','halcyon','#5bd4b6','#c4ece4'],
 ['quartz_legion','Quartz Legion','quartz','#d5a7db','#eee2f5'],
 ['silent_lantern','Silent Lantern','lantern','#a6c974','#e5efcd'],
 ['orbit_nine','Orbit Nine','orbit','#f09d70','#ffe0c0']
];
const rift=c=>path('M32 5 51 22 43 29 49 45 32 59 15 45 21 29 13 22Z',c.s,N,2)+poly('32,9 32,25 23,33 19,44 29,51 29,34 35,28 35,51 45,43 39,28 47,22',c.p)+poly('32,17 40,24 32,31 24,24',c.a);
const cup=c=>path('M18 9H46V18H57V29L45 37 39 42V48H47V56H17V48H25V42L19 37 7 29V18H18Z',c.s,N,2)+path('M21 12H43V28L38 36 32 40 26 36 21 28Z',c.p)+poly('21,12 32,12 32,40 26,36 21,28',c.a)+path('M11 22H18V31L11 27ZM46 22H53V27L46 31Z',N)+poly('29,41 35,41 35,50 29,50',c.p)+poly('21,51 43,51 43,54 21,54',c.a);
const laurel=c=>path('M9 16 15 21 12 27 19 29 17 35 24 38 25 44 32 48 39 44 40 38 47 35 45 29 52 27 49 21 55 16 57 29 52 42 43 52 32 58 21 52 12 42 7 29Z',c.p,N,1.5);
const institutions=[['rift_director_logo','Rift Director','logo'],['rift_director_symbol','Rift Director · símbolo','symbol'],['rift_director_wordmark','Rift Director · wordmark','wordmark'],['rift_championship','Rift Championship','championship'],['rift_league','Rift League','league']];
const competitions=[['liga_aurora','Liga Aurora','aurora'],['liga_boreal','Circuito Boreal','boreal'],['regular_season','Temporada regular','regular'],['playoffs','Playoffs','playoffs'],['semifinal','Semifinal','semi'],['grand_final','Gran final','final'],['league_champion','Campeón de liga','champion'],['international_champion','Campeón internacional','international']];
const entries=[...clubDefs.map(([id,displayName,motif,primaryColor,secondaryColor])=>({id,displayName,motif,primaryColor,secondaryColor,accent:G,category:'club',futureOnly:false})),...institutions.map(([id,displayName,motif])=>({id,displayName,motif,primaryColor:G,secondaryColor:H,accent:B,category:'institutional',futureOnly:false})),...competitions.map(([id,displayName,motif])=>({id,displayName,motif,primaryColor:motif==='boreal'?B:G,secondaryColor:H,accent:motif==='boreal'?B:R,category:'competition',futureOnly:motif==='international'}))].map(e=>Object.freeze({...e,asset:`${e.category==='club'?'clubs':e.category+'s'}/${e.id}.svg`,png:`png/${e.id}.png`}));
const catalog=Object.freeze(entries),byId=Object.fromEntries(entries.map(e=>[e.id,e]));
const normalize=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const byName=Object.fromEntries(entries.filter(e=>e.category==='club').map(e=>[normalize(e.displayName),e]));
function palette(e,overrides={}){return {p:color(overrides.primaryColor,e.primaryColor),s:color(overrides.secondaryColor,e.secondaryColor),a:color(overrides.accent,e.accent)};}
// Letter outlines: portable geometric wordmark, no system fonts or SVG text.
const letters={R:'M0 18V0H8L11 3V8L8 10H0M6 10 12 18',I:'M0 0H10M5 0V18M0 18H10',F:'M0 18V0H11M0 8H9',T:'M0 0H12M6 0V18',D:'M0 18V0H7L12 5V13L7 18Z',E:'M11 0H0V18H11M0 8H9',C:'M12 2 9 0H3L0 3V15L3 18H9L12 16',O:'M3 0H9L12 3V15L9 18H3L0 15V3Z'};
function wordmark(){return [...'RIFT DIRECTOR'].map((letter,i)=>letter===' '?'':`<g transform="translate(${i*17} 0)">${path(letters[letter],'none',N,4)}${path(letters[letter],'none',G,2.4)}</g>`).join('');}
function art(e,c){
 if(e.category==='club')return motifs[e.motif](c);
 if(e.category==='institutional'){
  if(e.motif==='symbol')return rift(c);
  if(e.motif==='wordmark')return `<g transform="translate(3 4) scale(1.05)">${rift(c)}</g><g transform="translate(83 25) scale(1.85)">${wordmark()}</g>`;
  if(e.motif==='logo')return `<g transform="translate(61 9) scale(2.1)">${rift(c)}</g><g transform="translate(20 167)">${wordmark()}</g>${path('M39 204H217','none',G,2)}${poly('128,198 134,204 128,210 122,204',B)}`;
  if(e.motif==='championship')return laurel(c)+`<g transform="translate(11 0) scale(.66)">${cup(c)}</g>`;
  return path('M32 5 55 18V44L32 58 9 44V18Z',N,c.s,2)+poly('16,39 24,39 24,25 16,30',B)+poly('28,45 36,45 36,17 28,17',c.p)+poly('40,39 48,39 48,30 40,25',R);
 }
 switch(e.motif){
 case 'aurora':return path('M8 16 32 6 56 16V43L32 58 8 43Z',N,c.s,2)+path('M15 39V27L23 20V39ZM28 39V15H36V39ZM41 39V20L49 27V39Z',c.p)+poly('14,44 50,44 32,53',c.a)+poly('17,28 23,23 23,32 17,37',c.s);
 case 'boreal':return path('M11 10H53L58 32 48 51 32 58 16 51 6 32Z',N,c.s,2)+path('M14 28 22 16 31 23 41 13 50 25 43 22 32 32 23 25 15 36Z',c.p)+poly('15,40 27,30 35,40 41,34 50,44 32,52',c.s)+poly('27,34 31,43 18,43',c.p);
 case 'regular':return path('M10 10H54V54H10Z',N,c.s,2)+path('M17 17H27V27H17ZM37 17H47V27H37ZM17 37H27V47H17ZM37 37H47V47H37Z',c.p)+poly('29,29 35,29 35,35 29,35',B);
 case 'playoffs':return path('M7 8H23V25H29V39H23V56H7V49H16V35H25V29H16V15H7ZM57 8H41V25H35V39H41V56H57V49H48V35H39V29H48V15H57Z',c.p,N,2)+poly('32,23 41,32 32,41 23,32',c.s);
 case 'semi':return path('M7 13 29 26V38L7 51V38L19 32 7 26ZM57 13 35 26V38L57 51V38L45 32 57 26Z',c.s,N,2)+poly('10,18 25,28 25,36 10,46 10,40 24,32 10,24',B)+poly('54,18 39,28 39,36 54,46 54,40 40,32 54,24',R);
 case 'final':return cup(c);
 case 'champion':return laurel(c)+`<g transform="translate(14 1) scale(.56)">${motifs.five(c)}</g>`+poly('27,44 37,44 39,51 25,51',c.s);
 default:return laurel(c)+ring(32,26,17,N,c.s,2)+path('M15 26H49M32 9C19 18 19 34 32 43M32 9C45 18 45 34 32 43','none',B,2)+poly('32,16 41,26 32,36 23,26',c.p);
 }
}
function wrap(body,label,size=48,view='0 0 64 64',id=''){
 const h=Math.max(16,Math.min(512,Number(size)||48)),ratio=view==='0 0 512 80'?6.4:1;
 return `<svg xmlns="http://www.w3.org/2000/svg" class="brand-mark" data-brand-id="${esc(id)}" role="img" aria-label="${esc(label)}" width="${h*ratio}" height="${h}" viewBox="${view}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}
function svg(id,size=48,overrides={}){
 const e=Object.hasOwn(byId,id)?byId[id]:null;if(!e)return '';
 const view=e.motif==='wordmark'?'0 0 512 80':e.motif==='logo'?'0 0 256 256':'0 0 64 64';
 return wrap(art(e,palette(e,overrides)),e.displayName,size,view,id);
}
function hash(name){let h=2166136261;for(const ch of normalize(name)){h=Math.imul(h^ch.charCodeAt(0),16777619);}return h>>>0;}
function identity(c,options={}){
 const h=hash(c.name),keys=Object.keys(shapes);
 return {version:1,shape:keys.includes(options.shape)?options.shape:keys[h%keys.length],symbol:symbols.includes(options.symbol)?options.symbol:symbols[(h>>>4)%symbols.length],primaryColor:color(options.primaryColor,color(c.color,'#5bd4b6')),secondaryColor:color(options.secondaryColor,'#dce7ef'),accent:color(options.accent,G)};
}
function validIdentity(b){return b?.version===1&&Object.hasOwn(shapes,b.shape)&&symbols.includes(b.symbol)&&['primaryColor','secondaryColor','accent'].every(key=>/^#[0-9a-f]{6}$/i.test(b[key]||''));}
function modular(b,name,size=48){
 if(!validIdentity(b))return '';
 const c={p:b.primaryColor,s:b.secondaryColor,a:b.accent};
 const body=path(shapes[b.shape],N,c.s,2)+`<g transform="translate(4 4) scale(.875)">${path(shapes[b.shape],S,c.p,2)}</g>`+`<g transform="translate(12 11) scale(.625)">${motifs[b.symbol](c)}</g>`;
 return wrap(body,'Escudo de '+name,size,'0 0 64 64','custom_'+b.shape+'_'+b.symbol);
}
function resolve(c){
 if(!c)return null;
 if(validIdentity(c.branding))return {kind:'custom',identity:c.branding};
 const key=normalize(c.name),e=Object.hasOwn(byName,key)?byName[key]:null;
 return e?{kind:'club',entry:e}:null;
}
function club(c,size=48){
 const resolved=resolve(c);if(!resolved)return '';
 if(resolved.kind==='custom')return modular(resolved.identity,c.name,size);
 // Keep the club's saved primary/secondary colors; geometry belongs to its name.
 return svg(resolved.entry.id,size,{primaryColor:c.color,secondaryColor:c.secondaryColor,accent:c.accent});
}
function phase(f){return f?.phase==='final'?'grand_final':f?.phase==='semi'?'semifinal':f?.playoff?'playoffs':'regular_season';}
root.RiftBranding=Object.freeze({catalog,shapes,symbols,symbolNames,shapeNames,svg,club,resolve,identity,validIdentity,modular,phase,
 symbolSVG:(id,size=256)=>symbols.includes(id)?wrap(motifs[id]({p:B,s:H,a:G}),symbolNames[id],size,'0 0 64 64',id):'',
 shapeSVG:(id,size=256)=>Object.hasOwn(shapes,id)?wrap(path(shapes[id],N,H,2),shapeNames[id],size,'0 0 64 64',id):''});
})(globalThis);
