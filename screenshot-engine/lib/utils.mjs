/**
 * Shared utilities for the screenshot engine.
 *
 * Keeps plan/screen-type config loading, .env parsing, auth resolution,
 * dynamic route discovery, and console formatting in one place so the
 * capture and verify scripts behave identically.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ENGINE_ROOT = __dirname;
export const REPO_ROOT = path.resolve(ENGINE_ROOT, '..');
export const OUTPUT_ROOT = path.join(ENGINE_ROOT, 'output');
export const MANIFEST_PATH = path.join(ENGINE_ROOT, 'manifest.json');

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

export function loadScreenTypes() {
  const raw = fs.readFileSync(path.join(ENGINE_ROOT, 'config', 'screen-types.json'), 'utf8');
  return JSON.parse(raw);
}

export function loadPlanConfig() {
  const raw = fs.readFileSync(path.join(ENGINE_ROOT, 'config', 'plans.json'), 'utf8');
  return JSON.parse(raw);
}

export function getPlan(planId, planConfig) {
  const plan = planConfig.plans.find((p) => p.id === planId);
  if (!plan) {
    const known = planConfig.plans.map((p) => p.id).join(', ');
    throw new Error(`Unknown plan "${planId}". Known plans: ${known}`);
  }
  return plan;
}

/**
 * Filters plans/screen types/pages from CLI flags.
 * Returns null when a filter is empty, meaning "everything".
 */
export function parseSelection(args, planConfig, screenTypes) {
  const allPlanIds = planConfig.plans.map((p) => p.id);
  const allScreenIds = screenTypes.screenTypes.map((s) => s.id);

  const plans = splitFlag(args.plans) ?? allPlanIds;
  const screens = splitFlag(args.screens) ?? allScreenIds;
  const groups = splitFlag(args.groups);

  return { plans, screens, groups };
}

function splitFlag(value) {
  if (value === undefined || value === null || value === '') return null;
  const items = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

export function filterPages(pages, groups) {
  if (!groups) return pages;
  return pages.filter((p) => groups.includes(p.group));
}

// ---------------------------------------------------------------------------
// .env parsing (no dependency on dotenv)
// ---------------------------------------------------------------------------

/**
 * Minimal .env parser: KEY="value" / KEY=value, ignores comments and blanks.
 * Values wrapped in double quotes have escapes and ${VAR} interpolation resolved.
 */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const text = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
      }
    }

    out[key] = value;
  }

  return resolveEnvReferences(out, out);
}

/** Resolves ${VAR} and $VAR references against already-parsed values. */
function resolveEnvReferences(env, scope, depth = 0) {
  if (depth > 5) return env;
  let changed = false;

  for (const key of Object.keys(env)) {
    const raw = env[key];
    if (!/\$\{?[A-Za-z_]/.test(raw)) continue;

    const next = raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, a, b) => {
      const name = a || b;
      return scope[name] ?? process.env[name] ?? m;
    });

    if (next !== raw) {
      env[key] = next;
      changed = true;
    }
  }

  return changed ? resolveEnvReferences(env, scope, depth + 1) : env;
}

export function loadPlanEnv(plan) {
  const planDir = path.join(REPO_ROOT, plan.dir);
  const merged = {
    ...parseEnvFile(path.join(REPO_ROOT, '.env.master')),
    ...parseEnvFile(path.join(planDir, '.env.local')),
    ...parseEnvFile(path.join(planDir, '.env.local.example')),
  };
  return merged;
}

// ---------------------------------------------------------------------------
// Auth credential resolution
// ---------------------------------------------------------------------------

/**
 * Resolves dashboard login credentials for a plan.
 * Prefers plan .env values, falls back to the documented demo credentials.
 */
