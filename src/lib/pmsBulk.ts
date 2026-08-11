/**
 * Bulk-entry parsing for seeding the owner-reported PMS dataset.
 *
 * This exists to solve a cold-start problem: the widget shipped into 31 guides
 * with zero approved rows, and an empty readback line converts at roughly zero.
 * Seeding needs a path that isn't "retype the public form thirty times."
 *
 * The parsing is deliberately forgiving about SHAPE (tabs or commas, column
 * order, aliased headers, peso signs, thousands separators) and deliberately
 * strict about MEANING (same enums and sanity bounds as the public API). A
 * paste from a spreadsheet should just work; a wrong number should not.
 */

export const SERVICE_TYPES = ['light', 'major', 'other'] as const;
export const LOCATIONS = ['casa', 'independent'] as const;

/**
 * Where a row came from. This is the honesty mechanism, not bookkeeping.
 *
 * The widget tells readers its figures are "owner-reported." Two of these
 * sources genuinely are — one arrived through the public form, the other
 * through Joshua's keyboard on an owner's behalf (an FB group reply, a friend's
 * receipt, his own car). The third is a different kind of fact entirely: a
 * published or quoted price with no owner attached. Mixing that into an
 * owner-reported median would make the label false, so `reference` rows are
 * stored, shown in the admin, and excluded from the published figure.
 */
export const SOURCES = ['form', 'owner-collected', 'reference'] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type Location = (typeof LOCATIONS)[number];
export type Source = (typeof SOURCES)[number];

/** Matches the public API's bounds exactly — one definition of "a plausible peso figure." */
export const MIN_AMOUNT = 100;
export const MAX_AMOUNT = 500_000;

export type ParsedRow = {
	line: number;
	make: string;
	model: string;
	model_year: number | null;
	trim: string | null;
	service_type: ServiceType | null;
	mileage_km: number | null;
	amount_php: number | null;
	service_location: Location | null;
	region: string | null;
	service_date: string | null;
	notes: string | null;
	errors: string[];
};

export type ParseResult = {
	rows: ParsedRow[];
	valid: ParsedRow[];
	invalid: ParsedRow[];
	/** Headers we saw but couldn't map to a known field — surfaced so a typo'd column isn't silently dropped. */
	unknownHeaders: string[];
};

/**
 * Header aliases. Spreadsheet columns get named by whoever made the sheet, so
 * accept the obvious variants rather than making the user rename headers.
 */
const HEADER_MAP: Record<string, keyof ParsedRow> = {
	make: 'make',
	brand: 'make',
	model: 'model',
	car: 'model',
	year: 'model_year',
	modelyear: 'model_year',
	model_year: 'model_year',
	trim: 'trim',
	variant: 'trim',
	type: 'service_type',
	service: 'service_type',
	servicetype: 'service_type',
	service_type: 'service_type',
	pms: 'service_type',
	mileage: 'mileage_km',
	km: 'mileage_km',
	mileagekm: 'mileage_km',
	mileage_km: 'mileage_km',
	odometer: 'mileage_km',
	amount: 'amount_php',
	price: 'amount_php',
	cost: 'amount_php',
	paid: 'amount_php',
	amountphp: 'amount_php',
	amount_php: 'amount_php',
	php: 'amount_php',
	where: 'service_location',
	location: 'service_location',
	shop: 'service_location',
	servicelocation: 'service_location',
	service_location: 'service_location',
	region: 'region',
	area: 'region',
	province: 'region',
	city: 'region',
	date: 'service_date',
	servicedate: 'service_date',
	service_date: 'service_date',
	notes: 'notes',
	note: 'notes',
	remarks: 'notes',
	comment: 'notes',
};

/** "Light PMS" → light, "Major/Heavy" → major. Readers and Joshua both say "heavy"; the column stores "major". */
function normalizeServiceType(raw: string): ServiceType | null {
	const v = raw.toLowerCase().replace(/[^a-z]/g, '');
	if (!v) return null;
	if (v.includes('light') || v.includes('standard') || v.includes('minor')) return 'light';
	if (v.includes('major') || v.includes('heavy')) return 'major';
	if (v.includes('other')) return 'other';
	return null;
}

/** Casa vs. talyer, in all the ways they get written. */
function normalizeLocation(raw: string): Location | null {
	const v = raw.toLowerCase().replace(/[^a-z]/g, '');
	if (!v) return null;
	if (v.includes('casa') || v.includes('dealer') || v.includes('official')) return 'casa';
	if (
		v.includes('independent') ||
		v.includes('talyer') ||
		v.includes('shop') ||
		v.includes('outside') ||
		v.includes('private')
	) {
		return 'independent';
	}
	return null;
}

