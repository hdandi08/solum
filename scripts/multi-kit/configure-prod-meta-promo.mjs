// Explicit production-only campaign configuration. Never prints credentials.
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {prodQuery,PROD_PROJECT} from './prod-db.mjs';
const args=process.argv.slice(2);
if(PROD_PROJECT!=='gvfptmjluxpngfjendbi'||args.some(arg=>arg!=='--disable'))throw Error('Production configuration guard failed.');
const enabled=!args.includes('--disable');
const target=['--region','eu-west-2','--app-id','d3pa095gzazg3c'];
const run=(command,argv)=>execFileSync(command,argv,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
let stage='validation';
try{
 const app=JSON.parse(run('aws',['amplify','get-app',...target,'--query','app.{arn:appArn,vars:environmentVariables}','--output','json']));
 const branch=JSON.parse(run('aws',['amplify','get-branch',...target,'--branch-name','master','--query','branch.{arn:branchArn,vars:environmentVariables}','--output','json']));
 if(!branch.arn?.includes(':798470762256:apps/d3pa095gzazg3c/branches/master'))throw Error('Production branch/account guard failed.');
 const effective={...app.vars,...branch.vars};
 if(effective.VITE_SUPABASE_URL!==`https://${PROD_PROJECT}.supabase.co`||!effective.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_')||effective.VITE_MULTI_KIT_CHECKOUT_ENABLED!=='true')throw Error('Production/live/multi-kit guard failed.');
 const campaign=await prodQuery("select id,ends_at,now()<ends_at as active_window from public.meta_promo_campaigns where id='black-friday-2026'");
 if(campaign.length!==1||Date.parse(campaign[0].ends_at)!==Date.parse('2026-12-01T00:00:00Z')||(enabled&&!campaign[0].active_window))throw Error('Campaign deadline guard failed.');
 stage='production Vault';
 const name='meta_promo_entry_secret_prod';
 const records=await prodQuery(`select decrypted_secret from vault.decrypted_secrets where name='${name}'`);
 if(records.length>1)throw Error('Duplicate campaign secret.');
 const secret=records[0]?.decrypted_secret??randomBytes(32).toString('hex');
 if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Campaign secret format guard failed.');
 if(!records.length)await prodQuery(`select vault.create_secret('${secret}','${name}','SOLUM production Black Friday campaign key')`);
 const directory=await mkdtemp(join(tmpdir(),'solum-promo-prod-'));
 try{
  stage='production Edge flags';
  const envFile=join(directory,'edge.env');
  await writeFile(envFile,`META_PROMO_ENTRY_SECRET=${secret}\nMETA_PROMO_ENABLED=${enabled}\n`,{mode:0o600});
  run('supabase',['secrets','set','--env-file',envFile,'--project-ref',PROD_PROJECT,'--profile','supabase']);
  stage='production campaign';
  await prodQuery(`update public.meta_promo_campaigns set starts_at=case when enabled then starts_at else now() end,enabled=${enabled} where id='black-friday-2026' and ends_at='2026-12-01T00:00:00Z'::timestamptz`);
  stage='production frontend flag';
  const branchFile=join(directory,'amplify.json');
  await writeFile(branchFile,JSON.stringify({...branch.vars,VITE_META_PROMO_ENABLED:String(enabled)}),{mode:0o600});
  run('aws',['amplify','update-branch',...target,'--branch-name','master','--environment-variables',`file://${branchFile}`,'--query','branch.branchName','--output','text']);
  console.log(`Production promo ${enabled?'enabled':'disabled'}; other branch settings, live payment credentials and tracking secrets preserved.`);
 }finally{await rm(directory,{recursive:true,force:true});}
}catch{
 console.error(`Production promo configuration failed during ${stage}; provider details withheld to protect credentials.`);
 process.exitCode=1;
}
