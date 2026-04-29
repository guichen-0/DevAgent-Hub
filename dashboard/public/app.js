// ─── Output ───

function out(msg, type = '') {
  const el = document.getElementById('output');
  if (msg === 'clear') { el.textContent = ''; return; }
  const line = document.createElement('div');
  line.className = type;
  if (msg instanceof HTMLElement) {
    line.appendChild(msg);
  } else {
    line.textContent = msg;
  }
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function outJSON(label, data) {
  out(`┌─ ${label}`, 'bold');
  const json = JSON.stringify(data, null, 2);
  // Colorize JSON
  const colored = json.replace(/"([^"]+)":/g, (m) => `\x1b[36m${m}\x1b[0m`);
  out(colored, 'dim');
  out(`└─ End`, 'dim');
}

function clearOutput() {
  out('clear');
  out('Ready.', 'dim');
}

// ─── Tab Switching ───

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
  });
});

// ─── API Helper ───

async function apiCall(url, body = null, methodOverride = null) {
  out(`> ${url}`, 'dim');
  try {
    let method = 'GET';
    let reqBody = null;
    if (methodOverride) {
      method = methodOverride;
      reqBody = body ? JSON.stringify(body) : null;
    } else if (body) {
      method = 'POST';
      reqBody = JSON.stringify(body);
    }
    const res = await fetch(url, {
      method,
      headers: reqBody ? { 'Content-Type': 'application/json' } : {},
      body: reqBody,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    out(`Error: ${err.message}`, 'red');
    throw err;
  }
}

// ─── Config Sync API ───

const configSync = {
  async init() {
    clearOutput();
    out('Initializing vault...', 'blue');
    const data = await apiCall('/api/config-sync/init', { profile: 'default' });
    out(`Vault initialized. Profile: ${data.profile}`, 'green');
  },

  async initWithProfile() {
    const profile = document.getElementById('cs-profile').value || 'work';
    clearOutput();
    out(`Initializing with profile: ${profile}...`, 'blue');
    const data = await apiCall('/api/config-sync/init', { profile });
    out(`Done! Profile "${data.profile}" is active.`, 'green');
  },

  async discover() {
    clearOutput();
    out('Scanning for configuration files...', 'blue');
    const data = await apiCall('/api/config-sync/discover');
    for (const source of data.sources) {
      if (source.status === 'not-installed') {
        out(`  ⚠ ${source.name}: not installed`, 'yellow');
        continue;
      }
      out(`  ✓ ${source.name}:`, 'green');
      for (const file of source.files) {
        out(`    • ${file.label}: ${file.path}`, 'dim');
      }
    }
  },

  async backup() {
    clearOutput();
    out('Backing up configurations...', 'blue');
    const data = await apiCall('/api/config-sync/backup', {});
    for (const result of data.results) {
      const ok = result.fileResults.filter(r => r.success).length;
      const fail = result.fileResults.filter(r => !r.success).length;
      if (ok > 0) out(`  ✓ ${result.sourceId}: ${ok} file(s) backed up`, 'green');
      if (fail > 0) out(`  ✗ ${result.sourceId}: ${fail} file(s) failed`, 'red');
    }
    const total = data.results.reduce((a, r) => a + r.fileResults.filter(f => f.success).length, 0);
    out(`\nDone. ${total} file(s) backed up.`, 'bold');
    if (data.versionId) {
      out(`Version: ${data.versionId}`, 'dim');
      this.loadVersions();
    }
  },

  async backupWithProfile() {
    const profile = document.getElementById('cs-profile').value || 'work';
    clearOutput();
    out(`Backing up profile: ${profile}...`, 'blue');
    const data = await apiCall('/api/config-sync/backup', { profile });
    const total = data.results.reduce((a, r) => a + r.fileResults.filter(f => f.success).length, 0);
    out(`Done. ${total} file(s) backed up.`, 'green');
    if (data.versionId) this.loadVersions();
  },

  async backupWithLabel() {
    const label = prompt('Backup description (optional):');
    clearOutput();
    out(`Backing up with label: ${label || '(none)'}...`, 'blue');
    const data = await apiCall('/api/config-sync/backup', { label: label || undefined });
    const total = data.results.reduce((a, r) => a + r.fileResults.filter(f => f.success).length, 0);
    out(`Done. ${total} file(s) backed up.`, 'green');
    if (data.versionId) this.loadVersions();
  },

  async restore() {
    clearOutput();
    out('Restoring from vault (dry-run)...', 'blue');
    const data = await apiCall('/api/config-sync/restore', { dryRun: true });
    for (const result of data.results) {
      for (const fr of result.fileResults) {
        if (fr.skipped) out(`  - ${result.sourceId}/${fr.fileId}: up-to-date, skipped`, 'dim');
        else if (fr.success) out(`  ✓ ${result.sourceId}/${fr.fileId}: would restore`, 'green');
        else out(`  ✗ ${result.sourceId}/${fr.fileId}: ${fr.error}`, 'red');
      }
    }
  },

  async getStatus() {
    clearOutput();
    out('Fetching sync status...', 'blue');
    const data = await apiCall('/api/config-sync/status');
    out(`Active profile: ${data.activeProfile || 'none'}`, 'bold');
    for (const source of data.sources) {
      const icons = { 'not-installed': '⚠', 'not-backed-up': '○', 'ready': '✓' };
      const colors = { 'not-installed': 'yellow', 'not-backed-up': 'yellow', 'ready': 'green' };
      out(`  ${icons[source.status] || '?'} ${source.name}: ${source.status}`, colors[source.status] || 'dim');
    }
  },

  async listSources() {
    clearOutput();
    out('Available sources:', 'bold');
    const data = await apiCall('/api/config-sync/sources');
    for (const s of data.sources) {
      out(`  ${s.installed ? '✓' : '✗'} ${s.name} — ${s.description}`, s.installed ? 'green' : 'dim');
    }
  },

  // ─── Version History ───

  async loadVersions() {
    const el = document.getElementById('version-list');
    if (!el) return;
    el.innerHTML = '<span class="dim">Loading...</span>';

    try {
      const data = await apiCall('/api/config-sync/versions');
      const versions = data.versions;

      if (versions.length === 0) {
        el.innerHTML = '<span class="dim">No versions yet. Run a backup first.</span>';
        return;
      }

      el.innerHTML = '';
      for (const v of versions) {
        const item = document.createElement('div');
        item.className = 'version-item';

        const time = new Date(v.timestamp).toLocaleString();
        const label = v.label || '';

        item.innerHTML = `
          <div class="version-info">
            <span class="version-badge">${v.id.slice(0, 6)}</span>
            <span class="version-time">${time}</span>
            ${label ? `<span class="version-label">— ${label}</span>` : ''}
          </div>
          <div class="version-actions">
            <button class="version-btn restore" onclick="api.configSync.restoreVersion('${v.id}')">回滚</button>
            <button class="version-btn" onclick="api.configSync.diffVersion('${v.id}')">对比</button>
            <button class="version-btn danger" onclick="api.configSync.deleteVersion('${v.id}')">删除</button>
          </div>
        `;
        el.appendChild(item);
      }
    } catch (err) {
      el.innerHTML = `<span class="red">Failed to load versions: ${err.message}</span>`;
    }
  },

  async restoreVersion(versionId) {
    if (!confirm(`Restore version ${versionId.slice(0, 6)}? Current files will be overwritten.`)) return;

    clearOutput();
    out(`Restoring from version ${versionId}...`, 'blue');
    const data = await apiCall('/api/config-sync/versions/restore', { versionId, dryRun: true });

    let wouldChange = 0;
    for (const r of data.results) {
      for (const fr of r.fileResults) {
        if (fr.skipped) out(`  - ${r.sourceId}/${fr.fileId}: unchanged`, 'dim');
        else if (fr.success) { out(`  ~ ${r.sourceId}/${fr.fileId}: will restore`, 'yellow'); wouldChange++; }
        else out(`  ✗ ${r.sourceId}/${fr.fileId}: ${fr.error}`, 'red');
      }
    }

    if (wouldChange === 0) { out('Everything already matches this version. Nothing to restore.', 'green'); return; }
    if (!confirm(`${wouldChange} file(s) will change. Proceed?`)) return;

    const finalData = await apiCall('/api/config-sync/versions/restore', { versionId });
    out('Restore complete!', 'green');
    this.loadVersions();
  },

  async diffVersion(versionId) {
    clearOutput();
    out(`Fetching diff for version ${versionId.slice(0, 6)}...`, 'blue');
    const data = await apiCall('/api/config-sync/versions/diff', { versionId });

    if (data.error) {
      out(`Error: ${data.error}`, 'red');
      return;
    }

    if (data.diffs.length === 0) {
      out('No files in this version to compare.', 'yellow');
      return;
    }

    let totalAdd = 0, totalRem = 0;
    for (const d of data.diffs) {
      totalAdd += d.stats.additions;
      totalRem += d.stats.removals;
    }
    out(`Comparing ${data.diffs.length} file(s) — +${totalAdd} / -${totalRem}`, 'bold');

    for (const d of data.diffs) {
      // File header
      const header = document.createElement('div');
      header.className = 'diff-header';
      header.textContent = `── ${d.sourceId}/${d.fileId}  ${d.stats.additions > 0 || d.stats.removals > 0 ? `(+${d.stats.additions}/-${d.stats.removals})` : '(unchanged)'}`;
      out(header);

      if (!d.hasLocal) {
        out('  Local file not found — only vault content shown', 'yellow');
      }

      // Diff lines
      const container = document.createElement('div');
      container.className = 'diff-view';

      for (const line of d.lines) {
        const lineEl = document.createElement('div');
        lineEl.className = 'diff-line';

        if (line.type === 'add') {
          lineEl.className += ' diff-add';
          lineEl.textContent = `+ ${line.lineNumB?.toString().padStart(4) || '    '} │ ${line.text}`;
        } else if (line.type === 'remove') {
          lineEl.className += ' diff-remove';
          lineEl.textContent = `- ${line.lineNumA?.toString().padStart(4) || '    '} │ ${line.text}`;
        } else {
          // Only show context lines around changes (simple: show first/last 2 context)
          lineEl.textContent = `  ${line.lineNumA?.toString().padStart(4) || '    '} │ ${line.text}`;
        }

        container.appendChild(lineEl);
      }

      out(container);
    }

    out(`\nDiff complete: ${totalAdd} addition(s), ${totalRem} removal(s)`, 'dim');
  },

  async deleteVersion(versionId) {
    if (!confirm(`Delete version ${versionId.slice(0, 6)}?`)) return;
    await apiCall('/api/config-sync/versions/delete', { versionId });
    out(`Version ${versionId.slice(0, 6)} deleted.`, 'yellow');
    this.loadVersions();
  },

  // ─── Remote Sync ───

  remote: {
    async init() {
      const url = document.getElementById('remote-url').value.trim();
      if (!url) { out('Please enter a Git remote URL.', 'red'); return; }
      clearOutput();
      out(`Initializing remote: ${url}...`, 'blue');
      const data = await apiCall('/api/config-sync/remote/init', { url });
      if (data.success) {
        out(`Remote configured: ${data.url} (branch: ${data.branch})`, 'green');
        this.updateBadge();
      } else {
        out('Failed to initialize remote.', 'red');
      }
    },

    async push() {
      clearOutput();
      out('Pushing to remote...', 'blue');
      const data = await apiCall('/api/config-sync/remote/push');
      if (data.success) {
        out(data.message, 'green');
      } else {
        out(`Push failed: ${data.message}`, 'red');
      }
      this.updateBadge();
    },

    async pull() {
      clearOutput();
      out('Pulling from remote...', 'blue');
      const data = await apiCall('/api/config-sync/remote/pull');
      if (data.success) {
        out(data.message, 'green');
      } else {
        out(`Pull failed: ${data.message}`, 'yellow');
      }
      this.updateBadge();
    },

    async status() {
      clearOutput();
      out('Fetching remote sync status...', 'blue');
      const data = await apiCall('/api/config-sync/remote/status');

      if (!data.isGitRepo) {
        out('Remote sync not configured.', 'yellow');
        out('Enter a Git remote URL above and click "初始化".', 'dim');
        return;
      }

      out('═══ Remote Sync Status ═══', 'bold');
      out(`  Branch: ${data.branch}`, 'green');
      out(`  Remote: ${data.remoteUrl || 'not configured'}`, data.remoteUrl ? 'green' : 'yellow');
      if (data.lastCommit) {
        out(`  Last commit: ${data.lastCommit.hash.slice(0, 8)}`, 'dim');
        out(`    ${data.lastCommit.date}: ${data.lastCommit.message}`);
      }
      if (data.status && data.status.length > 0) {
        out(`  Uncommitted changes (${data.status.length}):`, 'yellow');
        for (const line of data.status) {
          out(`    ${line}`, 'dim');
        }
      } else if (data.isGitRepo) {
        out('  Working tree: clean', 'green');
      }
      if (data.config?.lastSync) {
        out(`  Last sync: ${new Date(data.config.lastSync).toLocaleString()}`, 'dim');
      }

      this.updateBadge();
    },

    async disconnect() {
      if (!confirm('Disconnect remote sync? Local data will be kept.')) return;
      clearOutput();
      await apiCall('/api/config-sync/remote/disconnect');
      out('Remote disconnected.', 'yellow');
      this.updateBadge();
    },

    async updateBadge() {
      try {
        const data = await apiCall('/api/config-sync/remote/status');
        const badge = document.getElementById('remote-status-badge');
        if (badge) {
          if (data.isGitRepo && data.hasRemote) {
            badge.textContent = '已连接';
            badge.style.background = 'var(--green)';
          } else if (data.isGitRepo) {
            badge.textContent = '本地';
            badge.style.background = 'var(--yellow)';
          } else {
            badge.textContent = '未配置';
            badge.style.background = 'var(--text-dim)';
          }
        }
      } catch { /* ignore */ }
    },
  },
};

// ─── Chart instances ───

let trendChartInstance = null;
let pieChartInstance = null;

function formatDurationShort(ms) {
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

function destroyCharts() {
  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
}

// ─── Time Audit API ───

const timeAudit = {
  async status() {
    clearOutput();
    destroyCharts();
    out('Checking data sources...', 'blue');
    const data = await apiCall('/api/time-audit/sources');
    for (const s of data.sources) {
      if (s.available) {
        out(`  ✓ ${s.name}: ${s.entries} entries found`, 'green');
      } else {
        out(`  ⚠ ${s.name}: ${s.error || 'unavailable'}`, 'yellow');
      }
    }
  },

  async scan() {
    clearOutput();
    destroyCharts();
    out('Scanning activity data...', 'blue');
    const data = await apiCall('/api/time-audit/scan', {});
    out(`Collected ${data.entries} entries from ${data.sources.length} sources.`, 'green');
  },

  async report(mode) {
    clearOutput();
    destroyCharts();
    out(`Generating ${mode} report...`, 'blue');
    const data = await apiCall('/api/time-audit/report', { mode });

    const s = data.summary;
    if (!s || !s.categories) {
      out('No data available.', 'yellow');
      return;
    }

    const totalMin = Math.round(s.totalTrackedMs / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    out(`═══ Time Audit: ${s.date} ═══`, 'bold');
    out(`Total tracked: ${hours}h ${mins}m\n`, 'bold');

    for (const [cat, catData] of Object.entries(s.categories)) {
      const pct = catData.percentage.toFixed(1);
      const catMin = Math.round(catData.totalMs / 60000);
      const catH = Math.floor(catMin / 60);
      const catM = catMin % 60;
      const barLen = Math.round(catData.percentage / 5);
      const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(0, 20 - barLen));
      out(`  ${cat.padEnd(20)} ${catH}h ${String(catM).padStart(2, '0')}m  ${pct.padStart(5)}%  ${bar}`, 'green');

      for (const [sub, ms] of Object.entries(catData.subcategories)) {
        const subMin = Math.round(ms / 60000);
        const subH = Math.floor(subMin / 60);
        out(`    ${sub.padEnd(18)} ${subH}h ${String(subMin % 60).padStart(2, '0')}m`, 'dim');
      }
    }

    const srcParts = Object.entries(s.sources)
      .filter(([_, ms]) => ms > 0)
      .map(([src, ms]) => `${src} ${formatDurationShort(ms)}`);
    if (srcParts.length > 0) {
      out(`\nSources: ${srcParts.join(' | ')}`, 'dim');
    }

    out(`\nReport complete.`, 'dim');
  },

  async showTrends() {
    clearOutput();
    out('Loading trends and efficiency...', 'blue');
    const data = await apiCall('/api/time-audit/trends', {});

    // Show efficiency section
    const effSection = document.getElementById('efficiency-section');
    effSection.style.display = 'block';

    const eff = data.efficiency;
    const scoreEl = document.getElementById('eff-score');
    scoreEl.textContent = eff.score;
    scoreEl.className = 'efficiency-score' + (eff.score >= 60 ? '' : eff.score >= 35 ? ' medium' : ' low');

    document.getElementById('eff-productive').textContent = formatDurationShort(eff.productiveMs);
    document.getElementById('eff-entertainment').textContent = formatDurationShort(eff.entertainmentMs);
    document.getElementById('eff-ratio').textContent = eff.ratio.toFixed(1) + 'x';

    out(`Efficiency Score: ${eff.score}/100`, eff.score >= 60 ? 'green' : eff.score >= 35 ? 'yellow' : 'red');
    out(`  Development: ${formatDurationShort(eff.productiveMs)}`, 'green');
    out(`  Entertainment: ${formatDurationShort(eff.entertainmentMs)}`, 'yellow');
    out(`  Ratio: ${eff.ratio.toFixed(1)}x development vs entertainment`);
    out(`  Trend data: ${data.trends.length} days`);

    // Show trend chart
    if (data.trends.length > 0) {
      this.renderTrendChart(data.trends);
    }
  },

  renderTrendChart(trends) {
    const section = document.getElementById('chart-section');
    section.style.display = 'block';

    if (trendChartInstance) trendChartInstance.destroy();

    const ctx = document.getElementById('trendChart').getContext('2d');
    const labels = trends.map(t => t.date.slice(5));
    const devData = trends.map(t => Math.round(t.categories.Development / 3600000 * 10) / 10);
    const entData = trends.map(t => Math.round(t.categories.Entertainment / 3600000 * 10) / 10);
    const socialData = trends.map(t => Math.round(t.categories.Social / 3600000 * 10) / 10);
    const commData = trends.map(t => Math.round(t.categories.Communication / 3600000 * 10) / 10);

    trendChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Development', data: devData, backgroundColor: '#3fb950', borderRadius: 3 },
          { label: 'Entertainment', data: entData, backgroundColor: '#d29922', borderRadius: 3 },
          { label: 'Social', data: socialData, backgroundColor: '#f85149', borderRadius: 3 },
          { label: 'Communication', data: commData, backgroundColor: '#58a6ff', borderRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b949e', boxWidth: 12, padding: 12 } },
        },
        scales: {
          x: { stacked: true, ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
          y: {
            stacked: true,
            title: { display: true, text: 'Hours', color: '#8b949e' },
            ticks: { color: '#8b949e' },
            grid: { color: '#21262d' },
          },
        },
      },
    });
  },

  renderPieChart(categories) {
    const section = document.getElementById('pie-section');
    section.style.display = 'block';

    if (pieChartInstance) pieChartInstance.destroy();

    const colors = ['#3fb950', '#58a6ff', '#d29922', '#f85149', '#8b949e', '#bc8cff', '#f0883e'];
    const labels = [];
    const data = [];
    const bgColors = [];

    let i = 0;
    for (const [cat, catData] of Object.entries(categories)) {
      if (catData.totalMs > 60000) { // Only > 1 min
        labels.push(cat);
        data.push(Math.round(catData.totalMs / 60000));
        bgColors.push(colors[i % colors.length]);
        i++;
      }
    }

    if (data.length === 0) return;

    const ctx = document.getElementById('pieChart').getContext('2d');
    pieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8b949e', boxWidth: 12, padding: 10, font: { size: 11 } },
          },
        },
      },
    });
  },

  async customReport() {
    const since = document.getElementById('ta-since').value;
    const to = document.getElementById('ta-to').value || undefined;
    const mode = since && !to ? 'daily' : 'summary';
    clearOutput();
    destroyCharts();
    out(`Generating report from ${since || 'recent'}...`, 'blue');
    const data = await apiCall('/api/time-audit/report', { mode, since: since || undefined, to });
    out(data.raw || 'Report generated.', 'dim');
  },

  async cacheInfo() {
    clearOutput();
    destroyCharts();
    out('Cache info:', 'bold');
    const data = await apiCall('/api/time-audit/cache');
    if (data.sources && data.sources.length > 0) {
      out(`  Sources cached: ${data.sources.length}`, 'green');
      out(`  Total entries: ${data.totalEntries}`);
      for (const [src, time] of Object.entries(data.lastScanned)) {
        out(`  ${src}: ${new Date(time).toLocaleString()}`, 'dim');
      }
    } else {
      out('  No cached data.', 'yellow');
    }
  },

  async clearCache() {
    await apiCall('/api/time-audit/cache/clear', {});
    out('Cache cleared.', 'green');
  },

  async dailyDigest() {
    clearOutput();
    destroyCharts();
    out('Generating daily digest...', 'blue');
    const data = await apiCall('/api/time-audit/digest');

    // Header
    out(`═══ 📰 ${data.date} 每日摘要 ═══`, 'bold');

    // Time summary
    const totalH = Math.floor(data.totalTrackedMs / 3600000);
    const totalM = Math.round((data.totalTrackedMs % 3600000) / 60000);
    let timeLine = `总活跃时间: ${totalH}h ${totalM}m`;
    if (data.yesterdayTrackedHours !== null) {
      const delta = data.deltaMs > 0 ? '+' : '';
      const deltaH = Math.floor(Math.abs(data.deltaMs) / 3600000);
      const deltaM = Math.round((Math.abs(data.deltaMs) % 3600000) / 60000);
      const deltaColor = data.deltaMs > 0 ? 'yellow' : 'dim';
      timeLine += ` (较昨日: ${delta}${deltaH}h ${deltaM}m)`;
      out(timeLine, data.deltaMs > 0 ? 'yellow' : 'green');
    } else {
      out(timeLine, 'green');
    }

    // Efficiency score
    const eff = data.efficiency;
    const scoreColor = eff.score >= 60 ? 'green' : eff.score >= 35 ? 'yellow' : 'red';
    out(`效率评分: ${eff.score}/100 (开发 ${formatDurationShort(eff.productiveMs)} / 娱乐 ${formatDurationShort(eff.entertainmentMs)})`, scoreColor);

    // Categories
    out('', null);
    out('── 分类明细 ──', 'bold');
    for (const [cat, catData] of Object.entries(data.categories)) {
      const pct = catData.percentage.toFixed(1);
      const catMin = Math.round(catData.totalMs / 60000);
      const catH = Math.floor(catMin / 60);
      const catM = catMin % 60;
      const barLen = Math.round(catData.percentage / 5);
      const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(0, 20 - barLen));
      out(`  ${cat.padEnd(20)} ${catH}h ${String(catM).padStart(2, '0')}m  ${pct.padStart(5)}%  ${bar}`, 'green');
    }

    // Top activities
    if (data.topActivities && data.topActivities.length > 0) {
      out('', null);
      out('── 主要活动 ──', 'bold');
      for (let i = 0; i < data.topActivities.length; i++) {
        const a = data.topActivities[i];
        const min = Math.round(a.ms / 60000);
        out(`  ${i + 1}. ${a.name} (${a.category}) — ${min}分钟`, 'dim');
      }
    }

    // Suggestions
    if (data.suggestions && data.suggestions.length > 0) {
      out('', null);
      out('── 💡 建议 ──', 'yellow');
      for (const s of data.suggestions) {
        out(`  • ${s}`, 'yellow');
      }
    }

    // Yesterday comparison
    if (data.yesterdayTotalMs > 0) {
      out('', null);
      const yH = Math.floor(data.yesterdayTotalMs / 3600000);
      const yM = Math.round((data.yesterdayTotalMs % 3600000) / 60000);
      out(`昨日活跃: ${yH}h ${yM}m`, 'dim');
    }

    out('', null);
    out('── End ──', 'dim');
  },
};

// Global API object
window.api = { configSync, timeAudit };

// Set default date
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const since = document.getElementById('ta-since');
  if (since) since.value = weekAgo;
  const to = document.getElementById('ta-to');
  if (to) to.value = today;

  // Check remote status on load
  setTimeout(() => api.configSync.remote.updateBadge(), 500);
});
