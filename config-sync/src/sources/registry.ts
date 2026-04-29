import type { ConfigSource } from '../types/index.js';
import { BaseSource } from './base-source.js';
import { VSCodeSource } from './vscode-source.js';
import { GitSource } from './git-source.js';
import { ShellSource } from './shell-source.js';

const sources: ConfigSource[] = [
  new VSCodeSource(),
  new GitSource(),
  new ShellSource(),
];

export function getAllSources(): ConfigSource[] {
  return sources;
}

export function getSourcesForCurrentPlatform(): ConfigSource[] {
  return sources.filter(s => s.platforms.includes(process.platform as NodeJS.Platform));
}

export function getSourceById(id: string): ConfigSource | undefined {
  return sources.find(s => s.id === id);
}

export function registerSource(source: ConfigSource): void {
  sources.push(source);
}
