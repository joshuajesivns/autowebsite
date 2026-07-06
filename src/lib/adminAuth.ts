import { createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'admin_session';

export function expectedAdminToken(): string {
	return createHash('sha256').update(import.meta.env.ADMIN_PASSWORD ?? '').digest('hex');
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
	if (!cookieValue) return false;
	const expected = expectedAdminToken();
	const a = Buffer.from(cookieValue);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
