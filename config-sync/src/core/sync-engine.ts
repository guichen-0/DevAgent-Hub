import * as path from 'node:path';
import {
  getSourcesForCurrentPlatform, getSourceById
} from '../sources/registry.js';
import {
  getManifest, writeManifest, createManifest,
  getVaultDirForProfile, saveVersion, getVersionManifest, getVersionFile
} from './vault.js';
import { getActiveProfile } from './vault.js';
import { fileExists, readFileSafe, writeFileSafe, ensureDir } from '../utils/file-utils.js';
import { hashContent, hashFile } from '../utils/hasher.js';
import type {
  ConfigSource, ConfigFile, BackupResult, RestoreResult,
  BackupEntry
} from '../types/index.js';

function getProfileEnabledSources(profileName: string): ConfigSource[] {
  const profile = getActiveProfile();
  if (!profile) return [];

  const allSources = getSourcesForCurrentPlatform();
  return allSources.filter(s => {
    const enabled = profile.enabledSources[s.id];
    return enabled !== false;
  });
}

export function backupProfile(profileName: string, dryRun: boolean = false, label?: string): BackupResult[] {
  const results: BackupResult[] = [];
  const sources = getProfileEnabledSources(profileName);
  const vaultDir = getVaultDirForProfile(profileName);

  let manifest = getManifest(profileName) ?? createManifest(profileName);
  ensureDir(vaultDir);

  for (const source of sources) {
    const result: BackupResult = { sourceId: source.id, fileResults: [] };

    if (!source.isInstalled()) {
      result.fileResults.push({ fileId: 'all', success: false, error: 'Not installed' });
      results.push(result);
      continue;
    }

    const configs = source.detectConfigs();
    const sourceDir = path.join(vaultDir, source.id);
    ensureDir(sourceDir);

    const sourceManifest: Record<string, BackupEntry> = {};

    for (const config of configs) {
      const content = readFileSafe(config.filePath);
      if (content === null) {
        result.fileResults.push({ fileId: config.fileId, success: false, error: 'Cannot read file' });
        continue;
      }

      const hash = hashContent(content);
      const relativePath = path.join(source.id, `${config.fileId}.${config.format === 'json' ? 'json' : 'cfg'}`);

      if (!dryRun) {
        writeFileSafe(path.join(vaultDir, relativePath), content);
      }

      sourceManifest[config.fileId] = {
        relativePath,
        originalPath: config.filePath,
        label: config.label,
        format: config.format,
        hash,
        backupTime: new Date().toISOString(),
        size: content.length,
      };

      result.fileResults.push({ fileId: config.fileId, success: true, hash });
    }

    if (!dryRun && Object.keys(sourceManifest).length > 0) {
      manifest.sources[source.id] = {
        enabled: true,
        files: sourceManifest,
      };
    }

    results.push(result);
  }

  if (!dryRun) {
    manifest.lastUpdated = new Date().toISOString();
    writeManifest(profileName, manifest);

    // Save a version snapshot
    const versionId = saveVersion(profileName, manifest.sources, label);
    if (versionId) {
      (results as BackupResult[] & { versionId?: string }).versionId = versionId;
    }
  }

  return results;
}

export function restoreProfile(profileName: string, dryRun: boolean = false, force: boolean = false): RestoreResult[] {
  const results: RestoreResult[] = [];
  const sources = getProfileEnabledSources(profileName);
  const vaultDir = getVaultDirForProfile(profileName);
  const manifest = getManifest(profileName);

  if (!manifest) {
    return [{ sourceId: 'all', fileResults: [{ fileId: 'all', success: false, error: 'No backup found for this profile' }] }];
  }

  for (const source of sources) {
    const result: RestoreResult = { sourceId: source.id, fileResults: [] };
    const sourceManifest = manifest.sources[source.id];
    if (!sourceManifest) {
      result.fileResults.push({ fileId: 'all', success: false, error: 'No backup for this source' });
      results.push(result);
      continue;
    }

    for (const [fileId, entry] of Object.entries(sourceManifest.files)) {
      const vaultFilePath = path.join(vaultDir, entry.relativePath);
      if (!fileExists(vaultFilePath)) {
        result.fileResults.push({ fileId, success: false, error: 'Backup file missing' });
        continue;
      }

      const localHash = hashFile(entry.originalPath);
      if (localHash === entry.hash && !force) {
        result.fileResults.push({ fileId, success: true, skipped: true });
        continue;
      }

      if (!dryRun) {
        const content = readFileSafe(vaultFilePath);
        if (content === null) {
          result.fileResults.push({ fileId, success: false, error: 'Cannot read backup file' });
          continue;
        }
        writeFileSafe(entry.originalPath, content);
      }

      result.fileResults.push({ fileId, success: true });
    }

    results.push(result);
  }

  return results;
}

export function restoreFromVersion(profileName: string, versionId: string, dryRun: boolean = false, force: boolean = false): RestoreResult[] {
  const results: RestoreResult[] = [];
  const versionManifest = getVersionManifest(profileName, versionId);

  if (!versionManifest) {
    return [{ sourceId: 'all', fileResults: [{ fileId: 'all', success: false, error: 'Version not found' }] }];
  }

  for (const [sourceId, sourceData] of Object.entries(versionManifest)) {
    if (!sourceData.enabled) continue;

    const result: RestoreResult = { sourceId, fileResults: [] };

    for (const [fileId, entry] of Object.entries(sourceData.files)) {
      const versionContent = getVersionFile(profileName, versionId, sourceId, fileId);
      if (versionContent === null) {
        result.fileResults.push({ fileId, success: false, error: 'Version file not found' });
        continue;
      }

      const localHash = hashFile(entry.originalPath);
      const versionHash = hashContent(versionContent);

      if (localHash === versionHash && !force) {
        result.fileResults.push({ fileId, success: true, skipped: true });
        continue;
      }

      if (!dryRun) {
        writeFileSafe(entry.originalPath, versionContent);
      }

      result.fileResults.push({ fileId, success: true });
    }

    results.push(result);
  }

  return results;
}
