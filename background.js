// Background service worker
// Sets default settings on first install

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enabled: true,
      blockedSites: ['instagram.com', 'x.com', 'facebook.com'],
      blockStart: '08:00',
      blockEnd: '17:00',
    });
  }
});
