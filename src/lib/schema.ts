// Single source of truth for the site's blog JSON-LD.
//
// Pure functions, no Astro imports — so they're trivially testable and callable
// from any layout. The site-wide Organization (#org) + WebSite (#website) are
// declared once in BaseHead.astro; everything here references them by @id rather
// than re-declaring them, so a post's graph reads as one connected thing:
// an Article, about this Vehicle, that explains this Service, answers these
// Questions, and recommends these Products.
//
// Adding or changing a vertical's entity mix = editing the RECIPE table + a
// builder below. Nothing else in the site needs to change.

export type Vertical = 'daily-driver' | 'ev' | 'jdm' | 'news';

export interface VehicleEngine {
	name: string;
	engineType?: string;
	power?: string;
	powerUnit?: string;
}
export interface VehicleData {
	name: string;
	brand: string;
	model: string;
	vehicleModelDate?: string;
	bodyType?: string;
	fuelType?: string;
	transmission?: string;
	drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
	engines?: VehicleEngine[];
}
export interface PmsService {
	name: string;
	interval?: string;
	costMin?: number;
	costMax?: number;
	steps?: string[];
}
export interface PmsData {
	currency: string;
	light?: PmsService;
	heavy?: PmsService;
}
export interface ProductData {
	name: string;
	category?: string;
	brand?: string;
	description?: string;
	url: string;
}
export interface FaqItem {
	q: string;
	a: string;
}

export interface BlogSchemaInput {
	vertical: Vertical;
	title: string;
	description: string;
	pageUrl: string; // canonical, trailing slash
	siteHref: string; // e.g. "https://www.apexenginehq.com/"
	imageUrl?: string; // absolute, already resolved by the caller
	datePublished: string; // ISO
	dateModified: string; // ISO
	tags?: string[];
	faq?: FaqItem[];
	vehicle?: VehicleData;
	pms?: PmsData;
	featuredProducts?: ProductData[];
}

const DRIVE_CONFIG: Record<string, string> = {
	FWD: 'https://schema.org/FrontWheelDriveConfiguration',
	RWD: 'https://schema.org/RearWheelDriveConfiguration',
	AWD: 'https://schema.org/AllWheelDriveConfiguration',
	'4WD': 'https://schema.org/FourWheelDriveConfiguration',
};

// Which extra entities each vertical may emit. News stays lean (Article + FAQ);
// the car verticals add Vehicle + Products; only Daily Driver adds the PMS HowTo.
// An entity still needs its data present to appear — this table only gates what's
// *eligible*, so schema can never describe something the vertical shouldn't carry.
export const RECIPE: Record<Vertical, { vehicle: boolean; howto: boolean; products: boolean }> = {
	'daily-driver': { vehicle: true, howto: true, products: true },
	ev: { vehicle: true, howto: false, products: true },
	jdm: { vehicle: true, howto: false, products: true },
	news: { vehicle: false, howto: false, products: false },
};

function buildVehicle(v: VehicleData, id: string) {
	return {
		'@type': 'Vehicle',
		'@id': id,
		name: v.name,
		brand: { '@type': 'Brand', name: v.brand },
		model: v.model,
		...(v.vehicleModelDate ? { vehicleModelDate: v.vehicleModelDate } : {}),
		...(v.bodyType ? { bodyType: v.bodyType } : {}),
		...(v.fuelType ? { fuelType: v.fuelType } : {}),
		...(v.transmission ? { vehicleTransmission: v.transmission } : {}),
		...(v.drivetrain && DRIVE_CONFIG[v.drivetrain]
			? { driveWheelConfiguration: DRIVE_CONFIG[v.drivetrain] }
			: {}),
		...(v.engines && v.engines.length
			? {
					vehicleEngine: v.engines.map((e) => ({
						'@type': 'EngineSpecification',
						name: e.name,
						...(e.engineType ? { engineType: e.engineType } : {}),
						// PS has no clean schema.org unitCode, so unitText is intentional.
						...(e.power
							? { enginePower: { '@type': 'QuantitativeValue', value: e.power, unitText: e.powerUnit || 'PS' } }
							: {}),
					})),
				}
			: {}),
	};
}

