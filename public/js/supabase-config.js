// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://svmromjsotrdchgcexud.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Replace with your actual anon key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabase;