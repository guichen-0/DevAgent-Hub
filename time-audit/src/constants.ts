import * as path from 'node:path';
import * as os from 'node:os';

export const APP_NAME = 'time-audit';

export function getConfigDir(): string {
  return path.join(os.homedir(), '.time-audit');
}

export function getCacheDbPath(): string {
  return path.join(getConfigDir(), 'cache.db');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export const CHROME_HISTORY_PATH: string | null = (() => {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  return path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'History');
})();

export const EDGE_HISTORY_PATH: string | null = (() => {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  return path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'History');
})();

export const VSCODE_STORAGE_PATH: string | null = (() => {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  return path.join(appData, 'Code', 'User', 'globalStorage', 'storage.json');
})();

export const USER_HOME = os.homedir();
export const USER_DESKTOP = path.join(USER_HOME, 'Desktop');
export const USER_DOCUMENTS = path.join(USER_HOME, 'Documents');

export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'build', 'dist', '.cache',
  'target', 'venv', '.venv', '__pycache__',
];
