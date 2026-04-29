import type { ConfigSource, ConfigFile } from '../types/index.js';

export abstract class BaseSource implements ConfigSource {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly platforms: NodeJS.Platform[];

  abstract isInstalled(): boolean;
  abstract detectConfigs(): ConfigFile[];

  protected filterForPlatform(): boolean {
    return this.platforms.includes(process.platform as NodeJS.Platform);
  }
}
