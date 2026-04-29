import { execSync } from 'node:child_process';
import type { MonitorConfig, MetricPoint } from '../types.js';

export function collectProcess(config: MonitorConfig): MetricPoint {
  const procCfg = config.process!;
  try {
    let cmd: string;
    if (process.platform === 'win32') {
      cmd = `tasklist /fi "IMAGENAME eq ${procCfg.name}" /nh`;
    } else if (process.platform === 'darwin') {
      cmd = `pgrep -f "${procCfg.name}" | head -5`;
    } else {
      cmd = `pgrep -f "${procCfg.name}" | head -5`;
    }

    const output = execSync(cmd, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();

    if (process.platform === 'win32') {
      // tasklist returns lines like "node.exe 1234 Console ..."
      const lines = output.split('\n').filter(l => l.includes(procCfg.name));
      const count = lines.length;

      return {
        timestamp: Date.now(),
        value: count,
        status: count > 0 ? 'ok' : 'warn',
        label: `running: ${count}`,
        detail: count > 0 ? `${procCfg.name} running (${count} instance(s))` : `${procCfg.name} not found`,
      };
    }

    const lines = output.split('\n').filter(Boolean);
    const count = lines.length;

    return {
      timestamp: Date.now(),
      value: count,
      status: count > 0 ? 'ok' : 'warn',
      label: `running: ${count}`,
      detail: count > 0 ? `${procCfg.name} running (${count} instance(s))` : `${procCfg.name} not found`,
    };
  } catch {
    return {
      timestamp: Date.now(),
      value: 0,
      status: 'warn',
      label: 'not running',
      detail: `${procCfg.name} not running`,
    };
  }
}
