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

for(const width of [390,1280]){
 test('Card Game v0.8.3: editor, mazo guardado y partida personalizada a '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/deck-builder.html');
  await expect(page.locator('.db-card')).toHaveCount(36);
  await expect(page.locator('.db-slot')).toHaveCount(5);
  await expect(page.locator('[data-action="play"]')).toBeEnabled();
  await page.screenshot({path:'ux-screenshots/card-game-builder-'+width+'.png',fullPage:true});
  await page.locator('[data-slot="0"]').click();
  await page.locator('[data-hero="hero-vanguardia"]').click();
  await expect(page.locator('[data-slot="0"]')).toContainText('Vanguardia');
  await page.locator('#deck-name').fill('Mi mazo Vanguardia');
  await page.locator('[data-action="save"]').click();
  await expect(page.getByRole('status')).toContainText('guardado');
  await page.locator('[data-action="play"]').click();
  await expect(page).toHaveURL(/card-game\.html$/);
  await expect(page.locator('[data-deck-side="0"]')).toContainText('Mi mazo Vanguardia');
  await page.locator('[data-setup="bot"]').click();
  await page.locator('[data-first]').first().click();
  await expect(page.locator('.field')).toBeVisible();
  await expect(page.locator('.side-banner:not(.enemy)').first()).toContainText('Mi mazo Vanguardia');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
  await context.close();
 });
}
test('Card Game v0.8.3: no permite jugar un mazo incompleto',async({page})=>{
 await page.goto('http://127.0.0.1:8080/deck-builder.html');
 await page.locator('[data-action="empty"]').click();
 await expect(page.locator('[data-action="play"]')).toBeDisabled();
 await expect(page.getByText('exactamente 20 cartas tácticas',{exact:false})).toBeVisible();
 await page.locator('[data-action="save"]').click();
 await expect(page.getByRole('status')).toContainText('guardado');
 await expect(page.locator('#db-saved-select option')).toHaveCount(2);
});

test('Card Game v0.8.4: seleccionar dificultad y estrategia del bot',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await expect(page.locator('[data-ai="difficulty"]')).toBeVisible();
 await page.locator('[data-ai="difficulty"]').selectOption('director');
 await page.locator('[data-ai="style"]').selectOption('control');
 await expect(page.locator('[data-ai="difficulty"]')).toHaveValue('director');
 await expect(page.locator('[data-ai="style"]')).toHaveValue('control');
 await page.locator('[data-setup="bot"]').click();
 await page.locator('[data-first]').first().click();
 await expect(page.locator('.field')).toBeVisible();
 await expect(page.getByText('IA Director · Control',{exact:false})).toBeVisible();
 await page.screenshot({path:'ux-screenshots/card-game-ai-390.png',fullPage:true});
 await page.locator('[data-act="pass"]').click();
 await expect(page.getByText('Ronda 2',{exact:true})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(3);
 expect(errors).toEqual([]);
 await context.close();
});

for(const width of [390,1280]){
 test('Card Game v0.9.0: abrir sobre, revelar cartas y conservar colección a '+width+' px',async({browser})=>{
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:8080/collection.html');
   await expect(page.locator('.cc-card')).toHaveCount(56);
   await expect(page.locator('[data-action="open"]')).toBeEnabled();
   await expect(page.getByText('200',{exact:false}).first()).toBeVisible();
   await page.screenshot({path:'ux-screenshots/card-game-collection-'+width+'.png',fullPage:true});
   await page.locator('[data-action="open"]').click();
   await expect(page.locator('.cc-reveal-card')).toBeVisible();
   await expect(page.locator('.cc-reveal-counter')).toContainText('1 de 5');
   await page.locator('[data-action="reveal"]').click();
   await expect(page.locator('.cc-reveal-counter')).toContainText('2 de 5');
   await page.locator('[data-action="skip"]').click();
   await expect(page.getByText('Cinco cartas reveladas',{exact:false})).toBeVisible();
   await page.locator('[data-action="finish"]').click();
   await expect(page.locator('.cc-card')).toHaveCount(56);
   await page.reload();
   await expect(page.locator('.cc-stat').last()).toContainText('1');
   await expect(page.locator('[data-action="open"]')).toBeEnabled();
   await page.screenshot({path:'ux-screenshots/card-game-opened-'+width+'.png',fullPage:true});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   expect(overflow).toBeLessThanOrEqual(3);
   expect(errors).toEqual([]);
   await context.close();
 });
}
test('Card Game v0.9.0: el constructor bloquea cartas no obtenidas sin borrar los mazos iniciales',async({page})=>{
 await page.goto('http://127.0.0.1:8080/deck-builder.html');
 await expect(page.locator('[data-action="play"]')).toBeEnabled();
 await expect(page.locator('[data-catalog-card="great-convergence"] [data-add]')).toBeDisabled();
 await expect(page.locator('[data-hero="hero-ancla"]')).toBeDisabled();
 await page.locator('[data-template="jungle"]').click();
 await expect(page.locator('[data-action="play"]')).toBeEnabled();
 await page.locator('[data-action="play"]').click();
 await expect(page).toHaveURL(/card-game\.html$/);
});

