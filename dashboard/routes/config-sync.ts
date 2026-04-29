import { Router } from 'express';
import { initVault, getProfiles, getActiveProfile, createProfile, setActiveProfile } from '../../config-sync/src/core/vault.js';
import { getSourcesForCurrentPlatform } from '../../config-sync/src/sources/registry.js';
import { backupProfile, restoreProfile, restoreFromVersion } from '../../config-sync/src/core/sync-engine.js';
import { getManifest, listVersions, deleteVersion, getVersionFile, getVersionManifest } from '../../config-sync/src/core/vault.js';
import { readFileSafe } from '../../config-sync/src/utils/file-utils.js';
import { initRemote, push, pull, getSyncStatus, disconnectRemote } from '../../config-sync/src/core/remote-sync.js';

const router = Router();

router.post('/init', (req, res) => {
  const { profile } = req.body || {};
  const ok = initVault();
  if (profile) {
    createProfile(profile);
    setActiveProfile(profile);
  }
  res.json({ success: ok, profile: profile || 'default' });
});

router.get('/profiles', (req, res) => {
  res.json(getProfiles());
});

router.get('/sources', (req, res) => {
  const sources = getSourcesForCurrentPlatform().map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    installed: s.isInstalled(),
  }));
  res.json({ sources });
});

router.get('/discover', (req, res) => {
  const sources = getSourcesForCurrentPlatform();
  const result = sources.map(s => {
    if (!s.isInstalled()) return { id: s.id, name: s.name, status: 'not-installed', files: [] };
    const configs = s.detectConfigs();
    return { id: s.id, name: s.name, status: 'ok', files: configs.map(c => ({ id: c.fileId, label: c.label, path: c.filePath })) };
  });
  res.json({ sources: result });
});

router.post('/backup', (req, res) => {
  const { profile, dryRun, label } = req.body || {};
  const results = backupProfile(profile || getActiveProfile()?.name || 'default', dryRun, label);
  const versionId = (results as any).versionId;
  res.json({ results, versionId });
});

router.post('/restore', (req, res) => {
  const { profile, dryRun, force } = req.body || {};
  const results = restoreProfile(profile || getActiveProfile()?.name || 'default', dryRun, force);
  res.json({ results });
});

router.get('/status', (req, res) => {
  const profile = getActiveProfile();
  const sources = getSourcesForCurrentPlatform();
  const manifest = profile ? getManifest(profile.name) : null;

  const statuses = sources.map(s => {
    if (!s.isInstalled()) return { id: s.id, name: s.name, status: 'not-installed' };
    const sourceManifest = manifest?.sources[s.id];
    if (!sourceManifest) return { id: s.id, name: s.name, status: 'not-backed-up' };
    return {
      id: s.id,
      name: s.name,
      status: 'ready',
      files: Object.keys(sourceManifest.files).length,
    };
  });

  res.json({ activeProfile: profile?.name || null, sources: statuses });
});

// ─── Version History ───

router.get('/versions', (req, res) => {
  const profile = req.query.profile as string || getActiveProfile()?.name || 'default';
  const versions = listVersions(profile);
  res.json({ profile, versions });
});

router.post('/versions/restore', (req, res) => {
  const { profile, versionId, dryRun, force } = req.body || {};
  const p = profile || getActiveProfile()?.name || 'default';
  const results = restoreFromVersion(p, versionId, dryRun, force);
  res.json({ results });
});

router.post('/versions/delete', (req, res) => {
  const { profile, versionId } = req.body || {};
  const p = profile || getActiveProfile()?.name || 'default';
  const ok = deleteVersion(p, versionId);
  res.json({ success: ok });
});

// ─── Diff ───

router.post('/versions/diff', (req, res) => {
  const { profile, versionId } = req.body || {};
  const p = profile || getActiveProfile()?.name || 'default';
  const vManifest = getVersionManifest(p, versionId);

  if (!vManifest) {
    res.json({ error: 'Version not found', diffs: [] });
    return;
  }

  const diffs: any[] = [];

  for (const [sourceId, sourceData] of Object.entries(vManifest)) {
    if (!sourceData.enabled) continue;

    for (const [fileId, entry] of Object.entries(sourceData.files)) {
      const versionContent = getVersionFile(p, versionId, sourceId, fileId);
      const localContent = readFileSafe(entry.originalPath);

      const lines = generateDiff(
        localContent ?? '',
        versionContent ?? '',
        entry.label || fileId
      );

      diffs.push({
        sourceId,
        fileId,
        label: entry.label || fileId,
        originalPath: entry.originalPath,
        hasLocal: localContent !== null,
        lines,
        stats: {
          additions: lines.filter(l => l.type === 'add').length,
          removals: lines.filter(l => l.type === 'remove').length,
        },
      });
    }
  }

  res.json({ diffs });
});

// ─── Simple line diff ───

interface DiffLine {
  type: 'same' | 'add' | 'remove';
  text: string;
  lineNumA?: number;
  lineNumB?: number;
}

function generateDiff(oldText: string, newText: string, label: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // LCS-based diff
  const result: DiffLine[] = [];
  const dp: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
    Array(newLines.length + 1).fill(0)
  );

  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = oldLines.length;
  let j = newLines.length;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.push({ type: 'same', text: oldLines[i - 1], lineNumA: i, lineNumB: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: 'add', text: newLines[j - 1], lineNumB: j });
      j--;
    } else {
      temp.push({ type: 'remove', text: oldLines[i - 1], lineNumA: i });
      i--;
    }
  }

  return temp.reverse();
}

// ─── Remote Sync ───

router.get('/remote/status', (req, res) => {
  const status = getSyncStatus();
  res.json(status);
});

router.post('/remote/init', (req, res) => {
  const { url, branch } = req.body || {};
  if (!url) {
    res.json({ success: false, error: 'Remote URL is required' });
    return;
  }
  const ok = initRemote(url, branch || 'main');
  res.json({ success: ok, url, branch: branch || 'main' });
});

router.post('/remote/push', (req, res) => {
  const result = push();
  res.json(result);
});

router.post('/remote/pull', (req, res) => {
  const result = pull();
  res.json(result);
});

router.post('/remote/disconnect', (req, res) => {
  const ok = disconnectRemote();
  res.json({ success: ok });
});

export default router;
