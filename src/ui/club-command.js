/* Rift Director UX-2 — club command center.
 * Pure presentation: no RNG, persistence, gameplay changes or inferred forecasts.
 */
((root)=>{
'use strict';
const escape=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[ch]);
const button=(label,key,value,variant='secondary')=>
 '<button type="button" class="btn '+variant+'" data-'+key+'="'+escape(value)+'">'+escape(label)+'</button>';
function model(info){
 const hasMatch=info.pendingFixtures>0;
 const blocks=Boolean(info.over||info.crisis||info.matchRunning||hasMatch||info.playoffsPending);
 const canClose=!blocks;
 const outstanding=info.sponsorRequirement==='content'&&info.contentBlocks<1?'contenido':
  info.sponsorRequirement==='community'&&info.communityBlocks<1?'comunidad':null;
 const financialCaution=info.cash<info.payroll+info.planCost;
 const priorities=[];
 let lead;
 if(info.crisis){
  lead={title:'Resolver la crisis comercial',detail:'Una disputa comercial bloquea el cierre de mes hasta que tomes una decisión.',key:'action',value:'crisis',variant:'danger'};
  priorities.push({kind:'danger',title:'Crisis sin resolver',detail:'Decide cómo responder antes de cerrar el calendario.',key:'action',value:'crisis',label:'Resolver crisis'});
 }else if(info.matchRunning){
  lead={title:'Volver al partido',detail:'Tienes una retransmisión pendiente. El calendario no avanza hasta terminarla.',key:'nav',value:'match',variant:''};
  priorities.push({kind:'important',title:'Partido en curso',detail:'Completa o revisa la retransmisión antes de continuar.',key:'nav',value:'match',label:'Ir al partido'});
 }else if(hasMatch){
  lead={title:'Preparar el próximo encuentro',detail:'Revisa la alineación y el plan deportivo antes de disputar el siguiente mapa.',key:'nav',value:'match',variant:''};
  priorities.push({kind:'important',title:info.pendingFixtures+' encuentro(s) pendientes',detail:'Debes disputar los partidos de este mes para poder avanzar.',key:'nav',value:'match',label:'Ver calendario'});
 }else if(info.playoffsPending){
  lead={title:'Revisar los playoffs',detail:'Hay enfrentamientos de playoffs sin resolver. El calendario aún no puede cerrarse.',key:'nav',value:'match',variant:''};
  priorities.push({kind:'important',title:'Playoffs pendientes',detail:'Es necesario completar los encuentros restantes.',key:'nav',value:'match',label:'Ver partidos'});
 }else if(info.over){
  lead={title:'Temporada finalizada',detail:'La organización ha agotado su caja y no puede avanzar de mes.',key:'nav',value:'finance',variant:'secondary'};
 }else{
  lead={title:'Cerrar el mes y avanzar',detail:'No hay partidos ni crisis pendientes. Al cerrar se aplicarán los ingresos y gastos del mes.',key:'action',value:'close-month',variant:''};
 }
 if(outstanding){
  priorities.push({kind:'warn',title:'Compromiso con el patrocinador',detail:'Falta asignar al menos un bloque de '+outstanding+' en la agenda para cumplir el acuerdo.',anchor:'club-agenda',label:'Abrir agenda'});
 }
 if(financialCaution&&!info.over){
  priorities.push({kind:'warn',title:'Revisar liquidez',detail:'La caja disponible es inferior a la suma de la nómina y el coste adicional de agenda. No incluye todos los gastos ni ingresos del mes.',key:'nav',value:'finance',label:'Ver finanzas'});
 }
 if(!priorities.length){
  priorities.push({kind:'calm',title:canClose?'Calendario sin bloqueos':'Consulta la situación actual',detail:canClose?'Puedes revisar tu plan o cerrar el mes cuando quieras.':'Comprueba las decisiones y las partidas pendientes.',key:'nav',value:'roster',label:'Revisar plantilla'});
 }
 return {blocks,canClose,lead,priorities:priorities.slice(0,4),outstanding};
}
function render(info){
 const status=model(info);
 const primary=button(status.lead.title,status.lead.key,status.lead.value,status.lead.variant);
 const cards=status.priorities.map(item=>
  '<div class="club-priority club-priority-'+item.kind+'"><div class="club-priority-body"><strong>'+
  escape(item.title)+'</strong><p>'+escape(item.detail)+'</p></div>'+
  (item.anchor?'<a class="club-priority-link" href="#'+item.anchor+'">'+escape(item.label)+'</a>':
   button(item.label,item.key,item.value,'ghost small'))+
  '</div>').join('');
 const steps=[
  {number:'01',name:'Plantilla',detail:'Revisa tus cinco titulares y su preparación.',nav:'roster',label:'Ver plantilla'},
  {number:'02',name:'Estrategia',detail:info.strategy+' · '+info.usedBlocks+'/8 bloques de agenda.',anchor:'club-agenda',label:'Ver agenda'},
  {number:'03',name:'Competición',detail:info.matchRunning?'Partido en curso':info.pendingFixtures?info.pendingFixtures+' por disputar':info.playoffsPending?'Playoffs sin cerrar':'Sin partidos pendientes',nav:'match',label:'Ver partidos'},
  {number:'04',name:'Cierre mensual',detail:status.canClose?'Listo para avanzar al siguiente mes.':'Bloqueado hasta resolver las obligaciones competitivas o una crisis.',nav:'finance',label:'Ver finanzas'}
 ];
 const workflow=steps.map(item=>'<div class="club-workflow-step"><div class="club-workflow-number">'+item.number+'</div><div class="club-workflow-copy"><strong>'+escape(item.name)+'</strong><small>'+escape(item.detail)+'</small></div>'+
  (item.anchor?'<a href="#'+item.anchor+'">'+escape(item.label)+'</a>':
  button(item.label,'nav',item.nav,'ghost small'))+'</div>').join('');
 return '<section class="club-command" aria-label="Centro de decisiones del club">'+
  '<div class="club-command-lead"><div class="eyebrow">TU SIGUIENTE DECISIÓN · '+escape(info.dateLabel)+'</div><h2>'+escape(status.lead.title)+'</h2>'+
  '<p>'+escape(status.lead.detail)+'</p><div class="club-command-actions">'+primary+
  button('Gestionar plantilla','nav','roster','secondary')+
  '<a href="#club-agenda" class="club-command-text-link">Revisar agenda</a></div>'+
  '</div><div class="club-command-side"><h3>Prioridades actuales</h3>'+cards+'</div></section>'+
  '<section class="club-command-workflow panel" aria-label="Pasos para preparar y avanzar el mes">'+
  '<div class="panel-head"><h2>Ruta de dirección</h2><span class="helper">Preparar → competir → cerrar</span></div>'+
  '<div class="club-workflow-grid">'+workflow+'</div></section>'+
  '<section class="club-finance-strip" aria-label="Compromisos financieros del mes">'+
  '<div><small>Dinero disponible</small><strong>'+escape(info.cashLabel)+'</strong></div>'+
  '<div><small>Nómina mensual</small><strong>'+escape(info.payrollLabel)+'</strong></div>'+
  '<div><small>Coste adicional de agenda (estimado)</small><strong>'+escape(info.planCostLabel)+'</strong></div>'+
  '<div><small>Patrocinio mensual base</small><strong>'+escape(info.sponsorLabel)+'</strong></div></section>'+
  '<p class="helper club-finance-disclaimer">Son importes individuales, no una previsión de beneficio ni del saldo al cierre. Revisa Finanzas para conocer el detalle.</p>';
}
root.RiftClubCommand=Object.freeze({model,render});
})(globalThis);
