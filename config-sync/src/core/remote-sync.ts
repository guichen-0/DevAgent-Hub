import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { getVaultRoot } from '../utils/paths.js';

export interface RemoteConfig {
  url: string;
  branch: string;
  lastSync: string | null;
  autoCommit: boolean;
}

export interface SyncStatus {
  isGitRepo: boolean;
  hasRemote: boolean;
  remoteUrl: string | null;
  branch: string;
  status: string[];
  lastCommit: { hash: string; date: string; message: string } | null;
  config: RemoteConfig | null;
}

function getRemoteConfigPath(): string {
  return path.join(getVaultRoot(), 'remote.json');
}

export function readRemoteConfig(): RemoteConfig | null {
  try {
    const raw = fs.readFileSync(getRemoteConfigPath(), 'utf-8');
    return JSON.parse(raw) as RemoteConfig;
  } catch {
    return null;
  }
}

function writeRemoteConfig(config: RemoteConfig): boolean {
  try {
    fs.writeFileSync(getRemoteConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

export function isGitRepo(): boolean {
  const vaultRoot = getVaultRoot();
  return fs.existsSync(path.join(vaultRoot, '.git'));
}

export function initRemote(url: string, branch: string = 'main'): boolean {
  const vaultRoot = getVaultRoot();
  try {
    if (!isGitRepo()) {
      git('init', vaultRoot);
    }

    // Set branch name
    git(`checkout -b ${branch} 2>nul || git checkout ${branch}`, vaultRoot);

    // Add .gitignore for non-config files
    const gitignorePath = path.join(vaultRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, [
        '# Config-sync git storage',
        '# Only configuration files and metadata are tracked',
        'node_modules/',
        '.DS_Store',
      ].join('\n'), 'utf-8');
    }

    // Add remote
    try {
      git(`remote add origin ${url}`, vaultRoot);
    } catch {
      // Remote may already exist — update it
      git(`remote set-url origin ${url}`, vaultRoot);
    }

    // Initial commit if needed
    try {
      git('commit --allow-empty -m "Initialize config-sync remote" 2>nul', vaultRoot);
    } catch {
      // Might need git config for first commit
      try {
        git('-c user.name="config-sync" -c user.email="config-sync@local" commit --allow-empty -m "Initialize config-sync remote"', vaultRoot);
      } catch {
        // Already has commits or git not configured
      }
    }

    const config: RemoteConfig = {
      url,
      branch,
      lastSync: null,
      autoCommit: true,
    };
    writeRemoteConfig(config);

    return true;
  } catch {
    return false;
  }
}

export function push(): { success: boolean; message: string } {
  const vaultRoot = getVaultRoot();
  const config = readRemoteConfig();
  if (!config) return { success: false, message: 'Remote not configured. Run init first.' };
  if (!isGitRepo()) return { success: false, message: 'Vault is not a git repository.' };

  try {
    // Stage all changes in vault
    git('add -A', vaultRoot);

    // Check if there's anything to commit
    const status = git('status --porcelain', vaultRoot);
    if (status) {
      // Use inline config to avoid requiring global git user config
      git(`-c user.name="config-sync" -c user.email="config-sync@local" commit -m "Config sync backup ${new Date().toISOString()}"`, vaultRoot);
    }

    // Push to remote
    git(`push -u origin ${config.branch} 2>&1`, vaultRoot);

    config.lastSync = new Date().toISOString();
    writeRemoteConfig(config);

    return { success: true, message: status ? 'Changes committed and pushed.' : 'Nothing to push, up-to-date.' };
  } catch (err) {
    return { success: false, message: `Push failed: ${(err as Error).message}` };
  }
}

export function pull(): { success: boolean; message: string } {
  const vaultRoot = getVaultRoot();
  const config = readRemoteConfig();
  if (!config) return { success: false, message: 'Remote not configured. Run init first.' };
  if (!isGitRepo()) return { success: false, message: 'Vault is not a git repository.' };

  try {
    // Ensure we're on the right branch
    git(`checkout ${config.branch} 2>nul || git checkout -b ${config.branch}`, vaultRoot);

    // Pull from remote
    const output = git(`pull origin ${config.branch} --ff-only 2>&1`, vaultRoot);

    config.lastSync = new Date().toISOString();
    writeRemoteConfig(config);

    return { success: true, message: output || 'Pull completed.' };
  } catch (err) {
    return { success: false, message: `Pull failed: ${(err as Error).message}` };
  }
}

export function getSyncStatus(): SyncStatus {
  const vaultRoot = getVaultRoot();
  const isRepo = isGitRepo();
  const config = readRemoteConfig();

  let lastCommit: SyncStatus['lastCommit'] = null;
  let statusLines: string[] = [];
  let branch = '';

  if (isRepo) {
    try {
      branch = git('rev-parse --abbrev-ref HEAD', vaultRoot);
      if (branch === 'HEAD') branch = config?.branch || 'main';
    } catch { branch = config?.branch || 'main'; }

    try {
      statusLines = git('status --porcelain', vaultRoot).split('\n').filter(Boolean);
    } catch { /* ignore */ }

    try {
      const log = git('log -1 --format="%H|%ci|%s"', vaultRoot);
      if (log) {
        const [hash, date, ...msgParts] = log.split('|');
        lastCommit = { hash, date, message: msgParts.join('|') };
      }
    } catch { /* no commits yet */ }
  }

  let remoteUrl: string | null = null;
  let hasRemote = false;
  if (isRepo && config) {
    hasRemote = true;
    remoteUrl = config.url;
  }

  return {
    isGitRepo: isRepo,
    hasRemote,
    remoteUrl,
    branch,
    status: statusLines,
    lastCommit,
    config,
  };
}

export function disconnectRemote(): boolean {
  const vaultRoot = getVaultRoot();
  try {
    try {
      git('remote remove origin', vaultRoot);
    } catch { /* ignore */ }
    // Remove remote config
    const configPath = getRemoteConfigPath();
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    return true;
  } catch {
    return false;
  }
}
