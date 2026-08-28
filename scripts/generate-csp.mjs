#!/usr/bin/env node
/**
 * Content-Security-Policy generator for the static export.
 *
 * Next's static export emits two inline <script> blocks per page (the React
 * flight payload). A strict `script-src 'self'` blocks them, which silently
 * breaks hydration — so the policy has to carry their SHA-256 hashes.
 *
 * This script runs after `next build` and does two things:
 *
 *   1. Injects a per-page <meta http-equiv="Content-Security-Policy"> into every
 *      exported HTML file. This is the only way to get a policy onto GitHub
 *      Pages, which cannot set response headers at all.
 *   2. Writes docker/security-headers.generated.conf with the union of every
 *      hash, for nginx to serve as a real header (which additionally carries
 *      frame-ancestors, ignored in meta form).
 *
 * Usage:  node scripts/generate-csp.mjs [--out <dir>] [--check]
 *   --check  verify only; exit non-zero if the generated conf is stale.
 *
 * Env:
 *   NEXT_PUBLIC_API_URL  backend origin to add to connect-src (default: same origin)
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.join(REPO_ROOT, 'frontend', 'out');
const GENERATED_CONF = path.join(REPO_ROOT, 'docker', 'security-headers.generated.conf');

const MARKER_START = '<!--csp-->';
const MARKER_END = '<!--/csp-->';

/** Matches a <script> element that has no src attribute, capturing its body. */
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--check') {
      args.check = true;
    }
  }
  return args;
}

/**
 * Next's env-file precedence for a production build. A real environment variable
 * still wins over all of them.
 *
 * This has to be read here as well: Next inlines NEXT_PUBLIC_* from these files at
 * build time, but a plain node script sees only process.env. Missing them silently
 * produced a `connect-src` that blocked the app's own API calls.
 */
const ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];

function readEnvFiles(dir, key) {
  for (const name of ENV_FILES) {
    const file = path.join(dir, name);
    if (!existsSync(file)) continue;

    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/);
      if (!match || match[1] !== key) continue;

      let value = match[2].trim();
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      value = quoted ? value.slice(1, -1) : value.split('#')[0].trim();
      if (value) return value;
    }
  }
  return null;
}

/** Origin of the configured backend, or null when it is served same-origin. */
function apiOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || readEnvFiles(path.join(REPO_ROOT, 'frontend'), 'NEXT_PUBLIC_API_URL');
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    console.warn(`[csp] NEXT_PUBLIC_API_URL is not a valid URL, ignoring: ${raw}`);
    return null;
  }
}

function sha256(source) {
  return `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

/** buildPolicy runs once per page; the http warning only needs saying once. */
let warnedPlainHttp = false;

/**
 * Builds the policy. `frameAncestors` is only meaningful as a real header —
 * browsers ignore it (and warn) when it arrives via <meta>.
 */
function buildPolicy(hashes, { frameAncestors }) {
  const connect = ["'self'"];
  const origin = apiOrigin();
  if (origin) connect.push(origin);

  const directives = [
    `default-src 'self'`,
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // Tailwind and the tool components set inline style attributes.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src ${connect.join(' ')}`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];
  if (frameAncestors) directives.push(`frame-ancestors 'none'`);

  // upgrade-insecure-requests would rewrite an explicitly configured http:// API
  // origin to https:// and break every call to it. Emit it only when nothing in the
  // policy actually depends on plain http — which is the case for any real deployment.
  if (origin && origin.startsWith('http://')) {
    if (!warnedPlainHttp) {
      warnedPlainHttp = true;
      console.warn(
        `[csp] NEXT_PUBLIC_API_URL is plain http (${origin}); omitting upgrade-insecure-requests. Use https in production.`,
      );
    }
  } else {
    directives.push('upgrade-insecure-requests');
  }

  return `${directives.join('; ')};`;
}

async function htmlFiles(dir) {
  const found = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) found.push(full);
    }
  }
  await walk(dir);
  return found.sort();
}

/** Replaces any previously injected block so the script stays idempotent. */
function injectMeta(html, policy) {
  const meta = `${MARKER_START}<meta http-equiv="Content-Security-Policy" content="${policy}">${MARKER_END}`;
  const existing = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`);
  if (existing.test(html)) return html.replace(existing, meta);

  const headOpen = html.match(/<head[^>]*>/i);
  if (!headOpen) return html;
  const at = headOpen.index + headOpen[0].length;
  return html.slice(0, at) + meta + html.slice(at);
}

async function main() {
  const { out, check } = parseArgs(process.argv.slice(2));

  if (!existsSync(out)) {
    console.error(`[csp] export directory not found: ${out}\n[csp] run \`pnpm --filter frontend run build\` first.`);
    process.exit(1);
  }

  const files = await htmlFiles(out);
  if (files.length === 0) {
    console.error(`[csp] no HTML files under ${out}`);
    process.exit(1);
  }

  const allHashes = new Set();
  let injected = 0;

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    // Strip any earlier injection before hashing so re-runs stay stable.
    const source = html.replace(new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`), '');

    const pageHashes = [];
    for (const match of source.matchAll(INLINE_SCRIPT)) {
      const body = match[1];
      if (body.trim() === '') continue;
      const hash = sha256(body);
      pageHashes.push(hash);
      allHashes.add(hash);
    }

    if (!check) {
      const policy = buildPolicy(pageHashes, { frameAncestors: false });
      await writeFile(file, injectMeta(html, policy), 'utf8');
      injected += 1;
    }
  }

  const sorted = [...allHashes].sort();
  const header = buildPolicy(sorted, { frameAncestors: true });
  const conf = [
    '# GENERATED by scripts/generate-csp.mjs — do not edit by hand.',
    '# Regenerate with: node scripts/generate-csp.mjs (after `next build`).',
    '#',
    "# The sha256 sources are Next's inline flight-data scripts; they change on",
    '# every build, so this file must be regenerated alongside the export it serves.',
    'add_header X-Frame-Options "DENY" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    'add_header Cross-Origin-Opener-Policy "same-origin" always;',
    'add_header Cross-Origin-Resource-Policy "same-origin" always;',
    'add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;',
    `add_header Content-Security-Policy "${header}" always;`,
    '',
  ].join('\n');

  if (check) {
    const current = existsSync(GENERATED_CONF) ? await readFile(GENERATED_CONF, 'utf8') : '';
    if (current !== conf) {
      console.error('[csp] docker/security-headers.generated.conf is stale — re-run scripts/generate-csp.mjs');
      process.exit(1);
    }
    console.log(`[csp] up to date (${sorted.length} hashes across ${files.length} pages)`);
    return;
  }

  // The Docker builder stage has no docker/ directory of its own.
  await mkdir(path.dirname(GENERATED_CONF), { recursive: true });
  await writeFile(GENERATED_CONF, conf, 'utf8');
  console.log(`[csp] injected <meta> policy into ${injected} pages`);
  console.log(`[csp] wrote ${path.relative(REPO_ROOT, GENERATED_CONF)} with ${sorted.length} script hashes`);
}

main().catch((error) => {
  console.error('[csp] failed:', error);
  process.exit(1);
});
