import type { ImageMetadata } from 'astro';
import heroImage from '../assets/hero-hero.jpg';

/* Single source of truth for inventory (mock for now).
   The hero search dropdowns and the /listings filter both derive from this,
   so they can never drift out of sync. Replace with a content collection
   when real inventory exists — the shape is the future listing contract. */
export interface Listing {
	make: string;
	model: string;
	year: number;
	engine: string;
	transmission: string;
	fuel: string;
	seats: number;
	mileage: string; // verified odometer
	grade: string; // auction / inspection grade
	price: number; // PHP
	verified: boolean;
	image?: ImageMetadata;
}

export const listings: Listing[] = [
	{ make: 'Toyota', model: 'AE86 Trueno', year: 1985, engine: '4A-GE', transmission: 'MT', fuel: 'Gasoline', seats: 4, mileage: '118,400 km', grade: '4 / B', price: 1450000, verified: true, image: heroImage },
	{ make: 'Nissan', model: 'Skyline GT-R', year: 1999, engine: 'RB26DETT', transmission: 'MT', fuel: 'Gasoline', seats: 4, mileage: '86,200 km', grade: '4.5 / A', price: 4200000, verified: true, image: heroImage },
	{ make: 'Mitsubishi', model: 'Lancer Evo VI', year: 1999, engine: '4G63', transmission: 'MT', fuel: 'Gasoline', seats: 5, mileage: '102,750 km', grade: '4 / B', price: 1850000, verified: true, image: heroImage },
	{ make: 'Honda', model: 'NSX Type-R', year: 1995, engine: 'C32B', transmission: 'MT', fuel: 'Gasoline', seats: 2, mileage: '64,900 km', grade: '5 / A', price: 6800000, verified: true, image: heroImage },
	{ make: 'Toyota', model: 'Supra A80', year: 1997, engine: '2JZ-GTE', transmission: 'MT', fuel: 'Gasoline', seats: 4, mileage: '94,300 km', grade: '4.5 / B', price: 3950000, verified: true, image: heroImage },
	{ make: 'Subaru', model: 'Impreza WRX STI', year: 2000, engine: 'EJ20', transmission: 'MT', fuel: 'Gasoline', seats: 5, mileage: '121,000 km', grade: '4 / C', price: 1320000, verified: true, image: heroImage },
	{ make: 'Mazda', model: 'RX-7 FD', year: 1996, engine: '13B-REW', transmission: 'MT', fuel: 'Gasoline', seats: 2, mileage: '78,500 km', grade: '4.5 / B', price: 2600000, verified: true, image: heroImage },
	{ make: 'Toyota', model: 'Celica GT-Four', year: 1994, engine: '3S-GTE', transmission: 'MT', fuel: 'Gasoline', seats: 4, mileage: '133,200 km', grade: '4 / B', price: 980000, verified: true, image: heroImage },
];

/* Derived options for the search dropdowns (keys lowercased to match query params). */
export const makes: string[] = [...new Set(listings.map((l) => l.make))].sort();

export const modelsByMake: Record<string, string[]> = {};
for (const l of listings) {
	(modelsByMake[l.make.toLowerCase()] ??= []).push(l.model);
}
