import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {createClient} from '@supabase/supabase-js';
const {combinedEnv:e}=env.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.MOBILE_TEST_BASE || 'http://localhost:3000';
assert(['http://localhost:3000','https://www.myaioutfit.com'].includes(base));
assert.equal(e.NEXT_PUBLIC_SUPABASE_URL,'https://ahjwzpyammiqelloazvn.supabase.co');
const output=process.env.MOBILE_TEST_OUTPUT || 'tmp/mobile-access-browser';
await fs.mkdir(output,{recursive:true});
const admin=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ensure=(r,label)=>{if(r.error)throw Error(label+': '+r.error.message);return r.data;};
const checks=[],errors=[];let userId,browser,page;
const check=name=>{checks.push(name);console.log({passed:name});};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const forecast=Array.from({length:7},(_,i)=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+i);return{date:date.toISOString().slice(0,10),temperature:{high:71-i,low:53-i},condition:i%2?'overcast clouds':'few clouds',icon:'02d',precipitationProbability:[.01,0,.2,.45,.15,0,.1][i]};});
try{
 const email='mobile-access-'+randomUUID()+'@example.com',password=randomUUID()+'Aa1!';
 userId=ensure(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{first_name:'Mobile QA'}}),'create account').user.id;
 await fs.writeFile(output+'/test-account.json',JSON.stringify({id:userId}));
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
 browser=await chromium.launch({headless:true,...(process.platform==='darwin'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',permissions:['geolocation'],geolocation:{latitude:33.2148,longitude:-97.1331},timezoneId:'America/Chicago'});
 // Deterministic weather verifies presentation only. Authentication, memberships,
 // analytics, wardrobe, saved outfits, and history use real isolated account data.
 await context.route(url=>url.pathname.replace(/\/$/,'')==='/api/weather',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({current:{temperature:53,feelsLike:52,windSpeed:11,humidity:84,condition:'overcast clouds',icon:'04d'},forecast,timezone:'America/Chicago'})}));
 await context.route(url=>url.pathname.replace(/\/$/,'')==='/api/geocode',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({best:{name:'Denton County',state:'Texas',country:'US',label:'Denton County, Texas, US'}})}));
 page=await context.newPage();page.on('pageerror',err=>errors.push(err.message));
 let aiWrites=0;page.on('request',r=>{const p=new URL(r.url()).pathname;if(r.method()==='POST'&&/\/api\/(?:ai|assistant\/chat|today\/ai-outfit)/.test(p))aiWrites++;});
 await page.goto(base+'/auth/login',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Email',{exact:true}).waitFor();await page.waitForTimeout(600);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:/^Login$|^Log in$|^Sign in$/i}).click();await page.waitForURL(u=>!u.pathname.includes('/auth/login'),{waitUntil:'domcontentloaded'});
 await page.goto(base+'/onboarding',{waitUntil:'domcontentloaded'});
 for(const name of ['I own this top','I own this bottom','I own this pair of shoes'])await page.getByRole('checkbox',{name,exact:true}).check();
 await page.getByRole('button',{name:'Add these pieces & see my outfit'}).click();await page.waitForURL(u=>/^\/today\/?$/.test(u.pathname),{waitUntil:'domcontentloaded'});
 const items=ensure(await admin.from('wardrobe_items').select('*').eq('user_id',userId).order('created_at'),'read test pieces');assert.equal(items.length,3);
 ensure(await admin.from('wardrobe_items').update({purchase_price:60,purchase_currency:'USD'}).eq('id',items[0].id),'set test price');
 await page.getByRole('button',{name:'Wear this today',exact:true}).waitFor();await page.getByRole('button',{name:'Wear this today',exact:true}).click();await page.getByRole('button',{name:/Worn today$/}).waitFor();
 const outfit=ensure(await admin.from('outfits').insert({user_id:userId,name:'Easy day · outfit layout check',tuck_style:'Untucked',score:70,source:'generated'}).select('id').single(),'create test outfit');
 ensure(await admin.from('outfit_items').insert(items.map(item=>({outfit_id:outfit.id,item_id:item.id,category_id:item.category_id}))),'add outfit pieces');
 check('Real Free account, confirmed clothing, wear history, price, and saved outfit are ready');
 const evening=page.getByRole('button',{name:/Show a going-out look/});assert(await evening.isEnabled());await evening.click();
 const upgrade=page.getByRole('dialog',{name:'More looks for your plans'});await upgrade.getByRole('heading',{name:'Dress for your next night out'}).waitFor();
 assert.equal((await upgrade.getByRole('link',{name:'Compare Plus & Pro'}).getAttribute('href')).replace(/\/$/,''),'/settings/billing');
 const close=upgrade.getByRole('button',{name:'Close More looks for your plans'});
 const centered=await close.evaluate(button=>{const b=button.getBoundingClientRect(),s=button.querySelector('svg').getBoundingClientRect();return Math.abs((b.left+b.width/2)-(s.left+s.width/2))<1&&Math.abs((b.top+b.height/2)-(s.top+s.height/2))<1;});assert(centered);
 await page.screenshot({path:output+'/evening-unlock-mobile.png'});await close.click();
 check('Locked occasion is clearly labelled and opens benefits, plan CTA, and a centered close control');
 ensure(await admin.from('usage_counters').insert({user_id:userId,metric_key:'ai_today_ai_trial_lifetime',period_key:'lifetime',period_start_at:'2000-01-01T00:00:00Z',period_end_at:'2100-01-01T00:00:00Z',count:1}),'seed used trial');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#app-content summary:visible').filter({hasText:'Create a tailored AI outfit'}).click();
 const unlock=page.getByRole('button',{name:'Upgrade for AI',exact:true});await unlock.waitFor();await unlock.click();
 await page.getByRole('heading',{name:'Get an outfit tailored to your plans'}).waitFor();await page.getByRole('button',{name:'Close More looks for your plans'}).click();
 check('An exhausted free AI trial opens a benefit explanation without starting inference');
 await page.getByRole('button',{name:'Open weather details'}).click();const weather=page.getByRole('dialog',{name:'Your weather'});
 await weather.getByRole('region',{name:'Daily forecast'}).waitFor();assert.equal(await weather.locator('.weather-outlook-row').count(),7);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:width>700?1000:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await weather.evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.screenshot({path:output+`/weather-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await weather.getByRole('button',{name:'Close Your weather'}).click();
 await page.getByRole('button',{name:'Open account menu'}).click();
 const [themeSaved]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/user_preferences'&&r.request().method()==='PATCH'),page.getByRole('menuitem',{name:'Dark theme',exact:true}).click()]);assert.equal(themeSaved.status(),200);
 await page.waitForFunction(()=>document.documentElement.getAttribute('data-theme')!=='light');
 await page.getByRole('button',{name:'Open weather details'}).click();await page.screenshot({path:output+'/weather-390-dark.png'});await weather.getByRole('button',{name:'Close Your weather'}).click();
 check('Seven-day forecast rows, rain, temperature ranges, and modal scrolling fit phone, tablet, and desktop');
 await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'Analytics',exact:true}).click();
 const titles={'Overview':'Your wardrobe at a glance','Clothing':'A closer look at your clothing','Wear history':'Your recent wears','Cost per wear':'Start with a purchase price'};
 for(const [tab,title]of Object.entries(titles)){
  await page.getByRole('tab',{name:tab,exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();
  assert(await page.getByRole('button',{name:'See benefits',exact:true}).isVisible());await page.getByRole('button',{name:'See benefits',exact:true}).click();await page.getByRole('dialog',{name:'More insights from your wardrobe'}).getByRole('link',{name:'Compare Plus & Pro'}).waitFor();await page.getByRole('button',{name:'Close More insights from your wardrobe'}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/analytics-free-'+tab.toLowerCase().replaceAll(' ','-')+'.png',fullPage:true});
 }
 check('Every Free analytics tab has distinct real basics or an explicitly labelled example and a relevant plan CTA');
 await page.goto(base+'/outfits/'+outfit.id,{waitUntil:'domcontentloaded'});const details=page.locator('.outfit-metadata'),preview=page.locator('.outfit-view-preview');
 await details.waitFor();assert(await preview.evaluate((el)=>!!(el.compareDocumentPosition(document.querySelector('.outfit-metadata'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 assert((await details.boundingBox()).height<300);await page.screenshot({path:output+'/outfit-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('heading',{name:'Edit Outfit',exact:true}).waitFor();
 check('Outfit preview precedes a compact summary in visual and reading order, and edit mode still opens');
 await page.goto(base+'/today',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Show a going-out look/}).waitFor();
 const assistant=page.getByRole('button',{name:'Ask Sebastian',exact:true});await assistant.click();await page.getByRole('dialog',{name:'Ask Sebastian'}).getByRole('heading',{name:'Talk through what to wear'}).waitFor();await page.getByRole('button',{name:'Close Ask Sebastian'}).click();
 check('Free Sebastian access explains the conversation benefit and available plans');
 ensure(await admin.from('wardrobe_items').insert(items.flatMap(item=>[1,2].map(i=>({user_id:userId,category_id:item.category_id,name:item.name+' · variant '+i,color:item.color,image_url:item.image_url,active:true,formality_score:5})))),'add isolated outfit variety');
 ensure(await admin.from('membership_access_grants').insert({user_id:userId,plan_code:'pro',reason:'Temporary browser acceptance test'}),'grant isolated Pro access');
 assert.equal(ensure(await admin.rpc('get_effective_plan_code_for_user',{p_user_id:userId})),'pro');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('.today-occasion[data-locked="true"]').length===0&&document.querySelector('.today-occasion')?.disabled===false);
 const paidEvening=page.getByRole('button',{name:/Show a going-out look/});await paidEvening.click();assert.equal(await paidEvening.getAttribute('aria-pressed'),'true');assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('button',{name:'Ask Sebastian',exact:true}).click();await page.getByRole('textbox',{name:'Message Sebastian'}).waitFor();await page.getByRole('button',{name:'Close Ask Sebastian'}).click();
 await page.goto(base+'/analytics',{waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'Clothing',exact:true}).click();await page.getByRole('heading',{name:'Every piece has a story'}).waitFor();assert.equal(await page.getByRole('link',{name:'Compare Plus & Pro'}).count(),0);
 await page.getByRole('tab',{name:'Cost per wear'}).click();await page.getByRole('heading',{name:'What each wear costs'}).waitFor();
 await page.goto(base+'/settings/billing',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Complimentary Pro access'}).waitFor();assert.equal(await page.getByRole('button',{name:/Choose Pro|Upgrade to Pro|Switch to Free/}).count(),0);
 check('Complimentary Pro survives normal billing synchronization and unlocks occasions, chat UI, full analytics, and a billing view without purchase prompts');
 assert.equal(aiWrites,0);const jobs=await admin.from('ai_jobs').select('id',{count:'exact',head:true}).eq('user_id',userId);assert.equal(jobs.error,null);assert.equal(jobs.count,0);assert.deepEqual(errors,[]);
}catch(error){errors.push(error.message);process.exitCode=1;if(page)await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});}
finally{
 if(browser)await browser.close();
 let removed=false;if(userId){ensure(await admin.auth.admin.deleteUser(userId),'delete test account');removed=true;await fs.rm(output+'/test-account.json',{force:true});}
 const result={checkedAt:new Date().toISOString(),base,passed:!process.exitCode,scope:'Real isolated account data and membership grant; deterministic weather fixture for layout checks. No AI inference, email, or Stripe writes.',checks,errors,accountRemoved:removed};await fs.writeFile(output+'/verification.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}
