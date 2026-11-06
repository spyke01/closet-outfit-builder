// Only an isolated, labeled container is accepted. Never uses application secrets.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const container =
  process.env.AI_TEST_CONTAINER || "closet-experience-20261106-ada4";
const label = execFileSync(
  "docker",
  ["inspect", "--format", '{{index .Config.Labels "codex.task"}}', container],
  { encoding: "utf8" },
).trim();
assert.equal(
  label,
  "closet-experience-20261106",
  "Refusing to modify a container without the isolated test label",
);
const database = "closet_ai_tests";
async function sql(query, db = database) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "exec",
      "-i",
      container,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      db,
      "-Atq",
    ]);
    let out = "",
      err = "";
    child.stdout.on("data", (x) => (out += x));
    child.stderr.on("data", (x) => (err += x));
    child.on("close", (code) =>
      code ? reject(new Error(err.trim())) : resolve(out.trim()),
    );
    child.stdin.end(query);
  });
}
await sql(`DROP DATABASE IF EXISTS ${database};`, "postgres");
await sql(`CREATE DATABASE ${database};`, "postgres");
await sql(fs.readFileSync("supabase/tests/ai-guards-setup.sql", "utf8"));
await sql(
  fs.readFileSync(
    "supabase/migrations/20261106090000_authoritative_ai_jobs.sql",
    "utf8",
  ),
);
await sql(
  fs.readFileSync("supabase/tests/experience-schema-setup.sql", "utf8"),
);
for (const name of [
  "20261106091000_private_clothing_images.sql",
  "20261106092000_idempotent_today_outfits.sql",
  "20261106093000_atomic_onboarding.sql",
  "20261106094000_ai_audit_and_policy_alignment.sql",
  "20261106095000_atomic_calendar_entries.sql",
  "20261106100000_preserve_newer_clothing_choices.sql",
])
  await sql(fs.readFileSync("supabase/migrations/" + name, "utf8"));
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const checks = [];
const record = (name) => {
  checks.push({ name, passed: true });
  console.log("PASS " + name);
};
async function reset() {
  await sql(
    `TRUNCATE ai_jobs,usage_counters,user_subscriptions,auth.users CASCADE;INSERT INTO auth.users VALUES('${a}'),('${b}');INSERT INTO user_subscriptions(user_id,plan_code,billing_state,plan_anchor_date) VALUES('${a}','plus','active','2020-01-01'),('${b}','plus','active','2020-01-01');`,
  );
}
function reserve(
  key,
  {
    user = a,
    task = "assistant_text",
    cost = 20000,
    day = 25000000,
    month = 250000000,
    parent = null,
    hash = "a".repeat(64),
  } = {},
) {
  return `SET ROLE service_role;SELECT reserve_ai_job('${user}','${task}','${key}','${hash}','owned-item','replicate','openai/gpt-5-mini',${cost},${day},${month},150000000,20,${parent ? `'${parent}'` : "NULL"});`;
}
await reset();
await assert.rejects(
  sql(
    `SET ROLE authenticated;SELECT reserve_usage_counter('${a}','x','x',now(),now(),1,1);`,
  ),
  /permission denied/,
);
await assert.rejects(
  sql(
    `SET ROLE authenticated;INSERT INTO usage_counters(user_id,metric_key,period_key,count) VALUES('${a}','x','x',0);`,
  ),
  /permission denied/,
);
record("Authenticated users cannot call the metering RPC or write counters");
const races = await Promise.all(
  Array.from({ length: 20 }, () =>
    sql(
      `SET ROLE service_role;SELECT row_to_json(r) FROM reserve_usage_counter('${a}','race','race',now(),now(),1,1) r;`,
    ),
  ),
);
assert.equal(races.map(JSON.parse).filter((x) => x.allowed).length, 1);
assert.equal(
  await sql("SELECT count FROM usage_counters WHERE metric_key='race';"),
  "1",
);
record(
  "Twenty concurrent first-row reservations admit exactly one at a limit of one",
);
await reset();
const jobs = (
  await Promise.all(
    Array.from({ length: 20 }, () => sql(reserve("same-request"))),
  )
).map(JSON.parse);
assert.equal(jobs.filter((x) => x.created).length, 1);
assert.equal(await sql("SELECT count(*) FROM ai_jobs;"), "1");
assert.equal(
  await sql(
    "SELECT count FROM usage_counters WHERE metric_key='ai_stylist_messages';",
  ),
  "1",
);
record(
  "Concurrent duplicate requests create one job and consume one operation",
);
assert.equal(
  JSON.parse(await sql(reserve("same-request", { hash: "b".repeat(64) }))).code,
  "IDEMPOTENCY_CONFLICT",
);
record("An idempotency key cannot be reused for a different request");
await reset();
const budget = await Promise.all(
  Array.from({ length: 5 }, (_, i) =>
    sql(reserve("budget-" + i, { cost: 20, day: 50 })),
  ),
);
assert.equal(budget.map(JSON.parse).filter((x) => x.allowed).length, 2);
record("Concurrent global-budget reservations include all pending work");
await reset();
await sql(
  `UPDATE user_subscriptions SET plan_code='free' WHERE user_id='${a}';`,
);
assert.equal(
  JSON.parse(await sql(reserve("free-image", { task: "wardrobe_image" }))).code,
  "PLAN_REQUIRED",
);
assert.equal(
  JSON.parse(await sql(reserve("free-cleanup", { task: "background_removal" })))
    .allowed,
  true,
);
record(
  "Direct billable generation is plan-gated; free cleanup remains available within limits",
);
await reset();
const first = JSON.parse(
  await sql(reserve("original", { task: "wardrobe_image" })),
);
await sql(`UPDATE ai_jobs SET status='succeeded' WHERE id='${first.job.id}';`);
assert.equal(
  JSON.parse(
    await sql(
      reserve("retry-one", { task: "wardrobe_image", parent: first.job.id }),
    ),
  ).allowed,
  true,
);
assert.equal(
  JSON.parse(
    await sql(
      reserve("retry-two", { task: "wardrobe_image", parent: first.job.id }),
    ),
  ).code,
  "RETRY_LIMIT_EXCEEDED",
);
assert.equal(
  await sql(
    "SELECT count FROM usage_counters WHERE metric_key='ai_wardrobe_image_generations';",
  ),
  "1",
);
record(
  "Only one courtesy retry is allowed, with shared budget and burst limits intact",
);
await assert.rejects(
  sql(
    "SET ROLE authenticated;UPDATE assistant_messages SET metadata_json='{}';",
  ),
  /permission denied/,
);
await assert.rejects(
  sql("SET ROLE authenticated;SELECT * FROM ai_jobs;"),
  /permission denied/,
);
record(
  "Client sessions cannot forge assistant metadata or access the job ledger",
);
await reset();
assert.equal(
  JSON.parse(await sql(reserve("deleted-account", { cost: 20, day: 20 })))
    .allowed,
  true,
);
await sql(`DELETE FROM auth.users WHERE id='${a}';`);
assert.equal(
  JSON.parse(await sql(reserve("new-account", { user: b, cost: 20, day: 20 })))
    .code,
  "AI_BUDGET_EXCEEDED",
);
record("Deleting an account does not erase global spending reservations");

