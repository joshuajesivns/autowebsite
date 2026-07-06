import type { APIRoute } from 'astro';
import { ADMIN_COOKIE_NAME, expectedAdminToken } from '../../../lib/adminAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const password = String(form.get('password') ?? '');

	if (password && password === import.meta.env.ADMIN_PASSWORD) {
		cookies.set(ADMIN_COOKIE_NAME, expectedAdminToken(), {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/',
			maxAge: 60 * 60 * 8,
		});
		return redirect('/admin/moderation');
	}

	return redirect('/admin/login?error=1');
};
