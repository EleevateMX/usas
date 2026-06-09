// ===========================================================================
//  USMS Control — Cliente de Supabase (vía CDN, sin build)
// ===========================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
