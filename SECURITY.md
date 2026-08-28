# Security Policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/Ch3fUlrich/Tools/security/advisories/new)
rather than opening a public issue.

Include what you did, what happened, and why you think it is a problem. A proof of concept
helps but is not required. Expect an acknowledgement within a few days; this is a personal
project, not a staffed product, so please size your expectations accordingly.

Please do not run automated scanners against any hosted instance you do not own, and do not
access, modify or exfiltrate data that is not yours while investigating.

## Supported versions

Only the current `main` branch is supported. There are no long-term release branches.

## What the deployed site can and cannot do

The GitHub Pages deployment is a **static export with no backend**. Every tool computes in
the browser. In particular the Elterngeld optimizer and the blood level calculator have no
API endpoint at all: income, tax and health figures entered there never leave the device.
That is deliberate, and it should stay that way — if a tool ever needs a server round trip,
treat the data classification as the reason to think twice.

The full stack (Docker Compose: Rust/Axum, Postgres, Redis) does have accounts and sessions.
That is the part with real attack surface.

## Controls in place

**Transport and headers.** `scripts/generate-csp.mjs` runs as a `postbuild` step. It
sha256-hashes each page's inline scripts and emits a Content-Security-Policy with no
`unsafe-inline` for scripts, plus HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
`Referrer-Policy`, COOP/CORP, `Permissions-Policy` and
`X-Permitted-Cross-Domain-Policies`. The policy is also injected as a `<meta>` tag, because
GitHub Pages cannot set response headers at all.

**No third-party requests.** Fonts are self-hosted via `next/font`. The export makes zero
requests to hosts other than its own origin — verified in CI-adjacent manual checks. Do not
add a CDN `<link>` or `@import`; it breaks the CSP and leaks visitor IPs.

**Passwords.** Argon2id with a per-user salt. Login spends the same CPU whether or not the
address exists, so it cannot be used to enumerate accounts. Password length is bounded so
hashing cannot be turned into a denial-of-service.

**Sessions.** Server-side in Redis, referenced by an `HttpOnly`, `SameSite=Lax` cookie that
is `Secure` unless every configured origin is localhost.

**CORS.** An explicit allow-list from `ALLOWED_ORIGINS`. It denies everything when nothing
parses, rather than falling back to a wildcard.

**Containers.** All images run as a non-root user. Compose drops all capabilities, sets
`no-new-privileges`, mounts `tmpfs` with `noexec,nosuid,nodev`, and publishes ports on
`127.0.0.1` only. It refuses to start on placeholder credentials.

**Supply chain.** Every GitHub Action is pinned to a full commit SHA, not a tag or branch.
`cargo-audit` gates Rust dependencies; `pnpm audit --prod` gates the dependencies that
actually reach a visitor, with dev-only advisories reported but not blocking.

## Known limitations

- There is no rate limiting on the login endpoint. Deploy behind a reverse proxy or WAF
  that provides it if you expose this publicly.
- Base images are pinned by tag, not digest.
- `auth_user` (email and display name, no tokens) is cached in `localStorage` so the UI can
  render before the session check returns. It must never be used to hold anything a
  cross-site script should not be able to read.
