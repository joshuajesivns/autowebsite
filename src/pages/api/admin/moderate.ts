import type { APIRoute } from 'astro';
import { ADMIN_COOKIE_NAME, isValidAdminSession } from '../../../lib/adminAuth';
import { getAdminSupabase } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!isValidAdminSession(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
		return new Response('Unauthorized', { status: 401 });
	}

	const form = await request.formData();
	const id = String(form.get('id') ?? '');
	const action = String(form.get('action') ?? '');

	if (!id || (action !== 'approve' && action !== 'reject')) {
		return new Response('Bad request', { status: 400 });
	}

	const supabase = getAdminSupabase();
	await supabase
		.from('pms_reports')
		.update({ status: action === 'approve' ? 'approved' : 'rejected' })
		.eq('id', id);

	return redirect('/admin/moderation');
};
