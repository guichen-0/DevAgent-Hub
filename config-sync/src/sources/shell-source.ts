import { BaseSource } from './base-source.js';
import { getShellProfilePaths } from '../utils/paths.js';
import { fileExists } from '../utils/file-utils.js';
import type { ConfigFile } from '../types/index.js';

export class ShellSource extends BaseSource {
  readonly id = 'shell';
  readonly name = 'Shell';
  readonly description = 'Shell profiles and aliases';
  readonly platforms: NodeJS.Platform[] = ['win32', 'darwin', 'linux'];

  isInstalled(): boolean {
    const profiles = getShellProfilePaths();
    return Object.values(profiles).some(p => fileExists(p));
  }

  detectConfigs(): ConfigFile[] {
    const configs: ConfigFile[] = [];
    const profiles = getShellProfilePaths();

    for (const [shellName, profilePath] of Object.entries(profiles)) {
      if (fileExists(profilePath)) {
        configs.push({
          sourceId: this.id,
          fileId: shellName,
          label: `${shellName.charAt(0).toUpperCase() + shellName.slice(1)} Profile`,
          filePath: profilePath,
          format: 'plaintext',
        });
      }
    }

    return configs;
  }
}
