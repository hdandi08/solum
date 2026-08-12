#!/usr/bin/env bash
set -euo pipefail
set +x

EXPECTED_REF='rodvvmfzkyjsqbufkjbc'
JOB_NAME='awin-conversion-worker-dev'
VAULT_NAME='awin_worker_bearer_dev'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
TEMP_DIR="$(mktemp -d /tmp/solum-awin-rerun.XXXXXX)"
TEMP_ENV="$TEMP_DIR/acceptance.env"
PAUSE_MIGRATION="$REPO_DIR/supabase/migrations/20260812999994_temporary_awin_rerun_pause.sql"
VAULT_MIGRATION="$REPO_DIR/supabase/migrations/20260812999995_temporary_awin_rerun_vault.sql"
RESTORE_MIGRATION="$REPO_DIR/supabase/migrations/20260812999996_temporary_awin_rerun_restore.sql"
umask 077
chmod 700 "$TEMP_DIR"
touch "$TEMP_ENV"
chmod 600 "$TEMP_ENV"
acceptance_secret_set=false
schedule_paused=false
credentials_synchronized=false

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
  local original_status=$?
  local cleanup_failed=false
  set +x
  trap - EXIT
  if [[ "$acceptance_secret_set" == true ]] && guard_supabase_dev; then
    if ! supabase secrets unset STRIPE_ACCEPTANCE_WEBHOOK_SECRET \
      --project-ref "$EXPECTED_REF" --profile supabase --yes >/dev/null; then
      echo 'BLOCKED: temporary development secret cleanup failed' >&2
      cleanup_failed=true
    fi
  elif [[ "$acceptance_secret_set" == true ]]; then
    echo 'BLOCKED: guard failed before temporary development secret cleanup' >&2
    cleanup_failed=true
  fi

  if [[ "$schedule_paused" == true && "$credentials_synchronized" != true ]]; then
    echo 'BLOCKED: credentials did not synchronize; schedule remains paused' >&2
    cleanup_failed=true
  elif [[ "$schedule_paused" == true ]] && guard_supabase_dev; then
    cat > "$RESTORE_MIGRATION" <<'SQL'
do $restore$
begin
  if (select count(*) from cron.job where jobname = 'awin-conversion-worker-dev') <> 0 then
    raise exception 'AWIN development schedule already exists during restore';
  end if;
  if (select count(*) from vault.secrets where name = 'awin_worker_bearer_dev') <> 1 then
    raise exception 'AWIN development Vault bearer invariant failed';
  end if;
  perform cron.schedule(
    'awin-conversion-worker-dev', '* * * * *',
    $command$
      select net.http_post(
        url := 'https://rodvvmfzkyjsqbufkjbc.supabase.co/functions/v1/awin-conversion-worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'awin_worker_bearer_dev'
          )
        ),
        body := '{"limit":100}'::jsonb,
        timeout_milliseconds := 5000
      );
    $command$
  );
  if (
    select count(*) from cron.job
    where jobname = 'awin-conversion-worker-dev'
      and schedule = '* * * * *' and active
  ) <> 1 then
    raise exception 'AWIN development schedule restore failed';
  end if;
end
$restore$;
SQL
    chmod 600 "$RESTORE_MIGRATION"
    supabase db push --linked --profile supabase --yes >/dev/null 2>&1 || {
      echo 'BLOCKED: AWIN development schedule restore failed' >&2
      cleanup_failed=true
    }
    supabase migration repair 20260812999996 --status reverted \
      --linked --profile supabase >/dev/null 2>&1 || true
  elif [[ "$schedule_paused" == true ]]; then
    echo 'BLOCKED: guard failed before AWIN development schedule restore' >&2
    cleanup_failed=true
  fi

  rm -f "$PAUSE_MIGRATION" "$VAULT_MIGRATION" "$RESTORE_MIGRATION" "$TEMP_ENV"
  rmdir "$TEMP_DIR" 2>/dev/null || true
  if [[ "$cleanup_failed" == true ]]; then
    exit 1
  fi
  exit "$original_status"
}
trap cleanup_acceptance_secret EXIT

cd "$REPO_DIR"
guard_supabase_dev
stripe_acceptance_secret="$(openssl rand -hex 32)"
awin_worker_secret="$(openssl rand -hex 32)"
printf '%s\n' \
  "AWIN_WORKER_SECRET=$awin_worker_secret" \
  "STRIPE_ACCEPTANCE_WEBHOOK_SECRET=$stripe_acceptance_secret" > "$TEMP_ENV"

cat > "$PAUSE_MIGRATION" <<'SQL'
do $pause$
declare target_job_id bigint;
begin
  if (
    select count(*) from cron.job
    where jobname = 'awin-conversion-worker-dev'
      and schedule = '* * * * *' and active
  ) <> 1 then
    raise exception 'expected one active AWIN development schedule';
  end if;
  select jobid into target_job_id from cron.job
  where jobname = 'awin-conversion-worker-dev';
  perform cron.unschedule(target_job_id);
end
$pause$;
SQL
chmod 600 "$PAUSE_MIGRATION"

guard_supabase_dev
supabase db push --linked --profile supabase --yes >/dev/null 2>&1
supabase migration repair 20260812999994 --status reverted \
  --linked --profile supabase >/dev/null 2>&1 || true
rm -f "$PAUSE_MIGRATION"
schedule_paused=true

guard_supabase_dev
acceptance_secret_set=true
supabase secrets set --env-file "$TEMP_ENV" \
  --project-ref "$EXPECTED_REF" --profile supabase >/dev/null

cat > "$VAULT_MIGRATION" <<'SQL'
do $vault_sync$
declare target_id uuid;
declare next_secret text;
begin
  next_secret := current_setting('solum.awin_worker_secret', true);
  if next_secret is null or length(next_secret) < 32 then
    raise exception 'AWIN development worker bearer is unavailable';
  end if;
  if (select count(*) from vault.secrets where name = 'awin_worker_bearer_dev') <> 1 then
    raise exception 'AWIN development Vault bearer invariant failed';
  end if;
  select id into target_id from vault.secrets where name = 'awin_worker_bearer_dev';
  perform vault.update_secret(target_id, new_secret => next_secret, new_name => 'awin_worker_bearer_dev');
end
$vault_sync$;
SQL
chmod 600 "$VAULT_MIGRATION"

guard_supabase_dev
PGOPTIONS="-c solum.awin_worker_secret=$awin_worker_secret" \
  supabase db push --linked --profile supabase --yes >/dev/null 2>&1
supabase migration repair 20260812999995 --status reverted \
  --linked --profile supabase >/dev/null 2>&1 || true
rm -f "$VAULT_MIGRATION"
credentials_synchronized=true

guard_supabase_dev
SUPABASE_PROJECT_REF="$EXPECTED_REF" \
STRIPE_ACCEPTANCE_WEBHOOK_SECRET="$stripe_acceptance_secret" \
AWIN_WORKER_SECRET="$awin_worker_secret" \
node "$SCRIPT_DIR/acceptance-dev.mjs"

guard_supabase_dev
SUPABASE_PROJECT_REF="$EXPECTED_REF" \
AWIN_WORKER_SECRET="$awin_worker_secret" \
node "$SCRIPT_DIR/verify-empty-worker-dev.mjs"
