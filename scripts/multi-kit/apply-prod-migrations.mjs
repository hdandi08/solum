import { readFile } from 'node:fs/promises';
import { prodQuery, PROD_PROJECT } from './prod-db.mjs';

if(PROD_PROJECT!=='gvfptmjluxpngfjendbi')throw Error('Production project guard failed.');
const files=['20261101000001_checkout_reservations.sql','20261101000002_checkout_reservation_recovery.sql','20261101000003_first_box_payment_uniqueness.sql','20261119000001_multi_kit_checkout.sql'];
const recorded=await prodQuery('select version from supabase_migrations.schema_migrations');
const missing=files.filter(file=>!recorded.some(row=>row.version===file.split('_')[0]));
if(!missing.length){console.log('Production checkout migrations already recorded.');process.exit(0);}
const duplicates=await prodQuery("select count(*)::integer n from (select stripe_payment_id from public.orders where order_type='first_box' and stripe_payment_id is not null group by stripe_payment_id having count(*)>1) d");
if(duplicates[0].n)throw Error('Existing duplicate payment references require reconciliation before migration.');
const statements=[];
for(const file of missing){
 const source=await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8');
 if(source.includes('$solum_prod_source$'))throw Error('Unexpected SQL delimiter.');
 const version=file.split('_')[0],name=file.slice(15,-4);
 statements.push(source,`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',ARRAY[$solum_prod_source$${source}$solum_prod_source$]);`);
}
await prodQuery(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'; select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('solum-multi-kit-migration',19)); ${statements.join('\n')} COMMIT;`);
console.log(`Applied production checkout migrations: ${missing.join(', ')}. No flags enabled or inventory counts reset.`);
