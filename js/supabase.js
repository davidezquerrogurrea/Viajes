const SUPABASE_URL = 'https://xmyxmyusqwzueousnezy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3DAn8hJ5TRVsNcPSV4y-fw_zyJBiJJW';

// la librería global viene del CDN
export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
