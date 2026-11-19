import {readFile} from 'node:fs/promises';
import {devQuery,DEV_PROJECT} from './dev-db.mjs';

if(DEV_PROJECT!=='rodvvmfzkyjsqbufkjbc')throw Error('DEV project guard failed.');
const args=process.argv.slice(2);if(args.some(arg=>arg!=='--verify-only'))throw Error('Only --verify-only is supported.');
const version='20261119000002';
const source=await readFile(new URL('../../supabase/migrations/20261119000002_meta_promo.sql',import.meta.url),'utf8');
const recorded=await devQuery(`select version from supabase_migrations.schema_migrations where version='${version}'`);
if(args.includes('--verify-only')){
 const fixture=await readFile(new URL('../../supabase/tests/meta-promo-transaction.sql',import.meta.url),'utf8');
 // The fixture owns no transaction boundary when nested with migration DDL.
 const checks=fixture.replace(/^\s*begin\s*;/im,'').replace(/\brollback\s*;\s*$/im,'');
 await devQuery(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'; ${recorded.length?'':source}\n${checks}\nROLLBACK;`);
 console.log('DEV promo migration/financial fixture checks passed; transaction rolled back.');
}else if(recorded.length){
 console.log(`DEV promo migration ${version} already recorded; no changes made.`);
}else{
 if(source.includes('$meta_promo_migration_source$'))throw Error('Unexpected SQL delimiter.');
 await devQuery(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'; select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('solum-meta-promo-migration',19)); ${source}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','meta_promo',ARRAY[$meta_promo_migration_source$${source}$meta_promo_migration_source$]); COMMIT;`);
 console.log(`Applied DEV-only promo migration ${version}; production and feature flags unchanged.`);
}
