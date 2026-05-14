export const DATA_BACKEND = import.meta.env.VITE_DATA_BACKEND || 'firebase';

export const isSupabaseBackend = DATA_BACKEND === 'supabase';

