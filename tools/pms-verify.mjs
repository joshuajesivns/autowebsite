#!/usr/bin/env node
/**
 * End-to-end check for the owner-submitted PMS pipeline.
 *
 * This exists because that pipeline has failed silently twice, and both times
 * the failure looked exactly like "nobody has contributed yet":
 *   - Jul–Aug 2026: the Supabase project was paused; every submitter got a 500.
 *   - Aug 2026:     RLS had no public SELECT policy, so approved rows were
 *                   invisible to the widget while the table was not empty.
 *                   Separately, model_year/mileage_km were still NOT NULL
 *                   after the form made them optional, so any submission that
 *                   skipped one died with a 500.
 *
 * A green run here means a real reader can submit and a real reader can see
 * the result. Nothing else proves that.
 *
 * Usage:  node tools/pms-verify.mjs        (from the repo root)
 *
 * Non-destructive: the only rows it writes are probes it deletes again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_PATH = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(ENV_PATH)) {
	console.error('No .env at repo root — run this from the repo root.');
	process.exit(1);
}

const env = Object.fromEntries(
	fs.readFileSync(ENV_PATH, 'utf8').split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('#'))
		.map((l) => {
			const i = l.indexOf('=');
			return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
		}),
);

for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']) {
	if (!env[key]) {
		console.error(`.env is missing ${key}`);
		process.exit(1);
	}
}

const anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const PROBE = '__pmsverify__';

const results = [];
const check = (name, pass, detail = '') => {
	results.push({ name, pass, detail });
	console.log(`${pass ? ' PASS' : ' FAIL'}  ${name}${detail ? `\n         ${detail}` : ''}`);
};

console.log(`\nPMS pipeline check — ${new URL(env.SUPABASE_URL).host}\n`);

// 1. Reachability -----------------------------------------------------------
const { error: reachErr } = await admin.from('pms_reports').select('id', { head: true, count: 'exact' });
check('datastore reachable', !reachErr, reachErr?.message ?? '');
if (reachErr) finish();

// 2. Schema: the columns the API treats as optional must actually be nullable
const spec = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
	headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
}).then((r) => r.json()).catch(() => null);

const def = spec?.definitions?.pms_reports;
if (def) {
	const required = new Set(def.required ?? []);
	const shouldBeNullable = ['model_year', 'mileage_km'].filter((c) => required.has(c));
	check(
		'optional fields are nullable in the DB',
		shouldBeNullable.length === 0,
		shouldBeNullable.length
			? `${shouldBeNullable.join(' and ')} still NOT NULL — submissions that skip them will 500`
			: '',
	);
	check('`source` column present', 'source' in (def.properties ?? {}), 'needed by the bulk seed tool');
} else {
	check('schema readable', false, 'could not read the PostgREST schema');
}

// 3. RLS: can the public role actually see approved rows? -------------------
const { count: adminApproved } = await admin
	.from('pms_reports').select('id', { count: 'exact', head: true }).eq('status', 'approved');
const { count: anonApproved, error: anonErr } = await anon
	.from('pms_reports').select('id', { count: 'exact', head: true }).eq('status', 'approved');

check(
	'public role can read approved rows',
	!anonErr && (adminApproved ?? 0) === (anonApproved ?? 0),
	anonErr
		? anonErr.message
		: (adminApproved ?? 0) === (anonApproved ?? 0)
			? `${anonApproved ?? 0} approved row(s) visible`
			: `RLS BLOCKED: ${adminApproved} approved row(s) exist, public role sees ${anonApproved ?? 0}`,
);

// 4. Round-trip the exact case that was breaking: no year, no mileage -------
const { error: insertErr } = await anon.from('pms_reports').insert({
	make: PROBE, model: PROBE, service_type: 'other', amount_php: 123, service_location: 'casa',
});
check(
	'public insert works without year/mileage',
	!insertErr,
	insertErr ? `${insertErr.message} (code ${insertErr.code ?? 'n/a'})` : 'the minimal 5-field submission is accepted',
);

// 5. A submitted row must land as `pending`, never straight to approved -----
if (!insertErr) {
	const { data: probe } = await admin.from('pms_reports').select('status').eq('make', PROBE).limit(1);
	const status = probe?.[0]?.status;
	check('new submissions default to pending', status === 'pending', `status = ${status ?? 'unknown'}`);
}

// 6. Cleanup ----------------------------------------------------------------
const { error: cleanErr } = await admin.from('pms_reports').delete().eq('make', PROBE);
check('probe rows cleaned up', !cleanErr, cleanErr?.message ?? '');

finish();

function finish() {
	const failed = results.filter((r) => !r.pass);
	console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
	if (failed.length) {
		console.log('\nThe pipeline is NOT working end to end. Fix these first:');
		for (const f of failed) console.log(`  - ${f.name}`);
		console.log('\nThe migration SQL for the common causes is on /admin/pms-seed/.');
	} else {
		console.log('Pipeline is live: a reader can submit, and approved data is publicly readable.');
	}
	process.exit(failed.length ? 1 : 0);
}
