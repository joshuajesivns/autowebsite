import type { APIRoute } from 'astro';
import { getPublicSupabase } from '../../lib/supabase';

export const prerender = false;

/**
 * Datastore health check — and, just as importantly, a keepalive.
 *
 * Two jobs:
 *  1. Supabase free-tier projects PAUSE after about a week with no queries.
 *     That created a nasty failure spiral: /contribute got no submissions
 *     because it was broken, and it was broken because it got no submissions.
 *     A daily cron hit (see vercel.json) keeps the project awake.
 *  2. Gives a one-URL answer to "is the submission pipeline actually alive?"
 *     The pipeline previously failed silently for weeks — a dead datastore
 *     looked exactly like "nobody has submitted anything yet".
 *
 * Returns 200 when healthy, 503 when the datastore is unreachable, so an
 * uptime monitor can alert on it.
 */
export const GET: APIRoute = async () => {
	const started = Date.now();
	try {
		const supabase = getPublicSupabase();
		const { error, count } = await supabase
			.from('pms_reports')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved');
		if (error) throw new Error(error.message);

		// `visibleApproved` exists to catch a specific false-positive: when a
		// Row Level Security policy blocks reads, Supabase returns an empty
		// result rather than an error, so a misconfigured table looks perfectly
		// healthy. Surfacing the count makes "connected but cannot read" — which
		// silently disables the stats readback — visible at a glance.
		return json(
			{ ok: true, datastore: 'up', visibleApproved: count ?? 0, ms: Date.now() - started },
			200,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[health] datastore unreachable:', message);
		return json({ ok: false, datastore: 'down', error: message, ms: Date.now() - started }, 503);
	}
};

function json(data: Record<string, unknown>, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
}
