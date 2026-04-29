import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { BaseSource } from './base-source.js';
import { getVSCodeConfigDir } from '../utils/paths.js';
import { fileExists } from '../utils/file-utils.js';
import type { ConfigFile } from '../types/index.js';

export class VSCodeSource extends BaseSource {
  readonly id = 'vscode';
  readonly name = 'VS Code';
  readonly description = 'VS Code settings, keybindings, and extensions';
  readonly platforms: NodeJS.Platform[] = ['win32', 'darwin', 'linux'];

  isInstalled(): boolean {
    return getVSCodeConfigDir() !== null && fileExists(path.join(getVSCodeConfigDir()!, 'settings.json'));
  }

  detectConfigs(): ConfigFile[] {
    const configDir = getVSCodeConfigDir();
    if (!configDir) return [];

    const configs: ConfigFile[] = [];

    const settingsPath = path.join(configDir, 'settings.json');
    if (fileExists(settingsPath)) {
      configs.push({
        sourceId: this.id,
        fileId: 'settings',
        label: 'Settings',
        filePath: settingsPath,
        format: 'json',
      });
    }

    const keybindingsPath = path.join(configDir, 'keybindings.json');
    if (fileExists(keybindingsPath)) {
      configs.push({
        sourceId: this.id,
        fileId: 'keybindings',
        label: 'Keybindings',
        filePath: keybindingsPath,
        format: 'json',
      });
    }

    // Extensions list via code CLI
    const extensions = this.detectExtensions();
    if (extensions) {
      configs.push({
        sourceId: this.id,
        fileId: 'extensions',
        label: 'Extensions',
        filePath: extensions,
        format: 'ext-list',
      });
    }

    return configs;
  }

  private detectExtensions(): string | null {
    try {
      const result = execSync('code --list-extensions', {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }) as string;
      if (!result.trim()) return null;

      // Write to a temp file path so we can track it
      const tmpPath = path.join(os.tmpdir(), 'config-sync-vscode-extensions.json');
      const extensions = result.trim().split('\n').filter(Boolean);
      fs.writeFileSync(tmpPath, JSON.stringify(extensions, null, 2), 'utf-8');
      return tmpPath;
    } catch {
      return null;
    }
  }
}
