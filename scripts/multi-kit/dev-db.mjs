// Explicit DEV-only management transport. Does not use the CLI's linked project.
// Credentials stay in memory; callers must not print them or provider headers.
import { execFileSync } from 'node:child_process';

export const DEV_PROJECT = 'rodvvmfzkyjsqbufkjbc';
let credential;
function accessToken() {
  if (credential) return credential;
  for (const service of ['Supabase CLI', 'supabase']) {
    try {
      credential = execFileSync('security', ['find-generic-password', '-s', service, '-a', 'supabase', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (credential.startsWith('go-keyring-base64:')) credential = Buffer.from(credential.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
      if (credential) return credential;
    } catch { /* Try the alternate configured service name. */ }
  }
  throw new Error('Configured Supabase CLI credential is unavailable.');
}

export async function devQuery(query) {
  if (typeof query !== 'string' || !query.trim()) throw new Error('A SQL statement is required.');
  const response = await fetch(`https://api.supabase.com/v1/projects/${DEV_PROJECT}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(60000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`DEV SQL failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}
