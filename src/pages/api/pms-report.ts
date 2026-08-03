import type { APIRoute } from 'astro';
import { getPublicSupabase } from '../../lib/supabase';

export const prerender = false;

const SERVICE_TYPES = new Set(['light', 'major', 'other']);
const LOCATIONS = new Set(['casa', 'independent']);

// Sanity bounds. Deliberately wide — the point is to catch typos and junk
// (₱5, ₱5,000,000), not to reject an unusual-but-real figure.
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500_000;

export const POST: APIRoute = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, 400);
	}

	// Honeypot: real users never fill this hidden field. Bots that autofill every field will.
	if (typeof body.website === 'string' && body.website.trim() !== '') {
		return json({ ok: true }, 200); // pretend success, drop silently
	}

	const make = trimmedString(body.make);
	const model = trimmedString(body.model);
	const serviceType = trimmedString(body.serviceType);
	const amountPhp = Number(body.amountPhp);
	const serviceLocation = trimmedString(body.serviceLocation);

	// --- Required: the five fields that make a report meaningful at all. ---
	// Everything below this block is optional on purpose. Each extra required
	// field measurably cuts completion, and a report without a mileage figure
	// is still useful; a report nobody finishes is not.
	if (!make || !model) return json({ error: 'Tell us the car — make and model.' }, 400);
	if (!serviceType || !SERVICE_TYPES.has(serviceType)) {
		return json({ error: 'Pick a service type: light, major, or other.' }, 400);
	}
	if (!Number.isFinite(amountPhp) || amountPhp < MIN_AMOUNT || amountPhp > MAX_AMOUNT) {
		return json({ error: 'Enter the amount paid in pesos.' }, 400);
	}
	if (!serviceLocation || !LOCATIONS.has(serviceLocation)) {
		return json({ error: 'Was this at a casa or an independent shop?' }, 400);
	}

	// --- Optional: accepted when given, never blocking. ---
	const modelYear = optionalInt(body.modelYear, 1990, 2100);
	const mileageKm = optionalInt(body.mileageKm, 0, 2_000_000);
	const trim = trimmedString(body.trim) || null;
	const region = trimmedString(body.region) || null;
	const serviceDate = trimmedString(body.serviceDate) || null;
	const notes = trimmedString(body.notes).slice(0, 1000) || null;

	const supabase = getPublicSupabase();
	const { error } = await supabase.from('pms_reports').insert({
		make,
		model,
		model_year: modelYear,
		trim,
		service_type: serviceType,
		mileage_km: mileageKm,
		amount_php: amountPhp,
		service_location: serviceLocation,
		region,
		service_date: serviceDate,
		notes,
	});

	if (error) {
		// Log loudly: this pipeline once failed silently for weeks because a
		// dead datastore looked identical to "nobody submitted anything".
		console.error('[pms-report] insert failed:', error.message, '| code:', error.code ?? 'n/a');
		return json({ error: 'Could not save your report. Please try again.' }, 500);
	}

	return json({ ok: true }, 200);
};

function trimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Returns a clamped integer, or null when absent/blank/unparseable. */
function optionalInt(value: unknown, min: number, max: number): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = Number(value);
	if (!Number.isFinite(n)) return null;
	const rounded = Math.round(n);
	if (rounded < min || rounded > max) return null;
	return rounded;
}

function json(data: Record<string, unknown>, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
