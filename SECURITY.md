# Security

This is a **static portfolio site** (HTML, CSS, JavaScript and a PDF). It has no
backend, database, login, user accounts, forms, file uploads, cookies, payments or
third-party API calls. The attack surface is therefore limited to what a browser
loads and runs, and this audit focuses there.

**Reporting a vulnerability:** use the contact address published at `/.well-known/security.txt`.

Last reviewed: 2026-10-11

---

## What is in place

### Supply chain — all code and fonts are self-hosted
| Asset | Version | Source | Verification |
|---|---|---|---|
| three.js (+ 10 post-processing modules) | 0.160.0 | npm registry tarball | sha512 matched `dist.integrity`; converted to classic scripts by `tools/build-three-classic.py` so the site also works from `file://` |
| GSAP core | 3.12.5 | npm registry tarball | sha512 matched `dist.integrity` |
| Lenis | 1.1.13 | npm registry tarball | sha512 matched `dist.integrity` |
| Inter, Inter Tight, JetBrains Mono (latin, woff2) | — | Google Fonts | SIL OFL 1.1 |

* No CDN at runtime → a compromised CDN cannot inject code; no Google Fonts → visitors' IPs are not sent to Google.
* Only the files the site imports are shipped (`vendor/`); source-map comments removed.
* No `eval`, `new Function`, `document.write`, `postMessage`, cookies or `localStorage`.

### Content Security Policy
Set as a `<meta>` tag in `index.html` (works on every host) and as an HTTP header in `_headers` / `vercel.json`:

```
default-src 'none'; script-src 'self'; style-src 'self';
img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self';
base-uri 'none'; form-action 'none'; object-src 'none'
```
The header version also adds `frame-ancestors 'none'; upgrade-insecure-requests`.

* No `'unsafe-inline'`, no `'unsafe-eval'` and no inline scripts at all — every script is a same-origin file.
* Inline `style="…"` attributes were removed (bar widths moved to `data-w`) so styles need no inline exception.
* Verified in Chrome: zero CSP violations, zero cross-origin requests.

### Security headers (`_headers` for Netlify / Cloudflare Pages, `vercel.json` for Vercel)
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, a deny-all `Permissions-Policy`
(camera, microphone, geolocation, payment, USB …), `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Resource-Policy: same-origin`, sensible `Cache-Control`.

### DOM safety
* All data rendered with `innerHTML` comes from the local `js/data.js` and is passed through an HTML escaper (`& < > " '`).
* Project IDs from `data-project` attributes are checked against an own-property allow-list before use.
* Rail duplication uses `cloneNode`, not HTML string concatenation.

### Links, privacy and files
* Every `target="_blank"` link uses `rel="noopener noreferrer"`.
* No analytics, trackers, cookies or third-party embeds → no cookie banner needed.
* The email address is not in the HTML source: it is stored encoded in `js/main.js` and assembled in the browser, so simple scraping bots can't harvest it. (It remains in `security.txt` — required for that file's purpose — and in the resume PDF.)
* Resume PDF inspected: no JavaScript, no embedded files, no auto-open actions, minimal metadata.
* Secret scan of all source files: none found. `.gitignore` excludes `.env*`, keys and editor files.
* `robots.txt`, `/.well-known/security.txt` (RFC 9116, expires 2027-10-11 — renew yearly).

---

## Checklist coverage

| # | Section | Status |
|---|---|---|
| 1 | Authentication & accounts | **N/A** — no accounts or login |
| 2 | Authorization & access control | **N/A** — no protected resources; everything is public by design |
| 3 | Injection & input validation | **Done** — no user input is accepted; rendered data is escaped; no `eval`; no redirects |
| 4 | Browser & frontend | **Done** — CSP, nosniff, frame protection, Referrer-Policy, Permissions-Policy, HSTS (header), safe DOM, no source maps, no secrets in bundle, minimal & verified third-party JS. CORS/cookies/CSRF/postMessage: N/A |
| 5 | CSRF, CORS, API, rate limiting | **N/A** — no API or state-changing requests (rate limiting / DDoS handled by the host's CDN) |
| 6 | File upload & download | **Partly applicable** — only a public, inspected PDF is served; no uploads |
| 7 | Database & data protection | **N/A** — no database |
| 8 | Secrets & configuration | **Done** — no secrets exist; scanned; `.gitignore`; no debug endpoints; no directory listing on static hosts |
| 9 | Server, cloud & Docker | **Host-managed** — static hosting; dependencies pinned & integrity-verified |
| 10 | SSRF, webhooks, integrations | **N/A** — no server-side requests |
| 11 | Logging & incident response | **Done (scaled)** — `security.txt` reporting channel; host access logs |
| 12 | Business logic | **N/A** — no transactions or workflows |
| 13 | Privacy | **Done** — no tracking/cookies/third-party requests. Note: email & phone are intentionally public (also in the resume PDF) |
| 14 | Security testing | **Done (scaled)** — CSP/headless browser test, secret scan, dependency integrity check. Run a ZAP baseline scan against the live URL after deploy |
| 15 | Domain, HTTPS, deployment | **At deploy time** — see below |

## At deployment (to do)
1. Host on a platform that serves HTTPS and redirect HTTP → HTTPS (GitHub Pages: tick *Enforce HTTPS*).
2. **GitHub Pages ignores `_headers`/`vercel.json`.** The CSP `<meta>` still protects the page, but
   `frame-ancestors`, `X-Frame-Options` and HSTS cannot be set there — use Netlify, Vercel or Cloudflare Pages
   (or Cloudflare in front of GitHub Pages) if you want the full header set.
3. Turn on MFA for your GitHub and hosting accounts; protect the `main` branch.
4. If you use a custom domain: enable registrar MFA, remove unused DNS records, keep HSTS without `preload` until you are sure every subdomain is HTTPS.
5. Verify the live headers (e.g. securityheaders.com, Mozilla Observatory) and run an OWASP ZAP baseline scan.
6. Renew `/.well-known/security.txt` `Expires` before 2027-10-11.
