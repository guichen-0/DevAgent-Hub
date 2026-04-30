// ─── Config Sync Page ───

const ConfigSyncPage = {
  async render() {
    return `
<div class="page-header">
  <h2>⚙ 配置同步</h2>
  <p class="page-desc">开发环境配置备份、版本管理和同步</p>
</div>

<div class="cs-status-bar" id="cs-status-bar">
  <div class="stat-card"><div class="stat-value" id="cs-prof-count">-</div><div class="stat-label">Profiles</div></div>
  <div class="stat-card"><div class="stat-value" id="cs-source-count">-</div><div class="stat-label">数据源</div></div>
  <div class="stat-card"><div class="stat-value" id="cs-version-count">-</div><div class="stat-label">版本数</div></div>
  <div class="stat-card blue"><div class="stat-value" id="cs-active-prof">-</div><div class="stat-label">当前 Profile</div></div>
</div>

<div class="card">
  <div class="card-header"><h3>操作</h3></div>
  <div class="cs-actions">
    <button class="btn btn-primary" onclick="ConfigSyncPage.discover()">🔍 扫描配置</button>
    <button class="btn btn-primary" onclick="ConfigSyncPage.backup()">⬆ 备份</button>
    <button class="btn" onclick="ConfigSyncPage.restore()">⬇ 恢复</button>
    <button class="btn" onclick="ConfigSyncPage.showStatus()">📊 状态</button>
  </div>
</div>

<div class="card">
  <div class="card-header">
    <h3>📜 版本历史</h3>
    <button class="btn btn-sm" onclick="ConfigSyncPage.loadVersions()">刷新</button>
  </div>
  <div class="cs-version-timeline" id="cs-version-list">
    <div class="empty-state">加载中...</div>
  </div>
</div>

<div class="card">
  <div class="card-header">
    <h3>☁ 远程同步</h3>
    <span class="badge badge-dim" id="cs-remote-badge">未配置</span>
  </div>
  <div class="cs-remote-bar">
    <input class="form-input" id="cs-remote-url" placeholder="https://github.com/user/repo.git">
    <button class="btn btn-sm" onclick="ConfigSyncPage.remoteInit()">初始化</button>
    <button class="btn btn-sm" onclick="ConfigSyncPage.remotePush()">推送</button>
    <button class="btn btn-sm" onclick="ConfigSyncPage.remotePull()">拉取</button>
    <button class="btn btn-sm" onclick="ConfigSyncPage.remoteStatus()">状态</button>
  </div>
</div>

<div class="card">
  <div class="card-header">
    <h3>🖥 新电脑设置</h3>
    <span class="badge badge-warn">适用于新环境</span>
  </div>
  <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
    在新电脑上从远程仓库克隆配置，然后恢复到本地对应位置。
  </div>
  <div class="cs-remote-bar" style="margin-bottom:8px">
    <input class="form-input" id="cs-clone-url" placeholder="https://github.com/user/repo.git">
    <button class="btn btn-primary" onclick="ConfigSyncPage.bootstrap()">📥 从远程克隆</button>
  </div>
  <div id="cs-bootstrap-result"></div>
  <div id="cs-restore-after-clone" style="display:none;margin-top:8px">
    <div class="card-header"><h3>找到的配置</h3></div>
    <div id="cs-clone-profiles" style="font-size:13px;margin-bottom:8px"></div>
    <div id="cs-clone-versions" style="font-size:13px;margin-bottom:8px"></div>
    <button class="btn btn-primary" onclick="ConfigSyncPage.restoreAfterClone()">⬇ 恢复配置到本机</button>
    <button class="btn btn-sm" onclick="ConfigSyncPage.remotePull();setTimeout(()=>ConfigSyncPage.restoreAfterClone(),1000)">先拉取最新 → 恢复</button>
  </div>
</div>

<div id="cs-result-area"></div>
`;
  },

  async afterRender() {
    await this.loadOverview();
    this.loadVersions();
    this.checkRemote();
  },

  async loadOverview() {
    try {
      const [profiles, statusData, versions] = await Promise.all([
        apiCall('/api/config-sync/profiles'),
        apiCall('/api/config-sync/status'),
        apiCall('/api/config-sync/versions'),
      ]);
      document.getElementById('cs-prof-count').textContent = profiles.profiles?.length || 0;
      document.getElementById('cs-source-count').textContent = statusData.sources?.length || 0;
      document.getElementById('cs-version-count').textContent = versions.versions?.length || 0;
      document.getElementById('cs-active-prof').textContent = statusData.activeProfile || 'none';
    } catch {}
  },

  async discover() {
    this.showResult('<div class="loading">扫描中...</div>');
    try {
      const data = await apiCall('/api/config-sync/discover');
      let html = '<div class="card"><div class="card-header"><h3>扫描结果</h3></div>';
      for (const s of data.sources) {
        if (s.status === 'not-installed') {
          html += `<div class="cs-source-item"><span>⚠ ${s.name}</span><span class="badge badge-dim">未安装</span></div>`;
        } else {
          html += `<div class="cs-source-item"><span>✓ ${s.name}</span><span class="badge badge-ok">${s.files.length} 个文件</span></div>`;
          for (const f of s.files) {
            html += `<div style="font-size:12px;color:var(--text-dim);padding:2px 0 2px 24px">• ${f.label}: ${f.path}</div>`;
          }
        }
      }
      html += '</div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async backup() {
    this.showResult('<div class="loading">备份中...</div>');
    try {
      const data = await apiCall('/api/config-sync/backup', {});
      let totalOk = 0, totalFail = 0;
      for (const r of data.results || []) {
        for (const fr of r.fileResults || []) {
          if (fr.success) totalOk++; else totalFail++;
        }
      }
      const html = `<div class="card">
        <div class="card-header"><h3>备份完成</h3></div>
        <div class="stat-card green"><div class="stat-value">${totalOk}</div><div class="stat-label">成功</div></div>
        ${totalFail > 0 ? `<div class="stat-card red"><div class="stat-value">${totalFail}</div><div class="stat-label">失败</div></div>` : ''}
        ${data.versionId ? `<div style="font-size:12px;color:var(--text-dim);margin-top:8px">版本: ${data.versionId}</div>` : ''}
      </div>`;
      this.showResult(html);
      this.loadVersions();
      this.loadOverview();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async restore() {
    this.showResult('<div class="loading">检查中...</div>');
    try {
      const data = await apiCall('/api/config-sync/restore', { dryRun: true });
      let html = '<div class="card"><div class="card-header"><h3>恢复预览（Dry Run）</h3></div>';
      for (const r of data.results || []) {
        for (const fr of r.fileResults || []) {
          if (fr.skipped) html += `<div class="cs-source-item"><span>- ${r.sourceId}/${fr.fileId}</span><span class="badge badge-dim">已最新</span></div>`;
          else if (fr.success) html += `<div class="cs-source-item"><span>~ ${r.sourceId}/${fr.fileId}</span><span class="badge badge-warn">将恢复</span></div>`;
          else html += `<div class="cs-source-item"><span>✗ ${r.sourceId}/${fr.fileId}</span><span class="badge badge-error">${fr.error}</span></div>`;
        }
      }
      html += '</div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async showStatus() {
    this.showResult('<div class="loading">获取状态...</div>');
    try {
      const data = await apiCall('/api/config-sync/status');
      let html = `<div class="card"><div class="card-header"><h3>同步状态</h3></div>
        <div style="font-size:14px;margin-bottom:12px">Active Profile: <strong>${data.activeProfile || 'none'}</strong></div>`;
      for (const s of data.sources || []) {
        const badgeClass = s.status === 'ready' ? 'badge-ok' : s.status === 'not-backed-up' ? 'badge-warn' : 'badge-dim';
        const label = s.status === 'ready' ? `${s.files} 个文件` : s.status;
        html += `<div class="cs-source-item"><span>${s.name}</span><span class="badge ${badgeClass}">${label}</span></div>`;
      }
      html += '</div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async loadVersions() {
    const list = document.getElementById('cs-version-list');
    try {
      const data = await apiCall('/api/config-sync/versions');
      const versions = data.versions || [];
      if (versions.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无版本记录。先运行一次备份。</div>';
        return;
      }
      list.innerHTML = versions.map(v => {
        const time = new Date(v.timestamp).toLocaleString();
        return `<div class="cs-version-item">
          <div class="cs-version-info">
            <span class="cs-version-badge">${v.id.slice(0, 6)}</span>
            <span>${time}</span>
            ${v.label ? `<span style="color:var(--text-secondary);font-size:12px">— ${escapeHtml(v.label)}</span>` : ''}
          </div>
          <div class="btn-group">
            <button class="btn btn-sm" onclick="ConfigSyncPage.diffVersion('${v.id}')">对比</button>
            <button class="btn btn-sm btn-danger" onclick="ConfigSyncPage.deleteVersion('${v.id}')">删除</button>
          </div>
        </div>`;
      }).join('');
    } catch {
      list.innerHTML = '<div class="error-state">加载失败</div>';
    }
  },

  async diffVersion(versionId) {
    this.showResult('<div class="loading">获取差异...</div>');
    try {
      const data = await apiCall('/api/config-sync/versions/diff', { versionId });
      if (data.error) { this.showResult(`<div class="error-state">${data.error}</div>`); return; }
      if (!data.diffs?.length) { this.showResult('<div class="empty-state">无文件可对比</div>'); return; }

      let html = '<div class="card"><div class="card-header"><h3>版本对比</h3></div>';
      for (const d of data.diffs) {
        html += `<div class="diff-header">── ${d.sourceId}/${d.fileId}  ${d.stats.additions > 0 || d.stats.removals > 0 ? `(+${d.stats.additions}/-${d.stats.removals})` : '(unchanged)'}</div>`;
        if (!d.hasLocal) html += '<div style="color:var(--yellow);font-size:12px">  本地文件不存在 — 仅显示 vault 内容</div>';
        if (d.lines?.length) {
          html += '<div class="diff-view">';
          for (const line of d.lines.slice(0, 200)) {
            if (line.type === 'add') html += `<div class="diff-line diff-add">+ ${String(line.lineNumB || '').padStart(4)} │ ${escapeHtml(line.text)}</div>`;
            else if (line.type === 'remove') html += `<div class="diff-line diff-remove">- ${String(line.lineNumA || '').padStart(4)} │ ${escapeHtml(line.text)}</div>`;
            else html += `<div class="diff-line">  ${String(line.lineNumA || '').padStart(4)} │ ${escapeHtml(line.text)}</div>`;
          }
          if (d.lines.length > 200) html += `<div class="diff-stats">... 仅显示前 200 行，共 ${d.lines.length} 行</div>`;
          html += '</div>';
        }
      }
      html += '</div>';
      this.showResult(html);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async deleteVersion(versionId) {
    if (!confirm('删除此版本?')) return;
    try {
      await apiCall('/api/config-sync/versions/delete', { versionId });
      this.loadVersions();
      this.loadOverview();
    } catch {}
  },

  // ─── Remote ───

  async checkRemote() {
    try {
      const data = await apiCall('/api/config-sync/remote/status');
      const badge = document.getElementById('cs-remote-badge');
      if (data.isGitRepo && data.hasRemote) { badge.textContent = '已连接'; badge.className = 'badge badge-ok'; }
      else if (data.isGitRepo) { badge.textContent = '本地'; badge.className = 'badge badge-warn'; }
      else { badge.textContent = '未配置'; badge.className = 'badge badge-dim'; }
    } catch {}
  },

  async remoteInit() {
    const url = document.getElementById('cs-remote-url').value.trim();
    if (!url) return;
    try {
      await apiCall('/api/config-sync/remote/init', { url });
      this.showResult('<div class="card"><div class="card-header"><h3>远程同步已配置</h3></div></div>');
      this.checkRemote();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async remotePush() {
    this.showResult('<div class="loading">推送中...</div>');
    try {
      const data = await apiCall('/api/config-sync/remote/push');
      const cls = data.success ? 'badge-ok' : 'badge-error';
      this.showResult(`<div class="card"><div class="card-header"><h3>推送</h3></div><span class="badge ${cls}">${data.message}</span></div>`);
      this.checkRemote();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async remotePull() {
    this.showResult('<div class="loading">拉取中...</div>');
    try {
      const data = await apiCall('/api/config-sync/remote/pull');
      const cls = data.success ? 'badge-ok' : 'badge-warn';
      let html = `<div class="card"><div class="card-header"><h3>拉取</h3></div><span class="badge ${cls}">${data.message}</span>`;
      // After successful pull, load available versions and offer restore
      if (data.success) {
        try {
          const versions = await apiCall('/api/config-sync/versions');
          const vList = versions.versions || [];
          if (vList.length > 0) {
            const latest = vList[0];
            html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
              <div style="font-size:13px;margin-bottom:8px">可用版本: ${vList.length} 个</div>
              <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">最新: ${latest.id.slice(0, 6)} (${new Date(latest.timestamp).toLocaleString()})</div>
              <button class="btn btn-sm btn-primary" onclick="ConfigSyncPage.restoreLatest()">⬇ 恢复到此版本</button>
              <button class="btn btn-sm" onclick="ConfigSyncPage.diffVersion('${latest.id}')">先查看差异</button>
            </div>`;
          }
        } catch {}
      }
      html += '</div>';
      this.showResult(html);
      this.checkRemote();
      this.loadVersions();
      this.loadOverview();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async restoreLatest() {
    if (!confirm('恢复最新版本的配置到本机？现有文件将被覆盖。')) return;
    this.showResult('<div class="loading">恢复中...</div>');
    try {
      const data = await apiCall('/api/config-sync/restore', { dryRun: false, force: false });
      let ok = 0, fail = 0;
      for (const r of data.results || []) {
        for (const fr of r.fileResults || []) { if (fr.success) ok++; else fail++; }
      }
      this.showResult(`<div class="card"><div class="card-header"><h3>恢复完成</h3></div>
        <div><span class="badge badge-ok">${ok} 个成功</span> ${fail > 0 ? `<span class="badge badge-error">${fail} 个失败</span>` : ''}</div>
      </div>`);
      this.loadVersions();
      this.loadOverview();
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  async bootstrap() {
    const url = document.getElementById('cs-clone-url').value.trim();
    if (!url) return;
    const area = document.getElementById('cs-bootstrap-result');
    area.innerHTML = '<div class="loading">正在克隆远程仓库...</div>';
    try {
      const data = await apiCall('/api/config-sync/remote/bootstrap', { url });
      if (data.success) {
        area.innerHTML = `<div style="color:var(--green);font-size:13px">✓ ${data.message}</div>`;
        // Show available profiles and versions
        const [profiles, versions] = await Promise.all([
          apiCall('/api/config-sync/profiles'),
          apiCall('/api/config-sync/versions'),
        ]);
        const pList = profiles.profiles || [];
        const vList = versions.versions || [];
        document.getElementById('cs-clone-profiles').innerHTML = `Profile: <strong>${profiles.activeProfile || 'default'}</strong>${pList.map(p => ` <span class="badge badge-dim">${p.name}</span>`).join('')}`;
        document.getElementById('cs-clone-versions').innerHTML = `版本数: <strong>${vList.length}</strong>${vList.length > 0 ? ` (最新: ${vList[0].id.slice(0, 6)} ${new Date(vList[0].timestamp).toLocaleString()})` : ''}`;
        document.getElementById('cs-restore-after-clone').style.display = 'block';
        // Refresh page state
        this.loadOverview();
        this.loadVersions();
        this.checkRemote();
      } else {
        area.innerHTML = `<div style="color:var(--red);font-size:13px">✗ ${data.message}</div>`;
      }
    } catch (err) { area.innerHTML = `<div style="color:var(--red);font-size:13px">错误: ${err.message}</div>`; }
  },

  async restoreAfterClone() {
    if (!confirm('将配置恢复到本机对应位置？现有文件可能被覆盖。')) return;
    const area = document.getElementById('cs-bootstrap-result');
    area.innerHTML = '<div class="loading">恢复中...</div>';
    try {
      const data = await apiCall('/api/config-sync/restore', { dryRun: false, force: false });
      let ok = 0, fail = 0;
      for (const r of data.results || []) {
        for (const fr of r.fileResults || []) { if (fr.success) ok++; else fail++; }
      }
      area.innerHTML = `<div style="color:var(--green);font-size:13px">✓ 恢复完成: ${ok} 个成功${fail > 0 ? `, ${fail} 个失败` : ''}</div>`;
      this.loadVersions();
      this.loadOverview();
    } catch (err) { area.innerHTML = `<div style="color:var(--red);font-size:13px">错误: ${err.message}</div>`; }
  },

  async remoteStatus() {
    try {
      const data = await apiCall('/api/config-sync/remote/status');
      if (!data.isGitRepo) {
        this.showResult('<div class="card"><div class="empty-state">远程同步未配置</div></div>');
        return;
      }
      this.showResult(`<div class="card"><div class="card-header"><h3>远程状态</h3></div>
        <div style="font-size:13px"><div>分支: ${data.branch}</div>
        <div>远程: ${data.remoteUrl || '未配置'}</div>
        ${data.lastCommit ? `<div>最后提交: ${data.lastCommit.hash.slice(0, 8)} (${data.lastCommit.date})</div>` : ''}
        ${data.status?.length ? `<div style="margin-top:8px">未提交: ${data.status.length} 个文件</div>` : '<div style="margin-top:8px">工作区干净</div>'}
        ${data.config?.lastSync ? `<div style="margin-top:4px;color:var(--text-dim);font-size:12px">上次同步: ${new Date(data.config.lastSync).toLocaleString()}</div>` : ''}
      </div></div>`);
    } catch (err) { this.showResult(`<div class="error-state">错误: ${err.message}</div>`); }
  },

  // ─── Utility ───

  showResult(html) {
    document.getElementById('cs-result-area').innerHTML = html;
  },
};
