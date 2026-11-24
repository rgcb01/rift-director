const {test,expect}=require('@playwright/test');
const {mkdirSync}=require('node:fs');
const out='docs/screenshots/card-art-v092';
mkdirSync(out,{recursive:true});
const pilots=['hero-centinela','hero-astral','hero-sombra','great-convergence','disrupt','line-guard'];
async function readyImages(page){
 await page.locator('.card-art-image').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()}));});
}
async function layout(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 const clipped=await page.locator('.card-face-copy').evaluateAll(nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1).map(n=>n.textContent));
 expect(clipped).toEqual([]);
}
for(const width of [360,390,430,1440])test('pilot art, interaction and layout '+width,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/collection.html');
 await readyImages(page);
 await layout(page);
 await page.locator('.cc-collection').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-12));
 await page.screenshot({path:`${out}/collection-${width}.png`});
 // Each pilot really decodes; detail/rarity/text remain DOM.
 for(const id of pilots){
  const img=page.locator(`[data-art-id="${id}"] img`);
  expect(await img.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 }
 await page.goto('/deck-builder.html');await readyImages(page);await layout(page);
 await page.locator('.db-choice-list').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-120));
 await page.screenshot({path:`${out}/builder-${width}.png`});
 await page.locator('[data-hero="hero-centinela"]').click();
 await expect(page.locator('[data-slot="0"]')).toContainText('Centinela');
 await page.locator('#deck-name').fill('Piloto visual');await page.locator('[data-action="save"]').click();
 await page.reload();await expect(page.locator('#db-saved-select')).toContainText('Piloto visual');
 await page.goto('/card-game.html');
 await page.locator('[data-setup="bot"]').click();await page.locator('[data-first]').first().click();
 if(width<600)await page.locator('[data-focus-lane="TOP"]').click();
 await readyImages(page);await layout(page);
 await page.locator('.lane:visible .unit:not(.enemy)').first().click();
 await expect(page.locator('[data-order="SWAP_RANK"]')).toBeVisible();
 await page.locator('[data-order="SWAP_RANK"]').click();
 if(width<600){
  await page.locator('.lane:visible .unit:not(.enemy)').first().evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().top-180));
  await page.locator('.cards-scroll').evaluate(el=>{const art=el.querySelector('.card-art-image');if(art)el.scrollLeft=art.closest('.hand-card').offsetLeft-el.offsetLeft;});
 }
 await page.screenshot({path:`${out}/game-${width}.png`,fullPage:width===1440});
 await page.locator('[data-act="pass"]').click();await expect(page.getByText('Ronda 2',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);await context.close();
});
test('failed image requests and unillustrated cards retain playable fallback',async({page})=>{
 await page.route('**/assets/card-art/webp/**',route=>route.abort());
 await page.goto('/collection.html');
 await page.locator('[data-art-id="hero-centinela"]').scrollIntoViewIfNeeded();
 await expect(page.locator('[data-art-id="hero-centinela"] img')).toHaveCount(0);
 await expect(page.locator('[data-art-id="hero-centinela"] .card-art-fallback')).toBeVisible();
 await expect(page.locator('[data-art-id="hero-baluarte"] .card-art-fallback')).toBeVisible();
 await page.goto('/card-game.html');await page.locator('[data-setup="bot"]').click();await page.locator('[data-first]').first().click();
 await page.locator('.unit:not(.enemy):visible').first().click();await page.locator('[data-order="SWAP_RANK"]').click();
 await page.locator('[data-act="pass"]').click();await expect(page.getByText('Ronda 2',{exact:true})).toBeVisible();
});
test('six illustrations together in the real collection renderer',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/collection.html');
 // Review-only filtering of existing rendered collection nodes; no fake card markup.
 await page.locator('.cc-card').evaluateAll((cards,ids)=>cards.forEach(c=>{if(!ids.includes(c.querySelector('[data-card-id]').dataset.cardId))c.remove()}),pilots);
 await page.locator('.cc-grid').evaluate(el=>el.style.gridTemplateColumns='repeat(6,minmax(0,1fr))');
 await readyImages(page);await page.locator('.cc-grid').screenshot({path:`${out}/six-pilots.png`});
});
