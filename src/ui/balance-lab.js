/* Rift Director UX-3 — read-only historical balance dashboard.
 * Audited values are transcribed from CHANGELOG.md 0.7.16/0.7.17 entries
 * and the published Actions reports. Missing measurements are null, never 0.
 * This module does not request data, access localStorage, touch RNG or simulate.
 */
((root)=>{
'use strict';
const DATA=Object.freeze([
 Object.freeze({
  version:'0.7.14',label:'Alpha 0.7.14',release:'Macro y decisiones tácticas',
  source:'Comparación histórica publicada en CHANGELOG 0.7.16',
  sourceUrl:'https://github.com/rgcb01/rift-director/blob/ecc9e3d280c0f7abdfb942d090d316984846721a/CHANGELOG.md',
  samples:1000,mirrored:1000,
  metrics:Object.freeze({duration:49.28,kills:6.39,towers:4.48,comeback:4.2,side:49.5,observedTtk:null,p50:null,p90:null})
 }),
 Object.freeze({
  version:'0.7.16',label:'Alpha 0.7.16',release:'Nexo, torres, objetos y contraasedios',
  source:'Benchmark publicado: Actions 42751443138',
  sourceUrl:'https://github.com/rgcb01/rift-director/actions/runs/42751443138',
  samples:1000,mirrored:1000,
  metrics:Object.freeze({duration:49.78,kills:6.44,towers:4.72,comeback:4.1,side:49.0,observedTtk:null,p50:null,p90:null})
 }),
 Object.freeze({
  version:'0.7.17',label:'Alpha 0.7.17',release:'Escalado de campeones y picos de poder',
  source:'Benchmark publicado: Actions 42755942297',
  sourceUrl:'https://github.com/rgcb01/rift-director/actions/runs/42755942297',
  samples:1000,mirrored:1000,
  metrics:Object.freeze({duration:49.48,kills:6.50,towers:4.76,comeback:4.6,side:49.5,observedTtk:2.52,p50:null,p90:null})
 })
]);
const METRICS=Object.freeze([
 Object.freeze({key:'duration',label:'Duración media',unit:'min',decimals:2,detail:'Media de minutos simulados hasta la destrucción del Nexo.'}),
 Object.freeze({key:'kills',label:'Eliminaciones por mapa',unit:'kills/mapa',decimals:2,detail:'Media de bajas reales registradas por partida.'}),
 Object.freeze({key:'towers',label:'Torres por mapa',unit:'torres/mapa',decimals:2,detail:'Media de torres destruidas a partir de acciones verificadas.'}),
 Object.freeze({key:'comeback',label:'Remontadas',unit:'%',deltaUnit:'pp',decimals:1,detail:'Porcentaje de partidas ganadas tras ir al menos 1,500 de oro por detrás en el minuto 20.'}),
 Object.freeze({key:'side',label:'Victoria azul (espejado)',unit:'%',deltaUnit:'pp',decimals:1,detail:'Porcentaje de victorias azules en los mapas espejados. El valor de referencia neutral es 50%; un delta positivo no implica mejora.'}),
 Object.freeze({key:'observedTtk',label:'TTK observado (proxy)',unit:'min simulados',decimals:2,detail:'Tiempo simulado entre primera herida registrada y kill; NO es tiempo real de combate en segundos. Solo publicado desde 0.7.17.'}),
 Object.freeze({key:'p50',label:'Duración P50',unit:'min',decimals:2,detail:'Percentil 50 de duración. No aparece en los resúmenes congelados de estas releases.'}),
 Object.freeze({key:'p90',label:'Duración P90',unit:'min',decimals:2,detail:'Percentil 90 de duración. No aparece en los resúmenes congelados de estas releases.'})
]);
const byVersion=Object.freeze(Object.fromEntries(DATA.map(row=>[row.version,row])));
const byMetric=Object.freeze(Object.fromEntries(METRICS.map(row=>[row.key,row])));
const escape=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known=n=>typeof n==='number'&&Number.isFinite(n);
const point=(version,key)=>{
 const v=byVersion[version];return v&&Object.hasOwn(byMetric,key)?v.metrics[key]:null;
};
function format(key,value){
 const metric=byMetric[key];
 if(!metric||!known(value))return 'No medido';
 const amount=value.toFixed(metric.decimals);
 return amount+(metric.unit==='%'?'%':metric.unit==='min'?' min':metric.unit==='min simulados'?' min simulados':' '+metric.unit);
}
function difference(base,current,key){
 if(!byMetric[key]||!known(base)||!known(current))return null;
 const metric=byMetric[key];
 const difference=Number((current-base).toFixed(metric.decimals));
 const mark=difference>0?'+':difference<0?'−':'±';
 const n=Math.abs(difference).toFixed(metric.decimals);
 return mark+n+' '+(metric.deltaUnit||metric.unit);
}
function model(options={}){
 const baseline=byVersion[options.baseline]?options.baseline:'0.7.16';
 const current=byVersion[options.current]?options.current:'0.7.17';
 const metric=byMetric[options.metric]?options.metric:'duration';
 const a=byVersion[baseline],b=byVersion[current],m=byMetric[metric];
 const aValue=point(baseline,metric),bValue=point(current,metric);
 return {baseline,current,metric,a,b,m,aValue,bValue,
  delta:difference(aValue,bValue,metric),same:baseline===current,
  hasBoth:known(aValue)&&known(bValue)};
}
function optionMarkup(rows,selected,field){
 return '<select id="balance-'+field+'" data-change="lab-'+field+'" aria-label="'+
   (field==='metric'?'Métrica':'Versión '+(field==='baseline'?'base':'comparada'))+'">'+
   rows.map(item=>'<option value="'+escape(item.key||item.version)+'"'+
    ((item.key||item.version)===selected?' selected':'')+'>'+
    escape(item.label)+'</option>').join('')+'</select>';
}
function metricRow(metric,a,b){
 const base=a.metrics[metric.key],current=b.metrics[metric.key];
 const diff=difference(base,current,metric.key);
 return '<tr><th scope="row">'+escape(metric.label)+'</th>'+
   '<td class="num">'+escape(format(metric.key,base))+'</td>'+
   '<td class="num">'+escape(format(metric.key,current))+'</td>'+
   '<td class="num">'+escape(diff||'No comparable')+'</td></tr>';
}
function graph(metric){
 const data=DATA.filter(row=>known(row.metrics[metric.key]));
 if(!data.length)return '<div class="empty">No medido en las versiones disponibles. No se ha estimado este valor.</div>';
 const max=Math.max(1,...data.map(row=>row.metrics[metric.key]));
 const top=metric.unit==='%'?100:Math.ceil(max*1.15);
 const chartHeight=162,baseline=220;
 const bars=DATA.map((row,index)=>{
  const v=row.metrics[metric.key],cx=150+index*224;
  if(!known(v))return '<text x="'+cx+'" y="166" text-anchor="middle" class="balance-svg-missing">No medido</text>'+
    '<text x="'+cx+'" y="250" text-anchor="middle" class="balance-svg-label">'+escape(row.version)+'</text>';
  const h=Math.max(2,chartHeight*v/top),y=baseline-h;
  return '<g><title>'+escape(row.label+': '+format(metric.key,v))+'</title>'+
   '<rect x="'+(cx-57)+'" y="'+y+'" width="114" height="'+h+'" rx="7" class="balance-svg-bar balance-svg-bar-'+index+'"/>'+
   '<text x="'+cx+'" y="'+Math.max(25,y-10)+'" text-anchor="middle" class="balance-svg-number">'+escape(format(metric.key,v))+'</text>'+
   '<text x="'+cx+'" y="250" text-anchor="middle" class="balance-svg-label">'+escape(row.version)+'</text></g>';
 }).join('');
 return '<svg class="balance-chart" viewBox="0 0 750 270" role="img" aria-label="'+escape(metric.label)+
   ' en las versiones 0.7.14, 0.7.16 y 0.7.17. Los valores exactos están en la tabla.">'+
   '<line x1="45" x2="710" y1="220" y2="220" stroke="#526c81"/>'+
   '<text x="42" y="60" text-anchor="end" class="balance-svg-axis">'+escape(String(top))+'</text>'+
   '<text x="42" y="222" text-anchor="end" class="balance-svg-axis">0</text>'+
   bars+'</svg>';
}
function render(options={}){
 const x=model(options);
 const current=x.b,baseline=x.a;
 const headline=['duration','kills','comeback','side'].map(key=>{
  const a=baseline.metrics[key],b=current.metrics[key],delta=difference(a,b,key);
  return '<div class="balance-kpi"><small>'+escape(byMetric[key].label)+'</small><strong>'+escape(format(key,b))+
   '</strong><span>'+escape(delta||'No comparable')+' vs '+escape(baseline.version)+'</span></div>';
 }).join('');
 const rows=METRICS.map(m=>metricRow(m,baseline,current)).join('');
 const state=x.same?'<p class="banner warn">Has seleccionado la misma versión. El delta será cero: elige versiones distintas para compararlas.</p>':
  !x.hasBoth?'<p class="banner warn">Esta métrica no existe en uno o ambos reportes: no se calcula un delta ficticio.</p>':'';
 return '<section class="balance-lab" aria-label="Laboratorio de balance de Rift Director">'+
  '<div class="balance-lab-intro"><div class="eyebrow">HERRAMIENTAS · LECTURA HISTÓRICA</div>'+
  '<h1>Laboratorio de balance</h1><p>Compara métricas auditadas de versiones publicadas sin iniciar simulaciones ni alterar tu organización.</p>'+
  '<div class="balance-lab-meta"><span>1,000 mapas auditados + 500 pares espejados por versión</span>'+
  '<span>Datos congelados del changelog y GitHub Actions</span></div></div>'+
  '<section class="panel balance-lab-filters" aria-label="Seleccionar versiones y métrica">'+
  '<div class="balance-lab-field"><label for="balance-baseline">Versión base</label>'+optionMarkup(DATA,x.baseline,'baseline')+'</div>'+
  '<div class="balance-lab-field"><label for="balance-current">Versión comparada</label>'+optionMarkup(DATA,x.current,'current')+'</div>'+
  '<div class="balance-lab-field"><label for="balance-metric">Métrica del gráfico</label>'+optionMarkup(METRICS,x.metric,'metric')+'</div></section>'+
  '<div class="balance-kpis">'+headline+'</div>'+
  '<div class="balance-lab-columns"><section class="panel balance-lab-chart-panel"><div class="panel-head"><h2>'+
  escape(x.m.label)+'</h2><span class="chip">Comparación histórica</span></div>'+
  '<p class="helper">'+escape(x.m.detail)+'</p>'+graph(x.m)+state+
  '<div class="balance-comparison"><div><small>'+escape(baseline.label)+'</small><strong>'+
  escape(format(x.metric,x.aValue))+'</strong></div><div><small>'+escape(current.label)+'</small><strong>'+
  escape(format(x.metric,x.bValue))+'</strong></div><div><small>Diferencia</small><strong>'+
  escape(x.delta||'No comparable')+'</strong></div></div>'+
  '</section><aside class="panel balance-source-panel"><h2>Procedencia y alcance</h2>'+
  '<p class="helper">Las cifras se transcriben de los resúmenes de versiones ya publicadas, no son medidas nuevas de este navegador.</p>'+
  '<div class="balance-source-row"><b>'+escape(baseline.label)+'</b><span>'+escape(baseline.release)+'</span>'+
  '<a href="'+escape(baseline.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(baseline.source)+'</a></div>'+
  '<div class="balance-source-row"><b>'+escape(current.label)+'</b><span>'+escape(current.release)+'</span>'+
  '<a href="'+escape(current.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(current.source)+'</a></div>'+
  '<p class="helper">Cada publicación reporta 1,000 mapas primarios y 1,000 mapas en 500 pares espejados. No son 2,000 observaciones independientes. La tasa azul espejada pertenece al segundo grupo.</p>'+
  '<p class="helper">Los pequeños cambios de promedios no prueban por sí mismos que el balance haya mejorado. Las validaciones de causalidad siguen siendo responsabilidad de los benchmarks y sus gates.</p>'+
  '</aside></div>'+
  '<section class="panel balance-data-panel"><div class="panel-head"><h2>Tabla de métricas</h2><span class="chip">No medido ≠ 0</span></div>'+
  '<div class="table-wrap"><table class="table balance-data-table"><thead><tr><th scope="col">Indicador</th>'+
  '<th scope="col">'+escape(baseline.version)+'</th><th scope="col">'+escape(current.version)+'</th>'+
  '<th scope="col">Delta</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="helper">La duración P50/P90 no está disponible en los resúmenes conservados. El TTK observado de 0.7.17 es un proxy en minutos simulados, no segundos reales de combate.</p></section>'+
  '<section class="panel balance-next"><h2>Benchmark completo y futuras versiones</h2>'+
  '<p class="helper">Para reproducir semillas, auditar eventos, descargar SVG/JSON o evaluar regresiones bloqueantes, abre el workflow de balance. Sus artifacts tienen retención limitada; este panel mantiene únicamente las cifras públicas transcritas.</p>'+
  '<a class="balance-report-link" href="https://github.com/rgcb01/rift-director/actions/workflows/balance.yml" target="_blank" rel="noopener noreferrer">Ver ejecuciones y reportes de balance</a>'+
  '</section></section>';
}
root.RiftBalanceLab=Object.freeze({DATA,METRICS,model,point,format,difference,render});
})(globalThis);
