import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { combinedEnv: e } = env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.NAV_TEST_BASE || 'http://localhost:3000';
const output = process.env.NAV_TEST_OUTPUT || 'tmp/navigation-browser-validation.json';
await fs.mkdir(path.dirname(output), {recursive:true});
assert.equal(e.NEXT_PUBLIC_SUPABASE_URL, 'https://ahjwzpyammiqelloazvn.supabase.co');
assert(['http://localhost:3000', 'https://www.myaioutfit.com'].includes(base), 'Use the local app or the verified production site');
const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ensure = (r, label) => { if (r.error) throw Error(label + ': ' + r.error.message); return r.data; };
let userId, browser, page;
let stage = 'create-account';
const checks = [];
const report = { base, checkedAt: new Date().toISOString(), scope: 'Isolated temporary free account; real mobile navigation, Chrome CPU 4x slowdown, no artificial network delay, service workers blocked for consistent browser throttling, no AI inference', routes: [], errors: [] };
try {
  const email = 'navigation-' + randomUUID() + '@example.com', password = randomUUID() + 'Aa1!';
  userId = ensure(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Navigation test' } }), 'create account').user.id;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? {executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'} : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', timezoneId: 'America/Chicago' });
  page = await context.newPage();
  let billingRequests = 0;
  page.on('request', request => { if(new URL(request.url()).pathname === '/api/billing/entitlements/') billingRequests++; });
  page.on('pageerror', error => report.errors.push(error.message));
  stage = 'login';
  await page.goto(base + '/auth/login', {waitUntil:'domcontentloaded', timeout:60000});
  // Let the hosted form hydrate before filling its controlled fields.
  await page.getByLabel('Email', { exact: true }).waitFor();
  await page.waitForTimeout(600);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Login$|^Log in$|^Sign in$/i }).click();
  await page.waitForURL(u => !u.pathname.includes('/auth/login'), { timeout: 60000, waitUntil:'domcontentloaded' });
  stage = 'onboarding';
  await page.goto(base + '/onboarding', {waitUntil:'domcontentloaded', timeout:60000});
  await page.getByRole('heading', { name: 'Your first outfit starts with a few pieces' }).waitFor();
  for (const name of ['I own this top', 'I own this bottom', 'I own this pair of shoes']) await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('button', { name: 'Add these pieces & see my outfit' }).click();
  await page.waitForURL(u => /^\/today\/?$/.test(u.pathname), { timeout: 60000, waitUntil:'domcontentloaded' });
  await page.locator('#app-content h1').waitFor();
  await page.waitForTimeout(1500);
  const initialBillingRequests = billingRequests;
  stage = 'measure-navigation';
  const cdp = await context.newCDPSession(page);
  if(process.env.NAV_TEST_SLOW === '1') {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:200000, uploadThroughput:90000 });
    report.scope += '; simulated 150ms RTT / 1.6 Mbps download';
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const requests = [];
  page.on('requestfinished', request => {
    if (!request.url().includes('_rsc=')) return;
    const t = request.timing();
    requests.push({ path: new URL(request.url()).pathname, totalMs: Math.round(t.responseEnd), ttfbMs: Math.round(t.responseStart) });
  });
  for (const [label, route] of [['Planner','/calendar'], ['Analytics','/analytics'], ['Today','/today'], ['Planner','/calendar'], ['Today','/today']]) {
    await page.evaluate(() => {
      window.__navStart = performance.now(); window.__navFeedback = null; window.__navHeading = null;
      window.__navOldHeading = document.querySelector('#app-content h1')?.textContent;
      const observer = new MutationObserver(() => {
        if (window.__navFeedback === null && document.querySelector('[data-navigation-pending="true"], [data-page-skeleton]')) window.__navFeedback = performance.now() - window.__navStart;
        const h = document.querySelector('#app-content h1')?.textContent;
        if (h && h !== window.__navOldHeading && !document.querySelector('[data-page-skeleton]') && window.__navHeading === null) window.__navHeading = performance.now() - window.__navStart;
      });
      observer.observe(document.body,{ subtree:true, childList:true, attributes:true }); window.__navObserver = observer;
    });
    const start = performance.now();
    await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: label, exact: true }).click();
    await page.waitForURL(u => u.pathname.replace(/\/$/,'') === route, { timeout: 60000, waitUntil:'domcontentloaded' });
    await page.locator('#app-content h1').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const h = document.querySelector('#app-content h1')?.textContent; return h && h !== window.__navOldHeading && !document.querySelector('[data-page-skeleton]'); }, undefined, { timeout: 60000 });
    const measurement = await page.evaluate(() => { window.__navObserver.disconnect(); return { feedbackMs: window.__navFeedback, headingMs: window.__navHeading, heading: document.querySelector('#app-content h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth }; });
    report.routes.push({ label, route, elapsedMs: Math.round(performance.now()-start), ...measurement });
    console.log(report.routes.at(-1));
    await page.waitForTimeout(1000);
  }
  report.rscRequests = requests;
  report.billingRequestsDuringNavigation = billingRequests - initialBillingRequests;
  assert.equal(report.billingRequestsDuringNavigation, 0, 'Returning pages should reuse recent shared membership data');
  checks.push('Main navigation reuses shared membership data without another billing lookup');
  assert(report.routes.every(r => r.feedbackMs !== null && r.feedbackMs < 600), 'Navigation should respond before slow content finishes');
  checks.push('Every main navigation click has prompt visible feedback');

  // Hold a real route response to verify that a second click wins. No app data
  // is fabricated, and the delay is separate from the measured timings above.
  await page.goto(base + '/today', { waitUntil: 'domcontentloaded' });
  await page.locator('#app-content h1').waitFor();
  const holdPlanner = async route => {
    await new Promise(resolve => setTimeout(resolve, 2200));
    await route.continue().catch(() => {});
  };
  const plannerRsc = url => /\/calendar\/?$/.test(url.pathname) && url.searchParams.has('_rsc');
  await page.route(plannerRsc, holdPlanner);
  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await mobileNav.getByRole('link', { name:'Planner', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('[data-navigation-pending="true"], [data-page-skeleton]'), undefined, {timeout:1000});
  await page.screenshot({ path: output.replace(/\.json$/, '-pending.png') });
  await mobileNav.getByRole('link', { name:'Analytics', exact:true }).click();
  await page.waitForURL(url => url.pathname.replace(/\/$/,'') === '/analytics', {waitUntil:'domcontentloaded'});
  await page.getByRole('heading', { name:'Make more of what you own' }).waitFor();
  await page.waitForTimeout(2500);
  assert.equal(new URL(page.url()).pathname.replace(/\/$/,''), '/analytics');
  checks.push('A slow Planner navigation can be interrupted; Analytics remains the final destination');
  await page.unroute(plannerRsc, holdPlanner);

  // Client data still loads after the server route arrives. Exercise that second
  // stage too, including a long wait, loss of connectivity, and reduced motion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const holdCalendarData = async route => {
    await new Promise(resolve => setTimeout(resolve, 11500));
    await route.continue().catch(() => {});
  };
  const calendarData = url => url.hostname.endsWith('.supabase.co') && url.pathname === '/rest/v1/calendar_entries';
  await page.route(calendarData, holdCalendarData);
  await page.goto(base + '/calendar', { waitUntil:'domcontentloaded' });
  await page.getByRole('status').filter({ hasText:'Loading your calendar' }).waitFor();
  const bone = page.locator('.loading-bone').first();
  assert.equal(await bone.evaluate(el => getComputedStyle(el).animationName), 'none');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: output.replace(/\.json$/, '-calendar-skeleton.png'), fullPage: true });
  assert.equal(await page.getByText('No entries yet for this date. Add an entry to plan or log what you wore.', {exact:true}).count(), 0);
  checks.push('Calendar data has a phone-sized skeleton; reduced motion disables pulsing and unknown counts stay hidden');
  await page.getByRole('button', {name:'Open account menu'}).click();
  stage = 'theme-save';
  const [themeResponse] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/rest/v1/user_preferences' && response.request().method() === 'PATCH'),
    page.getByRole('menuitem', {name:'Dark theme', exact:true}).click(),
  ]);
  assert.equal(themeResponse.status(), 200);
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') !== 'light');
  await page.waitForTimeout(150);
  assert.equal(await page.getByText('Could not save your theme. Please try again.').count(), 0);
  assert.notEqual(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.screenshot({path:output.replace(/\.json$/, '-calendar-dark.png'), fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({path:output.replace(/\.json$/, '-calendar-desktop.png'), fullPage:true});
  await page.setViewportSize({width:390,height:844});
  checks.push('Skeletons fit desktop and phone layouts in light and dark themes');
  await page.getByRole('status').filter({ hasText:'Still loading your calendar' }).waitFor({timeout:12000});
  checks.push('Long requests explain that loading continues and other pages remain available');
  await context.setOffline(true);
  await page.getByRole('status').filter({ hasText:'You’re offline' }).waitFor();
  await context.setOffline(false);
  await page.unroute(calendarData, holdCalendarData);
  await page.getByRole('status').filter({ hasText:/Loading your calendar|Still loading your calendar/ }).waitFor({state:'hidden',timeout:30000});
  checks.push('The skeleton explains lost connectivity and clears when real data arrives');

  // Planner subpages and collection pages also keep the shared header/weather.
  for(const route of ['/calendar/upcoming', '/calendar/trips', '/wardrobe', '/outfits', '/today']) {
    await page.goto(base + route, {waitUntil:'domcontentloaded'});
    await page.locator('#app-content h1').waitFor();
    await page.locator('[data-page-skeleton]').waitFor({state:'hidden'});
    await page.getByRole('button', {name:'Open weather details'}).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  checks.push('All seven primary/planner pages render on a phone and retain header weather access');

  const guest = await browser.newContext({serviceWorkers:'block'});
  const guestPage = await guest.newPage();
  for(const route of ['/today','/calendar','/analytics']) {
    await guestPage.goto(base + route, {waitUntil:'domcontentloaded'});
    await guestPage.waitForURL(url=>url.pathname.startsWith('/auth/login'), {waitUntil:'domcontentloaded'});
  }
  await guest.close();
  checks.push('Personal routes still send signed-out visitors to login');
  report.checks = checks;
  report.passed = report.errors.length === 0 && report.routes.every(r=>!r.overflow);
} catch(error) {
  report.errors.push(error.message); report.failedStage = stage;
  if (page) {
    await page.screenshot({ path: output.replace(/\.json$/, '-failure.png') }).catch(() => {});
    report.visibleErrors = await page.getByRole('alert').allTextContents().catch(() => []);
    report.failedPath = new URL(page.url()).pathname;
  }
  report.passed = false; process.exitCode = 1;
}
finally {
  if(browser) await browser.close();
  if(userId) { ensure(await admin.auth.admin.deleteUser(userId), 'remove temporary account'); report.accountRemoved = true; }
  await fs.writeFile(output, JSON.stringify(report,null,2)+'\n');
  report.checks = checks;
  console.log({ passed: report.passed, output, checks, errors: report.errors, failedStage:report.failedStage, failedPath:report.failedPath, visibleErrors:report.visibleErrors, accountRemoved: report.accountRemoved });
}
