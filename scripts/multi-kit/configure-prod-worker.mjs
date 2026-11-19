import{execFileSync}from'node:child_process';
import{randomBytes}from'node:crypto';
import{mkdtemp,writeFile,rm}from'node:fs/promises';
import{join}from'node:path';
import{tmpdir}from'node:os';
import{prodQuery,PROD_PROJECT}from'./prod-db.mjs';

if(PROD_PROJECT!=='gvfptmjluxpngfjendbi')throw Error('Production project guard failed.');
const name='checkout_reservation_worker_bearer_prod';
const existing=await prodQuery(`select decrypted_secret from vault.decrypted_secrets where name='${name}'`);
if(existing.length>1)throw Error('Duplicate worker Vault credentials require reconciliation.');
const secret=existing[0]?.decrypted_secret??randomBytes(32).toString('hex');
if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Unexpected worker credential format.');
const directory=await mkdtemp(join(tmpdir(),'solum-worker-prod-'));
try{
 const file=join(directory,'worker.env');await writeFile(file,`CHECKOUT_RESERVATION_WORKER_SECRET=${secret}\n`,{mode:0o600});
 execFileSync('supabase',['secrets','set','--env-file',file,'--project-ref',PROD_PROJECT,'--profile','supabase'],{stdio:['ignore','pipe','pipe']});
 if(!existing.length)await prodQuery(`do $$ begin perform vault.create_secret('${secret}','${name}','SOLUM production checkout reservation worker'); end $$;`);
 const response=await fetch(`https://${PROD_PROJECT}.supabase.co/functions/v1/checkout-reservation-worker`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(45000)});
 const result=await response.json();if(!response.ok||result.failed!==0)throw Error(`Worker health check failed (${response.status}).`);
 const jobs=await prodQuery("select jobid,jobname from cron.job where jobname like 'checkout-reservation-worker%'");
 if(jobs.some(job=>job.jobname!=='checkout-reservation-worker-prod')||jobs.length>1)throw Error('Unexpected checkout worker schedule; inspect before enabling.');
 await prodQuery(`select cron.schedule('checkout-reservation-worker-prod','* * * * *',$worker$select net.http_post(url:='https://${PROD_PROJECT}.supabase.co/functions/v1/checkout-reservation-worker',headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='${name}'),'Content-Type','application/json'),body:='{}'::jsonb,timeout_milliseconds:=55000);$worker$)`);
 console.log(`Production worker authenticated successfully; one minute schedule configured. Counters: ${JSON.stringify(result)}. Credentials not printed.`);
}finally{await rm(directory,{recursive:true,force:true});}
