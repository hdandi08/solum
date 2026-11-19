import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const args=process.argv.slice(2);if(args.some(arg=>arg!=='--disable'))throw Error('Only --disable is supported.');
const target=['--region','eu-west-2','--app-id','d3pa095gzazg3c'];
const app=JSON.parse(execFileSync('aws',['amplify','get-app',...target,'--query','app.{arn:appArn,vars:environmentVariables}','--output','json'],{encoding:'utf8'}));
const branch=JSON.parse(execFileSync('aws',['amplify','get-branch',...target,'--branch-name','master','--query','branch.{arn:branchArn,vars:environmentVariables}','--output','json'],{encoding:'utf8'}));
if(!branch.arn?.includes(':798470762256:apps/d3pa095gzazg3c/branches/master'))throw Error('Production branch/account guard failed.');
const effective={...app.vars,...branch.vars};
if(effective.VITE_SUPABASE_URL!=='https://gvfptmjluxpngfjendbi.supabase.co'||!effective.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_'))throw Error('Production/live configuration guard failed.');
const directory=await mkdtemp(join(tmpdir(),'solum-multi-prod-'));
try{
 const file=join(directory,'environment.json');
 await writeFile(file,JSON.stringify({...branch.vars,VITE_MULTI_KIT_CHECKOUT_ENABLED:String(!args.includes('--disable'))}),{mode:0o600});
 execFileSync('aws',['amplify','update-branch',...target,'--branch-name','master','--environment-variables',`file://${file}`,'--query','branch.branchName','--output','text'],{stdio:['ignore','pipe','pipe']});
 console.log(`Production frontend multi-kit flag ${args.includes('--disable')?'disabled':'enabled'}; inherited and branch settings preserved.`);
}finally{await rm(directory,{recursive:true,force:true});}
