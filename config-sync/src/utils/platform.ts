import * as os from 'node:os';
import type { Platform } from '../types/index.js';

export function getCurrentPlatform(): Platform {
  return process.platform;
}

export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isMac(): boolean {
  return process.platform === 'darwin';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

export function getOsVersion(): string {
  return `${process.platform} ${process.arch}`;
}

export function getHostname(): string {
  return os.hostname();
}
