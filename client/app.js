// ─── SPA Router ───

const pages = {
  'config-sync': ConfigSyncPage,
  'time-audit': TimeAuditPage,
  'monitor': MonitorPage,
};

let currentPage = null;

async function switchPage(pageId) {
  const page = pages[pageId];
  if (!page) return;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

  // Update page container
  const container = document.getElementById('page-container');
  container.innerHTML = '';
  container.innerHTML = await page.render();
  if (page.afterRender) await page.afterRender();
  currentPage = pageId;
}

// ─── Nav Listeners ───

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPage(btn.dataset.page);
    });
  });

  // Load default page
  switchPage('config-sync');
});
