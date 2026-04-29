export type MonitorType = 'http' | 'process' | 'file' | 'command' | 'git';

export interface MonitorConfig {
  id: string;
  name: string;
  description: string;
  type: MonitorType;
  interval: number; // seconds, min 10
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  // Type-specific configs
  http?: {
    url: string;
    method: 'GET' | 'HEAD';
    timeout: number;
    expectedStatus: number;
  };
  process?: {
    name: string;       // process name, e.g. "node.exe"
    argument?: string;  // optional filter by cmdline arg
  };
  file?: {
    path: string;
    checkSize: boolean;
    checkExists: boolean;
  };
  command?: {
    command: string;
    shell: boolean;
  };
  git?: {
    repos: string[];    // paths to git repos
    checkUnpushed: boolean;
    checkUntracked: boolean;
  };
}

export interface MetricPoint {
  timestamp: number;     // epoch ms
  value: number;         // numeric value (response ms, file size, etc.)
  status: 'ok' | 'warn' | 'error';
  label?: string;        // contextual info
  detail?: string;       // error message or extra info
}

export interface MonitorSnapshot {
  id: string;
  lastValue: number;
  lastStatus: 'ok' | 'warn' | 'error';
  lastLabel: string;
  lastTimestamp: number;
  lastDetail?: string;
  history: MetricPoint[];
}

export interface MonitorPlugin {
  type: MonitorType;
  name: string;
  description: string;
  collect(config: MonitorConfig): Promise<MetricPoint>;
}
