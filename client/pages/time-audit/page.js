// ─── Time Audit Page ───

const TimeAuditPage = {
  charts: {},

  async render() {
    return `
<div class="page-header">
  <h2>⏱ 时间审计</h2>
  <p class="page-desc">个人时间使用情况审计 — 浏览器、编辑器、Git、文件系统</p>
</div>

<div class="ta-status-bar" id="ta-status-bar">
  <div class="stat-card"><div class="stat-value" id="ta-source-count">-</div><div class="stat-label">数据源</div></div>
  <div class="stat-card"><div class="stat-value" id="ta-entry-count">-</div><div class="stat-label">记录数</div></div>
  <div class="stat-card"><div class="stat-value" id="ta-eff-score">-</div><div class="stat-label">效率评分</div></div>
  <div class="stat-card blue"><div class="stat-value" id="ta-tracked-hours">-</div><div class="stat-label">今日活跃</div></div>
</div>

<div class="card">
  <div class="card-header"><h3>操作</h3></div>
  <div class="ta-actions">
    <button class="btn btn-primary" onclick="TimeAuditPage.scan()">📥 扫描数据</button>
    <button class="btn btn-primary" onclick="TimeAuditPage.report()">📊 生成报告</button>
    <button class="btn" onclick="TimeAuditPage.digest()">📰 每日摘要</button>
    <button class="btn" onclick="TimeAuditPage.trends()">📈 趋势分析</button>
    <button class="btn" onclick="TimeAuditPage.showSources()">📡 数据源</button>
    <button class="btn" onclick="TimeAuditPage.cacheInfo()">💾 缓存</button>
    <button class="btn btn-danger" onclick="TimeAuditPage.clearCache()">🗑 清除缓存</button>
  </div>
</div>

<div class="card">
  <div class="card-header"><h3>自定义查询</h3></div>
  <div class="ta-date-picker">
    <label>起始: <input type="date" id="ta-since"></label>
    <label>结束: <input type="date" id="ta-to"></label>
    <button class="btn btn-sm" onclick="TimeAuditPage.customReport()">生成报告</button>
  </div>
</div>

<!-- Efficiency -->
<div class="card" id="ta-eff-section" style="display:none">
  <div class="card-header"><h3>效率评分</h3></div>
  <div class="ta-efficiency-grid" id="ta-eff-grid"></div>
</div>

<!-- Charts -->
<div class="card" id="ta-trend-section" style="display:none">
  <div class="card-header"><h3>📈 趋势</h3></div>
  <div class="ta-chart-container"><canvas id="ta-trend-chart"></canvas></div>
</div>

<div class="card" id="ta-pie-section" style="display:none">
  <div class="card-header"><h3>🎯 分类占比</h3></div>
  <div class="ta-chart-container small"><canvas id="ta-pie-chart"></canvas></div>
</div>

<div id="ta-result-area"></div>
<div id="ta-sources-area"></div>
<div id="ta-digest-area"></div>
`;
  },

  async afterRender() {
    this.setDefaultDates();
    await this.loadOverview();
  },

  setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const since = document.getElementById('ta-since');
    if (since) since.value = weekAgo;
    const to = document.getElementById('ta-to');
    if (to) to.value = today;
  },

  async loadOverview() {
    try {
      const [sourcesData, digestData] = await Promise.all([
        apiCall('/api/time-audit/sources'),
        apiCall('/api/time-audit/digest', {}).catch(() => null),
      ]);
      document.getElementById('ta-source-count').textContent = sourcesData.sources?.length || 0;
      const totalEntries = sourcesData.sources?.reduce((a, s) => a + (s.entries || 0), 0) || 0;
      document.getElementById('ta-entry-count').textContent = totalEntries;

      if (digestData) {
        const h = Math.floor(digestData.trackedHours);
        const m = Math.round((digestData.trackedHours - h) * 60);
        document.getElementById('ta-tracked-hours').textContent = `${h}h ${m}m`;
        const score = digestData.efficiency?.score ?? '-';
        document.getElementById('ta-eff-score').textContent = score;
      }
    } catch {}
  },

  async scan() {
    this.clearResult();
    this.showResult('<div class="loading">扫描中...</div>');
    try {
      const data = await apiCall('/api/time-audit/scan', {});
      this.showResult(`<div class="card"><div class="card-header"><h3>扫描完成</h3></div>
        <div style="font-size:14px">收集到 <strong>${data.entries}</strong> 条记录，来自 ${data.sources.length} 个数据源</div>
      </div>`);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async report() {
    this.clearResult();
    this.hideSections();
    this.showResult('<div class="loading">生成报告...</div>');
    try {
      const data = await apiCall('/api/time-audit/report', { mode: 'summary' });
      const s = data.summary;
      if (!s || !s.categories) {
        this.showResult('<div class="empty-state">暂无数据</div>');
        return;
      }
      const totalMin = Math.round(s.totalTrackedMs / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;

      let html = `<div class="card"><div class="card-header"><h3>📊 时间报告 — ${s.date}</h3></div>
        <div style="font-size:14px;margin-bottom:12px">总活跃: <strong>${h}h ${m}m</strong></div>`;

      const catColors = ['#3fb950', '#58a6ff', '#d29922', '#f85149', '#8b949e', '#bc8cff'];
      let ci = 0;
      for (const [cat, catData] of Object.entries(s.categories)) {
        const pct = catData.percentage || 0;
        const catMin = Math.round(catData.totalMs / 60000);
        const catH = Math.floor(catMin / 60);
        html += `<div class="ta-cat-bar">
          <span class="ta-cat-name">${cat}</span>
          <div class="ta-cat-bar-fill" style="width:${Math.max(pct * 2, 4)}px;background:${catColors[ci++ % catColors.length]}"></div>
          <span class="ta-cat-time">${catH}h ${catMin % 60}m</span>
          <span style="font-size:11px;color:var(--text-dim)">${pct.toFixed(1)}%</span>
        </div>`;

        for (const [sub, ms] of Object.entries(catData.subcategories)) {
          const subMin = Math.round(ms / 60000);
          if (subMin < 1) continue;
          html += `<div style="font-size:12px;color:var(--text-dim);padding-left:130px">${sub}: ${Math.floor(subMin / 60)}h ${subMin % 60}m</div>`;
        }
      }

      if (s.sources) {
        const srcParts = Object.entries(s.sources)
          .filter(([_, ms]) => ms > 0)
          .map(([src, ms]) => `${src} ${formatDuration(ms)}`);
        if (srcParts.length > 0) html += `<div style="font-size:12px;color:var(--text-dim);margin-top:8px">来源: ${srcParts.join(' | ')}</div>`;
      }
      html += '</div>';
      this.showResult(html);

      // Render pie chart
      this.renderPieChart(s.categories);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async digest() {
    this.clearResult();
    this.hideSections();
    this.showResult('<div class="loading">生成每日摘要...</div>');
    try {
      const data = await apiCall('/api/time-audit/digest', {});
      this.renderDigest(data);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  renderDigest(data) {
    const totalH = Math.floor(data.totalTrackedMs / 3600000);
    const totalM = Math.round((data.totalTrackedMs % 3600000) / 60000);
    const eff = data.efficiency || {};
    const scoreClass = eff.score >= 60 ? 'high' : eff.score >= 35 ? 'medium' : 'low';

    // Build efficiency section
    const effGrid = document.getElementById('ta-eff-grid');
    effGrid.innerHTML = `
      <div class="ta-eff-card">
        <div class="ta-eff-score ${scoreClass}">${eff.score ?? '-'}</div>
        <div class="ta-eff-label">效率评分</div>
      </div>
      <div class="ta-eff-card">
        <div class="ta-eff-value" style="color:var(--green)">${formatDuration(eff.productiveMs)}</div>
        <div class="ta-eff-label">开发时间</div>
      </div>
      <div class="ta-eff-card">
        <div class="ta-eff-value" style="color:var(--yellow)">${formatDuration(eff.entertainmentMs)}</div>
        <div class="ta-eff-label">娱乐时间</div>
      </div>
      <div class="ta-eff-card">
        <div class="ta-eff-value" style="color:var(--accent)">${eff.ratio?.toFixed(1) ?? '-'}x</div>
        <div class="ta-eff-label">效率比</div>
      </div>
    `;
    document.getElementById('ta-eff-section').style.display = 'block';

    let html = `<div class="card"><div class="card-header"><h3>📰 每日摘要 — ${data.date}</h3></div>`;

    // Time summary
    let deltaHtml = '';
    if (data.yesterdayTrackedHours !== null) {
      const delta = data.deltaMs > 0 ? '+' : '';
      const deltaH = Math.floor(Math.abs(data.deltaMs) / 3600000);
      const deltaM = Math.round((Math.abs(data.deltaMs) % 3600000) / 60000);
      const deltaColor = data.deltaMs > 0 ? 'var(--yellow)' : 'var(--text-dim)';
      deltaHtml = `<span style="color:${deltaColor}"> (较昨日: ${delta}${deltaH}h ${deltaM}m)</span>`;
    }
    html += `<div style="font-size:14px;margin-bottom:16px">总活跃时间: <strong>${totalH}h ${totalM}m</strong>${deltaHtml}</div>`;

    // Categories
    html += '<div style="margin-bottom:12px"><strong style="font-size:13px">分类明细</strong></div>';
    const catColors = ['#3fb950', '#58a6ff', '#d29922', '#f85149', '#8b949e', '#bc8cff'];
    let ci = 0;
    for (const [cat, catData] of Object.entries(data.categories || {})) {
      const pct = catData.percentage || 0;
      const catMin = Math.round(catData.totalMs / 60000);
      const catH = Math.floor(catMin / 60);
      html += `<div class="ta-cat-bar">
        <span class="ta-cat-name">${cat}</span>
        <div class="ta-cat-bar-fill" style="width:${Math.max(pct * 2, 4)}px;background:${catColors[ci++ % catColors.length]}"></div>
        <span class="ta-cat-time">${catH}h ${catMin % 60}m</span>
        <span style="font-size:11px;color:var(--text-dim)">${pct.toFixed(1)}%</span>
      </div>`;
    }

    // Top activities
    if (data.topActivities?.length) {
      html += '<div style="margin:12px 0 8px"><strong style="font-size:13px">主要活动</strong></div>';
      for (let i = 0; i < data.topActivities.length; i++) {
        const a = data.topActivities[i];
        html += `<div class="ta-activity-item"><span><span class="rank">${i + 1}.</span> ${a.name} <span style="color:var(--text-dim);font-size:12px">(${a.category})</span></span><span>${formatDuration(a.ms)}</span></div>`;
      }
    }

    // Suggestions
    if (data.suggestions?.length) {
      html += '<div style="margin:12px 0 8px"><strong style="font-size:13px">💡 建议</strong></div>';
      for (const s of data.suggestions) {
        html += `<div class="ta-suggestion">${s}</div>`;
      }
    }

    // Yesterday comparison
    if (data.yesterdayTotalMs > 0) {
      const yH = Math.floor(data.yesterdayTotalMs / 3600000);
      const yM = Math.round((data.yesterdayTotalMs % 3600000) / 60000);
      html += `<div style="margin-top:12px;font-size:12px;color:var(--text-dim)">昨日活跃: ${yH}h ${yM}m</div>`;
    }

    html += '</div>';
    this.showResult(html);

    // Render pie chart
    this.renderPieChart(data.categories);
  },

  async trends() {
    this.clearResult();
    this.hideSections();
    this.showResult('<div class="loading">加载趋势...</div>');
    try {
      const data = await apiCall('/api/time-audit/trends', {});

      // Efficiency
      const eff = data.efficiency || {};
      const scoreClass = eff.score >= 60 ? 'high' : eff.score >= 35 ? 'medium' : 'low';
      const effGrid = document.getElementById('ta-eff-grid');
      effGrid.innerHTML = `
        <div class="ta-eff-card">
          <div class="ta-eff-score ${scoreClass}">${eff.score ?? '-'}</div>
          <div class="ta-eff-label">效率评分</div>
        </div>
        <div class="ta-eff-card">
          <div class="ta-eff-value" style="color:var(--green)">${formatDuration(eff.productiveMs)}</div>
          <div class="ta-eff-label">开发时间</div>
        </div>
        <div class="ta-eff-card">
          <div class="ta-eff-value" style="color:var(--yellow)">${formatDuration(eff.entertainmentMs)}</div>
          <div class="ta-eff-label">娱乐时间</div>
        </div>
        <div class="ta-eff-card">
          <div class="ta-eff-value" style="color:var(--accent)">${eff.ratio?.toFixed(1) ?? '-'}x</div>
          <div class="ta-eff-label">效率比</div>
        </div>
      `;
      document.getElementById('ta-eff-section').style.display = 'block';

      // Render chart
      if (data.trends?.length) {
        this.renderTrendChart(data.trends);
      }

      this.showResult(`<div class="card"><div class="card-header"><h3>趋势数据</h3></div><div style="font-size:14px">${data.trends?.length || 0} 天的趋势数据</div></div>`);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  renderTrendChart(trends) {
    const section = document.getElementById('ta-trend-section');
    section.style.display = 'block';

    if (this.charts.trend) { this.charts.trend.destroy(); }

    const ctx = document.getElementById('ta-trend-chart').getContext('2d');
    const labels = trends.map(t => t.date.slice(5));
    const devData = trends.map(t => Math.round((t.categories?.Development || 0) / 3600000 * 10) / 10);
    const entData = trends.map(t => Math.round((t.categories?.Entertainment || 0) / 3600000 * 10) / 10);
    const socialData = trends.map(t => Math.round((t.categories?.Social || 0) / 3600000 * 10) / 10);
    const commData = trends.map(t => Math.round((t.categories?.Communication || 0) / 3600000 * 10) / 10);

    this.charts.trend = new Chart(ctx, {
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
        plugins: { legend: { labels: { color: '#8b949e', boxWidth: 12, padding: 12 } } },
        scales: {
          x: { stacked: true, ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
          y: { stacked: true, title: { display: true, text: 'Hours', color: '#8b949e' }, ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
        },
      },
    });
  },

  renderPieChart(categories) {
    const section = document.getElementById('ta-pie-section');
    section.style.display = 'block';

    if (this.charts.pie) { this.charts.pie.destroy(); }

    const colors = ['#3fb950', '#58a6ff', '#d29922', '#f85149', '#8b949e', '#bc8cff', '#f0883e'];
    const labels = [];
    const data = [];
    const bgColors = [];
    let i = 0;

    for (const [cat, catData] of Object.entries(categories || {})) {
      if (catData.totalMs > 60000) {
        labels.push(cat);
        data.push(Math.round(catData.totalMs / 60000));
        bgColors.push(colors[i % colors.length]);
        i++;
      }
    }

    if (data.length === 0) return;

    const ctx = document.getElementById('ta-pie-chart').getContext('2d');
    this.charts.pie = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b949e', boxWidth: 12, padding: 10, font: { size: 11 } } },
        },
      },
    });
  },

  async showSources() {
    this.clearResult();
    this.hideSections();
    this.showResult('<div class="loading">获取数据源状态...</div>');
    try {
      const data = await apiCall('/api/time-audit/sources');
      let html = '<div class="card"><div class="card-header"><h3>📡 数据源</h3></div><div class="ta-source-list">';
      for (const s of data.sources) {
        const icon = s.available ? '✓' : '⚠';
        const cls = s.available ? 'badge-ok' : 'badge-warn';
        const label = s.available ? `${s.entries} 条记录` : (s.error || '不可用');
        html += `<div class="ta-source-item"><span>${icon} ${s.name}</span><span class="badge ${cls}">${label}</span></div>`;
      }
      html += '</div></div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async customReport() {
    const since = document.getElementById('ta-since').value;
    const to = document.getElementById('ta-to').value || undefined;
    if (!since) return;
    this.clearResult();
    this.hideSections();
    this.showResult('<div class="loading">生成自定义报告...</div>');
    try {
      const data = await apiCall('/api/time-audit/report', { mode: 'summary', since, to });
      const s = data.summary;
      if (!s || !s.categories) {
        this.showResult('<div class="empty-state">指定范围内无数据</div>');
        return;
      }
      const totalMin = Math.round(s.totalTrackedMs / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;

      let html = `<div class="card"><div class="card-header"><h3>📊 报告 ${since} ~ ${to || '现在'}</h3></div>
        <div style="font-size:14px;margin-bottom:12px">总活跃: <strong>${h}h ${m}m</strong></div>`;

      const catColors = ['#3fb950', '#58a6ff', '#d29922', '#f85149', '#8b949e', '#bc8cff'];
      let ci = 0;
      for (const [cat, catData] of Object.entries(s.categories)) {
        const pct = catData.percentage || 0;
        const catMin = Math.round(catData.totalMs / 60000);
        const catH = Math.floor(catMin / 60);
        html += `<div class="ta-cat-bar">
          <span class="ta-cat-name">${cat}</span>
          <div class="ta-cat-bar-fill" style="width:${Math.max(pct * 2, 4)}px;background:${catColors[ci++ % catColors.length]}"></div>
          <span class="ta-cat-time">${catH}h ${catMin % 60}m</span>
          <span style="font-size:11px;color:var(--text-dim)">${pct.toFixed(1)}%</span>
        </div>`;
      }
      html += '</div>';
      this.showResult(html);
      this.renderPieChart(s.categories);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async cacheInfo() {
    this.clearResult();
    this.hideSections();
    try {
      const data = await apiCall('/api/time-audit/cache');
      let html = '<div class="card"><div class="card-header"><h3>💾 缓存信息</h3></div>';
      if (data.sources?.length) {
        html += `<div style="font-size:13px;margin-bottom:8px">已缓存: ${data.sources.length} 个数据源</div>`;
        html += `<div style="font-size:13px;margin-bottom:8px">总记录: ${data.totalEntries} 条</div>`;
        for (const [src, time] of Object.entries(data.lastScanned || {})) {
          html += `<div style="font-size:12px;color:var(--text-dim)">${src}: ${new Date(time).toLocaleString()}</div>`;
        }
      } else {
        html += '<div class="empty-state">无缓存数据</div>';
      }
      html += '</div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async clearCache() {
    try {
      await apiCall('/api/time-audit/cache/clear', {});
      this.showResult('<div class="card"><div class="card-header"><h3>缓存已清除</h3></div></div>');
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  // ─── Utility ───

  showResult(html) {
    document.getElementById('ta-result-area').innerHTML = html;
  },

  clearResult() {
    const area = document.getElementById('ta-result-area');
    if (area) area.innerHTML = '';
    document.getElementById('ta-digest-area').innerHTML = '';
  },

  hideSections() {
    document.getElementById('ta-eff-section').style.display = 'none';
    document.getElementById('ta-trend-section').style.display = 'none';
    document.getElementById('ta-pie-section').style.display = 'none';
    if (this.charts.trend) { this.charts.trend.destroy(); this.charts.trend = null; }
    if (this.charts.pie) { this.charts.pie.destroy(); this.charts.pie = null; }
  },
};
