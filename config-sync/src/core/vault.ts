import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import {
  getVaultRoot, getVaultConfigPath, getProfilesPath,
  getProfileVaultDir, getManifestPath
} from '../utils/paths.js';
import { ensureDir, readJsonSafe, writeJsonSafe, writeFileSafe, readFileSafe } from '../utils/file-utils.js';
import { getHostname, getOsVersion } from '../utils/platform.js';
import type { VaultManifest, VaultConfig, Profile, ProfilesData, BackupEntry } from '../types/index.js';

// ─── Vault ───

export function initVault(vaultPath?: string): boolean {
  const root = vaultPath ?? getVaultRoot();
  try {
    ensureDir(root);
    ensureDir(path.join(root, 'vault'));

    const configPath = vaultPath ? path.join(root, 'config.json') : getVaultConfigPath();
    if (!readJsonSafe<VaultConfig>(configPath)) {
      writeJsonSafe(configPath, {
        activeProfile: 'default',
        vaultPath: root,
      } satisfies VaultConfig);
    }

    const profilesPath = vaultPath ? path.join(root, 'profiles.json') : getProfilesPath();
    if (!readJsonSafe<ProfilesData>(profilesPath)) {
      const defaultProfile: Profile = {
        name: 'default',
        description: 'Default profile',
        enabledSources: {},
        created: new Date().toISOString(),
      };
      writeJsonSafe(profilesPath, {
        profiles: [defaultProfile],
        activeProfile: 'default',
      } satisfies ProfilesData);
    }

    return true;
  } catch {
    return false;
  }
}

export function getManifest(profileName: string): VaultManifest | null {
  return readJsonSafe<VaultManifest>(getManifestPath(profileName));
}

export function writeManifest(profileName: string, manifest: VaultManifest): boolean {
  return writeJsonSafe(getManifestPath(profileName), manifest);
}

export function createManifest(profileName: string): VaultManifest {
  return {
    profileVersion: '1.0.0',
    vaultVersion: '1',
    profile: profileName,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    machine: {
      hostname: getHostname(),
      platform: process.platform,
      osVersion: getOsVersion(),
    },
    sources: {},
  };
}

export function getVaultDirForProfile(profileName: string): string {
  return getProfileVaultDir(profileName);
}

// ─── Version History ───

export function getVersionsDir(profileName: string): string {
  return path.join(getVaultDirForProfile(profileName), 'versions');
}

export function listVersions(profileName: string): { id: string; timestamp: string; label?: string }[] {
  const versionsDir = getVersionsDir(profileName);
  if (!fs.existsSync(versionsDir)) return [];

  try {
    const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => {
        const metaPath = path.join(versionsDir, e.name, 'meta.json');
        const meta = readJsonSafe<{ timestamp: string; label?: string }>(metaPath);
        return {
          id: e.name,
          timestamp: meta?.timestamp ?? e.name,
          label: meta?.label,
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export function saveVersion(
  profileName: string,
  sourcesData: Record<string, { enabled: boolean; files: Record<string, BackupEntry> }>,
  label?: string
): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const versionId = `v-${timestamp}`;
  const versionDir = path.join(getVersionsDir(profileName), versionId);

  try {
    ensureDir(versionDir);

    // Save meta
    writeJsonSafe(path.join(versionDir, 'meta.json'), {
      timestamp: new Date().toISOString(),
      label: label ?? `Backup ${new Date().toLocaleString()}`,
      machine: {
        hostname: getHostname(),
        platform: process.platform,
      },
    });

    // Copy each source's files into the version directory
    for (const [sourceId, sourceData] of Object.entries(sourcesData)) {
      const sourceDir = path.join(versionDir, sourceId);
      ensureDir(sourceDir);

      for (const [fileId, entry] of Object.entries(sourceData.files)) {
        const vaultFilePath = path.join(getVaultDirForProfile(profileName), entry.relativePath);
        if (fs.existsSync(vaultFilePath)) {
          const content = readFileSafe(vaultFilePath);
          if (content !== null) {
            writeFileSafe(path.join(sourceDir, `${fileId}.json`), content);
          }
        }
      }
    }

    // Write the manifest snapshot
    writeJsonSafe(path.join(versionDir, 'manifest.json'), sourcesData);

    return versionId;
  } catch {
    return null;
  }
}

export function getVersionManifest(profileName: string, versionId: string): Record<string, { enabled: boolean; files: Record<string, BackupEntry> }> | null {
  return readJsonSafe(path.join(getVersionsDir(profileName), versionId, 'manifest.json'));
}

export function getVersionFile(profileName: string, versionId: string, sourceId: string, fileId: string): string | null {
  return readFileSafe(path.join(getVersionsDir(profileName), versionId, sourceId, `${fileId}.json`));
}

export function deleteVersion(profileName: string, versionId: string): boolean {
  const versionDir = path.join(getVersionsDir(profileName), versionId);
  try {
    fs.rmSync(versionDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// ─── Profiles ───

export function getProfiles(): ProfilesData {
  const data = readJsonSafe<ProfilesData>(getProfilesPath());
  if (!data) {
    const defaultData: ProfilesData = {
      profiles: [{ name: 'default', description: 'Default profile', enabledSources: {}, created: new Date().toISOString() }],
      activeProfile: 'default',
    };
    return defaultData;
  }
  return data;
}

export function saveProfiles(data: ProfilesData): boolean {
  return writeJsonSafe(getProfilesPath(), data);
}

export function getActiveProfile(): Profile | undefined {
  const data = getProfiles();
  return data.profiles.find(p => p.name === data.activeProfile);
}

export function setActiveProfile(name: string): boolean {
  const data = getProfiles();
  if (!data.profiles.find(p => p.name === name)) return false;
  data.activeProfile = name;
  return saveProfiles(data);
}

export function createProfile(name: string, description?: string): boolean {
  const data = getProfiles();
  if (data.profiles.find(p => p.name === name)) return false;
  data.profiles.push({
    name,
    description: description ?? '',
    enabledSources: {},
    created: new Date().toISOString(),
  });
  return saveProfiles(data);
}

export function deleteProfile(name: string): boolean {
  if (name === 'default') return false;
  const data = getProfiles();
  const idx = data.profiles.findIndex(p => p.name === name);
  if (idx === -1) return false;
  data.profiles.splice(idx, 1);
  if (data.activeProfile === name) {
    data.activeProfile = 'default';
  }
  return saveProfiles(data);
}
