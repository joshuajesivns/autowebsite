import type { APIRoute } from 'astro';
import { ADMIN_COOKIE_NAME, isValidAdminSession } from '../../../lib/adminAuth';
import { getAdminSupabase } from '../../../lib/supabase';
import { parseBulk, toInsertPayload, SOURCES, type Source } from '../../../lib/pmsBulk';

export const prerender = false;

/** One paste shouldn't be able to dump thousands of rows by accident. */
const MAX_ROWS = 500;

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!isValidAdminSession(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
		return json({ error: 'Unauthorized' }, 401);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, 400);
	}

	const action = String(body.action ?? '');
	const text = typeof body.text === 'string' ? body.text : '';
	const parsed = parseBulk(text);

	// Dry run: the admin page calls this on every paste to render the preview
	// table. Nothing is written, so it's safe to call constantly.
	if (action === 'preview') {
		return json({ ok: true, ...summarize(parsed) }, 200);
	}

	if (action !== 'insert') return json({ error: 'Unknown action.' }, 400);

	const source = String(body.source ?? '') as Source;
	if (!SOURCES.includes(source)) {
		return json({ error: 'Pick where this data came from before inserting.' }, 400);
	}
	// `form` means "a stranger submitted this through the public form." Nothing
	// typed into an admin box is that, so accepting it here would launder
	// provenance in exactly the way the source column exists to prevent.
	if (source === 'form') {
		return json({ error: 'The "form" source is reserved for real public submissions.' }, 400);
	}

	if (parsed.valid.length === 0) return json({ error: 'No valid rows to insert.' }, 400);
	if (parsed.valid.length > MAX_ROWS) {
		return json({ error: `Too many rows (${parsed.valid.length}). Max ${MAX_ROWS} per paste.` }, 400);
	}

	// Reference rows carry no owner, so they never enter the published median
	// (pms-stats filters them out). They still land as `approved` because that
	// flag means "reviewed," not "publishable as owner data".
	const status = body.status === 'pending' ? 'pending' : 'approved';
	const payload = parsed.valid.map((r) => toInsertPayload(r, source, status));

	const supabase = getAdminSupabase();
	const { data, error } = await supabase.from('pms_reports').insert(payload).select('id');

	if (error) {
		console.error('[pms-bulk] insert failed:', error.message, '| code:', error.code ?? 'n/a');
		// The `source` column is the one piece of schema this tool adds. If the
		// migration hasn't been run yet, say so plainly instead of making Joshua
		// decode a Postgres error string.
		const missingColumn = /column .*source.* does not exist/i.test(error.message);
		return json(
			{
				error: missingColumn
					? 'The pms_reports table has no "source" column yet. Run the migration SQL shown on this page in the Supabase SQL editor, then try again.'
					: `Insert failed: ${error.message}`,
			},
			500,
		);
	}

	return json({ ok: true, inserted: data?.length ?? parsed.valid.length, skipped: parsed.invalid.length }, 200);
};

function summarize(parsed: ReturnType<typeof parseBulk>) {
	return {
		rows: parsed.rows,
		validCount: parsed.valid.length,
		invalidCount: parsed.invalid.length,
		unknownHeaders: parsed.unknownHeaders,
	};
}

function json(data: Record<string, unknown>, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
