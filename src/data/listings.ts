import type { ImageMetadata } from 'astro';
import ae86Exterior from '../assets/listings/ae86_exterior.jpg';
import ae86Interior from '../assets/listings/ae86_interior.jpg';
import ae86Engine from '../assets/listings/ae86_engine.jpg';
import r34Exterior from '../assets/listings/r34_exterior.jpg';
import heroImage from '../assets/hero-hero.jpg';

/* Master switch — while we have no real inventory, the site presents listings as
   "Coming Soon" rather than showing the mock cars below as if they were available.
   Flip to `true` once real listings exist; the mock data stays as the shape/contract
   reference and the search/filter UI light back up automatically. */
export const LISTINGS_LIVE = false;

/* Single source of truth for inventory (mock for now).
   The hero search dropdowns and the /listings filter both derive from this,
   so they can never drift out of sync. Replace with a content collection
   when real inventory exists — the shape is the future listing contract. */
export interface Listing {
	id: string; // unique slug e.g. "toyota-ae86-trueno"
	make: string;
	model: string;
	year: number;
	engine: string;
	transmission: string;
	fuel: string;
	seats: number;
	category: string; // body-style category slug, see CATEGORIES below
	mileage: string; // verified odometer
	grade: string; // auction / inspection grade
	price: number; // PHP
	verified: boolean;
	status: 'available' | 'sold';
	image: ImageMetadata;
	images: ImageMetadata[];
	description: string;
}

export const listings: Listing[] = [
	{
		id: 'toyota-ae86-trueno',
		make: 'Toyota',
		model: 'AE86 Trueno',
		year: 1985,
		engine: '4A-GE',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 4,
		category: 'sports',
		mileage: '118,400 km',
		grade: '4 / B',
		price: 1450000,
		verified: true,
		status: 'available',
		image: ae86Exterior,
		images: [ae86Exterior, ae86Interior, ae86Engine],
		description: 'A stellar, unmodified example of the legendary Hachiroku. Features the original red-top 4A-GE twin-cam motor, clean stock interior, and the iconic panda white-and-black two-tone color scheme. Documented mechanical inspection completed.'
	},
	{
		id: 'nissan-skyline-gt-r-r34',
		make: 'Nissan',
		model: 'Skyline GT-R',
		year: 1999,
		engine: 'RB26DETT',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 4,
		category: 'sports',
		mileage: '86,200 km',
		grade: '4.5 / A',
		price: 4200000,
		verified: true,
		status: 'available',
		image: r34Exterior,
		images: [r34Exterior],
		description: 'Pristine Nissan Skyline GT-R R34 in gorgeous Bayside Blue. Grade 4.5 auction import. Powered by the legendary RB26DETT twin-turbo inline-six, paired with a bulletproof 6-speed manual transmission. Fully serviced and ready for the collection.'
	},
	{
		id: 'mitsubishi-lancer-evo-vi',
		make: 'Mitsubishi',
		model: 'Lancer Evo VI',
		year: 1999,
		engine: '4G63',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 5,
		category: 'sports',
		mileage: '102,750 km',
		grade: '4 / B',
		price: 1850000,
		verified: true,
		status: 'sold',
		image: heroImage,
		images: [heroImage],
		description: 'A genuine Mitsubishi Lancer Evolution VI. Finished in Scotia White. Powered by the high-boost 4G63 turbo engine with active yaw control (AYC) and rally-bred suspension. This vehicle has been sold to a passionate collector.'
	},
	{
		id: 'honda-nsx-type-r',
		make: 'Honda',
		model: 'NSX Type-R',
		year: 1995,
		engine: 'C32B',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 2,
		category: 'sports',
		mileage: '64,900 km',
		grade: '5 / A',
		price: 6800000,
		verified: true,
		status: 'available',
		image: heroImage,
		images: [heroImage],
		description: 'Ultra-rare NA2 NSX Type-R. Lightweight spec with carbon-fiber panels, Recaro carbon-kevlar bucket seats, and track-honed double-wishbone suspension. Powered by a hand-balanced C32B 3.2L V6 mid-mounted engine.'
	},
	{
		id: 'toyota-supra-a80',
		make: 'Toyota',
		model: 'Supra A80',
		year: 1997,
		engine: '2JZ-GTE',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 4,
		category: 'sports',
		mileage: '94,300 km',
		grade: '4.5 / B',
		price: 3950000,
		verified: true,
		status: 'available',
		image: heroImage,
		images: [heroImage],
		description: 'Factory twin-turbo 2JZ-GTE Supra with the original Getrag V160 6-speed manual. Unmodified block, immaculate engine bay, and clean black leather interior. Excellent structural inspection grade.'
	},
	{
		id: 'subaru-impreza-wrx-sti',
		make: 'Subaru',
		model: 'Impreza WRX STI',
		year: 2000,
		engine: 'EJ20',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 5,
		category: 'sports',
		mileage: '121,000 km',
		grade: '4 / C',
		price: 1320000,
		verified: true,
		status: 'available',
		image: heroImage,
		images: [heroImage],
		description: 'Classic GC8 WRX STI Version VI. Rally-bred performance featuring symmetrical AWD, turbocharged EJ20 boxer engine, and signature WR Blue Mica finish with gold alloy wheels.'
	},
	{
		id: 'mazda-rx-7-fd',
		make: 'Mazda',
		model: 'RX-7 FD',
		year: 1996,
		engine: '13B-REW',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 2,
		category: 'sports',
		mileage: '78,500 km',
		grade: '4.5 / B',
		price: 2600000,
		verified: true,
		status: 'sold',
		image: heroImage,
		images: [heroImage],
		description: 'Late-model Series 7 Mazda RX-7 FD3S. Powered by the twin-turbo 13B rotary engine. Striking lines, responsive sequential turbo transition, and excellent compression readings. This unit has been sold.'
	},
	{
		id: 'toyota-celica-gt-four',
		make: 'Toyota',
		model: 'Celica GT-Four',
		year: 1994,
		engine: '3S-GTE',
		transmission: 'MT',
		fuel: 'Gasoline',
		seats: 4,
		category: 'sports',
		mileage: '133,200 km',
		grade: '4 / B',
		price: 980000,
		verified: true,
		status: 'available',
		image: heroImage,
		images: [heroImage],
		description: 'ST205 Celica GT-Four. WRC homolgation special with 3S-GTE turbo engine, permanent four-wheel drive, and distinctive rally front spoiler with hood bulge.'
	},
];

/* Derived options for the search dropdowns (keys lowercased to match query params). */
export const makes: string[] = [...new Set(listings.map((l) => l.make))].sort();

export const modelsByMake: Record<string, string[]> = {};
for (const l of listings) {
	(modelsByMake[l.make.toLowerCase()] ??= []).push(l.model);
}

/* Browse-by-category taxonomy. The homepage tiles and the /listings category
   filter both read from this, so labels and slugs can never drift. Add new
   slugs here and tag listings with them as inventory diversifies. */
export const CATEGORIES: { slug: string; label: string; blurb: string }[] = [
	{ slug: 'sports', label: 'Sports Cars', blurb: 'Performance JDM icons, fully documented.' },
	{ slug: 'kei-truck', label: 'Kei Trucks', blurb: 'Compact RHD workhorses for any job.' },
	{ slug: 'van', label: 'RHD Vans', blurb: 'Practical right-hand-drive haulers.' },
];

/* Count of available (not sold) units in a category — used for homepage tiles. */
export function availableInCategory(slug: string): number {
	return listings.filter((l) => l.category === slug && l.status === 'available').length;
}