await reset();
await assert.rejects(
  sql(
    `SET ROLE authenticated;SET request.jwt.claim.sub='${a}';INSERT INTO storage.objects(bucket_id,name) VALUES('wardrobe-images','original/${a}/bypass.png');`,
  ),
  /row-level security/,
);
await assert.rejects(
  sql(
    `SET ROLE authenticated;SET request.jwt.claim.sub='${a}';INSERT INTO storage.objects(bucket_id,name) VALUES('wardrobe-private-images','${a}/original/bypass.png');`,
  ),
  /row-level security/,
);
assert.equal(
  await sql(
    "SELECT public FROM storage.buckets WHERE id='wardrobe-private-images';",
  ),
  "f",
);
record(
  "Both clothing buckets reject direct client uploads and new photos are private",
);
const category = "00000000-0000-4000-8000-000000000010";
await sql(
  `INSERT INTO categories(id,user_id,name) VALUES('${category}','${a}','Shirt');`,
);
const batch = JSON.stringify([
  {
    category_id: category,
    name: "Navy shirt",
    color: "navy",
    formality_score: 5,
    season: ["All"],
    image_url: null,
  },
]);
const persistBatch = (user = a, key = "first", hash = "a".repeat(64)) =>
  `SET ROLE service_role;SELECT persist_onboarding_batch('${user}','${key}','${hash}','${batch}'::jsonb);`;
