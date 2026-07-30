import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadE2EEnvironment } from '../../e2e/support/load-e2e-environment';

const temporaryRoots = [];

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'solum-e2e-env-'));
  temporaryRoots.push(root);
  return root;
}

function writeEnv(file, contents) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('loadE2EEnvironment', () => {
  it('uses main-worktree files only for values missing locally', () => {
    const root = makeRoot();
    const currentWeb = join(root, 'feature', 'web');
    const mainWeb = join(root, 'main', 'web');
    writeEnv(join(currentWeb, '.env.test'), 'E2E_TARGET=dev\n');
    writeEnv(
      join(mainWeb, '.env.test'),
      'SUPABASE_SERVICE_ROLE_KEY=service_dev\n',
    );
    writeEnv(
      join(mainWeb, '.env.local'),
      [
        'VITE_SUPABASE_ANON_KEY=anon_dev',
        'VITE_STRIPE_PUBLISHABLE_KEY=pk_test_dev',
      ].join('\n'),
    );

    const env = {
      VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
    };

    loadE2EEnvironment(currentWeb, env, () => join(root, 'main', '.git'));

    expect(env).toMatchObject({
      E2E_TARGET: 'dev',
      SUPABASE_SERVICE_ROLE_KEY: 'service_dev',
      VITE_SUPABASE_ANON_KEY: 'anon_dev',
      VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_dev',
    });
  });

  it('does not overwrite an existing process value', () => {
    const root = makeRoot();
    const currentWeb = join(root, 'feature', 'web');
    writeEnv(
      join(currentWeb, '.env.test'),
      'E2E_TARGET=dev\nVITE_SUPABASE_URL=https://wrong.example\n',
    );

    const env = {
      VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
    };

    loadE2EEnvironment(currentWeb, env, () => join(root, 'feature', '.git'));

    expect(env.VITE_SUPABASE_URL).toBe(
      'https://rodvvmfzkyjsqbufkjbc.supabase.co',
    );
  });
});
