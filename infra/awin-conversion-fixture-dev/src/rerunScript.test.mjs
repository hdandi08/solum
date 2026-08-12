import test from 'node:test'
import assert from 'node:assert/strict'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const fixtureDir = resolve(import.meta.dirname, '..')
const script = join(fixtureDir, 'scripts/rerun-acceptance-supabase-dev.sh')

test('rerun synchronizes the DEV Edge/Vault bearer while the exact minute job is paused and always restored', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'solum-awin-rerun-contract.'))
  const bin = join(sandbox, 'bin')
  const trace = join(sandbox, 'trace')
  await import('node:fs/promises').then(({ mkdir }) => mkdir(bin))
  const executable = async (name, source) => {
    const path = join(bin, name)
    await writeFile(path, source, { mode: 0o700 })
    await chmod(path, 0o700)
  }
  await executable('openssl', '#!/bin/sh\nprintf %s fake-development-secret-0123456789abcdef\n')
  await executable('node', `#!/bin/sh
case "$*" in
  *acceptance-dev.mjs*)
    printf '%s\n' acceptance >> "$TRACE"
    [ "\${FAIL_ACCEPTANCE:-0}" = 1 ] && exit 7
    ;;
  *verify-empty-worker-dev.mjs*) printf '%s\n' empty_worker_check >> "$TRACE" ;;
esac
exit 0
`)
  await executable('supabase', `#!/bin/sh
case "$1 $2" in
  'projects list') printf '%s\n' '[{"id":"rodvvmfzkyjsqbufkjbc"}]' ;;
  'secrets set')
    printf '%s\n' edge_secret_set >> "$TRACE"
    for arg in "$@"; do
      if [ -f "$arg" ]; then
        [ "$(stat -f %Lp "$arg")" = 600 ] || exit 91
        grep -q '^AWIN_WORKER_SECRET=' "$arg" || exit 92
        grep -q '^STRIPE_ACCEPTANCE_WEBHOOK_SECRET=' "$arg" || exit 93
      fi
    done
    ;;
  'secrets unset') printf '%s\n' stripe_secret_unset >> "$TRACE" ;;
  'db push')
    for migration in "$REPO_DIR"/supabase/migrations/*temporary_awin_rerun*.sql; do
      [ -f "$migration" ] || continue
      grep -q 'cron.unschedule' "$migration" && printf '%s\n' schedule_paused >> "$TRACE"
      grep -q 'vault.update_secret' "$migration" && {
        case "$PGOPTIONS" in *fake-development-secret-0123456789abcdef*) : ;; *) exit 94 ;; esac
        printf '%s\n' vault_secret_set >> "$TRACE"
      }
      grep -q 'cron.schedule' "$migration" && printf '%s\n' schedule_restored >> "$TRACE"
    done
    ;;
esac
exit 0
`)

  const result = spawnSync('/bin/bash', [script], {
    cwd: resolve(fixtureDir, '../..'),
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace, REPO_DIR: resolve(fixtureDir, '../..') },
    encoding: 'utf8',
  })
  const actions = (await readFile(trace, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean)

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(actions, [
    'schedule_paused',
    'edge_secret_set',
    'vault_secret_set',
    'acceptance',
    'empty_worker_check',
    'stripe_secret_unset',
    'schedule_restored',
  ])
  assert.doesNotMatch(`${result.stdout}${result.stderr}`, /fake-development-secret/)

  await writeFile(trace, '')
  const failed = spawnSync('/bin/bash', [script], {
    cwd: resolve(fixtureDir, '../..'),
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TRACE: trace,
      REPO_DIR: resolve(fixtureDir, '../..'),
      FAIL_ACCEPTANCE: '1',
    },
    encoding: 'utf8',
  })
  const failedActions = (await readFile(trace, 'utf8')).trim().split('\n').filter(Boolean)
  await rm(sandbox, { recursive: true, force: true })

  assert.equal(failed.status, 7, failed.stderr)
  assert.deepEqual(failedActions, [
    'schedule_paused',
    'edge_secret_set',
    'vault_secret_set',
    'acceptance',
    'stripe_secret_unset',
    'schedule_restored',
  ])
  assert.doesNotMatch(`${failed.stdout}${failed.stderr}`, /fake-development-secret/)
});