/** Strips ₱, commas, spaces, and a trailing ".00" so "₱ 12,494.00" parses. */
function parseAmount(raw: string): number | null {
	const cleaned = raw.replace(/[₱,\s]/g, '').replace(/php/gi, '');
	if (!cleaned) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? Math.round(n) : null;
}

function parseIntOrNull(raw: string): number | null {
	const cleaned = raw.replace(/[,\s]/g, '').replace(/km$/i, '');
	if (!cleaned) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? Math.round(n) : null;
}

/** Accepts YYYY-MM-DD or YYYY-MM; anything else is dropped rather than guessed at. */
function parseDate(raw: string): string | null {
	const v = raw.trim();
	if (!v) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
	if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
	return null;
}

/**
 * Splits one line into cells. Tab-separated wins when tabs are present (that's
 * what a spreadsheet paste produces); otherwise comma, with basic quoted-field
 * support so a notes field containing a comma survives.
 */
function splitLine(line: string): string[] {
	if (line.includes('\t')) return line.split('\t').map((c) => c.trim());

	const cells: string[] = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			// Doubled quote inside a quoted field is a literal quote.
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			cells.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	cells.push(current.trim());
	return cells;
}

export function parseBulk(text: string): ParseResult {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trimEnd())
		.filter((l) => l.trim() !== '');

	if (lines.length === 0) {
		return { rows: [], valid: [], invalid: [], unknownHeaders: [] };
	}

	const headerCells = splitLine(lines[0]);
	const unknownHeaders: string[] = [];
	const columns = headerCells.map((h) => {
		const key = h.toLowerCase().replace(/[^a-z_]/g, '');
		const mapped = HEADER_MAP[key];
		if (!mapped) unknownHeaders.push(h);
		return mapped ?? null;
	});

	const rows: ParsedRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const cells = splitLine(lines[i]);
		const get = (field: keyof ParsedRow): string => {
			const idx = columns.indexOf(field);
			return idx >= 0 && idx < cells.length ? cells[idx] : '';
		};

		const errors: string[] = [];

		const make = get('make');
		const model = get('model');
		const serviceType = normalizeServiceType(get('service_type'));
		const amount = parseAmount(get('amount_php'));
		const location = normalizeLocation(get('service_location'));

		// Same five required fields as the public API, same reasoning: a report
		// missing any of these can't be grouped or compared, so it isn't data.
		if (!make) errors.push('missing make');
		if (!model) errors.push('missing model');
		if (!serviceType) errors.push('service type must be light, major/heavy, or other');
		if (amount === null) errors.push('missing or unparseable amount');
		else if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
			errors.push(`amount ₱${amount.toLocaleString()} is outside ₱${MIN_AMOUNT}–₱${MAX_AMOUNT.toLocaleString()}`);
		}
		if (!location) errors.push('location must be casa or independent/talyer');

		const modelYear = parseIntOrNull(get('model_year'));
		const mileage = parseIntOrNull(get('mileage_km'));

		rows.push({
			line: i + 1,
			make,
			model,
			model_year: modelYear !== null && modelYear >= 1990 && modelYear <= 2100 ? modelYear : null,
			trim: get('trim') || null,
			service_type: serviceType,
			mileage_km: mileage !== null && mileage >= 0 && mileage <= 2_000_000 ? mileage : null,
			amount_php: amount,
			service_location: location,
			region: get('region') || null,
			service_date: parseDate(get('service_date')),
			notes: get('notes').slice(0, 1000) || null,
			errors,
		});
	}

	return {
		rows,
		valid: rows.filter((r) => r.errors.length === 0),
		invalid: rows.filter((r) => r.errors.length > 0),
		unknownHeaders,
	};
}

/** Shapes a validated row for insertion. Kept separate so the API route has no parsing logic in it. */
export function toInsertPayload(row: ParsedRow, source: Source, status: 'pending' | 'approved') {
	return {
		make: row.make,
		model: row.model,
		model_year: row.model_year,
		trim: row.trim,
		service_type: row.service_type,
		mileage_km: row.mileage_km,
		amount_php: row.amount_php,
		service_location: row.service_location,
		region: row.region,
		service_date: row.service_date,
		notes: row.notes,
		source,
		status,
	};
}

export const TEMPLATE_HEADER = 'make\tmodel\tyear\tservice_type\tmileage_km\tamount_php\tlocation\tregion\tdate\tnotes';
