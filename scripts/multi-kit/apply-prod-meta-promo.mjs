import {readFile} from 'node:fs/promises';
import {prodQuery,PROD_PROJECT} from './prod-db.mjs';

if(PROD_PROJECT!=='gvfptmjluxpngfjendbi')throw Error('Production project guard failed.');
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--verify-only'))throw Error('Only --verify-only is supported.');
const files=['20261119000002_meta_promo.sql','20261121000001_short_promo_codes.sql','20261121000002_multi_kit_order_shape.sql'];
const recorded=await prodQuery('select version from supabase_migrations.schema_migrations');
if(!recorded.some(row=>row.version==='20261119000001'))throw Error('Production multi-kit prerequisite is missing.');
const sources=await Promise.all(files.map(file=>readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8')));
const missing=files.map((file,index)=>({file,source:sources[index],version:file.split('_')[0]})).filter(item=>!recorded.some(row=>row.version===item.version));
if(args.includes('--verify-only')){
 const stripTransaction=sql=>sql.replace(/^\s*begin\s*;/im,'').replace(/\brollback\s*;\s*$/im,'');
 const financial=stripTransaction(await readFile(new URL('../../supabase/tests/meta-promo-transaction.sql',import.meta.url),'utf8'));
 const shortCodes=stripTransaction(await readFile(new URL('../../supabase/tests/short-promo-codes.sql',import.meta.url),'utf8')).replace('-- APPLY_SHORT_PROMO_MIGRATION_HERE',()=>sources[1]);
 await prodQuery(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'; ${missing.filter(item=>item.version!=='20261121000001').map(item=>item.source).join('\n')}\n${financial}\n${shortCodes}\nROLLBACK;`);
 console.log('Production promo financial, settlement, privacy and short-code fixtures passed; every fixture change rolled back.');
}else if(!missing.length){
 console.log('Production promo migrations already recorded; no changes made.');
}else{
 const statements=missing.map(({file,source,version})=>{
  if(source.includes('$solum_prod_promo_source$'))throw Error('Unexpected migration delimiter.');
  return `${source}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${file.slice(15,-4)}',ARRAY[$solum_prod_promo_source$${source}$solum_prod_promo_source$]);`;
 });
 await prodQuery(`BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='45s'; select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('solum-meta-promo-migration',19)); ${statements.join('\n')} COMMIT;`);
 console.log(`Applied only production promo migrations ${missing.map(item=>item.version).join(', ')}. Campaign remains disabled; inventory was not reset.`);
}
