import { execFileSync } from 'node:child_process';

const REPO = process.cwd();

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}

export function headSha(): string {
  return git(['rev-parse', 'HEAD']);
}

export function hasChanges(): boolean {
  return git(['status', '--porcelain']).length > 0;
}

export function commitAll(message: string): string | null {
  if (!hasChanges()) return null;
  git(['add', '-A']);
  git(['commit', '-m', message]);
  return headSha();
}

export function revertCommits(shas: string[]): void {
  // newest first so parents apply cleanly
  for (const sha of shas) {
    git(['revert', '--no-edit', sha]);
  }
}
