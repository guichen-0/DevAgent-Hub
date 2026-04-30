// ─── Shared API Helper ───

async function apiCall(url, body = null, methodOverride = null) {
  try {
    let method = 'GET';
    let reqBody = null;
    if (methodOverride) { method = methodOverride; if (body) reqBody = JSON.stringify(body); }
    else if (body) { method = 'POST'; reqBody = JSON.stringify(body); }
    const res = await fetch(url, {
      method,
      headers: reqBody ? { 'Content-Type': 'application/json' } : {},
      body: reqBody,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}

// ─── Formatting Utilities ───

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0m';
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  return `${h}h ${min}m`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
