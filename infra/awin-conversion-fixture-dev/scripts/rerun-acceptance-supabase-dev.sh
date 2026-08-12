#!/usr/bin/env bash
set -euo pipefail

EXPECTED_REF='rodvvmfzkyjsqbufkjbc'
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

cleanup_acceptance_secret() {
  rm -f "$TEMP_ENV"
  [[ "$acceptance_secret_set" == true ]] || return 0
  if guard_supabase_dev; then
    supabase secrets unset STRIPE_ACCEPTANCE_WEBHOOK_SECRET \
      --project-ref "$EXPECTED_REF" --profile supabase --yes >/dev/null ||
      echo 'BLOCKED: temporary development secret cleanup failed' >&2
  else
    echo 'BLOCKED: guard failed before temporary development secret cleanup' >&2
  fi
}
trap cleanup_acceptance_secret EXIT

cd "$REPO_DIR"
guard_supabase_dev
stripe_acceptance_secret="$(openssl rand -hex 32)"
awin_worker_secret="$(openssl rand -hex 32)"
printf '%s\n' \
  "AWIN_WORKER_SECRET=$awin_worker_secret" \
  "STRIPE_ACCEPTANCE_WEBHOOK_SECRET=$stripe_acceptance_secret" > "$TEMP_ENV"

guard_supabase_dev
acceptance_secret_set=true
supabase secrets set --env-file "$TEMP_ENV" \
  --project-ref "$EXPECTED_REF" --profile supabase >/dev/null

guard_supabase_dev
SUPABASE_PROJECT_REF="$EXPECTED_REF" \
STRIPE_ACCEPTANCE_WEBHOOK_SECRET="$stripe_acceptance_secret" \
AWIN_WORKER_SECRET="$awin_worker_secret" \
node "$SCRIPT_DIR/acceptance-dev.mjs"
