# Croessant

Electron desktop app (Windows, macOS, Linux) for Argentine monotributistas: issues Factura C to an unidentified consumidor final through ARCA's (ex AFIP) WSAA + WSFEv1 web services, using its own client in `src/arca` (no afipsdk). User-facing text and the README are in Spanish (rioplatense "vos"); code comments may be Spanish too.

## Hard rules
- Certificate and private key never leave the machine: no third-party services, no telemetry.
- Views have no Node access (`contextIsolation`, `sandbox`): everything goes through `window.croessant` (`src/main/preload.js`) → `src/main/ipc.js`. Keep the CSP in the views; no inline handlers.
- Billing rules (date ranges, amount limit, concepts) live in `src/arca/rules.js`.
- Plain Node cannot reach ARCA with default TLS ("dh key too small"): it needs `ciphers: 'DEFAULT:!DHE'`. Electron's `net.fetch` is fine.
- Linux release builds stay on `ubuntu-24.04` (the RPM maker failed on `ubuntu-latest`).
- Never verified with a real ARCA certificate: authenticated calls are covered only by mocked tests.

## Commands
- `npm start` (builds CSS, opens the app), `npm test`, `npm run make`. `CROESSANT_ENV=homologation npm start` for ARCA's test servers.
- `npm run screenshots` (`docs/screenshots.mjs`): opens the real views in headless Edge with a fake `window.croessant` and sample data, and writes `docs/*.png` for the README. It doesn't need Electron (`ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci` is enough). Re-run it after visible UI changes.
- A `v*` tag runs `.github/workflows/release.yaml`, which publishes installers to GitHub Releases.
