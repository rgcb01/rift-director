const {test,expect}=require('@playwright/test');
const {mkdirSync}=require('node:fs');
const widths=[360,768,1440];
const root='http://127.0.0.1:8080/legacy-moba.html';
mkdirSync('ux-screenshots',{recursive:true});

for(const width of widths){
 test('UX browser: guest → balance → club → spectator at '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root,{waitUntil:'load'});
  await expect(page.locator('.welcome')).toBeVisible();
  await page.locator('[data-action="lab-open"]').click();
  await expect(page.locator('.balance-lab')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Laboratorio de balance'})).toBeVisible();
  await page.screenshot({path:'ux-screenshots/lab-'+width+'.png',fullPage:true});
  await page.locator('[data-change="lab-metric"]').selectOption('p90');
  await expect(page.getByText('No medido en las versiones disponibles',{exact:false})).toBeVisible();
  const emptySave=await page.evaluate(()=>Object.keys(localStorage).length);
  expect(emptySave).toBe(0);
  await page.locator('[data-action="lab-close"]').click();
  await page.locator('[data-action="create"]').click();
  await expect(page.locator('.club-command')).toBeVisible();
  await page.screenshot({path:'ux-screenshots/direccion-'+width+'.png',fullPage:true});
  await page.locator('[data-nav="lab"]').click();
  await expect(page.locator('.balance-lab')).toBeVisible();
  await page.locator('[data-nav="match"]').click();
  await page.locator('[data-action="demo-start"]').click();
  await expect(page.locator('.match-center-stage')).toBeVisible();
  await expect(page.getByText('Minimapa táctico')).toBeVisible();
  await page.locator('[data-action="replay-next"]').click();
  await page.locator('[data-action="replay-next"]').click();
  await page.locator('[data-action="replay-prev"]').click();
  await page.locator('[data-action="replay-filter"][data-kind="combat"]').click();
  await page.locator('[data-action="match-toggle-roster"]').click();
  await expect(page.locator('[data-action="match-toggle-roster"]')).toHaveAttribute('aria-expanded','true');
  await page.screenshot({path:'ux-screenshots/match-'+width+'.png',fullPage:true});
  const viewportOverflow=await page.evaluate(()=>({
   width:document.documentElement.scrollWidth,viewport:innerWidth,
   main:document.querySelector('main')?.scrollWidth,
   inner:document.querySelector('main')?.clientWidth
  }));
  expect(viewportOverflow.width).toBeLessThanOrEqual(width+2);
  expect(errors).toEqual([]);
  await context.close();
 });
}

test('Portada principal de Rift Director abre el juego de cartas (sin activar el manager)',async({page})=>{
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8080/');
 await expect(page).toHaveTitle(/Juego de cartas táctico/);
 await expect(page.locator('.intro')).toBeVisible();
 await expect(page.locator('#card-game-app')).toBeVisible();
 await expect(page.locator('#app')).toHaveCount(0);
 await expect(page.locator('[data-setup="bot"]')).toBeVisible();
 await expect(page.locator('a[href="./deck-builder.html"]')).toBeVisible();
 await expect(page.locator('a[href="./collection.html"]')).toBeVisible();
 expect(errors).toEqual([]);
});
test('El simulador MOBA se conserva en su página de archivo',async({page})=>{
 await page.goto('http://127.0.0.1:8080/legacy-moba.html');
 await expect(page.locator('.welcome')).toBeVisible();
 await expect(page.locator('#app')).toHaveCount(1);
 await expect(page.locator('#card-game-app')).toHaveCount(0);
});
