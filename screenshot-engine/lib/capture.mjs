/**
 * Browser launch + auth + per-viewport capture for the screenshot engine.
 *
 * One browser instance is reused across every plan, screen type, and route.
 * Login happens once per plan per browser session.
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import {
  sleep,
  ensureDir,
  screenshotPath,
  relativeToEngine,
  resolveRoute,
  discoverDynamicId,
  dynamicPatternFor,
} from './utils.mjs';

const DEFAULT_TIMEOUTS = {
  navigation: 45000,
  selector: 12000,
  settleAfterLoad: 1500,
  settleAfterAuth: 2500,
};

/**
 * Launches Chrome. Prefers the locally installed Chrome so we reuse the
 * browser the user already has rather than downloading another copy.
 */
export async function launchBrowser() {
  const executablePath = findLocalChrome();

  return puppeteer.launch({
    headless: 'new',
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--disable-gpu',
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
    ],
  });
}

function findLocalChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const candidates = [
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  return candidates.find((p) => p && existsSafe(p));
}

function existsSafe(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Creates a page pre-configured for a screen type (viewport, DPR, touch, UA).
 */
export async function newScreenPage(browser, screenType) {
  const page = await browser.newPage();

  await page.setViewport({
    width: screenType.width,
    height: screenType.height,
    deviceScaleFactor: screenType.deviceScaleFactor,
    isMobile: screenType.isMobile,
    hasTouch: screenType.hasTouch,
  });

  if (screenType.userAgent) {
    await page.setUserAgent(screenType.userAgent);
  }

  // Freeze animations so screenshots are deterministic.
  await page.evaluateOnNewDocument(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `;
    const attach = () => document.head?.appendChild(style);
    if (document.head) attach();
    else document.addEventListener('DOMContentLoaded', attach);
  });

  return page;
}

/**
 * Logs into a plan's dashboard. Returns { ok, reason }.
 *
 * Handles both auth shapes found in this repo:
 *  - inline-dashboard: no /login page, form renders inside /dashboard
 *  - login-page: dedicated /login route
 */
export async function authenticate(page, baseUrl, plan, credentials, selectors) {
  const loginUrl = `${baseUrl}${plan.auth?.loginUrl ?? '/login'}`;
  const reason = { ok: false, detail: '', screenshotHint: null };

  try {
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: DEFAULT_TIMEOUTS.navigation });
  } catch (err) {
    reason.detail = `could not load ${loginUrl}: ${err.message}`;
    return reason;
  }

  await sleep(DEFAULT_TIMEOUTS.settleAfterLoad);

  // Already authenticated: the form is absent.
  if (!(await page.$(selectors.emailField))) {
    reason.ok = true;
    reason.detail = 'no login form present (already authenticated)';
    return reason;
  }

  try {
    await page.waitForSelector(selectors.emailField, { timeout: DEFAULT_TIMEOUTS.selector });
    await page.waitForSelector(selectors.passwordField, { timeout: DEFAULT_TIMEOUTS.selector });

    await page.evaluate(() => {
      for (const el of document.querySelectorAll('input')) el.value = '';
    });

    await page.type(selectors.emailField, credentials.email, { delay: 12 });
    await page.type(selectors.passwordField, credentials.password, { delay: 12 });
    await page.click(selectors.submitButton);

    // Success signal: the login form disappears from the DOM.
    await page
      .waitForFunction(
        (sel) => !document.querySelector(sel),
        { timeout: DEFAULT_TIMEOUTS.selector },
        selectors.emailField
      )
      .catch(() => null);

    await sleep(DEFAULT_TIMEOUTS.settleAfterAuth);

    const stillHasForm = await page.$(selectors.emailField);
    if (stillHasForm) {
      reason.detail = 'login form still visible after submit (bad credentials?)';
      return reason;
    }

    reason.ok = true;
    reason.detail = `logged in via ${credentials.source}`;
    return reason;
  } catch (err) {
    reason.detail = `login failed: ${err.message}`;
    return reason;
  }
}

/**
 * Captures one route at one screen type.
 */
export async function captureRoute(page, ctx) {
  const { baseUrl, plan, screenType, pageEntry, discoveredIds, options } = ctx;

  const record = {
    plan: plan.id,
    planLabel: plan.label,
    screen: screenType.id,
    screenLabel: screenType.label,
    viewport: `${screenType.width}x${screenType.height}@${screenType.deviceScaleFactor}x`,
    route: pageEntry.route,
    name: pageEntry.name,
    group: pageEntry.group,
    requiresAuth: Boolean(pageEntry.requiresAuth),
    file: null,
    bytes: 0,
    status: 'ok',
    detail: '',
    capturedAt: new Date().toISOString(),
  };

  const { url, resolved, usedId } = resolveRoute(pageEntry, discoveredIds);
  record.resolvedUrl = url;
  record.dynamicId = usedId ? Object.values(usedId)[0] : null;

  if (!resolved && !options.captureUnresolvedDynamic) {
    record.status = 'skipped';
    record.detail = 'no real id available for dynamic route';
    return record;
  }

  try {
    const response = await page.goto(`${baseUrl}${url}`, {
      waitUntil: 'networkidle2',
      timeout: options.navigationTimeout ?? DEFAULT_TIMEOUTS.navigation,
    });

    await sleep(options.settle ?? DEFAULT_TIMEOUTS.settleAfterLoad);

    // A dynamic route with no match can render the app's not-found page.
    if (response && response.status() === 404) {
      record.status = 'failed';
      record.detail = 'HTTP 404';
      return record;
    }

    // Detect an auth bounce: redirected to /login when auth was required.
    if (pageEntry.requiresAuth) {
      const pathname = await page.evaluate(() => location.pathname);
      if (/\/(login|signin|sign-in)$/.test(pathname)) {
        record.status = 'redirected';
        record.detail = `bounced to ${pathname} (not authenticated)`;
        return record;
      }
      record.finalPath = pathname;
    }

    await waitForImages(page);

    const outPath = screenshotPath(plan.id, screenType.id, pageEntry.name);
    ensureDir(path.dirname(outPath));

    await page.screenshot({
      path: outPath,
      fullPage: options.fullPage !== false,
      type: 'png',
    });

    record.file = relativeToEngine(outPath);
    record.bytes = fs.statSync(outPath).size;
    record.status = 'ok';
    record.detail = `http ${response ? response.status() : 'n/a'}`;
    return record;
  } catch (err) {
    record.status = 'failed';
    record.detail = err.message.split('\n')[0].slice(0, 200);
    return record;
  }
}

/** Waits for images to settle so we don't capture half-loaded art. */
async function waitForImages(page) {
  try {
    await page.evaluate(async () => {
      const images = Array.from(document.images).filter((img) => !img.complete);
      await Promise.all(
        images.map((img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 4000);
          })
        )
      );
      if (document.fonts?.ready) {
        await Promise.race([document.fonts.ready, sleep(2000)]);
      }
    });
  } catch {
    // Non-fatal: capture anyway.
  }
}

/**
 * Discovers real IDs for dynamic routes by reading links from list pages.
 */
export async function discoverIds(page, baseUrl, plan) {
  const discovered = {};
  const dynamicPages = plan.pages.filter((p) => p.requireDynamic && p.discoverFrom);

  for (const dp of dynamicPages) {
    const pattern = dynamicPatternFor(dp.route);
    try {
      const id = await discoverDynamicId(page, baseUrl, dp.discoverFrom, pattern);
      if (id) {
        const segMatch = dp.route.match(/\[(?:\.\.\.)?(\w+)\]/);
        discovered[dp.route] = { [segMatch ? segMatch[1] : 'id']: id };
      }
    } catch (err) {
      // Leave unresolved; the capture step records a skip.
    }
  }

  return discovered;
}
