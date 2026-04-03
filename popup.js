// Focus Guard - Popup Logic

const $ = (id) => document.getElementById(id);

let blockedSites = [];

// Load settings from storage
chrome.storage.sync.get(
  {
    enabled: true,
    blockedSites: [],
    blockStart: '08:00',
    blockEnd: '21:00',
  },
  (settings) => {
    $('toggle-enabled').checked = settings.enabled;
    $('time-start').value = settings.blockStart;
    $('time-end').value = settings.blockEnd;
    blockedSites = [...settings.blockedSites];
    renderSites();
    updateToggleLabel(settings.enabled);
    updateBodyState(settings.enabled);
  }
);

// Toggle enable/disable
$('toggle-enabled').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  updateToggleLabel(enabled);
  updateBodyState(enabled);
});

function updateToggleLabel(enabled) {
  $('toggle-label').textContent = enabled ? 'ON' : 'OFF';
}

function updateBodyState(enabled) {
  document.body.classList.toggle('disabled', !enabled);
}

// Render the site list
function renderSites() {
  const list = $('sites-list');
  list.innerHTML = '';
  blockedSites.forEach((site, index) => {
    const item = document.createElement('div');
    item.className = 'site-item flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2';
    item.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
      <span class="flex-1 text-[13px] font-medium text-slate-700 break-all">${escapeHTML(site)}</span>
      <button class="site-remove shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50
                     text-base leading-none px-1 py-0.5 rounded transition-colors"
              data-index="${index}" title="Remove">&#10005;</button>
    `;
    list.appendChild(item);
  });
}

// Remove site via event delegation
$('sites-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.site-remove');
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  blockedSites.splice(index, 1);
  renderSites();
});

// Add site
function addSite() {
  const input = $('add-input');
  const raw = input.value.trim();
  if (!raw) return;

  const normalized = normalizeEntry(raw);
  if (!normalized) {
    input.style.borderColor = '#fc8181';
    input.placeholder = 'Invalid — try: instagram.com or youtube.com/shorts';
    setTimeout(() => {
      input.style.borderColor = '';
      input.placeholder = 'e.g. instagram.com or youtube.com/shorts';
    }, 2000);
    return;
  }

  if (blockedSites.includes(normalized)) {
    input.value = '';
    return;
  }

  blockedSites.push(normalized);
  renderSites();
  input.value = '';

  // Scroll list to bottom
  const list = $('sites-list');
  list.scrollTop = list.scrollHeight;
}

$('btn-add').addEventListener('click', addSite);

$('add-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addSite();
});

// Save settings
$('btn-save').addEventListener('click', () => {
  const settings = {
    enabled: $('toggle-enabled').checked,
    blockedSites: [...blockedSites],
    blockStart: $('time-start').value,
    blockEnd: $('time-end').value,
  };

  chrome.storage.sync.set(settings, () => {
    const status = $('status');
    status.classList.remove('opacity-0');
    status.classList.add('opacity-100');
    setTimeout(() => {
      status.classList.remove('opacity-100');
      status.classList.add('opacity-0');
    }, 2000);
  });
});

// Helpers

function normalizeEntry(input) {
  // Strip protocol, www prefix, query string, and trailing slashes
  let value = input.toLowerCase();
  value = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  // Remove query string and hash
  value = value.split('?')[0].split('#')[0];
  // Remove trailing slash
  value = value.replace(/\/+$/, '');

  // Split into domain and optional path
  const slashIndex = value.indexOf('/');
  const domain = slashIndex === -1 ? value : value.substring(0, slashIndex);
  const path = slashIndex === -1 ? '' : value.substring(slashIndex);

  // Validate domain part
  if (!/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    return null;
  }

  return path ? domain + path : domain;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
