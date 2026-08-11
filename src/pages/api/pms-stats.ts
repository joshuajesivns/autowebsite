import type { APIRoute } from 'astro';
import { getPublicSupabase } from '../../lib/supabase';

export const prerender = false;

/**
 * Owner-reported PMS cost summary for one model.
 *
 * Only APPROVED rows count — unmoderated submissions never reach a reader.
 *
 * And only rows with an OWNER BEHIND THEM count. The widget labels its figures
 * "owner-reported," so seeded `reference` rows (a casa price list, a published
 * quote — real numbers, but nobody paid them) are excluded here. They live in
 * the same table because they're useful context in the admin, but folding them
 * into this median would quietly turn that label into a lie.
 *
 * MIN_SAMPLE exists because the whole site's credibility rests on not
 * overclaiming: a "median" drawn from one or two reports is an anecdote
 * wearing a statistic's clothes. Below the threshold we return the raw count
 * and no figure, so the page can honestly say "2 reports so far — not enough
 * to publish a number yet."
 */
const MIN_SAMPLE = 3;

export const GET: APIRoute = async ({ url }) => {
	const make = (url.searchParams.get('make') ?? '').trim();
	const model = (url.searchParams.get('model') ?? '').trim();
	if (!make || !model) return json({ ok: false, error: 'make and model required' }, 400);

	try {
		const supabase = getPublicSupabase();
		const base = () =>
			supabase
				.from('pms_reports')
				.select('service_type, service_location, amount_php')
				.eq('status', 'approved')
				.ilike('make', make)
				.ilike('model', model);

		// The `source` column is added by a manual migration, so a deploy can
		// land before it exists. Ask for the filtered set first and fall back to
		// the unfiltered one if the column isn't there yet — without the column
		// there are no reference rows to exclude anyway, so the fallback is
		// exactly correct rather than merely tolerable.
		let { data, error } = await base().neq('source', 'reference');
		if (error && /column .*source.* does not exist/i.test(error.message)) {
			({ data, error } = await base());
		}

		if (error) throw new Error(error.message);

		const rows = data ?? [];
		return json(
			{
				ok: true,
				minSample: MIN_SAMPLE,
				total: rows.length,
				groups: {
					light: summarize(rows, 'light'),
					major: summarize(rows, 'major'),
				},
			},
			200,
			// Cheap edge caching: this data changes only when Joshua approves a
			// report, so a few minutes of staleness costs nothing and keeps the
			// widget off the database on every page view.
			{ 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
		);
	} catch (err) {
		// Degrade quietly. A dead datastore should hide the stats line, never
		// break the article around it.
		console.error('[pms-stats] read failed:', err instanceof Error ? err.message : err);
		return json({ ok: false, total: 0, groups: {} }, 200);
	}
};

type Row = { service_type: string; service_location: string; amount_php: number };

function summarize(rows: Row[], type: string) {
	const all = rows.filter((r) => r.service_type === type);
	const n = all.length;
	if (n < MIN_SAMPLE) return { n, median: null, casaMedian: null, shopMedian: null };
	return {
		n,
		median: median(all.map((r) => r.amount_php)),
		casaMedian: medianOf(all, 'casa'),
		shopMedian: medianOf(all, 'independent'),
	};
}

function medianOf(rows: Row[], location: string) {
	const subset = rows.filter((r) => r.service_location === location).map((r) => r.amount_php);
	return subset.length >= MIN_SAMPLE ? median(subset) : null;
}

function median(values: number[]): number {
	const s = [...values].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function json(data: Record<string, unknown>, status: number, extraHeaders: Record<string, string> = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...extraHeaders },
	});
}
