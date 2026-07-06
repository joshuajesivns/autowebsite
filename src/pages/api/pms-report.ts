import type { APIRoute } from 'astro';
import { getPublicSupabase } from '../../lib/supabase';

export const prerender = false;

const SERVICE_TYPES = new Set(['light', 'major', 'other']);
const LOCATIONS = new Set(['casa', 'independent']);

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
	const modelYear = Number(body.modelYear);
	const trim = trimmedString(body.trim) || null;
	const serviceType = trimmedString(body.serviceType);
	const mileageKm = Number(body.mileageKm);
	const amountPhp = Number(body.amountPhp);
	const serviceLocation = trimmedString(body.serviceLocation);
	const region = trimmedString(body.region) || null;
	const serviceDate = trimmedString(body.serviceDate) || null;
	const notes = trimmedString(body.notes) || null;

	if (!make || !model) return json({ error: 'Make and model are required.' }, 400);
	if (!Number.isInteger(modelYear) || modelYear < 1990 || modelYear > 2100) {
		return json({ error: 'Enter a valid model year.' }, 400);
	}
	if (!serviceType || !SERVICE_TYPES.has(serviceType)) {
		return json({ error: 'Service type must be light, major, or other.' }, 400);
	}
	if (!Number.isFinite(mileageKm) || mileageKm < 0) {
		return json({ error: 'Enter a valid mileage.' }, 400);
	}
	if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
		return json({ error: 'Enter a valid amount paid.' }, 400);
	}
	if (!serviceLocation || !LOCATIONS.has(serviceLocation)) {
		return json({ error: 'Service location must be casa or independent.' }, 400);
	}

	const supabase = getPublicSupabase();
	const { error } = await supabase.from('pms_reports').insert({
		make,
		model,
		model_year: modelYear,
		trim,
		service_type: serviceType,
		mileage_km: Math.round(mileageKm),
		amount_php: amountPhp,
		service_location: serviceLocation,
		region,
		service_date: serviceDate,
		notes,
	});

	if (error) {
		console.error('pms_reports insert failed:', error.message);
		return json({ error: 'Could not save your report. Please try again.' }, 500);
	}

	return json({ ok: true }, 200);
};

function trimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function json(data: Record<string, unknown>, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
