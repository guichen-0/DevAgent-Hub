// ─── Monitor API ───

const monitorApi = {
  async list() { return (await apiCall('/api/monitor')).monitors; },
  async get(id) { return (await apiCall(`/api/monitor/${id}`)).monitor; },
  async create(data) { return (await apiCall('/api/monitor', data)).monitor; },
  async update(id, data) { return (await apiCall(`/api/monitor/${id}`, data, 'PUT')).monitor; },
  async delete(id) { await apiCall(`/api/monitor/${id}`, {}, 'DELETE'); return true; },
  async snapshots() { return (await apiCall('/api/monitor/snapshots')).snapshots; },
  async collect(id) { return (await apiCall(`/api/monitor/${id}/collect`, {})).point; },
  async snapshot(id) { return (await apiCall(`/api/monitor/${id}/snapshot`)).snapshot; },
  async clear(id) { await apiCall(`/api/monitor/${id}/clear`, {}); },
};

// ─── Monitor UI ───

const monitor = {
  charts: {},

  // ─── Grid View ───

  async showGrid() {
    clearOutput();
    out('Loading monitor dashboard...', 'blue');
    this.hideAllSections();

    const grid = document.getElementById('monitor-grid');
    grid.style.display = 'grid';
    grid.innerHTML = '<span class="dim">Loading...</span>';

    try {
      const monitors = await monitorApi.list();
      if (monitors.length === 0) {
        grid.innerHTML = '<span class="yellow">No monitors yet. Click "新建监控" to create one.</span>';
        return;
      }

      const snapshots = await monitorApi.snapshots();
      const snapMap = {};
      for (const s of snapshots) snapMap[s.id] = s;

      grid.innerHTML = '';
      for (const m of monitors) {
        const snap = snapMap[m.id];
        grid.appendChild(this.createCard(m, snap));
      }
    } catch (err) {
      grid.innerHTML = `<span class="red">Failed to load: ${err.message}</span>`;
    }
  },

  createCard(m, snap) {
    const card = document.createElement('div');
    card.className = 'monitor-card';
    card.onclick = () => this.showDetail(m.id);

    const status = snap?.lastStatus || 'warn';
    const value = snap?.lastValue ?? '—';
    const label = snap?.lastLabel || 'pending';
    const time = snap?.lastTimestamp ? new Date(snap.lastTimestamp).toLocaleTimeString() : '';

    let valueStr = value;
    if (m.type === 'http' && value !== '—') valueStr = `${value}ms`;
    else if (m.type === 'file' && m.file?.checkSize && value !== '—') valueStr = `${Math.round(value / 1024)} KB`;

    card.innerHTML = `
      <div class="monitor-card-actions">
        <button class="monitor-card-btn" onclick="event.stopPropagation();api.monitor.collectNow('${m.id}')">▶</button>
        <button class="monitor-card-btn" onclick="event.stopPropagation();api.monitor.showEditForm('${m.id}')">✎</button>
        <button class="monitor-card-btn" onclick="event.stopPropagation();api.monitor.deleteMonitor('${m.id}')" style="color:var(--red)">✕</button>
      </div>
      <div class="monitor-card-header">
        <span class="monitor-card-name">${m.name}</span>
        <span class="monitor-card-type">${m.type}</span>
      </div>
      <div class="monitor-card-value monitor-status-${status}">
        <span class="monitor-status-dot"></span>${valueStr}
      </div>
      <div class="monitor-card-label">${label}</div>
      <div class="monitor-card-time">${time}</div>
    `;

    return card;
  },

  async collectNow(id) {
    clearOutput();
    out(`Collecting data for ${id}...`, 'blue');
    try {
      const point = await monitorApi.collect(id);
      out(`Done: ${JSON.stringify(point)}`, 'dim');
      this.showGrid();
    } catch (err) {
      out(`Error: ${err.message}`, 'red');
    }
  },

  async deleteMonitor(id) {
    if (!confirm('Delete this monitor?')) return;
    await monitorApi.delete(id);
    delete this.charts[id];
    this.showGrid();
  },

  // ─── Detail View ───

  async showDetail(id) {
    clearOutput();
    out(`Loading detail for ${id}...`, 'blue');
    this.hideAllSections();

    const section = document.getElementById('monitor-detail');
    section.style.display = 'block';

    try {
      const m = await monitorApi.get(id);
      const snap = await monitorApi.snapshot(id);
      const body = document.getElementById('monitor-detail-body');

      let html = `
        <div class="section-header">
          <h3>${m.name}</h3>
          <div style="display:flex;gap:6px">
            <button class="refresh-btn" onclick="api.monitor.showDetail('${m.id}')">刷新</button>
            <button class="refresh-btn" onclick="api.monitor.showEditForm('${m.id}')">编辑</button>
            <button class="refresh-btn" onclick="api.monitor.collectNow('${m.id}')">立即采集</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px">
          <div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Type: ${m.type}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Interval: ${m.interval}s</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Created: ${new Date(m.createdAt).toLocaleString()}</div>
      `;

      if (m.description) {
        html += `<div style="font-size:12px;color:var(--text-secondary);margin-top:8px">${m.description}</div>`;
      }

      if (snap) {
        const status = snap.lastStatus;
        const time = new Date(snap.lastTimestamp).toLocaleString();
        html += `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div class="monitor-card-value monitor-status-${status}"><span class="monitor-status-dot"></span>${snap.lastLabel}</div>
            <div style="font-size:11px;color:var(--text-dim)">${time}</div>
            ${snap.lastDetail ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px">${snap.lastDetail}</div>` : ''}
          </div>
        `;
      }

      html += `</div><div><canvas id="detail-chart-${m.id}" style="height:200px;width:100%"></canvas></div></div>`;
      body.innerHTML = html;

      // Render chart
      if (snap && snap.history && snap.history.length > 1) {
        this.renderDetailChart(m.id, snap.history, m.type);
      }
    } catch (err) {
      document.getElementById('monitor-detail-body').innerHTML = `<span class="red">Error: ${err.message}</span>`;
    }
  },

  renderDetailChart(id, history, type) {
    const canvas = document.getElementById(`detail-chart-${id}`);
    if (!canvas) return;

    // Destroy previous chart
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
          label: type === 'http' ? 'Response (ms)' : type === 'file' ? 'Size (bytes)' : 'Value',
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
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { ticks: { color: '#8b949e', maxTicksLimit: 10, font: { size: 10 } }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#21262d' }, beginAtZero: true },
        },
      },
    });
  },

  // ─── List View ───

  async listAll() {
    clearOutput();
    out('All monitors:', 'bold');
    this.hideAllSections();

    try {
      const monitors = await monitorApi.list();
      if (monitors.length === 0) {
        out('No monitors yet.', 'yellow');
        return;
      }

      for (const m of monitors) {
        const status = m.enabled ? '✓' : '✗';
        out(`${status} [${m.type}] ${m.name} — every ${m.interval}s${m.enabled ? '' : ' (disabled)'}`, m.enabled ? 'green' : 'dim');
        if (m.description) out(`   ${m.description}`, 'dim');
      }
      out(`\nTotal: ${monitors.length} monitor(s)`, 'dim');
    } catch (err) {
      out(`Error: ${err.message}`, 'red');
    }
  },

  // ─── Create/Edit Form ───

  showNewForm() {
    this.hideAllSections();
    this.renderForm(null);
  },

  async showEditForm(id) {
    this.hideAllSections();
    const m = await monitorApi.get(id);
    this.renderForm(m);
  },

  renderForm(m) {
    const section = document.getElementById('monitor-form');
    section.style.display = 'block';
    document.getElementById('monitor-form-title').textContent = m ? '编辑监控' : '新建监控';

    const body = document.getElementById('monitor-form-body');
    const isEdit = !!m;

    body.innerHTML = `
      <div class="monitor-form-grid">
        <div class="monitor-form-group">
          <label>名称</label>
          <input type="text" id="mf-name" value="${m?.name || ''}" placeholder="My Monitor">
        </div>
        <div class="monitor-form-group">
          <label>类型</label>
          <select id="mf-type" onchange="api.monitor.toggleTypeConfig()">
            <option value="http" ${m?.type === 'http' ? 'selected' : ''}>HTTP</option>
            <option value="process" ${m?.type === 'process' ? 'selected' : ''}>进程</option>
            <option value="file" ${m?.type === 'file' ? 'selected' : ''}>文件</option>
            <option value="command" ${m?.type === 'command' ? 'selected' : ''}>命令</option>
            <option value="git" ${m?.type === 'git' ? 'selected' : ''}>Git</option>
          </select>
        </div>
        <div class="monitor-form-group full-width">
          <label>描述</label>
          <input type="text" id="mf-desc" value="${m?.description || ''}" placeholder="What does this monitor do?">
        </div>
        <div class="monitor-form-group">
          <label>采集间隔 (秒)</label>
          <input type="number" id="mf-interval" value="${m?.interval || 60}" min="10">
        </div>
        <div class="monitor-form-group">
          <label>启用</label>
          <select id="mf-enabled">
            <option value="true" ${m?.enabled !== false ? 'selected' : ''}>是</option>
            <option value="false" ${m?.enabled === false ? 'selected' : ''}>否</option>
          </select>
        </div>
      </div>

      <div id="mf-type-config" style="margin-top:12px">
        ${this.renderTypeConfig(m)}
      </div>

      <div class="monitor-form-actions">
        <button class="clear-btn" onclick="api.monitor.hideForm()">取消</button>
        <button onclick="api.monitor.saveForm('${isEdit ? m.id : ''}')" style="background:var(--accent);color:#fff;border:none;padding:6px 20px;border-radius:4px;cursor:pointer">
          ${isEdit ? '保存' : '创建'}
        </button>
      </div>
    `;
  },

  renderTypeConfig(m) {
    const type = m?.type || 'http';
    switch (type) {
      case 'http':
        return `
          <div class="monitor-form-grid">
            <div class="monitor-form-group full-width">
              <label>URL</label>
              <input type="text" id="mf-http-url" value="${m?.http?.url || ''}" placeholder="https://example.com">
            </div>
            <div class="monitor-form-group">
              <label>方法</label>
              <select id="mf-http-method">
                <option value="GET" ${m?.http?.method === 'GET' || !m?.http ? 'selected' : ''}>GET</option>
                <option value="HEAD" ${m?.http?.method === 'HEAD' ? 'selected' : ''}>HEAD</option>
              </select>
            </div>
            <div class="monitor-form-group">
              <label>超时 (ms)</label>
              <input type="number" id="mf-http-timeout" value="${m?.http?.timeout || 10000}" min="1000">
            </div>
            <div class="monitor-form-group">
              <label>期望状态码</label>
              <input type="number" id="mf-http-expected" value="${m?.http?.expectedStatus || 200}">
            </div>
          </div>
        `;
      case 'process':
        return `
          <div class="monitor-form-grid">
            <div class="monitor-form-group">
              <label>进程名</label>
              <input type="text" id="mf-proc-name" value="${m?.process?.name || ''}" placeholder="node.exe">
            </div>
          </div>
        `;
      case 'file':
        return `
          <div class="monitor-form-grid">
            <div class="monitor-form-group full-width">
              <label>文件路径</label>
              <input type="text" id="mf-file-path" value="${m?.file?.path || ''}" placeholder="C:\\path\\to\\file.log">
            </div>
            <div class="monitor-form-group">
              <label><input type="checkbox" id="mf-file-size" ${m?.file?.checkSize !== false ? 'checked' : ''}> 监控大小</label>
            </div>
            <div class="monitor-form-group">
              <label><input type="checkbox" id="mf-file-exists" ${m?.file?.checkExists ? 'checked' : ''}> 监控存在</label>
            </div>
          </div>
        `;
      case 'command':
        return `
          <div class="monitor-form-grid">
            <div class="monitor-form-group full-width">
              <label>命令</label>
              <textarea id="mf-cmd-command" rows="2">${m?.command?.command || ''}</textarea>
            </div>
            <div class="monitor-form-group">
              <label><input type="checkbox" id="mf-cmd-shell" ${m?.command?.shell !== false ? 'checked' : ''}> 使用 Shell</label>
            </div>
          </div>
        `;
      case 'git':
        return `
          <div class="monitor-form-grid">
            <div class="monitor-form-group full-width">
              <label>仓库路径 (每行一个)</label>
              <textarea id="mf-git-repos" rows="3">${(m?.git?.repos || []).join('\n')}</textarea>
            </div>
            <div class="monitor-form-group">
              <label><input type="checkbox" id="mf-git-unpushed" ${m?.git?.checkUnpushed !== false ? 'checked' : ''}> 检查未推送</label>
            </div>
            <div class="monitor-form-group">
              <label><input type="checkbox" id="mf-git-untracked" ${m?.git?.checkUntracked !== false ? 'checked' : ''}> 检查未跟踪</label>
            </div>
          </div>
        `;
    }
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
        data.git = {
          repos,
          checkUnpushed: document.getElementById('mf-git-unpushed').checked,
          checkUntracked: document.getElementById('mf-git-untracked').checked,
        };
        break;
    }

    return data;
  },

  async saveForm(id) {
    const data = this.collectFormData();
    if (!data.name) { out('Name is required.', 'red'); return; }

    clearOutput();
    try {
      if (id) {
        await monitorApi.update(id, data);
        out('Monitor updated.', 'green');
      } else {
        await monitorApi.create(data);
        out('Monitor created.', 'green');
      }
      this.hideForm();
      this.showGrid();
    } catch (err) {
      out(`Error: ${err.message}`, 'red');
    }
  },

  hideForm() {
    document.getElementById('monitor-form').style.display = 'none';
  },

  hideAllSections() {
    document.getElementById('monitor-grid').style.display = 'none';
    document.getElementById('monitor-form').style.display = 'none';
    document.getElementById('monitor-detail').style.display = 'none';
  },
};

// Register with global api object
window.api = window.api || {};
window.api.monitor = monitor;
