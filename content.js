// Focus Guard - Content Script

(function () {
  if (window.self !== window.top) return;

  const hostname = window.location.hostname.replace(/^www\./, '').toLowerCase();
  if (!hostname) return;

  let parsedEntries = [];
  let isBlocking = false;
  let hasPathEntries = false;

  chrome.storage.sync.get(
    {
      enabled: true,
      blockedSites: [],
      blockStart: '08:00',
      blockEnd: '21:00',
    },
    (settings) => {
      if (chrome.runtime.lastError) return;
      if (!settings.enabled) return;

      parsedEntries = parseBlockedSites(settings.blockedSites);
      hasPathEntries = parsedEntries.some(
        (entry) => entry.path && matchesDomain(hostname, entry.domain)
      );

      checkAndBlock(settings);

      if (hasPathEntries) {
        let lastUrl = window.location.href;
        setInterval(() => {
          const currentUrl = window.location.href;
          if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            checkAndBlock(settings);
          }
        }, 500);
      }
    }
  );

  function parseBlockedSites(sites) {
    return sites.map((site) => {
      const normalized = site.trim().replace(/^www\./, '').toLowerCase();
      if (!normalized) return null;

      const slashIndex = normalized.indexOf('/');
      if (slashIndex === -1) {
        return { domain: normalized, path: null };
      }
      return {
        domain: normalized.substring(0, slashIndex),
        path: normalized.substring(slashIndex),
      };
    }).filter(Boolean);
  }

  function matchesDomain(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
  }

  function shouldBlockUrl(pathname) {
    return parsedEntries.some((entry) => {
      if (!matchesDomain(hostname, entry.domain)) return false;
      if (!entry.path) return true;
      return pathname === entry.path || pathname.startsWith(entry.path + '/');
    });
  }

  function checkAndBlock(settings) {
    const currentPath = window.location.pathname.toLowerCase();
    const shouldBlock = shouldBlockUrl(currentPath);

    if (shouldBlock && !isBlocking) {
      if (!isCurrentTimeInRange(settings.blockStart, settings.blockEnd)) return;
      isBlocking = true;
      blockPage(hostname, settings.blockStart, settings.blockEnd);
    } else if (!shouldBlock && isBlocking) {
      isBlocking = false;
      unblockPage();
    }
  }

  function isCurrentTimeInRange(start, end) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    if (s <= e) {
      return cur >= s && cur < e;
    }
    return cur >= s || cur < e;
  }

  function blockPage(hostname, blockStart, blockEnd) {
    window.stop();

    const overlay = document.createElement('div');
    overlay.id = '__focus_guard_overlay__';
    overlay.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'color:#fff',
      'box-sizing:border-box',
    ].join('!important;') + '!important';

    overlay.innerHTML = buildOverlayHTML(hostname, blockStart, blockEnd);

    const attach = () => {
      const root = document.documentElement || document.body;
      if (root && !document.getElementById('__focus_guard_overlay__')) {
        root.appendChild(overlay);
      }
    };

    const blurContent = () => {
      if (document.body) {
        document.body.style.cssText += [
          'filter:blur(20px)',
          'pointer-events:none',
          'user-select:none',
        ].join('!important;') + '!important';
      }
    };

    attach();
    blurContent();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        attach();
        blurContent();
      }, { once: true });
    }

    const guard = new MutationObserver(() => {
      if (!document.getElementById('__focus_guard_overlay__')) {
        attach();
        blurContent();
      }
    });

    const startGuard = () => {
      if (document.documentElement) {
        guard.observe(document.documentElement, { childList: true, subtree: true });
      }
    };

    startGuard();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startGuard, { once: true });
    }

    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
    }, true);
  }

  function unblockPage() {
    const overlay = document.getElementById('__focus_guard_overlay__');
    if (overlay) overlay.remove();
    if (document.body) {
      document.body.style.filter = '';
      document.body.style.pointerEvents = '';
      document.body.style.userSelect = '';
    }
  }

  function buildOverlayHTML(hostname, blockStart, blockEnd) {
    const cardStyle = [
      'text-align:center',
      'max-width:480px',
      'width:90%',
      'padding:48px 40px',
      'background:rgba(255,255,255,0.07)',
      'border-radius:24px',
      'border:1px solid rgba(255,255,255,0.12)',
      'box-shadow:0 25px 60px rgba(0,0,0,0.5)',
    ].join(';');

    const badgeStyle = [
      'display:inline-block',
      'background:rgba(99,179,237,0.15)',
      'border:1px solid rgba(99,179,237,0.3)',
      'border-radius:99px',
      'padding:6px 16px',
      'font-size:13px',
      'color:#63b3ed',
      'margin-bottom:24px',
      'letter-spacing:0.05em',
      'text-transform:uppercase',
    ].join(';');

    const timeBoxStyle = [
      'background:rgba(255,255,255,0.08)',
      'border-radius:14px',
      'padding:18px 24px',
      'margin:24px 0',
    ].join(';');

    const footerStyle = [
      'font-size:13px',
      'color:#718096',
      'margin:0',
      'line-height:1.6',
    ].join(';');

    return `
      <div style="${cardStyle}">
        <div style="font-size:56px;margin-bottom:12px;line-height:1;">&#128274;</div>
        <div style="${badgeStyle}">Focus Mode Active</div>
        <h1 style="font-size:26px;font-weight:700;margin:0 0 6px;color:#fff;line-height:1.2;">
          Access Blocked
        </h1>
        <p style="font-size:15px;color:#a0aec0;margin:0 0 4px;font-weight:500;">
          ${hostname}
        </p>
        <div style="${timeBoxStyle}">
          <p style="margin:0 0 4px;font-size:13px;color:#a0aec0;">
            Blocked during focus hours
          </p>
          <p style="margin:0;font-size:22px;font-weight:700;color:#63b3ed;letter-spacing:0.03em;">
            ${blockStart} &ndash; ${blockEnd}
          </p>
        </div>
        <p style="${footerStyle}">
          Stay focused! This site will be available again at
          <strong style="color:#9ae6b4;">${blockEnd}</strong>.
          <br/>Keep up the great work! &#128170;
        </p>
      </div>
    `;
  }
})();
