// ─── Data Sources ───

export type DataSource = 'browser' | 'vscode' | 'git' | 'filesystem';

// ─── Raw Activity Entry ───

export interface RawActivityEntry {
  id: string;
  source: DataSource;
  startTime: number;          // epoch ms
  endTime: number | null;     // epoch ms, null for point-in-time events
  title: string;
  detail: string;             // URL, file path, commit message, etc.
  category: string | null;
  subcategory: string | null;
  metadata: Record<string, unknown>;
}

// ─── Time Block ───

export interface TimeBlock {
  date: string;               // 'YYYY-MM-DD'
  startTime: number;          // epoch ms
  endTime: number;            // epoch ms
  durationMs: number;
  category: string;
  subcategory: string | null;
  source: DataSource;
  confidence: number;         // 0-1
}

// ─── Scan Results ───

export interface ScanResult {
  source: DataSource;
  success: boolean;
  error?: string;
  entries: RawActivityEntry[];
  durationMs: number;
  meta: {
    count: number;
    timeRange: [number, number] | null;
  };
}

// ─── Report Types ───

export interface DailySummary {
  date: string;
  totalTrackedMs: number;
  categories: Record<string, CategorySummary>;
  sources: Record<DataSource, number>;
}

export interface CategorySummary {
  totalMs: number;
  percentage: number;
  subcategories: Record<string, number>;
}

export interface ReportOptions {
  mode: 'daily' | 'weekly' | 'summary' | 'timeline';
  since?: string;
  to?: string;
  output?: 'terminal' | 'json';
  chart?: boolean;
}

// ─── Cache Types ───

export interface CacheEntry {
  source: DataSource;
  scannedAt: number;
  sourceModifiedAt: number;
  entries: RawActivityEntry[];
}

// ─── Config Types ───

export interface TimeAuditConfig {
  gitRepos?: string[];
  watchDirectories?: string[];
  ignorePatterns?: string[];
  browserHistoryLimit?: number;
  scanDepth?: number;
}
