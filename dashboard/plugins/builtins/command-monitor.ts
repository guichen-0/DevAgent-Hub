import { execSync } from 'node:child_process';
import type { MonitorConfig, MetricPoint } from '../types.js';

export function collectCommand(config: MonitorConfig): MetricPoint {
  const cmdCfg = config.command!;
  const cmd = cmdCfg.command;

  try {
    const start = Date.now();
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 30000,
      shell: cmdCfg.shell ?? true,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const elapsed = Date.now() - start;
    const trimmed = output.trim();
    const lines = trimmed.split('\n').filter(Boolean);
    const firstLine = lines[0] || '';
    const numeric = parseFloat(firstLine);

    return {
      timestamp: Date.now(),
      value: isNaN(numeric) ? elapsed : numeric,
      status: 'ok',
      label: isNaN(numeric) ? firstLine.slice(0, 30) : `${numeric}`,
      detail: trimmed.slice(0, 500) || `Completed in ${elapsed}ms`,
    };
  } catch (err) {
    const msg = (err as Error).message;
    return {
      timestamp: Date.now(),
      value: 0,
      status: 'error',
      label: 'error',
      detail: msg.slice(0, 500),
    };
  }
}
