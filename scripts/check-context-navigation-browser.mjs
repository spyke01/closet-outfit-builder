import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { combinedEnv: e } = env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.CONTEXT_TEST_BASE || 'http://localhost:3000';
assert(['http://localhost:3000', 'https://www.myaioutfit.com'].includes(base));
assert.equal(e.NEXT_PUBLIC_SUPABASE_URL, 'https://ahjwzpyammiqelloazvn.supabase.co');
const output = process.env.CONTEXT_TEST_OUTPUT || 'tmp/context-navigation-browser';
await fs.mkdir(output, { recursive: true });
const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ensure = (result, label) => { if (result.error) throw Error(`${label}: ${result.error.message}`); return result.data; };
const checks = [], errors = [], requests = [];
let userId, browser, page;
const check = name => { checks.push(name); console.log({ passed: name }); };
try {
  const email = `context-navigation-${randomUUID()}@example.com`, password = `${randomUUID()}Aa1!`;
  userId = ensure(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'UI QA' } }), 'create test account').user.id;
  await fs.writeFile(`${output}/test-account.json`, JSON.stringify({ id: userId }));
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block' });
  // Capture the actual chat request without invoking a paid model.
  await context.route(url => url.pathname.replace(/\/$/, '') === '/api/assistant/chat', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assistantMessage: `Test response ${requests.length}: keep the chosen piece.` }) });
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email', { exact: true }).waitFor(); await page.waitForTimeout(600);
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Login$|^Log in$|^Sign in$/i }).click();
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { waitUntil: 'domcontentloaded' });
  await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Your first outfit starts with a few pieces' }).waitFor(); await page.waitForTimeout(600);
  for (const name of ['I own this top', 'I own this bottom', 'I own this pair of shoes']) await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('button', { name: 'Add these pieces & see my outfit' }).click();
  await page.waitForURL(url => /^\/today\/?$/.test(url.pathname), { waitUntil: 'domcontentloaded' });
  const items = ensure(await admin.from('wardrobe_items').select('*').eq('user_id', userId), 'read test pieces');
  const chinos = items.find(item => /chinos/i.test(item.name)); assert(chinos);
  ensure(await admin.from('wardrobe_items').update({ name: 'Chinos', color: 'olive', brand: 'QA brand', material: 'Cotton' }).eq('id', chinos.id), 'identify olive piece');
  ensure(await admin.from('wardrobe_items').insert({ user_id: userId, category_id: chinos.category_id, name: 'Chinos', color: 'navy', image_url: chinos.image_url, active: true }), 'add similar piece');
  ensure(await admin.from('membership_access_grants').insert({ user_id: userId, plan_code: 'pro', reason: 'Temporary context and navigation browser acceptance test' }), 'grant test Pro access');
  ensure(await admin.from('user_preferences').update({ walkthrough_completed_at: new Date().toISOString() }).eq('user_id', userId), 'skip unrelated first-visit tour');
  await page.goto(`${base}/wardrobe`, { waitUntil: 'domcontentloaded' });
  let nav = page.getByRole('navigation', { name: 'Wardrobe tools', exact: true });
  await nav.getByRole('link', { name: 'My sizes', exact: true }).click();
  await page.waitForURL(url => /^\/sizes\/?$/.test(url.pathname));
  nav = page.getByRole('navigation', { name: 'Wardrobe tools', exact: true });
  assert.equal(await nav.getByRole('link', { name: 'My sizes', exact: true }).getAttribute('aria-current'), 'page');
  await page.getByRole('heading', { name: 'My Sizes', exact: true }).waitFor();
  await page.screenshot({ path: `${output}/my-sizes-mobile.png`, fullPage: true });
  await nav.getByRole('link', { name: 'Clothing', exact: true }).click();
  await page.waitForURL(url => /^\/wardrobe\/?$/.test(url.pathname));
  await nav.getByRole('link', { name: 'Add from the quick setup', exact: true }).click();
  await page.waitForURL(url => /^\/onboarding\/?$/.test(url.pathname));
  assert.equal(await nav.getByRole('link', { name: 'Add from the quick setup', exact: true }).getAttribute('aria-current'), 'page');
  await page.getByRole('button', { name: 'Set up more of my wardrobe ↗' }).click();
  assert(await nav.getByRole('link', { name: 'Clothing', exact: true }).isVisible());
  await nav.getByRole('link', { name: 'Clothing', exact: true }).click();
  await page.waitForURL(url => /^\/wardrobe\/?$/.test(url.pathname));
  check('Wardrobe, My sizes, and both setup modes keep a visible Clothing return link and current-page indication');
  await page.goto(`${base}/analytics`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Clothing', exact: true }).click();
  await page.getByRole('heading', { name: 'Every piece has a story' }).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
    for (const name of ['Time period', 'Filter clothing category', 'Sort clothing analytics']) {
      const select = page.getByRole('combobox', { name });
      const geometry = await select.evaluate(element => {
        const style = getComputedStyle(element), box = element.getBoundingClientRect(), caret = element.parentElement.querySelector('svg').getBoundingClientRect();
        return { appearance: style.appearance, padding: parseFloat(style.paddingRight), inset: box.right - caret.right, offsetY: Math.abs(box.y + box.height / 2 - caret.y - caret.height / 2) };
      });
      assert.equal(geometry.appearance, 'none'); assert(geometry.padding >= 40); assert(geometry.inset >= 11 && geometry.inset <= 13); assert(geometry.offsetY < 1);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/analytics-dropdowns-${width}.png`, fullPage: true });
  }
  await page.getByRole('combobox', { name: 'Time period' }).selectOption('all');
  await page.getByRole('combobox', { name: 'Filter clothing category' }).selectOption({ label: 'Pants' });
  await page.getByRole('combobox', { name: 'Sort clothing analytics' }).selectOption('unworn');
  assert(await page.getByRole('button', { name: /Olive Chinos/ }).isVisible());
  check('All three native dropdowns retain working selection with 12px caret inset and 40px text padding at phone, tablet, and desktop widths');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Olive Chinos/ }).click();
  await page.getByRole('dialog', { name: 'Olive Chinos', exact: true }).getByRole('button', { name: 'Ask Sebastian', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Ask Sebastian', exact: true });
  await chat.getByRole('region', { name: 'Selected clothing piece' }).waitFor();
  assert((await chat.getByRole('textbox', { name: 'Message Sebastian' }).inputValue()).includes('Olive Chinos (Pants · QA brand · Cotton)'));
  await page.screenshot({ path: `${output}/sebastian-olive-piece-mobile.png`, fullPage: true });
  await chat.getByRole('button', { name: 'Send message' }).click(); await chat.getByText('Test response 1: keep the chosen piece.').waitFor();
  await chat.getByRole('textbox', { name: 'Message Sebastian' }).fill('Make this warmer.');
  await chat.getByRole('button', { name: 'Send message' }).click(); await chat.getByText('Test response 2: keep the chosen piece.').waitFor();
  assert.equal(requests.length, 2);
  for (const request of requests) { assert.equal(request.contextHints.focusItemId, chinos.id); assert.equal(request.imageUrl, undefined); }
  await chat.getByRole('button', { name: 'Stop building around this piece' }).click();
  await chat.getByRole('textbox', { name: 'Message Sebastian' }).fill('Help with another day.');
  await chat.getByRole('button', { name: 'Send message' }).click(); await chat.getByText('Test response 3: keep the chosen piece.').waitFor();
  assert.equal(requests[2].contextHints.focusItemId, undefined);
  check('Olive piece name, color, category, brand, photo, and material survive Analytics-to-chat; follow-ups retain its exact ID until explicitly cleared');
  const jobs = await admin.from('ai_jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  assert.equal(jobs.error, null); assert.equal(jobs.count, 0); assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.message); process.exitCode = 1;
  if (page) await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  if (browser) await browser.close();
  let removed = false;
  if (userId) { ensure(await admin.auth.admin.deleteUser(userId), 'delete test account'); removed = true; await fs.rm(`${output}/test-account.json`, { force: true }); }
  const result = { checkedAt: new Date().toISOString(), base, passed: !process.exitCode, scope: 'Real isolated account, wardrobe, analytics, sizes, and membership. Chat responses mocked to inspect payloads without paid inference. No email or Stripe writes.', checks, errors, accountRemoved: removed };
  await fs.writeFile(`${output}/verification.json`, `${JSON.stringify(result, null, 2)}\n`); console.log(result);
}