export function resolveCredentials(plan, planConfig) {
  const env = loadPlanEnv(plan);
  const auth = plan.auth ?? {};
  const fallback = planConfig.commonAuth?.fallbackCredentials ?? {
    email: 'admin@store.com',
    password: 'password123',
  };

  let email = fallback.email;
  let password = fallback.password;
  let source = 'fallback demo credentials';

  const envEmailKeys = auth.credentialsFromEnv ?? ['NEXT_PUBLIC_ADMIN_TEST_EMAIL'];
  const envPasswordKeys = auth.credentialsFromEnv
    ? auth.credentialsFromEnv.filter((k) => k.includes('PASSWORD'))
    : ['NEXT_PUBLIC_ADMIN_TEST_PASSWORD'];

  for (const key of envEmailKeys) {
    const val = env[key] || process.env[key];
    if (val) {
      email = val;
      source = key;
      break;
    }
  }

  for (const key of envPasswordKeys) {
    const val = env[key] || process.env[key];
    if (val) {
      password = val;
      break;
    }
  }

  return { email, password, source, hasEnvConfig: source !== 'fallback demo credentials' };
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

/**
 * Picks a concrete URL for a page entry.
 * Dynamic routes are resolved via an id discovered at runtime.
 */
export function resolveRoute(page, discoveredIds) {
  if (!page.route.includes('[')) {
    return { url: page.route, resolved: true, usedId: null };
  }

  const id = discoveredIds?.[page.route] ?? null;
  if (id) {
    const url = page.route.replace(/\[\.\.\.(\w+)\]|\[(\w+)\]/g, (_, spread, single) => {
      return encodeURIComponent(id[spread || single]);
    });
    return { url, resolved: true, usedId: id };
  }

  return { url: page.route, resolved: false, usedId: null };
}

/**
 * Finds the href pattern for a dynamic route by visiting its list page
 * and reading real links out of the DOM.
 */
export async function discoverDynamicId(page, baseUrl, fromRoute, dynamicPattern) {
  await page.goto(`${baseUrl}${fromRoute}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(1200);

  const href = await page.evaluate((pattern) => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const match = anchors.find((a) => {
      const pathname = new URL(a.href, location.origin).pathname;
      return new RegExp('^' + pattern + '$').test(pathname);
    });
    if (!match) return null;

    const pathname = new URL(match.href, location.origin).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
  }, dynamicPattern);

  return href ? decodeURIComponent(href) : null;
}

export function dynamicPatternFor(route) {
  return route.replace(/\[\.\.\.(\w+)\]|\[(\w+)\]/g, '([^/]+)');
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function screenshotPath(planId, screenId, fileName) {
  return path.join(OUTPUT_ROOT, planId, screenId, `${fileName}.png`);
}

export function relativeToEngine(absPath) {
  return path.relative(ENGINE_ROOT, absPath).split(path.sep).join('/');
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { version: 1, generatedAt: null, entries: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { version: 1, generatedAt: null, entries: [] };
  }
}

export function writeManifest(manifest) {
  const sorted = {
    ...manifest,
    entries: [...manifest.entries].sort(
      (a, b) =>
        a.plan.localeCompare(b.plan) ||
        a.screen.localeCompare(b.screen) ||
        a.group.localeCompare(b.group) ||
        a.route.localeCompare(b.route)
    ),
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2));
  return sorted;
}

// ---------------------------------------------------------------------------
// Console formatting
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  bold: '\u001b[1m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  gray: '\u001b[90m',
};

export const c = COLORS;

export function banner(text) {
  const line = '─'.repeat(Math.min(text.length + 4, 78));
  console.log(`\n${c.cyan}${line}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ${text}${c.reset}`);
  console.log(`${c.cyan}${line}${c.reset}`);
}

export function statusTag(status) {
  switch (status) {
    case 'ok':
      return `${c.green}ok${c.reset}`;
    case 'skipped':
      return `${c.yellow}skip${c.reset}`;
    case 'failed':
      return `${c.red}FAIL${c.reset}`;
    case 'redirected':
      return `${c.yellow}redir${c.reset}`;
    default:
      return status;
  }
}

export function pad(text, width) {
  const str = String(text);
  return str.length >= width ? str : str + ' '.repeat(width - str.length);
}

/**
 * Parses `--flag value` and `--flag=value` style args.
 */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const eq = token.indexOf('=');
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}
