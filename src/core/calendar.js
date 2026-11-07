/* Rift Director: fixtures, standings and calendar rules. Static/browser-safe, no RNG. */
((root) => {
  'use strict';
  const core = root.RiftCore || (root.RiftCore = {});

  // Preserve the exact round-robin and month allocation from Alpha 0.2.
  function generateFixtures(clubs) {
    let ids=clubs.slice(),r=[];if(ids.length%2)ids.push(null);const n=ids.length;
    for(let j=0;j<n-1;j++){let games=[];for(let k=0;k<n/2;k++){const a=ids[k],b=ids[n-1-k];if(a&&b)games.push({a:j%2?a:b,b:j%2?b:a,round:j,played:false})}r.push(games);ids=[ids[0],ids[n-1],...ids.slice(1,n-1)]}
    let rounds=[...r,...r.map((g,j)=>g.map(x=>({a:x.b,b:x.a,round:j+n-1,played:false})))];let byMonth={};for(let m=1;m<=12;m++)byMonth[m]=[];
    rounds.forEach((games,j)=>{let m=2+Math.floor(j*7/rounds.length);byMonth[m].push(...games)});return byMonth;
  }
  function standingsFor(ids) {
    let d={};ids.forEach(id=>d[id]={w:0,l:0,points:0});return d;
  }
  function pendingUserFixtures(world) {
    if(world.month===9)return world.playoffs.filter(f=>!f.played&&(f.a===world.userClub||f.b===world.userClub));
    return (world.fixtures[world.month]||[]).filter(f=>!f.played&&(f.a===world.userClub||f.b===world.userClub));
  }
  function nextDate(year,month) {
    if(!Number.isSafeInteger(year)||!Number.isSafeInteger(month)||month<1||month>12)throw Error('Fecha inválida');
    return month===12 ? {year:year+1,month:1} : {year,month:month+1};
  }
  const record = v => v!==null&&typeof v==='object'&&!Array.isArray(v);
  const nat = v => Number.isSafeInteger(v)&&v>=0;
  function validateCalendar(world,clubs) {
    const errors=[];
    for (const [field,region,ranking] of [['fixtures','Aurora','standings'],['otherFixtures','Boreal','otherStandings']]) {
      const schedule=world[field],table=world[ranking];
      if(!record(schedule)||!record(table)){errors.push('Calendario o tabla inválido: '+region);continue;}
      const eligible=new Set([...clubs.values()].filter(c=>c.region===region).map(c=>c.id));
      const roundTeams=new Set(),roundGames=new Set();
      for(const id of eligible){
        const entry=table[id];
        if(!record(entry)||!nat(entry.w)||!nat(entry.l)||!nat(entry.points)){
          errors.push('Clasificación inválida para club '+id);break;
        }
      }
      for(const id of Object.keys(table))if(!eligible.has(id)){errors.push('Club obsoleto en clasificación: '+id);break;}
      for(let m=1;m<=12;m++){
        const fixtures=schedule[m];
        if(!Array.isArray(fixtures)){errors.push('Mes sin calendario: '+region+' '+m);continue;}
        for(const f of fixtures){
          if(!record(f)||!eligible.has(f.a)||!eligible.has(f.b)||f.a===f.b||!nat(f.round)||typeof f.played!=='boolean'||(f.winner!=null&&f.winner!==f.a&&f.winner!==f.b)){
            errors.push('Partido de liga inválido: '+region+' mes '+m);continue;
          }
          // A team cannot be scheduled twice in the same round, even across months.
          const key=f.round+':'+[f.a,f.b].sort().join(':');
          if(roundGames.has(key)||roundTeams.has(f.round+':'+f.a)||roundTeams.has(f.round+':'+f.b)){
            errors.push('Doble partido en la misma jornada: '+region+' '+f.round);
          }
          roundGames.add(key);roundTeams.add(f.round+':'+f.a);roundTeams.add(f.round+':'+f.b);
        }
      }
      for(const month of Object.keys(schedule)){
        if(!/^(?:[1-9]|1[0-2])$/.test(month))errors.push('Mes desconocido en calendario: '+month);
      }
    }
    if(!Array.isArray(world.playoffs))return [...errors,'Playoffs inválidos'];
    for(const f of world.playoffs){
      if(!record(f)||!clubs.has(f.a)||!clubs.has(f.b)||f.a===f.b||clubs.get(f.a)?.region!=='Aurora'||clubs.get(f.b)?.region!=='Aurora'||!nat(f.round)||typeof f.played!=='boolean'||f.playoff!==true||!['semi','final'].includes(f.phase)||(f.winner!=null&&f.winner!==f.a&&f.winner!==f.b)){
        errors.push('Cruce de playoffs inválido');break;
      }
    }
    return errors;
  }

  core.generateFixtures=generateFixtures;
  core.standingsFor=standingsFor;
  core.pendingUserFixtures=pendingUserFixtures;
  core.nextDate=nextDate;
  core.validateCalendar=validateCalendar;
})(globalThis);