for(const width of [360,390,430]){
 test('Card Game v0.9.1: carriles enfocados y mano inferior a '+width+'px',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-setup="bot"]').click();
  await page.locator('[data-first]').first().click();
  await expect(page.locator('.lane-navigator')).toBeVisible();
  await expect(page.locator('[data-focus-lane]')).toHaveCount(3);
  await expect(page.locator('[data-focus-lane="MID"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.lane:visible')).toHaveCount(2);
  await expect(page.locator('.lane:visible')).toHaveAttribute('data-lane-column','MID');
  await page.locator('[data-focus-lane="TOP"]').click();
  await expect(page.locator('[data-focus-lane="TOP"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.lane:visible')).toHaveAttribute('data-lane-column','TOP');
  await expect(page.locator('.hand-panel')).toBeVisible();
  await expect(page.locator('[data-act="toggle-hand"]')).toBeVisible();
  await page.locator('[data-act="toggle-hand"]').click();
  await expect(page.locator('.hand-panel')).toHaveClass(/is-collapsed/);
  await page.locator('[data-act="toggle-hand"]').click();
  await expect(page.locator('.hand-panel')).not.toHaveClass(/is-collapsed/);
  await page.screenshot({path:'ux-screenshots/card-game-mobile-focus-'+width+'.png',fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(3);
  const font=await page.locator('.lane.focus-active .unit b').first().evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize));
  expect(font).toBeGreaterThanOrEqual(12);
  expect(errors).toEqual([]);
  await context.close();
 });
}
test('Card Game v0.9.1: carta seleccionada muestra descripción y conserva la selección al cambiar de carril',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(url);
 await page.locator('[data-setup="bot"]').click();
 await page.locator('[data-first]').first().click();
 const uid=await page.locator('.tactic:not([disabled])').evaluateAll(nodes=>{
  const card=nodes.find(el=>!['⚡','✦'].includes(el.querySelector('.art')?.textContent?.trim()));
  return card?.getAttribute('data-card')||null;
 });
 expect(uid).toBeTruthy();
 await page.locator('[data-card="'+uid+'"]').click();
 await expect(page.locator('.selected-card-detail')).toBeVisible();
 await expect(page.locator('.hand-panel')).toHaveClass(/is-collapsed/);
 await page.locator('[data-focus-lane="BOT"]').click();
 await expect(page.locator('.selected-card-detail')).toBeVisible();
 await expect(page.locator('.lane:visible')).toHaveAttribute('data-lane-column','BOT');
 await page.locator('[data-act="cancel"]').click();
 await expect(page.locator('.selected-card-detail')).toHaveCount(0);
 await expect(page.locator('.hand-panel')).not.toHaveClass(/is-collapsed/);
});
test('Card Game v0.9.1: escritorio conserva tres carriles completos',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto(url);
 await page.locator('[data-setup="bot"]').click();
 await page.locator('[data-first]').first().click();
 await expect(page.locator('.lane-navigator')).toBeHidden();
 await expect(page.locator('.lane:visible')).toHaveCount(6);
 await expect(page.locator('.hand-panel')).not.toHaveCSS('position','fixed');
});
