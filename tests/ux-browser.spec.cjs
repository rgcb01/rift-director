const {test,expect}=require('@playwright/test');
const {mkdirSync}=require('node:fs');
const widths=[360,768,1440];
const root='http://127.0.0.1:8080/';
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