// Light + Heavy PMS become two distinct HowTo entities (they're two procedures),
// each with a MonetaryAmount estimatedCost built from numeric min/max so it stays
// clean. Each links back to the car via `about`.
function buildHowToList(pms: PmsData, pageUrl: string, vehicleId: string | null) {
	const out: Record<string, unknown>[] = [];
	const make = (svc: PmsService | undefined, frag: string) => {
		if (!svc) return;
		const cost =
			svc.costMin != null || svc.costMax != null
				? {
						estimatedCost: {
							'@type': 'MonetaryAmount',
							currency: pms.currency,
							...(svc.costMin != null && svc.costMax != null
								? { minValue: svc.costMin, maxValue: svc.costMax }
								: { value: svc.costMin ?? svc.costMax }),
						},
					}
				: {};
		out.push({
			'@type': 'HowTo',
			'@id': `${pageUrl}#${frag}`,
			name: svc.name,
			...(svc.interval ? { description: `Service interval: ${svc.interval}.` } : {}),
			...cost,
			...(svc.steps && svc.steps.length
				? { step: svc.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) }
				: {}),
			...(vehicleId ? { about: { '@id': vehicleId } } : {}),
		});
	};
	make(pms.light, 'howto-light');
	make(pms.heavy, 'howto-heavy');
	return out;
}

function buildFaq(faq: FaqItem[], id: string) {
	return {
		'@type': 'FAQPage',
		'@id': id,
		mainEntity: faq.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: { '@type': 'Answer', text: item.a },
		})),
	};
}

function buildProducts(products: ProductData[], id: string, vehicle?: VehicleData) {
	return {
		'@type': 'ItemList',
		'@id': id,
		name: `Recommended parts & upgrades${vehicle ? ` for the ${vehicle.model}` : ''}`,
		itemListOrder: 'https://schema.org/ItemListUnordered',
		itemListElement: products.map((p, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			item: {
				'@type': 'Product',
				name: p.name,
				...(p.category ? { category: p.category } : {}),
				...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
				...(p.description ? { description: p.description } : {}),
				// No price — affiliate prices go stale (liability). The affiliate URL only.
				url: p.url,
			},
		})),
	};
}

export function buildBlogGraph(input: BlogSchemaInput) {
	const recipe = RECIPE[input.vertical];
	const orgId = `${input.siteHref}#org`;
	const webSiteId = `${input.siteHref}#website`;
	const articleId = `${input.pageUrl}#article`;
	const vehicleId = `${input.pageUrl}#vehicle`;
	const faqId = `${input.pageUrl}#faq`;
	const productsId = `${input.pageUrl}#products`;

	const hasVehicle = recipe.vehicle && !!input.vehicle;

	const article = {
		'@type': 'BlogPosting',
		'@id': articleId,
		headline: input.title,
		description: input.description,
		...(input.imageUrl ? { image: input.imageUrl } : {}),
		datePublished: input.datePublished,
		dateModified: input.dateModified,
		inLanguage: 'en-PH',
		isPartOf: { '@id': webSiteId },
		publisher: { '@id': orgId },
		author: { '@type': 'Organization', name: 'Apex Engine Editorial Team' },
		mainEntityOfPage: input.pageUrl,
		...(hasVehicle ? { about: { '@id': vehicleId } } : {}),
		...(input.tags && input.tags.length ? { keywords: input.tags } : {}),
	};

	const nodes: Record<string, unknown>[] = [article];
	if (hasVehicle) nodes.push(buildVehicle(input.vehicle!, vehicleId));
	if (recipe.howto && input.pms)
		nodes.push(...buildHowToList(input.pms, input.pageUrl, hasVehicle ? vehicleId : null));
	if (input.faq && input.faq.length) nodes.push(buildFaq(input.faq, faqId));
	if (recipe.products && input.featuredProducts && input.featuredProducts.length)
		nodes.push(buildProducts(input.featuredProducts, productsId, input.vehicle));

	return {
		'@context': 'https://schema.org',
		'@graph': nodes,
	};
}

// Mirrors the schema gate above so a layout can decide whether to render the
// visible product section — keeping visible content and markup in lockstep.
export function showsProducts(vertical: Vertical): boolean {
	return RECIPE[vertical].products;
}
