# Focus Guard — Project Rules

## General

- This is a Chrome Extension (Manifest V3) built with vanilla JS and Tailwind CSS.
- No frameworks or bundlers — files are loaded directly by Chrome.
- `popup.css` is a compiled output from Tailwind. Never edit it directly; edit `src/input.css` and run `npm run build:css`.

## Development Guidelines

- Follow SOLID principles:
  - **Single Responsibility**: each function/module should do one thing. Content script handles blocking, popup handles settings UI, background handles install defaults.
  - **Open/Closed**: extend behavior by adding new code (new matching strategies, new UI sections), not by modifying working functions.
  - **Liskov Substitution**: keep interfaces consistent — blocked site entries (domain-only or domain/path) must behave uniformly where consumed.
  - **Interface Segregation**: keep storage schema minimal; don't bundle unrelated settings.
  - **Dependency Inversion**: abstract shared logic (e.g. site normalization, time range checks) rather than duplicating across files.

## Code Change Policy

- **Do NOT modify functions or methods that already work.** If a change to existing working code is needed, ask for confirmation first and explain why.
- Prefer adding new functions over editing existing ones when extending behavior.
- Keep changes scoped — a bug fix should only fix the bug, a feature should only add the feature.

## Documentation

- **Update README.md** whenever a user-facing feature is added or changed (new settings, new behavior, new UI elements).
- Keep the Configuration Reference table, Features list, and How Blocking Works section in sync with actual behavior.

## Architecture

- `content.js` — blocking engine, runs at `document_start` on every page. Handles SPA navigation detection.
- `background.js` — service worker, writes defaults on install. Keep it minimal.
- `popup.js` / `popup.html` — settings UI. Validates input, manages site list, persists to `chrome.storage.sync`.
- `generate_icons.js` — Node script for icon generation. Run once, not part of the extension runtime.

## Storage Schema

All settings use `chrome.storage.sync`. Current keys: `enabled`, `blockedSites`, `blockStart`, `blockEnd`. Do not add keys without documenting them in the README Configuration Reference table.

## Testing

- After any change to `content.js`, manually test: full domain blocking, path-based blocking, SPA navigation (YouTube), overnight time ranges, and the enable/disable toggle.
- After any change to `popup.js`, verify: adding/removing sites, domain normalization, path preservation, and save/load round-trip.
