const DEFAULT_PROJECT_ID = 'xqaxhfdijrrsdvbtshqz';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_PROJECT_ID}.supabase.co`;
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_T2Z3sGteL0Ujx7uEgq0C7g_8Y_HWTcI';
const DEFAULT_ANON_JWT =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYXhoZmRpanJyc2R2YnRzaHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQwMzEsImV4cCI6MjA4OTI4MDAzMX0.AFSMLhO8sf1JNmJm0O3EPeYV83ddQGR65SLWtloJLNg';

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || DEFAULT_PROJECT_ID;
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY;
export const anonJwt = import.meta.env.VITE_SUPABASE_ANON_JWT || DEFAULT_ANON_JWT;