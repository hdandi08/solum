import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import * as dotenv from 'dotenv';

type Environment = Record<string, string | undefined>;
type ResolveCommonGitDir = () => string;

export function loadE2EEnvironment(
  webRoot = process.cwd(),
  env: Environment = process.env,
  resolveCommonGitDir: ResolveCommonGitDir = () => resolve(
    webRoot,
    execFileSync(
      'git',
      ['rev-parse', '--git-common-dir'],
      { cwd: webRoot, encoding: 'utf8' },
    ).trim(),
  ),
) {
  const load = (file: string) => {
    if (!existsSync(file)) return;
    dotenv.config({
      path: file,
      processEnv: env,
      override: false,
      quiet: true,
    });
  };

  load(join(webRoot, '.env.test'));
  load(join(webRoot, '.env.local'));

  let commonGitDir: string;
  try {
    commonGitDir = resolveCommonGitDir();
  } catch {
    return;
  }

  const mainWebRoot = join(dirname(commonGitDir), 'web');
  if (resolve(mainWebRoot) === resolve(webRoot)) return;

  load(join(mainWebRoot, '.env.test'));
  load(join(mainWebRoot, '.env.local'));
}
