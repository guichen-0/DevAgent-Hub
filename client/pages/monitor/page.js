// ─── Monitor Page ───

const MonitorPage = {
  charts: {},

  async render() {
    return `
<div class="page-header">
  <h2>📡 监控中心</h2>
  <p class="page-desc">插件化监控平台 — HTTP、进程、文件、命令、Git 仓库</p>
</div>

<div class="mn-status-bar" id="mn-status-bar">
  <div class="stat-card"><div class="stat-value" id="mn-total">-</div><div class="stat-label">监控总数</div></div>
  <div class="stat-card"><div class="stat-value" id="mn-active">-</div><div class="stat-label">活跃</div></div>
  <div class="stat-card"><div class="stat-value" id="mn-types-count">-</div><div class="stat-label">类型数</div></div>
  <div class="stat-card blue"><div class="stat-value" id="mn-last-collect">-</div><div class="stat-label">上次采集</div></div>
</div>

<div class="card">
  <div class="card-header"><h3>操作</h3></div>
  <div class="mn-actions">
    <button class="btn btn-primary" onclick="MonitorPage.showGrid()">📊 监控面板</button>
    <button class="btn btn-primary" onclick="MonitorPage.showNewForm()">➕ 新建监控</button>
    <button class="btn" onclick="MonitorPage.listAll()">📋 列表管理</button>
  </div>
</div>

<!-- Grid -->
<div id="mn-grid-section" class="card" style="display:none">
  <div class="card-header"><h3>监控面板</h3><button class="btn btn-sm" onclick="MonitorPage.showGrid()">🔄 刷新</button></div>
  <div class="mn-card-grid" id="mn-grid"></div>
</div>

<!-- Form -->
<div id="mn-form-section" class="card" style="display:none">
  <div class="card-header"><h3 id="mn-form-title">新建监控</h3></div>
  <div id="mn-form-body"></div>
</div>

<!-- Detail -->
<div id="mn-detail-section" class="card" style="display:none">
  <div id="mn-detail-body"></div>
</div>

<!-- Table -->
<div id="mn-table-section" class="card" style="display:none">
  <div class="card-header"><h3>监控列表</h3></div>
  <div id="mn-table-body"></div>
</div>

<div id="mn-result-area"></div>
`;
  },

  async afterRender() {
    await this.loadOverview();
  },

  async loadOverview() {
    try {
      const monitors = await this.api.list();
      document.getElementById('mn-total').textContent = monitors.length;
      const active = monitors.filter(m => m.enabled !== false).length;
      document.getElementById('mn-active').textContent = active;
      const types = new Set(monitors.map(m => m.type));
      document.getElementById('mn-types-count').textContent = types.size;

      const snapshots = await this.api.snapshots();
      const times = Object.values(snapshots).map(s => s.lastTimestamp).filter(Boolean);
      if (times.length) {
        const latest = new Date(Math.max(...times.map(t => new Date(t).getTime())));
        document.getElementById('mn-last-collect').textContent = latest.toLocaleTimeString();
      } else {
        document.getElementById('mn-last-collect').textContent = '无';
      }
    } catch {}
  },

  // ─── API Wrapper ───

  api: {
    async list() { return (await apiCall('/api/monitor')).monitors; },
    async get(id) { return (await apiCall(`/api/monitor/${id}`)).monitor; },
    async create(data) { return (await apiCall('/api/monitor', data)).monitor; },
    async update(id, data) { return (await apiCall(`/api/monitor/${id}`, data, 'PUT')).monitor; },
    async delete(id) { await apiCall(`/api/monitor/${id}`, {}, 'DELETE'); return true; },
    async snapshots() { return (await apiCall('/api/monitor/snapshots')).snapshots; },
    async collect(id) { return (await apiCall(`/api/monitor/${id}/collect`, {})).point; },
    async snapshot(id) { return (await apiCall(`/api/monitor/${id}/snapshot`)).snapshot; },
    async clear(id) { await apiCall(`/api/monitor/${id}/clear`, {}); },
  },

  // ─── Grid View ───

  async showGrid() {
    this.hideAll();
    const section = document.getElementById('mn-grid-section');
    section.style.display = 'block';
    const grid = document.getElementById('mn-grid');
    grid.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const monitors = await this.api.list();
      if (monitors.length === 0) {
        grid.innerHTML = '<div class="empty-state">暂无监控。点击"新建监控"创建。</div>';
        return;
      }
      const snapshots = await this.api.snapshots();
      const snapMap = {};
      for (const s of snapshots) snapMap[s.id] = s;

      grid.innerHTML = monitors.map(m => this.buildCard(m, snapMap[m.id])).join('');
    } catch (err) {
      grid.innerHTML = `<div class="error-state">加载失败: ${err.message}</div>`;
    }
  },

  buildCard(m, snap) {
    const status = snap?.lastStatus || 'warn';
    const value = snap?.lastValue ?? '—';
    const label = snap?.lastLabel || 'pending';
    const time = snap?.lastTimestamp ? new Date(snap.lastTimestamp).toLocaleTimeString() : '';

    let valueStr = value;
    if (m.type === 'http' && value !== '—') valueStr = `${value}ms`;
    else if (m.type === 'file' && m.file?.checkSize && value !== '—') valueStr = `${Math.round(value / 1024)} KB`;

    return `<div class="mn-card" onclick="MonitorPage.showDetail('${m.id}')">
      <div class="mn-card-actions">
        <button class="mn-card-btn" onclick="event.stopPropagation();MonitorPage.collectNow('${m.id}')">▶</button>
        <button class="mn-card-btn" onclick="event.stopPropagation();MonitorPage.showEditForm('${m.id}')">✎</button>
        <button class="mn-card-btn" onclick="event.stopPropagation();MonitorPage.deleteMonitor('${m.id}')" style="color:var(--red)">✕</button>
      </div>
      <div class="mn-card-header">
        <span class="mn-card-name">${escapeHtml(m.name)}</span>
        <span class="mn-card-type">${m.type}</span>
      </div>
      <div class="mn-card-value mn-status-${status}">
        <span class="mn-status-dot"></span>${valueStr}
      </div>
      <div class="mn-card-label">${label}</div>
      <div class="mn-card-time">${time}</div>
    </div>`;
  },

  async collectNow(id) {
    this.hideAll();
    this.showResult('<div class="loading">采集中...</div>');
    try {
      const point = await this.api.collect(id);
      this.showResult(`<div class="card"><div class="card-header"><h3>采集完成</h3></div><div style="font-size:13px">${JSON.stringify(point)}</div></div>`);
      this.showGrid();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async deleteMonitor(id) {
    if (!confirm('删除此监控?')) return;
    await this.api.delete(id);
    delete this.charts[id];
    this.showGrid();
  },

  // ─── Detail View ───

  async showDetail(id) {
    this.hideAll();
    const section = document.getElementById('mn-detail-section');
    section.style.display = 'block';
    const body = document.getElementById('mn-detail-body');
    body.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const m = await this.api.get(id);
      const snap = await this.api.snapshot(id);

      let html = `<div class="card-header">
        <h3>${escapeHtml(m.name)}</h3>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="MonitorPage.showDetail('${m.id}')">🔄 刷新</button>
          <button class="btn btn-sm" onclick="MonitorPage.showEditForm('${m.id}')">✎ 编辑</button>
          <button class="btn btn-sm" onclick="MonitorPage.collectNow('${m.id}')">▶ 采集</button>
        </div>
      </div>
      <div class="mn-detail-grid">
        <div class="mn-detail-info">
          <div><span class="mn-detail-label">类型:</span> ${m.type}</div>
          <div><span class="mn-detail-label">间隔:</span> ${m.interval}s</div>
          <div><span class="mn-detail-label">创建:</span> ${new Date(m.createdAt).toLocaleString()}</div>
          ${m.description ? `<div style="margin-top:8px;font-size:12px;color:var(--text-dim)">${escapeHtml(m.description)}</div>` : ''}
          ${snap ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div class="mn-card-value mn-status-${snap.lastStatus || 'warn'}"><span class="mn-status-dot"></span>${snap.lastLabel || 'pending'}</div>
            <div style="font-size:11px;color:var(--text-dim)">${new Date(snap.lastTimestamp).toLocaleString()}</div>
            ${snap.lastDetail ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px">${escapeHtml(snap.lastDetail)}</div>` : ''}
          </div>` : ''}
        </div>
        <div><canvas id="mn-chart-${m.id}" style="height:200px;width:100%"></canvas></div>
      </div>`;

      body.innerHTML = html;

      if (snap?.history?.length > 1) {
        this.renderChart(m.id, snap.history, m.type);
      }
    } catch (err) {
      body.innerHTML = `<div class="error-state">错误: ${err.message}</div>`;
    }
  },

  renderChart(id, history, type) {
    const canvas = document.getElementById(`mn-chart-${id}`);
    if (!canvas) return;
    if (this.charts[id]) { this.charts[id].destroy(); }

    const ctx = canvas.getContext('2d');
    const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
    const data = history.map(h => h.value);
    const colors = history.map(h =>
      h.status === 'ok' ? '#3fb950' : h.status === 'warn' ? '#d29922' : '#f85149'
    );

    this.charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: type === 'http' ? '响应时间 (ms)' : type === 'file' ? '大小 (bytes)' : '值',
          data,
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88, 166, 255, 0.1)',
          pointBackgroundColor: colors,
          pointRadius: 2,
          borderWidth: 1.5,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8b949e', maxTicksLimit: 10, font: { size: 10 } }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#21262d' }, beginAtZero: true },
        },
      },
    });
  },

  // ─── List View ───

  async listAll() {
    this.hideAll();
    const section = document.getElementById('mn-table-section');
    section.style.display = 'block';
    const body = document.getElementById('mn-table-body');
    body.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const monitors = await this.api.list();
      if (monitors.length === 0) {
        body.innerHTML = '<div class="empty-state">暂无监控</div>';
        return;
      }

      let html = `<table class="mn-list-table">
        <thead><tr><th></th><th>名称</th><th>类型</th><th>间隔</th><th>创建时间</th><th>操作</th></tr></thead><tbody>`;
      for (const m of monitors) {
        const status = m.enabled !== false ? 'enabled' : 'disabled';
        html += `<tr>
          <td class="${status}">${m.enabled !== false ? '✓' : '✗'}</td>
          <td>${escapeHtml(m.name)}</td>
          <td><span class="mn-card-type">${m.type}</span></td>
          <td>${m.interval}s</td>
          <td style="font-size:12px;color:var(--text-dim)">${new Date(m.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-sm" onclick="MonitorPage.showDetail('${m.id}')">详情</button>
            <button class="btn btn-sm" onclick="MonitorPage.showEditForm('${m.id}')">编辑</button>
            <button class="btn btn-sm btn-danger" onclick="MonitorPage.deleteMonitor('${m.id}')">删除</button>
          </td>
        </tr>`;
      }
      html += '</tbody></table>';
      body.innerHTML = html;
    } catch (err) {
      body.innerHTML = `<div class="error-state">错误: ${err.message}</div>`;
    }
  },

  // ─── Form ───

  showNewForm() {
    this.hideAll();
    this.renderForm(null);
  },

  async showEditForm(id) {
    this.hideAll();
    const m = await this.api.get(id);
    this.renderForm(m);
  },

  renderForm(m) {
    const section = document.getElementById('mn-form-section');
    section.style.display = 'block';
    document.getElementById('mn-form-title').textContent = m ? '编辑监控' : '新建监控';

    const body = document.getElementById('mn-form-body');
    const isEdit = !!m;

    body.innerHTML = `
      <div class="mn-form-grid">
        <div class="mn-form-group">
          <label>名称</label>
          <input class="form-input" type="text" id="mf-name" value="${escapeHtml(m?.name || '')}" placeholder="My Monitor">
        </div>
        <div class="mn-form-group">
          <label>类型</label>
          <select class="form-select" id="mf-type" onchange="MonitorPage.toggleTypeConfig()">
            <option value="http" ${m?.type === 'http' ? 'selected' : ''}>HTTP</option>
            <option value="process" ${m?.type === 'process' ? 'selected' : ''}>进程</option>
            <option value="file" ${m?.type === 'file' ? 'selected' : ''}>文件</option>
            <option value="command" ${m?.type === 'command' ? 'selected' : ''}>命令</option>
            <option value="git" ${m?.type === 'git' ? 'selected' : ''}>Git</option>
          </select>
        </div>
        <div class="mn-form-group full-width">
          <label>描述</label>
          <input class="form-input" type="text" id="mf-desc" value="${escapeHtml(m?.description || '')}" placeholder="监控说明">
        </div>
        <div class="mn-form-group">
          <label>采集间隔 (秒)</label>
          <input class="form-input" type="number" id="mf-interval" value="${m?.interval || 60}" min="10">
        </div>
        <div class="mn-form-group">
          <label>启用</label>
          <select class="form-select" id="mf-enabled">
            <option value="true" ${m?.enabled !== false ? 'selected' : ''}>是</option>
            <option value="false" ${m?.enabled === false ? 'selected' : ''}>否</option>
          </select>
        </div>
      </div>
      <div id="mf-type-config" style="margin-top:12px">
        ${this.renderTypeConfig(m)}
      </div>
      <div class="mn-form-actions">
        <button class="btn btn-sm" onclick="MonitorPage.hideForm()">取消</button>
        <button class="btn btn-sm btn-primary" onclick="MonitorPage.saveForm('${isEdit ? m.id : ''}')">${isEdit ? '保存' : '创建'}</button>
      </div>
    `;
  },

  renderTypeConfig(m) {
    const type = m?.type || 'http';
    switch (type) {
      case 'http':
        return `<div class="mn-form-grid">
          <div class="mn-form-group full-width">
            <label>URL</label>
            <input class="form-input" type="text" id="mf-http-url" value="${escapeHtml(m?.http?.url || '')}" placeholder="https://example.com">
          </div>
          <div class="mn-form-group">
            <label>方法</label>
            <select class="form-select" id="mf-http-method">
              <option value="GET" ${m?.http?.method === 'GET' || !m?.http ? 'selected' : ''}>GET</option>
              <option value="HEAD" ${m?.http?.method === 'HEAD' ? 'selected' : ''}>HEAD</option>
            </select>
          </div>
          <div class="mn-form-group">
            <label>超时 (ms)</label>
            <input class="form-input" type="number" id="mf-http-timeout" value="${m?.http?.timeout || 10000}" min="1000">
          </div>
          <div class="mn-form-group">
            <label>期望状态码</label>
            <input class="form-input" type="number" id="mf-http-expected" value="${m?.http?.expectedStatus || 200}">
          </div>
        </div>`;
      case 'process':
        return `<div class="mn-form-grid">
          <div class="mn-form-group">
            <label>进程名</label>
            <input class="form-input" type="text" id="mf-proc-name" value="${escapeHtml(m?.process?.name || '')}" placeholder="node.exe">
          </div>
        </div>`;
      case 'file':
        return `<div class="mn-form-grid">
          <div class="mn-form-group full-width">
            <label>文件路径</label>
            <input class="form-input" type="text" id="mf-file-path" value="${escapeHtml(m?.file?.path || '')}" placeholder="C:\\path\\to\\file.log">
          </div>
          <div class="mn-form-group">
            <label><input type="checkbox" id="mf-file-size" ${m?.file?.checkSize !== false ? 'checked' : ''}> 监控大小</label>
          </div>
          <div class="mn-form-group">
            <label><input type="checkbox" id="mf-file-exists" ${m?.file?.checkExists ? 'checked' : ''}> 监控存在</label>
          </div>
        </div>`;
      case 'command':
        return `<div class="mn-form-grid">
          <div class="mn-form-group full-width">
            <label>命令</label>
            <textarea class="form-textarea" id="mf-cmd-command" rows="2">${escapeHtml(m?.command?.command || '')}</textarea>
          </div>
          <div class="mn-form-group">
            <label><input type="checkbox" id="mf-cmd-shell" ${m?.command?.shell !== false ? 'checked' : ''}> 使用 Shell</label>
          </div>
        </div>`;
      case 'git':
        return `<div class="mn-form-grid">
          <div class="mn-form-group full-width">
            <label>仓库路径 (每行一个)</label>
            <textarea class="form-textarea" id="mf-git-repos" rows="3">${escapeHtml((m?.git?.repos || []).join('\n'))}</textarea>
          </div>
          <div class="mn-form-group">
            <label><input type="checkbox" id="mf-git-unpushed" ${m?.git?.checkUnpushed !== false ? 'checked' : ''}> 检查未推送</label>
          </div>
          <div class="mn-form-group">
            <label><input type="checkbox" id="mf-git-untracked" ${m?.git?.checkUntracked !== false ? 'checked' : ''}> 检查未跟踪</label>
          </div>
        </div>`;
    }
    return '';
  },

  toggleTypeConfig() {
    const type = document.getElementById('mf-type').value;
    const container = document.getElementById('mf-type-config');
    container.innerHTML = this.renderTypeConfig({ type });
  },

  collectFormData() {
    const type = document.getElementById('mf-type').value;
    const data = {
      name: document.getElementById('mf-name').value,
      description: document.getElementById('mf-desc').value,
      type,
      interval: parseInt(document.getElementById('mf-interval').value) || 60,
      enabled: document.getElementById('mf-enabled').value === 'true',
    };

    switch (type) {
      case 'http':
        data.http = {
          url: document.getElementById('mf-http-url').value,
          method: document.getElementById('mf-http-method').value,
          timeout: parseInt(document.getElementById('mf-http-timeout').value) || 10000,
          expectedStatus: parseInt(document.getElementById('mf-http-expected').value) || 200,
        };
        break;
      case 'process':
        data.process = { name: document.getElementById('mf-proc-name').value };
        break;
      case 'file':
        data.file = {
          path: document.getElementById('mf-file-path').value,
          checkSize: document.getElementById('mf-file-size').checked,
          checkExists: document.getElementById('mf-file-exists').checked,
        };
        break;
      case 'command':
        data.command = {
          command: document.getElementById('mf-cmd-command').value,
          shell: document.getElementById('mf-cmd-shell').checked,
        };
        break;
      case 'git':
        const repos = document.getElementById('mf-git-repos').value
          .split('\n').map(l => l.trim()).filter(Boolean);
        data.git = { repos, checkUnpushed: document.getElementById('mf-git-unpushed').checked, checkUntracked: document.getElementById('mf-git-untracked').checked };
        break;
    }
    return data;
  },

  async saveForm(id) {
    const data = this.collectFormData();
    if (!data.name) { this.showResult('<div class="error-state">名称不能为空</div>'); return; }

    this.hideAll();
    this.showResult('<div class="loading">保存中...</div>');
    try {
      if (id) {
        await this.api.update(id, data);
        this.showResult('<div class="card"><div class="card-header"><h3>监控已更新</h3></div></div>');
      } else {
        await this.api.create(data);
        this.showResult('<div class="card"><div class="card-header"><h3>监控已创建</h3></div></div>');
      }
      this.hideForm();
      this.showGrid();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  hideForm() {
    document.getElementById('mn-form-section').style.display = 'none';
  },

  // ─── Utility ───

  hideAll() {
    document.getElementById('mn-grid-section').style.display = 'none';
    document.getElementById('mn-form-section').style.display = 'none';
    document.getElementById('mn-detail-section').style.display = 'none';
    document.getElementById('mn-table-section').style.display = 'none';
    document.getElementById('mn-result-area').innerHTML = '';
  },

  showResult(html) {
    document.getElementById('mn-result-area').innerHTML = html;
  },
};
