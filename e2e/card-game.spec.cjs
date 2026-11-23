const {test,expect}=require('@playwright/test');
const {mkdirSync}=require('node:fs');
mkdirSync('ux-screenshots',{recursive:true});
const url='http://127.0.0.1:8080/card-game.html';

for(const width of [360,768,1440]){
  test('Card Game v0.8.2: bot, tablero y jugadas a '+width+'px',async({browser})=>{
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);
    await expect(page.locator('.intro')).toBeVisible();
    await page.locator('[data-setup="bot"]').click();
    await expect(page.getByText('Sorteo inicial')).toBeVisible();
    await page.locator('[data-first]').first().click();
    await expect(page.locator('.field')).toBeVisible();
    await expect(page.locator('.lanes')).toHaveCount(2);
    await expect(page.locator('.tactic')).toHaveCount(6);
    await page.screenshot({path:'ux-screenshots/card-game-board-'+width+'.png',fullPage:true});
    await page.locator('.unit:not(.enemy)').first().click();
    await expect(page.locator('[data-order="SWAP_RANK"]')).toBeVisible();
    await page.locator('[data-order="SWAP_RANK"]').click();
    await expect(page.locator('.logline')).not.toHaveCount(0);
    await page.locator('[data-act="pass"]').click();
    await expect(page.getByText('Ronda 2',{exact:true})).toBeVisible();
    await page.screenshot({path:'ux-screenshots/card-game-round2-'+width+'.png',fullPage:true});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflow).toBeLessThanOrEqual(3);
    expect(errors).toEqual([]);
    await context.close();
  });
}
test('Card Game v0.8.2: hotseat oculta la mano rival al pasar',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-setup="hotseat"]').click();
  await page.locator('[data-first]').first().click();
  const reveal=page.locator('[data-act="reveal"]');
  if(await reveal.count())await reveal.click();
  await page.locator('[data-act="pass"]').click();
  await expect(page.locator('.pass-screen')).toBeVisible();
  await page.locator('[data-act="reveal"]').click();
  await expect(page.locator('.pass-screen')).toHaveCount(0);
  await expect(page.locator('.tactic')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('Card Game v0.8.2: el Latido aparece en la zona neutral desde R4',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.locator('[data-setup="bot"]').click();
 await page.locator('[data-first]').first().click();
 await expect(page.locator('.objective-tile')).toHaveCount(2);
 await expect(page.locator('[data-objective="minor"]')).toBeDisabled();
 for(let i=0;i<3;i++) await page.locator('[data-act="pass"]').click();
 await expect(page.getByText('Ronda 4',{exact:true})).toBeVisible();
 await expect(page.locator('[data-objective="minor"]')).toBeEnabled();
 await page.locator('[data-objective="minor"]').click();
 await expect(page.getByText('Para disputar este objetivo',{exact:false})).toBeVisible();
 await page.screenshot({path:'ux-screenshots/card-game-neutral-390.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(3);
 expect(errors).toEqual([]);
 await context.close();
});
