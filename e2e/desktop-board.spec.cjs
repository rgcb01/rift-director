const {test,expect}=require('@playwright/test');
const base=process.env.RIFT_TEST_URL||'http://127.0.0.1:8080';
async function enterGame(page){
 await page.goto(base+'/');
 await page.locator('[data-setup="bot"]').click();
 await page.locator('[data-first]').first().click();
 await expect(page.locator('.field')).toBeVisible();
}
for(const width of [1280,1440,1920]){
 test('Desktop tabletop is centered, fills width, and anchors the hand at '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:false,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enterGame(page);
  const metrics=await page.evaluate(()=>{
   const b=document.querySelector('.field').getBoundingClientRect(),
    h=document.querySelector('.hand-panel').getBoundingClientRect(),
    a=document.querySelector('.arena-layout').getBoundingClientRect();
   return {center:b.x+b.width/2,boardWidth:b.width,handBottom:innerHeight-h.bottom,
    handTop:h.top,arenaBottom:a.bottom,handPosition:getComputedStyle(document.querySelector('.hand-panel')).position,
    bodyOverflow:getComputedStyle(document.body).overflow,
    horizontal:document.documentElement.scrollWidth-innerWidth};
  });
  expect(Math.abs(metrics.center-width/2)).toBeLessThan(28);
  expect(metrics.boardWidth).toBeGreaterThan(width<1700?width*.88:1550);
  expect(metrics.handPosition).toBe('fixed');
  expect(Math.abs(metrics.handBottom)).toBeLessThanOrEqual(2);
  expect(metrics.arenaBottom).toBeLessThanOrEqual(metrics.handTop+2);
  expect(metrics.horizontal).toBeLessThanOrEqual(3);
  const unit=page.locator('.board-side:not(.enemy) .lane[data-lane-column="TOP"] .unit').first();
  await expect(unit).toHaveAttribute('draggable','true');
  await expect(page.locator('#game-help')).toBeHidden();
  await page.locator('[data-act="toggle-log"]').first().click();
  await expect(page.locator('#game-help')).toBeVisible();
  await page.locator('.sidebar-close').click();
  await expect(page.locator('#game-help')).toBeHidden();
  expect(errors).toEqual([]);await context.close();
 });
}
test('Desktop drag: allied Riftborn changes front/rear and returns to base',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await enterGame(page);
 const unit=page.locator('.board-side:not(.enemy) .lane[data-lane-column="TOP"] .row-slot.front .unit').first();
 const rear=page.locator('.board-side:not(.enemy) .lane[data-lane-column="TOP"] .row-slot.rear');
 await unit.dragTo(rear);
 await expect(rear.locator('.unit')).toHaveCount(1);
 await expect(rear).toContainText('Centinela');
 await expect(page.locator('.logline').first()).toContainText('cambia de fila');
 // Arcanista is in MID and has not been exhausted by the previous order.
 const arcanista=page.locator('.board-side:not(.enemy) .lane[data-lane-column="MID"] .unit').first();
 // Opponent is passive only in tutorial, so the bot may get the next move.
 await expect(arcanista).toBeVisible();
 await arcanista.dragTo(page.locator('.board-base-drop'));
 await expect(page.locator('.reserve-unit')).toContainText('BACK');
 expect(errors).toEqual([]);await context.close();
});
test('Desktop drag: card dropped onto a legal board target is played, not just selected',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await enterGame(page);
 const ids=['wave-push','siege-march','battle-standard','line-guard','gank','dive','precise-strike','energy-pulse'];
 const available=await page.locator('button.tactic:not([disabled])').evaluateAll(nodes=>nodes.map(n=>({id:n.querySelector('[data-card-id]')?.dataset.cardId,uid:n.dataset.card,drag:n.draggable})));
 const chosen=ids.map(id=>available.find(c=>c.id===id)).find(Boolean);
 expect(chosen).toBeTruthy();
 expect(chosen.drag).toBe(true);
 const source=page.locator('button.tactic[data-card="'+chosen.uid+'"]');
 const target=chosen.id==='line-guard'?
  page.locator('.board-side:not(.enemy) .lane[data-lane-column="TOP"]'):
  chosen.id==='precise-strike'?
  page.locator('.board-side.enemy .lane[data-lane-column="TOP"] .unit').first():
  chosen.id==='energy-pulse'?page.locator('.neutral'):
  page.locator('.board-side.enemy .lane[data-lane-column="TOP"]');
 const before=await page.locator('button.tactic').count();
 await source.dragTo(target);
 await expect(page.locator('button.tactic')).toHaveCount(before-1);
 await expect(page.locator('.logline').filter({hasText:'juega'}).first()).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(3);
 expect(errors).toEqual([]);await context.close();
});
test('Desktop action fallback: click and keyboard selection still work without drag',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await enterGame(page);
 await page.locator('.board-side:not(.enemy) .lane[data-lane-column="TOP"] .unit').first().click();
 await expect(page.locator('[data-order="SWAP_RANK"]')).toBeVisible();
 await page.locator('[data-order="SWAP_RANK"]').click();
 await expect(page.locator('.logline').first()).toContainText('cambia de fila');
});
