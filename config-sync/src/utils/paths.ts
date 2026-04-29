import * as path from 'node:path';
import * as os from 'node:os';
import { isWindows } from './platform.js';

export function getVaultRoot(): string {
  return path.join(os.homedir(), '.config-sync');
}

export function getVaultConfigPath(): string {
  return path.join(getVaultRoot(), 'config.json');
}

export function getProfilesPath(): string {
  return path.join(getVaultRoot(), 'profiles.json');
}

export function getProfileVaultDir(profileName: string): string {
  return path.join(getVaultRoot(), 'vault', `profile_${profileName}`);
}

export function getManifestPath(profileName: string): string {
  return path.join(getProfileVaultDir(profileName), 'manifest.json');
}

// ─── Tool-specific config paths ───

export function getVSCodeConfigDir(): string | null {
  if (isWindows()) {
    const appData = process.env.APPDATA;
    if (!appData) return null;
    return path.join(appData, 'Code', 'User');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User');
  }
  // Linux
  return path.join(os.homedir(), '.config', 'Code', 'User');
}

export function getGitConfigPath(): string {
  return path.join(os.homedir(), '.gitconfig');
}

export function getShellProfilePaths(): Record<string, string> {
  const home = os.homedir();
  const result: Record<string, string> = {};

  if (isWindows()) {
    const userProfile = process.env.USERPROFILE;
    if (userProfile) {
      const psPath = path.join(userProfile, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
      result['powershell'] = psPath;
    }
  } else {
    result['bashrc'] = path.join(home, '.bashrc');
    result['zshrc'] = path.join(home, '.zshrc');
    result['bash_profile'] = path.join(home, '.bash_profile');
  }

  return result;
}

export function getWindowsTerminalConfigPath(): string | null {
  if (!isWindows()) return null;
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  // Windows Terminal settings are in a packaged folder
  const packagesDir = path.join(localAppData, 'Packages');
  // This is approximate; the exact path varies by Windows Terminal version
  return path.join(packagesDir, 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json');
}
