// ─── Config file types ───

export type ConfigFormat = 'json' | 'yaml' | 'toml' | 'plaintext' | 'ext-list';

export interface ConfigFile {
  sourceId: string;
  fileId: string;
  label: string;
  filePath: string;
  format: ConfigFormat;
  encoding?: string;
}

export interface BackupEntry {
  relativePath: string;
  originalPath: string;
  label: string;
  format: ConfigFormat;
  hash: string;
  backupTime: string;
  size: number;
}

// ─── Source adapter ───

export type Platform = NodeJS.Platform;

export interface ConfigSource {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly platforms: Platform[];

  isInstalled(): boolean;
  detectConfigs(): ConfigFile[];
}

export interface SyncContext {
  profileName: string;
  vaultDir: string;
  dryRun: boolean;
  force: boolean;
}

export interface BackupResult {
  sourceId: string;
  fileResults: { fileId: string; success: boolean; hash?: string; error?: string }[];
}

export interface RestoreResult {
  sourceId: string;
  fileResults: { fileId: string; success: boolean; skipped?: boolean; error?: string }[];
}

export interface DiffResult {
  sourceId: string;
  fileDiffs: { fileId: string; label: string; hasDiff: boolean; diff?: string }[];
}

// ─── Vault types ───

export interface VaultManifest {
  profileVersion: string;
  vaultVersion: string;
  profile: string;
  created: string;
  lastUpdated: string;
  machine: {
    hostname: string;
    platform: string;
    osVersion: string;
  };
  sources: Record<string, {
    enabled: boolean;
    files: Record<string, BackupEntry>;
  }>;
}

export interface VaultConfig {
  activeProfile: string;
  vaultPath: string;
}

// ─── Profile types ───

export interface Profile {
  name: string;
  description: string;
  enabledSources: Record<string, boolean>;
  created: string;
  lastUsed?: string;
}

export interface ProfilesData {
  profiles: Profile[];
  activeProfile: string;
}
