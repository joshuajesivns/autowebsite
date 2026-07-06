import { createClient } from '@supabase/supabase-js';

// Server-only helpers — never import these from a client-side script.
// SUPABASE_SECRET_KEY bypasses Row Level Security; it must stay server-side.

export function getPublicSupabase() {
	return createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_PUBLISHABLE_KEY);
}

export function getAdminSupabase() {
	return createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_SECRET_KEY);
}
