import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { combinedEnv: e } = env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.BOARDS_TEST_BASE || 'http://localhost:3000';
assert(['http://localhost:3000', 'https://www.myaioutfit.com'].includes(base));
assert.equal(e.NEXT_PUBLIC_SUPABASE_URL, 'https://ahjwzpyammiqelloazvn.supabase.co');
const output = process.env.BOARDS_TEST_OUTPUT || 'tmp/sebastian-boards-browser';
await fs.mkdir(output, { recursive: true });
const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ensure = (r, label) => { if (r.error) throw Error(`${label}: ${r.error.message}`); return r.data; };
const checks = [], errors = [], users = [], storagePaths = [], chatRequests = [];
let browser, page;
const check = name => { checks.push(name); console.log({ passed: name }); };
const piece = row => ({ id: row.id, name: row.name, color: row.color, imageUrl: row.image_url, categoryId: row.category_id, category: row.category?.name || 'Clothing' });
try {
  const email = `outfit-board-${randomUUID()}@example.com`, password = `${randomUUID()}Aa1!`;
  const userId = ensure(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Board QA' } }), 'create test account').user.id; users.push(userId);
  await fs.writeFile(`${output}/test-accounts.json`, JSON.stringify(users));
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block' });
  page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email', { exact: true }).waitFor(); await page.waitForTimeout(600);
  await page.getByLabel('Email', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Login$|^Log in$|^Sign in$/i }).click(); await page.waitForURL(url => !url.pathname.includes('/auth/login'), { waitUntil: 'domcontentloaded' });
  await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Your first outfit starts with a few pieces' }).waitFor(); await page.waitForTimeout(600);
  for (const name of ['I own this top', 'I own this bottom', 'I own this pair of shoes']) await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('button', { name: 'Add these pieces & see my outfit' }).click(); await page.waitForURL(url => /^\/today\/?$/.test(url.pathname));
  const initial = ensure(await admin.from('wardrobe_items').select('*,category:categories(name)').eq('user_id', userId), 'read pieces');
  const pants = initial.find(item => /chinos/i.test(item.name)), shirt = initial.find(item => item.category.name === 'Shirt'); assert(pants && shirt);
  const photoPath = `${userId}/qa-owned-shirt.png`;
  ensure(await admin.storage.from('wardrobe-private-images').upload(photoPath, await fs.readFile('public/images/wardrobe/ocbd-navy copy.png'), { contentType: 'image/png' }), 'upload private test photo'); storagePaths.push(photoPath);
  shirt.image_url = `/api/clothing-images/${photoPath}`;
  ensure(await admin.from('wardrobe_items').update({ image_url: shirt.image_url }).eq('id', shirt.id), 'use private photo');
  pants.name = 'Chinos'; pants.color = 'olive';
  ensure(await admin.from('wardrobe_items').update({ name: pants.name, color: pants.color }).eq('id', pants.id), 'identify anchor');
  const addedCategories = ensure(await admin.from('categories').insert(['Jacket', 'Belt', 'Watch', 'Undershirt'].map(name => ({ user_id: userId, name }))).select('*'), 'create accessory categories');
  const extra = ensure(await admin.from('wardrobe_items').insert(addedCategories.map(category => ({ user_id: userId, category_id: category.id, name: category.name, color: 'black', active: true, image_url: null }))).select('*,category:categories(name)'), 'add layers and accessories');
  const replacement = ensure(await admin.from('wardrobe_items').insert({ user_id: userId, category_id: shirt.category_id, name: 'Oxford', color: 'white', active: true, image_url: shirt.image_url }).select('*,category:categories(name)').single(), 'create swap');
  const archived = ensure(await admin.from('wardrobe_items').insert({ user_id: userId, category_id: shirt.category_id, name: 'Archived shirt', active: false }).select('id').single(), 'create archived fixture');
  const foreignId = ensure(await admin.auth.admin.createUser({ email: `board-other-${randomUUID()}@example.com`, password: `${randomUUID()}Aa1!`, email_confirm: true }), 'create second account').user.id; users.push(foreignId);
  await fs.writeFile(`${output}/test-accounts.json`, JSON.stringify(users));
  const foreignCategory = ensure(await admin.from('categories').insert({ user_id: foreignId, name: 'Private category' }).select('id').single(), 'other category');
  const foreign = ensure(await admin.from('wardrobe_items').insert({ user_id: foreignId, category_id: foreignCategory.id, name: 'Other account private piece', active: true, image_url: '/private-other-photo.jpg' }).select('id').single(), 'other account clothing');
  ensure(await admin.from('membership_access_grants').insert({ user_id: userId, plan_code: 'pro', reason: 'Temporary outfit-board acceptance test' }), 'grant test Pro');
  ensure(await admin.from('user_preferences').update({ walkthrough_completed_at: new Date().toISOString() }).eq('user_id', userId), 'skip tour');
  const items = [...initial, ...extra];
  const thread = ensure(await admin.from('assistant_threads').insert({ user_id: userId, title: 'Photo board test' }).select('id').single(), 'create conversation');
  const records = [
    { id: 'fixture:1', title: 'Everyday layers', itemIds: items.map(item => item.id), focusItemId: pants.id },
    { id: 'fixture:2', title: 'Must not show foreign photo', itemIds: [pants.id, foreign.id] },
    { id: 'fixture:3', title: 'Must not show archived photo', itemIds: [pants.id, archived.id] },
  ];
  ensure(await admin.from('assistant_messages').insert({ user_id: userId, thread_id: thread.id, role: 'assistant', content: 'Here is a complete look from your wardrobe.', metadata_json: { outfit_boards: records } }), 'seed structured suggestion');
  await page.evaluate(({ userId, id }) => sessionStorage.setItem(`sebastian-thread:${userId}`, id), { userId, id: thread.id });
  await page.goto(`${base}/analytics`, { waitUntil: 'domcontentloaded' }); await page.getByRole('tab', { name: 'Clothing', exact: true }).click();
  await page.getByRole('button', { name: /Olive Chinos/ }).click(); await page.getByRole('dialog', { name: 'Olive Chinos', exact: true }).getByRole('button', { name: 'Ask Sebastian', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Ask Sebastian', exact: true });
  await chat.getByRole('button', { name: 'View Everyday layers' }).waitFor();
  const loaded = await page.request.get(`${base}/api/assistant/threads/${thread.id}/`); assert.equal(loaded.status(), 200);
  const loadedText = await loaded.text(); assert(!loadedText.includes('private-other-photo')); assert(!loadedText.includes('Other account private piece'));
  assert.equal(JSON.parse(loadedText).messages[0].outfitBoards.length, 1);
  assert.equal((await page.request.get(`${base}/api/clothing-images/${photoPath}`)).status(), 200);
  assert.deepEqual((await (await page.request.get(`${base}/api/assistant/wardrobe-options/?categoryId=${foreignCategory.id}`)).json()).items, []);
  check('Conversation boards resolve current owned photos; foreign and archived suggestions are dropped completely, and swap options cannot expose another account');
  await chat.getByRole('button', { name: 'View Everyday layers' }).click();
  const board = page.getByRole('dialog', { name: 'Everyday layers', exact: true });
  assert.equal(await board.getByRole('article').count(), 7);
  assert(await board.getByText('No photo yet', { exact: true }).count() >= 4);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 700 ? 1000 : 844 });
    assert(await board.evaluate(el => el.scrollWidth <= el.clientWidth));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/board-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await board.getByRole('button', { name: new RegExp(`^Swap .*${shirt.name}$`) }).click();
  const swap = page.getByRole('dialog', { name: new RegExp(`^Swap .*${shirt.name}$`) });
  await swap.getByRole('button', { name: 'Use White Oxford', exact: true }).waitFor();
  await page.keyboard.press('Escape'); assert(await board.isVisible()); assert(await chat.isVisible());
  await board.getByRole('button', { name: new RegExp(`^Swap .*${shirt.name}$`) }).click();
  await swap.getByRole('textbox', { name: 'Search swap options' }).fill('white');
  await swap.getByRole('button', { name: 'Use White Oxford', exact: true }).click();
  assert(await board.getByRole('heading', { name: 'White Oxford', exact: true }).isVisible());
  assert.equal(await board.getByRole('article').count(), 7);
  const noJobs = await admin.from('ai_jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId); assert.equal(noJobs.count, 0);
  check('All seven pieces, layers, accessories, missing-photo placeholders, private photos, responsive layout, and nested Escape behavior work; swaps use no inference');
  await board.getByLabel('Outfit name', { exact: true }).fill('Saved photo board QA');
  const renamedBoard = page.getByRole('dialog', { name: 'Saved photo board QA', exact: true });
  await renamedBoard.getByRole('button', { name: 'Save outfit', exact: true }).click();
  await renamedBoard.getByRole('link', { name: 'Open saved outfit' }).waitFor();
  const saved = ensure(await admin.from('outfits').select('id,outfit_items(item_id)').eq('user_id', userId).eq('name', 'Saved photo board QA').single(), 'read saved combination');
  const savedIds = saved.outfit_items.map(item => item.item_id);
  assert.equal(savedIds.length, 7); assert(savedIds.includes(replacement.id)); assert(!savedIds.includes(shirt.id)); assert(savedIds.includes(pants.id));
  await renamedBoard.getByRole('button', { name: 'Discuss this look', exact: true }).click();
  await chat.getByRole('region', { name: 'Selected outfit' }).waitFor();
  await context.route(url => url.pathname.replace(/\/$/, '') === '/api/assistant/chat', async route => { chatRequests.push(route.request().postDataJSON()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assistantMessage: 'Test follow-up keeps the exact look.' }) }); });
  await chat.getByRole('button', { name: 'Send message' }).click(); await chat.getByText('Test follow-up keeps the exact look.').waitFor();
  assert.deepEqual([...chatRequests[0].contextHints.outfitItemIds].sort(), [...savedIds].sort()); assert.equal(chatRequests[0].contextHints.focusItemId, pants.id);
  await context.unroute(url => url.pathname.replace(/\/$/, '') === '/api/assistant/chat');
  check('Saving preserves all swapped IDs in a real outfit; discussing it sends the exact whole combination and starting piece');
  if (process.env.BOARDS_LIVE_AI === '1') {
    const live = await page.request.post(`${base}/api/assistant/chat/`, { headers: { Origin: base }, data: { requestId: randomUUID(), message: 'Recommend one complete everyday outfit around my olive chinos, using my owned pieces. Include the coat, belt, watch, and undershirt where appropriate. Show a photo board for the combination.', contextHints: { focusItemId: pants.id } }, timeout: 30000 });
    assert.equal(live.status(), 200); let answer = await live.json();
    for (let attempts = 0; answer.pending && attempts < 25; attempts++) { await page.waitForTimeout(2000); const status = await page.request.post(`${base}/api/assistant/chat/status/`, { headers: { Origin: base }, data: { threadId: answer.threadId } }); assert.equal(status.status(), 200); answer = await status.json(); }
    await fs.writeFile(`${output}/live-model-result.json`, JSON.stringify(answer, null, 2));
    assert(!answer.pending); assert(answer.outfitBoards?.length > 0); assert(!answer.assistantMessage.includes('<outfit-board>'));
    const owned = new Set([...items, replacement].map(item => item.id));
    for (const suggestion of answer.outfitBoards) { assert(suggestion.items.some(item => item.id === pants.id)); assert(suggestion.items.every(item => owned.has(item.id))); }
    await page.evaluate(({ userId, id }) => sessionStorage.setItem(`sebastian-thread:${userId}`, id), { userId, id: answer.threadId });
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    await page.locator('.app-header').getByRole('button', { name: 'Ask Sebastian', exact: true }).click();
    await page.getByRole('dialog', { name: 'Ask Sebastian', exact: true }).getByRole('button', { name: `View ${answer.outfitBoards[0].title}`, exact: true }).click();
    const restored = page.getByRole('dialog', { name: answer.outfitBoards[0].title, exact: true });
    assert.equal(await restored.getByRole('article').count(), answer.outfitBoards[0].items.length);
    await page.screenshot({ path: `${output}/real-model-board-mobile.png` });
    const jobs = ensure(await admin.from('ai_jobs').select('task,status').eq('user_id', userId), 'check bounded text inference');
    assert.equal(jobs.length, 1); assert.equal(jobs[0].task, 'assistant_text'); assert.equal(jobs[0].status, 'succeeded');
    check('A real production text-model reply produces validated photo boards with the exact selected piece; no image model is invoked');
  }
  assert.deepEqual(errors, []);
} catch (error) { errors.push(error.message); process.exitCode = 1; if (page) await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {}); }
finally {
  if (browser) await browser.close();
  if (storagePaths.length) ensure(await admin.storage.from('wardrobe-private-images').remove(storagePaths), 'remove test photos');
  for (const id of users) ensure(await admin.auth.admin.deleteUser(id), 'delete test account');
  await fs.rm(`${output}/test-accounts.json`, { force: true });
  const result = { checkedAt: new Date().toISOString(), base, passed: !process.exitCode, checks, errors, accountsRemoved: users.length, privatePhotosRemoved: storagePaths.length, liveTextModelTest: process.env.BOARDS_LIVE_AI === '1' };
  await fs.writeFile(`${output}/verification.json`, `${JSON.stringify(result, null, 2)}\n`); console.log(result);
}
