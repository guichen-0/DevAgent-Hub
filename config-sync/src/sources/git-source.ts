import * as path from 'node:path';
import { BaseSource } from './base-source.js';
import { getGitConfigPath } from '../utils/paths.js';
import { fileExists } from '../utils/file-utils.js';
import * as os from 'node:os';
import type { ConfigFile } from '../types/index.js';

export class GitSource extends BaseSource {
  readonly id = 'git';
  readonly name = 'Git';
  readonly description = 'Git global configuration';
  readonly platforms: NodeJS.Platform[] = ['win32', 'darwin', 'linux'];

  isInstalled(): boolean {
    return fileExists(getGitConfigPath());
  }

  detectConfigs(): ConfigFile[] {
    const configs: ConfigFile[] = [];

    const gitConfigPath = getGitConfigPath();
    if (fileExists(gitConfigPath)) {
      configs.push({
        sourceId: this.id,
        fileId: 'gitconfig',
        label: 'Git Config',
        filePath: gitConfigPath,
        format: 'plaintext',
      });
    }

    const gitIgnorePath = path.join(os.homedir(), '.gitignore_global');
    if (fileExists(gitIgnorePath)) {
      configs.push({
        sourceId: this.id,
        fileId: 'gitignore',
        label: 'Global Gitignore',
        filePath: gitIgnorePath,
        format: 'plaintext',
      });
    }

    return configs;
  }
}
