// Explicit branch-only preview configuration. Never updates app-level settings.
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const target = ['--region','eu-west-2','--app-id','d3pa095gzazg3c','--branch-name','dev'];
if (process.argv.slice(2).some(arg => arg !== '--disable')) throw Error('Only --disable is supported.');
const enabled = !process.argv.includes('--disable');
const branch = JSON.parse(execFileSync('aws',['amplify','get-branch',...target,'--query','branch.{arn:branchArn,vars:environmentVariables}','--output','json'],{encoding:'utf8'}));
if (!branch.arn?.includes(':798470762256:apps/d3pa095gzazg3c/branches/dev')) throw Error('DEV Amplify branch/account guard failed.');
const vars = branch.vars ?? {};
if (vars.VITE_SUPABASE_URL !== 'https://rodvvmfzkyjsqbufkjbc.supabase.co' || !vars.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) throw Error('DEV/test preview configuration guard failed.');
const directory = await mkdtemp(join(tmpdir(),'solum-multi-dev-'));
try {
  const file = join(directory,'environment.json');
  await writeFile(file,JSON.stringify({...vars,VITE_MULTI_KIT_CHECKOUT_ENABLED:String(enabled)}),{mode:0o600});
  execFileSync('aws',['amplify','update-branch',...target,'--environment-variables',`file://${file}`,'--query','branch.branchName','--output','text'],{stdio:['ignore','pipe','pipe']});
  console.log(`${enabled ? 'Enabled' : 'Disabled'} the multi-kit preview flag on Amplify dev only; other branch variables preserved.`);
} finally { await rm(directory,{recursive:true,force:true}); }
