import { execSync } from 'node:child_process';
import type { MonitorConfig, MetricPoint } from '../types.js';

export function collectGit(config: MonitorConfig): MetricPoint {
  const gitCfg = config.git!;
  const repos = gitCfg.repos || [];
  const details: string[] = [];
  let totalIssues = 0;

  for (const repoPath of repos) {
    try {
      // Check if it's a git repo
      execSync('git rev-parse --git-dir', { cwd: repoPath, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });

      if (gitCfg.checkUntracked) {
        const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        const changes = status.split('\n').filter(Boolean).length;
        if (changes > 0) {
          totalIssues += changes;
          details.push(`${repoPath}: ${changes} uncommitted`);
        }
      }

      if (gitCfg.checkUnpushed) {
        try {
          const ahead = execSync('git rev-list --count @{u}..HEAD', { cwd: repoPath, encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          const count = parseInt(ahead) || 0;
          if (count > 0) {
            totalIssues += count;
            details.push(`${repoPath}: ${count} unpushed`);
          }
        } catch {
          // No upstream configured — skip
        }
      }
    } catch {
      details.push(`${repoPath}: not a git repo`);
      totalIssues++;
    }
  }

  const clean = totalIssues === 0;
  return {
    timestamp: Date.now(),
    value: totalIssues,
    status: clean ? 'ok' : 'warn',
    label: clean ? 'clean' : `${totalIssues} issues`,
    detail: details.join('; ') || `All ${repos.length} repo(s) clean`,
  };
}
