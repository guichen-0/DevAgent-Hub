import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseReader } from './BaseReader.js';
import { VSCODE_STORAGE_PATH } from '../constants.js';
import type { RawActivityEntry, DataSource } from '../types.js';

export class VSCodeReader extends BaseReader {
  readonly source: DataSource = 'vscode';
  readonly name = 'VS Code';

  async read(options: { since?: Date } = {}): Promise<RawActivityEntry[]> {
    if (!VSCODE_STORAGE_PATH || !fs.existsSync(VSCODE_STORAGE_PATH)) {
      return [];
    }

    const entries: RawActivityEntry[] = [];
    const sinceTime = options.since?.getTime() ?? 0;

    try {
      const content = fs.readFileSync(VSCODE_STORAGE_PATH, 'utf-8');
      const storage = JSON.parse(content);

      // Extract recent workspace folders
      const workspaces = storage?.backupWorkspaces?.folders ?? [];
      for (const ws of workspaces) {
        const wsPath = typeof ws === 'string' ? ws : ws.path ?? '';
        if (!wsPath) continue;

        const wsName = path.basename(wsPath);
        entries.push({
          id: `vscode-ws-${Buffer.from(wsPath).toString('base64').slice(0, 20)}`,
          source: 'vscode',
          startTime: sinceTime || Date.now() - 86400000, // default to last 24h
          endTime: null,
          title: `VS Code: ${wsName}`,
          detail: wsPath,
          category: null,
          subcategory: null,
          metadata: { workspace: wsPath },
        });
      }

      // Try workspace storage folders for more detail
      const wsStorageDir = path.join(path.dirname(VSCODE_STORAGE_PATH), '..', 'workspaceStorage');
      if (fs.existsSync(wsStorageDir)) {
        const folders = fs.readdirSync(wsStorageDir);
        for (const folder of folders) {
          const workspaceJsonPath = path.join(wsStorageDir, folder, 'workspace.json');
          if (!fs.existsSync(workspaceJsonPath)) continue;

          try {
            const wsContent = fs.readFileSync(workspaceJsonPath, 'utf-8');
            const wsData = JSON.parse(wsContent);
            const folderPath = wsData?.folder ?? '';
            if (!folderPath) continue;

            const wsName = path.basename(folderPath);
            const mtime = fs.statSync(workspaceJsonPath).mtimeMs;

            if (mtime < sinceTime) continue;

            entries.push({
              id: `vscode-ws2-${folder}`,
              source: 'vscode',
              startTime: mtime - 3600000, // assume 1h before last modified
              endTime: mtime,
              title: `VS Code: ${wsName}`,
              detail: folderPath,
              category: null,
              subcategory: null,
              metadata: { workspace: folderPath },
            });
          } catch { /* skip unparseable workspace */ }
        }
      }
    } catch { /* VS Code not available */ }

    return entries;
  }
}
