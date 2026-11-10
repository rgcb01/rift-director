const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=process.argv[2]||'http://127.0.0.1:8765/';
  const screenshot=async name=>page.screenshot({path:`docs/art-pack-03/${name}.png`,fullPage:true});
  await page.goto(base);
  const assets=await page.evaluate(async()=>{
   const m=await (await fetch('assets/branding/branding.json')).json();
   const vectors=[...m.entries,...m.symbols,...m.shapes];
   const results=await Promise.all(vectors.map(async e=>{
    const response=await fetch(m.pathBase+e.asset),text=await response.text();
    const xml=new DOMParser().parseFromString(text,'image/svg+xml');
    return {id:e.id,ok:response.ok&&!xml.querySelector('parsererror')};
   }));
   const pngs=await Promise.all(m.entries.map(e=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>resolve(img.naturalWidth===256&&img.naturalHeight===256);img.onerror=()=>resolve(false);img.src=m.pathBase+e.png;
   })));
   return {results,pngs};
  });
  assert.equal(assets.results.length,60);assert.ok(assets.results.every(e=>e.ok));assert.equal(assets.pngs.length,36);assert.ok(assets.pngs.every(Boolean));
  await page.locator('#new-club-name').fill('Lobos del Alba');
  await page.locator('.identity-options summary').click();
  await page.locator('#brand-shape').selectOption('bastion');
  await page.locator('#brand-symbol').selectOption('wolf');
  await page.locator('#brand-primaryColor').fill('#6a9fd5');
  await page.locator('#brand-secondaryColor').fill('#e0d6b8');
  await page.locator('#brand-accent').fill('#d6a35c');
  await page.locator('[data-action="choose-start"][data-id="rich"]').click();
  assert.equal(await page.locator('#brand-symbol').inputValue(),'wolf');
  await page.locator('.identity-options summary').click();
  await screenshot('identity_creation');
  await page.locator('[data-action="create"]').click();
  const key='rift_director_v02_save';
  let world=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const club=world.clubs.find(c=>c.id===world.userClub);
  assert.equal(club.name,'Lobos del Alba');assert.equal(club.color,'#6a9fd5');
  assert.deepEqual(club.branding,{version:1,shape:'bastion',symbol:'wolf',primaryColor:'#6a9fd5',secondaryColor:'#e0d6b8',accent:'#d6a35c'});
  const identity=await page.locator('.clubhead>.brand-mark').evaluate(el=>el.outerHTML);
  await screenshot('dashboard_desktop');
  await page.reload();assert.equal(await page.locator('.clubhead>.brand-mark').evaluate(el=>el.outerHTML),identity);
  await page.setViewportSize({width:390,height:844});await screenshot('dashboard_mobile');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-nav="roster"]').first().click();assert.ok(await page.locator('.player-card .brand-mark').count()>0);await screenshot('roster');
  await page.locator('[data-nav="world"]').first().click();
  assert.ok(await page.locator('.table .brand-mark').count()>=16);assert.ok(await page.locator('.news .brand-mark').count()>0);
  await screenshot('standings_news');
  await page.locator('[data-action="club"]').first().click();assert.equal(await page.locator('.modal [data-brand-id="custom_bastion_wolf"]').count(),1);await screenshot('organization_profile');
  await page.locator('[data-action="close-modal"]').click();
  await page.locator('[data-nav="home"]').first().click();
  await page.locator('[data-action="close-month"]').first().click();
  await page.locator('[data-nav="match"]').first().click();
  assert.ok(await page.locator('.matchup .brand-mark').count()===2);await screenshot('calendar');
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.locator('.rift-tab-team h3 .brand-mark').count(),2);
  assert.equal(await page.locator('.scoreboard [data-brand-id="custom_bastion_wolf"]').count(),1);
  await screenshot('match_center');
  await page.locator('[data-action="instant"]').click();
  assert.equal(await page.locator('[data-brand-id="international_champion"]').count(),0);
  // Preview completed competition metadata in an isolated test save, never a live user save.
  world=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  world.live=null;world.month=9;world.playoffsSetup=true;
  const ids=world.clubs.filter(c=>c.region==='Aurora').slice(0,4).map(c=>c.id);
  world.playoffs=[{a:ids[0],b:ids[3],round:50,phase:'semi',playoff:true,played:true,winner:ids[0]},
   {a:ids[1],b:ids[2],round:51,phase:'semi',playoff:true,played:true,winner:ids[1]},
   {a:ids[0],b:ids[1],round:53,phase:'final',playoff:true,played:true,winner:ids[0]}];
  world.champion=ids[0];
  await page.evaluate(({key,world})=>localStorage.setItem(key,JSON.stringify(world)),{key,world});await page.reload();
  await page.locator('[data-nav="world"]').first().click();
  for(const id of ['rift_championship','playoffs','semifinal','grand_final','league_champion'])assert.ok(await page.locator(`.championship-panel [data-brand-id="${id}"]`).count()>0);
  await screenshot('playoffs');
  await page.setViewportSize({width:390,height:844});await screenshot('playoffs_mobile');
  // No external branding download is needed for inline masters.
  await page.route('**/assets/branding/**',route=>route.abort());await page.reload();
  assert.equal(await page.locator('.clubhead [data-brand-id="custom_bastion_wolf"]').count(),1);
  // Missing presentation script falls back to the preserved historical crest.
  await page.route('**/src/ui/branding.js',route=>route.abort());await page.reload();
  assert.equal(await page.locator('.clubhead>.crest').count(),1);await screenshot('legacy_fallback');
  assert.deepEqual(errors,[]);
  console.log('PASS: 60 valid SVGs, 36 PNGs, custom identity persisted/reloaded, dashboard, roster, profile, calendar, standings/news, Match Center, competition stages, desktop/mobile and missing-script fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