const saved = await Promise.all(
  Array.from({ length: 12 }, () => sql(persistBatch())),
);
assert.equal(new Set(saved).size, 1);
assert.equal(
  await sql(`SELECT count(*) FROM wardrobe_items WHERE user_id='${a}';`),
  "1",
);
record("Twelve concurrent onboarding retries save one complete batch");
await assert.rejects(
  sql(persistBatch(a, "first", "b".repeat(64))),
  /Request changed/,
);
await assert.rejects(sql(persistBatch(b, "other")), /Category not found/);
await assert.rejects(
  sql(
    `SET ROLE authenticated;SELECT persist_onboarding_batch('${a}','bypass','x','${batch}'::jsonb);`,
  ),
  /permission denied/,
);
record(
  "Onboarding rejects a changed retry, foreign category, and direct client RPC calls",
);
await sql(
  `UPDATE user_subscriptions SET billing_state='canceled',cancel_at_period_end=true,current_period_end=now()+interval '1 day' WHERE user_id='${a}';`,
);
assert.equal(
  await sql(`SELECT get_effective_plan_code_for_user('${a}');`),
  "plus",
);
await sql(
  `UPDATE user_subscriptions SET current_period_end=now()-interval '1 day' WHERE user_id='${a}';`,
);
assert.equal(
  await sql(`SELECT get_effective_plan_code_for_user('${a}');`),
  "free",
);
record("Database paid access matches scheduled cancellation and expiry");
await reset();
const privateJob = JSON.parse(await sql(reserve("private-delete"))).job;
await sql(
  `UPDATE ai_jobs SET result_json='{"text":"Private conversation"}',prediction_id='provider-handle' WHERE id='${privateJob.id}';DELETE FROM auth.users WHERE id='${a}';`,
);
const erased = JSON.parse(
  await sql(
    `SELECT row_to_json(j) FROM ai_jobs j WHERE id='${privateJob.id}';`,
  ),
);
assert.equal(erased.result_json, null);
assert.equal(erased.prediction_id, null);
assert.equal(erased.scope_key, "");
assert.equal(erased.reserved_cost_micros, 20000);
record(
  "Account deletion clears inference content and identifiers while retaining spend",
);

await reset();
await sql(
  `INSERT INTO categories(id,user_id,name) VALUES('${category}','${a}','Shirt');INSERT INTO wardrobe_items(user_id,category_id,name) VALUES('${a}','${category}','First piece'),('${a}','${category}','Second piece');`,
);
const todayJob = JSON.parse(
  await sql(reserve("today-atomic", { task: "today_outfit" })),
).job;
const date = await sql("SELECT current_date;");
await sql(
  `UPDATE ai_jobs SET status='succeeded',scope_key='${date}' WHERE id='${todayJob.id}';`,
);
const ids = (
  await sql(`SELECT id FROM wardrobe_items WHERE user_id='${a}' ORDER BY id;`)
).split("\n");
const applyOutfit = `SET ROLE service_role;SELECT persist_today_ai_outfit('${a}','${todayJob.id}',ARRAY['${ids[0]}','${ids[1]}']::uuid[],80,'${date}','Work','Classic',NULL,'smart','An outfit from your wardrobe','{}',now()+interval '1 day');`;
const outfitsSaved = await Promise.all(
  Array.from({ length: 12 }, () => sql(applyOutfit)),
);
assert.equal(new Set(outfitsSaved).size, 1);
assert.equal(await sql("SELECT count(*) FROM outfits;"), "1");
assert.equal(await sql("SELECT count(*) FROM outfit_items;"), "2");
assert.equal(await sql("SELECT count(*) FROM today_ai_outfits;"), "1");
record(
  "Twelve concurrent Today result saves create one outfit with every piece and one selection",
);
await assert.rejects(
  sql(
    applyOutfit.replace(`'${a}','${todayJob.id}'`, `'${b}','${todayJob.id}'`),
  ),
  /Invalid outfit request/,
);
record("An AI result cannot be applied by another account");

