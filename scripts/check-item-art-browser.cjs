const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2]||'http://127.0.0.1:8765/');
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const files=await page.evaluate(()=>Promise.all(Object.values(RiftItemArt.catalogs).flat().flatMap(e=>[128,64,32].map(size=>new Promise(resolve=>{
   const image=new Image();image.onload=()=>resolve({id:e.id,size,w:image.naturalWidth,h:image.naturalHeight});
   image.onerror=()=>resolve({id:e.id,size,w:0,h:0});image.src=e['icon'+size];
  })))));
  assert.equal(files.length,90);assert.ok(files.every(f=>f.w===f.size&&f.h===f.size));
  await page.locator('[data-action="demo-start"]').click();
  await page.locator('[data-action="instant"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.rift-item-image').length>0&&[...document.querySelectorAll('.rift-item-image')].every(i=>i.complete&&i.naturalWidth>0));
  const tabImages=page.locator('.rift-tab-items .rift-item-image');
  const listImages=page.locator('.match-item-inline .rift-item-image');
  assert.ok(await tabImages.count()>0);assert.ok(await listImages.count()>0);
  assert.equal(await tabImages.count(),await page.locator('.rift-tab-items .tab-item.filled').count());
  assert.equal(await tabImages.count(),await listImages.count());
  assert.equal(await page.locator('.rift-tab-items .tab-item').count(),60);
  assert.ok(await tabImages.first().evaluate(el=>el.currentSrc.includes('/64/')));
  const inventory=await page.locator('.rift-tab-items .tab-item.filled').evaluateAll(nodes=>nodes.map(n=>n.title));
  const activeNames=await page.evaluate(()=>RiftCore.PowerEconomy.ITEM_CATALOG.map(e=>e.name));
  assert.ok(inventory.every(name=>activeNames.includes(name)));
  await page.locator('.rift-tab-panel').screenshot({path:'docs/art-pack-2/tab-desktop.png'});
  await page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Estadísticas individuales',exact:true})}).screenshot({path:'docs/art-pack-2/match-center.png'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.rift-tab-items .tab-item').count(),60);
  assert.deepEqual(await page.locator('.rift-tab-items .tab-item.filled').evaluateAll(nodes=>nodes.map(n=>n.title)),inventory);
  await page.locator('.rift-tab-panel').screenshot({path:'docs/art-pack-2/tab-mobile.png'});
  // Block both resolutions, then rerender through a real replay step.
  await page.route('**/assets/inventory/**/*.png',route=>route.abort());
  await page.reload();
  await page.locator('[data-action="demo-start"]').click();
  await page.locator('[data-action="instant"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.tab-item.filled').length>0&&document.querySelectorAll('.rift-item-image').length===0);
  assert.equal(await page.locator('.tab-item.filled').count(),await page.locator('.tab-item.filled>svg').count());
  await page.locator('.rift-tab-panel').screenshot({path:'docs/art-pack-2/tab-fallback.png'});
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),saved);
  assert.deepEqual(errors,[]);
  console.log('PASS: 90 PNGs, real purchases in TAB/Match Center, 2x images, mobile, failed downloads with SVG fallback, no save writes or JS errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
