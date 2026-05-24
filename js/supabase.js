// Supabase initialization
// Keys should be replaced with actual Supabase project keys before deployment

const SUPABASE_URL = 'https://avzprpyapskqmwywxibd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Mzg75Q4fOpwRC2_WKby5zA__CZ55ylP';

// Initialize the Supabase client globally
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
