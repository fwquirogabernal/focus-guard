# Focus Guard — Website Blocker

A Chrome extension that blocks distracting websites during configurable focus hours. When you (or anyone on the machine) tries to access a blocked site within the scheduled time window, the page is immediately stopped and replaced with a full-screen focus overlay.

---

## Features

- **Time-based blocking** — define a daily start and end time for your focus period
- **Overnight ranges** — supports schedules that span midnight (e.g. 22:00 – 06:00)
- **Custom site list** — add or remove any domain at any time
- **Subdomain aware** — blocking `instagram.com` also blocks `www.instagram.com`, `l.instagram.com`, etc.
- **SPA resistant** — a MutationObserver re-applies the overlay if a single-page app tries to remove it
- **Master toggle** — instantly enable or disable all blocking without losing your settings
- **Synced settings** — Chrome sync storage keeps your config across devices signed into the same account

---

## Installation

> The extension is not published to the Chrome Web Store. Load it manually as an unpacked extension.

**Prerequisites:** Node.js (to build the CSS and generate icons).

```bash
# 1. Clone or download this folder
cd chrome-extension

# 2. Install dev dependencies (Tailwind CSS)
npm install

# 3. Build the popup stylesheet
npm run build:css

# 4. Generate icon files
node generate_icons.js
```

Then load the extension in Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder
5. The Focus Guard icon appears in your toolbar

---

## Usage

Click the extension icon in the toolbar to open the settings popup.

### Enable / Disable

The **ON / OFF** toggle in the header acts as a master switch. When disabled, no sites are blocked regardless of the schedule or site list. Your settings are preserved while the extension is off.

### Setting the Block Schedule

Use the **From** and **To** time pickers to define your focus window.

| Example | Meaning |
|---|---|
| `08:00 – 21:00` | Block sites every day from 8 AM to 9 PM |
| `22:00 – 06:00` | Block sites overnight (spans midnight) |
| `00:00 – 23:59` | Block sites all day |

### Managing Blocked Sites

- Type a domain in the input field (e.g. `instagram.com`) and press **Enter** or click **+ Add**
- The `www.` prefix and `https://` protocol are stripped automatically — you can paste a full URL and it will be normalized
- Click **✕** next to any entry to remove it
- Press **Save Settings** to persist all changes

### Default blocked sites

On first install the following sites are pre-configured:

```
instagram.com
twitter.com
facebook.com
```

---

## How Blocking Works

The content script (`content.js`) runs at `document_start` on every page — before any HTML is rendered. When a navigation is detected:

1. The current hostname is normalized (lowercased, `www.` stripped)
2. Settings are read from Chrome sync storage
3. The hostname is matched against the blocked sites list (exact match or subdomain)
4. The current time is compared against the configured range
5. If all conditions are met:
   - `window.stop()` halts further page loading
   - A full-viewport overlay is injected directly into `<html>` (body may not exist yet)
   - Existing page content is blurred and made non-interactive
   - A `MutationObserver` watches the DOM and re-attaches the overlay if removed
   - The overlay shows the blocked domain, the active schedule, and when the site becomes available again

The extension only blocks the **top-level frame** — iframes embedded inside allowed pages are not affected.

---

## Configuration Reference

All settings are stored via `chrome.storage.sync`.

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Master on/off switch |
| `blockedSites` | `string[]` | `['instagram.com', 'twitter.com', 'facebook.com']` | Normalized domain list |
| `blockStart` | `string` (HH:MM) | `'08:00'` | Start of the focus window |
| `blockEnd` | `string` (HH:MM) | `'21:00'` | End of the focus window |

---

## Project Structure

```
chrome-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker — writes default settings on install
├── content.js             # Core blocking logic injected into every page
├── popup.html             # Settings popup markup (Tailwind classes)
├── popup.js               # Popup state management and domain validation
├── popup.css              # Compiled Tailwind stylesheet (do not edit manually)
├── src/
│   └── input.css          # Tailwind source — directives and custom overrides
├── tailwind.config.js     # Tailwind configuration
├── package.json           # Dev dependencies and build scripts
├── generate_icons.js      # Generates icon PNG files (run once with Node)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key files

**`content.js`** — The blocking engine. Reads settings, evaluates whether the current page should be blocked, and injects the overlay. Runs entirely client-side with no network requests.

**`background.js`** — Minimal service worker. Its only job is to write the default settings to sync storage on first install.

**`popup.html` / `popup.js`** — The settings UI. Validates and normalizes domain input, renders the site list, and writes changes to sync storage on save.

---

## Development

### Rebuild the stylesheet

After editing `src/input.css` or adding new Tailwind classes to `popup.html`:

```bash
# Single build (minified)
npm run build:css

# Watch mode — rebuilds on every save
npm run watch:css
```

> `popup.css` is the compiled output. Never edit it directly — changes will be overwritten on the next build.

### Regenerate icons

```bash
node generate_icons.js
```

This uses only Node.js built-ins (no extra dependencies) and writes `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`.

### Reload the extension after changes

Go to `chrome://extensions/` and click the **↺ reload** button on the Focus Guard card. For content script changes you also need to reload the affected tabs.

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save and sync settings across Chrome sessions |
| `tabs` | Reserved for future tab-level features |
| `host_permissions: <all_urls>` | Allows the content script to run on any site so blocking can be enforced everywhere |

No data is sent to any external server. All settings stay in Chrome's local sync storage.

---

## Limitations

- **Does not block at the network level.** A determined user can disable the extension or use another browser. This tool is designed for self-accountability, not parental controls.
- **One schedule per day.** There is currently no support for multiple time windows (e.g. block 9–12 AM and again 2–5 PM).
- **One schedule for all sites.** All blocked sites share the same time window. Per-site schedules are not supported yet.
