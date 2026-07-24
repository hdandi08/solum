import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

let envLoaded = false;

function loadTestEnvironment() {
  if (envLoaded) return;

  const root = process.cwd();
  for (const filename of ['.env.test', '.env.local']) {
    const envPath = path.join(root, filename);
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  }
  envLoaded = true;
}

/** Service-role client for asserting DEV side effects created by an E2E test. */
export function getAdminClient() {
  loadTestEnvironment();

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