await reset();
await sql(
  `INSERT INTO categories(id,user_id,name) VALUES('${category}','${a}','Shirt');INSERT INTO wardrobe_items(user_id,category_id,name) VALUES('${a}','${category}','Shirt'),('${a}','${category}','Watch');`,
);
const pieces = (await sql(`SELECT id FROM wardrobe_items ORDER BY id;`)).split(
  "\n",
);
const entryId = "00000000-0000-4000-8000-000000000099";
const calendarSave = (
  owner = a,
  create = true,
  itemIds = pieces,
  payload = { entry_date: date, status: "planned", notes: "Original plan" },
) =>
  `SET ROLE authenticated;SET request.jwt.claim.sub='${owner}';SELECT save_calendar_entry('${entryId}','${JSON.stringify(payload)}',ARRAY[${itemIds.map((id) => `'${id}'`).join(",")}]::uuid[],${create});`;
await Promise.all(Array.from({ length: 12 }, () => sql(calendarSave())));
assert.equal(await sql("SELECT count(*) FROM calendar_entries;"), "1");
assert.equal(await sql("SELECT count(*) FROM calendar_entry_items;"), "2");
record(
  "Concurrent calendar retries create one entry and preserve all selected pieces",
);
await assert.rejects(
  sql(calendarSave(a, false, [...pieces, b], { notes: "Changed note" })),
  /Clothing item not found/,
);
assert.equal(
  await sql(`SELECT notes FROM calendar_entries WHERE id='${entryId}';`),
  "Original plan",
);
assert.equal(await sql("SELECT count(*) FROM calendar_entry_items;"), "2");
await assert.rejects(
  sql(calendarSave(b, false, [], { notes: "Foreign edit" })),
  /Entry not found/,
);
await assert.rejects(
  sql(
    `SET ROLE authenticated;SET request.jwt.claim.sub='${a}';INSERT INTO calendar_entry_items(calendar_entry_id,wardrobe_item_id) VALUES('${entryId}','${b}');`,
  ),
  /Clothing item not found/,
);
record(
  "Invalid or foreign calendar edits leave the previous entry and every piece intact",
);

await sql(
  `INSERT INTO categories(id,user_id,name) VALUES('00000000-0000-4000-8000-000000000011','${b}','Watch');INSERT INTO wardrobe_items(id,user_id,category_id,name) VALUES('${b}','${b}','00000000-0000-4000-8000-000000000011','Foreign watch');`,
);
await assert.rejects(
  sql(calendarSave(a, false, [...pieces, b], { notes: "Changed note" })),
  /Clothing item not found/,
);
await sql(
  `CREATE FUNCTION fail_test_calendar_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.wardrobe_item_id='${pieces[1]}' THEN RAISE EXCEPTION 'simulated insert failure'; END IF; RETURN NEW; END $$;CREATE TRIGGER fail_test_calendar_insert BEFORE INSERT ON calendar_entry_items FOR EACH ROW EXECUTE FUNCTION fail_test_calendar_insert();`,
);
await assert.rejects(
  sql(calendarSave(a, false, pieces, { notes: "Changed note" })),
  /simulated insert failure/,
);
assert.equal(
  await sql(`SELECT notes FROM calendar_entries WHERE id='${entryId}';`),
  "Original plan",
);
assert.equal(await sql("SELECT count(*) FROM calendar_entry_items;"), "2");
await sql(
  "DROP TRIGGER fail_test_calendar_insert ON calendar_entry_items;DROP FUNCTION fail_test_calendar_insert();",
);
record(
  "A failure after replacing calendar pieces rolls back the entry and all item changes",
);

await sql(reserve("image-choice-job"));
await sql(
  `UPDATE wardrobe_items SET image_processing_job_id=(SELECT id FROM ai_jobs LIMIT 1) WHERE id='${pieces[0]}';`,
);
await sql(
  `SET ROLE authenticated;SET request.jwt.claim.sub='${a}';UPDATE wardrobe_items SET image_url='new-photo-choice' WHERE id='${pieces[0]}';`,
);
assert.equal(
  await sql(
    `SELECT image_processing_job_id IS NULL FROM wardrobe_items WHERE id='${pieces[0]}';`,
  ),
  "t",
);
record("A newer user photo choice detaches an older image worker");
assert.equal(
  JSON.parse(
    await sql(
      reserve("photo-with-ai-cap", { task: "media_upload", cost: 1, day: 1 }),
    ),
  ).allowed,
  true,
);
record(
  "Photo uploads remain available when the AI spending budget is exhausted",
);
const output = "docs/experience-implementation/database-validation.json";
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      engine: "PostgreSQL 16, isolated local container",
      checks,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${checks.length} database checks passed.`);
