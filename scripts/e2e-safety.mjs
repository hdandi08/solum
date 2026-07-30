const SAFE_BASE_URLS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://dev.d3pa095gzazg3c.amplifyapp.com',
]);

const SAFE_SUPABASE_URL = 'https://rodvvmfzkyjsqbufkjbc.supabase.co';

export function isCIEnvironment(env = process.env) {
  return Boolean(env.CI || env.CODEBUILD_BUILD_ID);
}

function origin(name, value) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`E2E ${name} required`);
  }
}

export function assertSafeE2ETarget(input) {
  if (input.target !== 'dev') {
    throw new Error('E2E target blocked: E2E_TARGET=dev required');
  }

  const baseURL = origin('base URL', input.baseURL);
  const supabaseURL = origin('Supabase URL', input.supabaseURL);

  if (!SAFE_BASE_URLS.has(baseURL)) {
    throw new Error('E2E site blocked: production or unknown origin');
  }
  if (supabaseURL !== SAFE_SUPABASE_URL) {
    throw new Error('E2E Supabase blocked: production or unknown project');
  }
  if (
    input.localServer &&
    !String(input.stripePublishableKey ?? '').startsWith('pk_test_')
  ) {
    throw new Error('E2E Stripe blocked: local runs require a test publishable key');
  }

  return { baseURL, supabaseURL };
}
