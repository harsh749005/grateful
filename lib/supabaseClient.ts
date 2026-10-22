import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.local.example.',
  );
}

/**
 * Shared browser client. Only the public (publishable) key is used here;
 * Row Level Security in the database keeps each user's data private.
 */
export const supabase = createClient(url, publishableKey);