import { readFile } from 'node:fs/promises';
import { devQuery, DEV_PROJECT } from './dev-db.mjs';

const version = '20261119000001';
const source = await readFile(new URL('../../supabase/migrations/20261119000001_multi_kit_checkout.sql', import.meta.url), 'utf8');
if (DEV_PROJECT !== 'rodvvmfzkyjsqbufkjbc') throw Error('DEV project guard failed.');
const existing = await devQuery(`select version from supabase_migrations.schema_migrations where version='${version}'`);
if (existing.length) {
  console.log(`DEV migration ${version} is already recorded; no changes made.`);
} else {
  if (source.includes('$multi_kit_migration_source$')) throw Error('Unexpected SQL delimiter.');
  await devQuery(`BEGIN;
    select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('solum-multi-kit-migration',19));
    ${source}
    insert into supabase_migrations.schema_migrations(version,name,statements)
    values('${version}','multi_kit_checkout',ARRAY[$multi_kit_migration_source$${source}$multi_kit_migration_source$]);
    COMMIT;`);
  console.log(`Applied DEV-only migration ${version}; checkout feature flags unchanged.`);
}
