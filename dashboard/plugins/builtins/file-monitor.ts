import * as fs from 'node:fs';
import type { MonitorConfig, MetricPoint } from '../types.js';

export function collectFile(config: MonitorConfig): MetricPoint {
  const fileCfg = config.file!;
  const filePath = fileCfg.path;

  try {
    if (!fs.existsSync(filePath)) {
      return {
        timestamp: Date.now(),
        value: 0,
        status: 'warn',
        label: 'not found',
        detail: `File not found: ${filePath}`,
      };
    }

    const stat = fs.statSync(filePath);

    if (fileCfg.checkExists) {
      return {
        timestamp: Date.now(),
        value: 1,
        status: 'ok',
        label: 'exists',
        detail: `File exists at ${filePath}`,
      };
    }

    if (fileCfg.checkSize) {
      const sizeKB = Math.round(stat.size / 1024);
      return {
        timestamp: Date.now(),
        value: stat.size,
        status: 'ok',
        label: `${sizeKB} KB`,
        detail: `Size: ${sizeKB} KB, Modified: ${stat.mtime.toISOString()}`,
      };
    }

    // Default: just report mtime
    return {
      timestamp: Date.now(),
      value: stat.mtimeMs,
      status: 'ok',
      label: stat.mtime.toISOString().slice(0, 16),
      detail: `Last modified: ${stat.mtime.toISOString()}`,
    };
  } catch (err) {
    return {
      timestamp: Date.now(),
      value: 0,
      status: 'error',
      label: 'error',
      detail: (err as Error).message,
    };
  }
}
