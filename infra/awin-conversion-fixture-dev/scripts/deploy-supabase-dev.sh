#!/usr/bin/env bash
set -euo pipefail

EXPECTED_REF='rodvvmfzkyjsqbufkjbc'
EXPECTED_ACCOUNT='798470762256'
EXPECTED_REGION='eu-west-2'
STACK_NAME='solum-awin-conversion-fixture-dev'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMP_ENV="$(mktemp)"
chmod 600 "$TEMP_ENV"
acceptance_secret_set=false

guard_supabase_dev() {
  local linked projects
  linked="$(tr -d '[:space:]' < "$REPO_DIR/supabase/.temp/project-ref")"
  [[ "$linked" == "$EXPECTED_REF" ]] || { echo 'BLOCKED: unexpected linked Supabase ref' >&2; exit 1; }
  projects="$(supabase projects list --output json --profile supabase)"
  PROJECTS_JSON="$projects" node -e '
    const projects = JSON.parse(process.env.PROJECTS_JSON);
    if (!projects.some((project) => project.id === "rodvvmfzkyjsqbufkjbc")) process.exit(1);
  ' || { echo 'BLOCKED: Supabase authentication/ref guard failed' >&2; exit 1; }
}

guard_aws_dev() {
  local account
  account="$(aws sts get-caller-identity --query Account --output text --region "$EXPECTED_REGION")"
  [[ "$account" == "$EXPECTED_ACCOUNT" ]] || { echo 'BLOCKED: unexpected AWS account' >&2; exit 1; }
  [[ "$STACK_NAME" == *-dev ]] || { echo 'BLOCKED: non-development fixture stack' >&2; exit 1; }
}

cleanup_acceptance_secrets() {
  rm -f "$TEMP_ENV"
  [[ "$acceptance_secret_set" == true ]] || return 0
  if guard_supabase_dev; then
    supabase secrets unset \
      STRIPE_ACCEPTANCE_WEBHOOK_SECRET \
      --project-ref "$EXPECTED_REF" --profile supabase --yes >/dev/null ||
      echo 'BLOCKED: temporary development secret cleanup failed' >&2
  else
    echo 'BLOCKED: guard failed before temporary development secret cleanup' >&2
  fi
}
trap cleanup_acceptance_secrets EXIT

cd "$REPO_DIR"
guard_supabase_dev
secrets_json="$(supabase secrets list --project-ref "$EXPECTED_REF" --output json --profile supabase)"
SECRETS_JSON="$secrets_json" node -e '
  const names = new Set(JSON.parse(process.env.SECRETS_JSON).map((entry) => entry.name));
  const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  if (required.some((name) => !names.has(name))) process.exit(1);
  const generated = ["AWIN_ATTRIBUTION_SECRET", "AWIN_OUTBOX_ENCRYPTION_KEY", "AWIN_WORKER_SECRET", "AWIN_CONVERSION_API_BASE_URL", "AWIN_CONVERSION_API_KEY"];
  if (generated.some((name) => names.has(name))) process.exit(2);
' || { echo 'BLOCKED: a required existing development secret is absent' >&2; exit 1; }

guard_aws_dev
fixture_url="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$EXPECTED_REGION" --query "Stacks[0].Outputs[?OutputKey=='FixtureBaseUrlDev'].OutputValue" --output text)"
fixture_secret_arn="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$EXPECTED_REGION" --query "Stacks[0].Outputs[?OutputKey=='FixtureSecretArnDev'].OutputValue" --output text)"
fixture_key="$(aws secretsmanager get-secret-value --secret-id "$fixture_secret_arn" --region "$EXPECTED_REGION" --query SecretString --output text)"
stripe_acceptance_secret="$(openssl rand -hex 32)"
awin_attribution_secret="$(openssl rand -hex 32)"
awin_outbox_encryption_key="$(openssl rand -hex 32)"
awin_worker_secret="$(openssl rand -hex 32)"
[[ "$fixture_url" == https://*.execute-api.eu-west-2.amazonaws.com ]] || { echo 'BLOCKED: fixture URL is not the guarded HTTPS endpoint' >&2; exit 1; }

printf '%s\n' \
  "AWIN_CONVERSION_API_BASE_URL=$fixture_url" \
  "AWIN_CONVERSION_API_KEY=$fixture_key" \
  "AWIN_ATTRIBUTION_SECRET=$awin_attribution_secret" \
  "AWIN_OUTBOX_ENCRYPTION_KEY=$awin_outbox_encryption_key" \
  "AWIN_WORKER_SECRET=$awin_worker_secret" \
  "STRIPE_ACCEPTANCE_WEBHOOK_SECRET=$stripe_acceptance_secret" \
  > "$TEMP_ENV"

guard_supabase_dev
acceptance_secret_set=true
supabase secrets set --env-file "$TEMP_ENV" --project-ref "$EXPECTED_REF" --profile supabase >/dev/null
for function_name in stripe-webhook create-first-box-payment-intent awin-conversion-worker; do
  guard_supabase_dev
  supabase functions deploy "$function_name" --project-ref "$EXPECTED_REF" --profile supabase >/dev/null
done

guard_supabase_dev
SUPABASE_PROJECT_REF="$EXPECTED_REF" \
STRIPE_ACCEPTANCE_WEBHOOK_SECRET="$stripe_acceptance_secret" \
AWIN_WORKER_SECRET="$awin_worker_secret" \
node "$SCRIPT_DIR/acceptance-dev.mjs"
