/**
 * Host half of the Usage Center bundle.
 *
 * It exposes one read-only, loopback-only summary endpoint that the Web Client
 * uses to render the sidebar dashboard:
 *
 *   GET /api/usage-center/summary?period=7d&tzOffset=480&locale=zh
 *
 * Balance/links come from the signed-in DeepSeek account when available, with
 * the deployment's DEEPSEEK_API_KEY as a fallback. Token usage is folded from
 * the same durable session events the rest of Harness reads. Nothing is
 * written, and no credential ever reaches the browser.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const name = '@local/usage-center';

export const inject = ['webServer'];

const DAY_MS = 24 * 60 * 60 * 1000;
const BALANCE_TTL_MS = 20_000;
const PLATFORM_TTL_MS = 20_000;
const MAX_ACCOUNT_WAIT_MS = 3_000;
const MAX_BALANCE_WAIT_MS = 8_000;

const DEFAULT_LINKS = {
  usageUrl: 'https://platform.deepseek.com/usage',
  topUpUrl: 'https://platform.deepseek.com/top_up',
};

const PERIODS = new Set(['today', '7d', '30d', '1y', 'all']);
const DAY_SECONDS = 24 * 60 * 60;
const MAX_PLATFORM_SPAN_DAYS = 365;
const MIN_PLATFORM_SPAN_DAYS = 7;
const PLATFORM_EARLIEST = Date.UTC(2024, 3, 26);

/** Last-resort platform token: the same grant the account service stores. */
function storedPlatformToken() {
  try {
    const home = process.env.DSH_HOME || join(homedir(), '.dsh');
    const text = readFileSync(join(home, '.credentials.yaml'), 'utf8');
    const match = text.match(/deepseek-account-platform\/default:[\s\S]*?token:\s*(\S+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

/**
 * CNY per one million tokens. The table follows the same public price periods
 * as the DeepSeek Platform: legacy "current" before 2026-08-17, then Beijing
 * peak (09:00-12:00, 14:00-18:00) and off-peak rates. It is deliberately a
 * small, readable table: a new official price is one edit here.
 */
const PRICES = {
  flash: {
    current: { hit: 0.02, miss: 1.0, out: 2.0 },
    offPeak: { hit: 0.02, miss: 1.0, out: 4.0 },
    peak: { hit: 0.04, miss: 2.0, out: 8.0 },
  },
  pro: {
    current: { hit: 0.025, miss: 3.0, out: 6.0 },
    offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
    peak: { hit: 0.30, miss: 9.0, out: 27.0 },
  },
};
const NEW_PRICING_FROM = '2026-08-17';

/** Chinese statutory holidays in 2026, when Platform charges the off-peak rate. */
const CN_HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
]);

function pricePeriod(timeMs) {
  const shifted = new Date(timeMs + 8 * 60 * 60 * 1000);
  const dateKey = shifted.toISOString().slice(0, 10);
  if (dateKey < NEW_PRICING_FROM) return 'current';
  const weekday = shifted.getUTCDay();
  if (weekday === 0 || weekday === 6 || CN_HOLIDAYS_2026.has(dateKey)) return 'offPeak';
  const hour = shifted.getUTCHours();
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18) ? 'peak' : 'offPeak';
}

function priceFor(model) {
  const family = /pro/i.test(String(model)) ? 'pro' : 'flash';
  return PRICES[family];
}

function estimateCost(usage, model, timeMs) {
  const price = priceFor(model)[pricePeriod(timeMs)] || priceFor(model).current;
  const missTokens = usage.input + usage.cacheWrite;
  return (missTokens * price.miss + usage.cacheRead * price.hit + usage.output * price.out) / 1_000_000;
}

function finiteNumber(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function pickNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function platformBucketLabel(timeSec, bucketSec, tzOffset) {
  const shifted = new Date((timeSec + tzOffset * 60) * 1000);
  const year = shifted.getUTCFullYear();
  const month = pad2(shifted.getUTCMonth() + 1);
  const day = pad2(shifted.getUTCDate());
  const hour = shifted.getUTCHours();
  const bucket = Number(bucketSec) || 86400;
  if (bucket <= 3600) return pad2(hour) + ':00';
  if (bucket >= 28 * 86400) return year + '-' + month;
  return month + '-' + day;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + ' timed out')), ms);
    if (typeof timer.unref === 'function') timer.unref();
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeLinks(links) {
  const result = { ...DEFAULT_LINKS };
  if (!links || typeof links !== 'object') return result;
  for (const key of ['usageUrl', 'topUpUrl']) {
    const value = links[key];
    if (typeof value !== 'string') continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') result[key] = url.toString();
    } catch {
      // Keep the known-good default for a malformed provider value.
    }
  }
  return result;
}

/** Local calendar helpers. `tzOffset` is minutes east of UTC (China = 480). */
function localDayKey(timeMs, tzOffset) {
  return new Date(timeMs + tzOffset * 60_000).toISOString().slice(0, 10);
}

function localHour(timeMs, tzOffset) {
  return new Date(timeMs + tzOffset * 60_000).getUTCHours();
}

function startOfLocalDay(timeMs, tzOffset) {
  const shifted = new Date(timeMs + tzOffset * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() - tzOffset * 60_000;
}

function startOfLocalMonth(timeMs, tzOffset) {
  const shifted = new Date(timeMs + tzOffset * 60_000);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() - tzOffset * 60_000;
}

function addLocalMonths(timeMs, months, tzOffset) {
  const shifted = new Date(timeMs + tzOffset * 60_000);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() - tzOffset * 60_000;
}

function periodWindow(period, now, tzOffset) {
  if (period === 'all') {
    return { id: 'all', start: 0, end: now };
  }
  if (period === 'today') {
    return { id: 'today', start: startOfLocalDay(now, tzOffset), end: now };
  }
  const days = period === '1y' ? 365 : period === '30d' ? 30 : 7;
  return {
    id: period,
    start: startOfLocalDay(now - (days - 1) * DAY_MS, tzOffset),
    end: now,
  };
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const input = finiteNumber(usage.inputTokens);
  const output = finiteNumber(usage.outputTokens);
  const cacheRead = finiteNumber(usage.cacheReadTokens);
  const cacheWrite = finiteNumber(usage.cacheWriteTokens);
  const reasoning = finiteNumber(usage.reasoningTokens);
  const providedTotal = pickNumber(usage.totalTokens);
  const total = providedTotal === null ? input + output + cacheRead + cacheWrite : providedTotal;
  if (input + output + cacheRead + cacheWrite === 0 && total === 0) return null;
  return { input, output, cacheRead, cacheWrite, reasoning, total };
}

function messageModel(data, fallback) {
  const source = data && data.message && data.message.source;
  const model = source && typeof source.model === 'string' ? source.model : undefined;
  return model || fallback || 'unknown';
}

/**
 * Fold one session's own events into one record per logical (turn, step).
 * Later usage for the same step replaces an earlier sample, which is exactly
 * how retries and the chunk/final-message pair appear in the durable log.
 */
function foldEvents(events) {
  const currentByStep = new Map();
  let headerModel = null;

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const data = event.data;

    if (event.type === 'request/header') {
      const config = data && data.header && data.header.config;
      if (config && typeof config.model === 'string') headerModel = config.model;
      continue;
    }

    let usage = null;
    if (event.type === 'assistant/message' && data && data.usage) {
      usage = normalizeUsage(data.usage);
    } else if (event.type === 'assistant/chunk' && data && data.chunk && data.chunk.type === 'usage') {
      usage = normalizeUsage(data.chunk.usage);
    } else if (event.type === 'assistant/attempt' && data && data.usage) {
      usage = normalizeUsage(data.usage);
    }
    if (!usage) continue;

    const turn = Number.isFinite(data.turn) ? data.turn : null;
    const step = Number.isFinite(data.step) ? data.step : null;
    const key = turn !== null && step !== null ? String(turn) + ':' + String(step) : 'seq:' + event.seq;
    const model = messageModel(data, headerModel);
    const time = Number.isFinite(event.time) ? event.time : Date.now();

    currentByStep.set(key, { time, model, usage, cost: estimateCost(usage, model, time) });
  }

  return Array.from(currentByStep.values());
}

function emptyTotals() {
  return {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    cost: 0,
    requests: 0,
  };
}

function addUsage(totals, usage, cost = 0) {
  totals.totalTokens += usage.total;
  totals.inputTokens += usage.input;
  totals.outputTokens += usage.output;
  totals.cacheReadTokens += usage.cacheRead;
  totals.cacheWriteTokens += usage.cacheWrite;
  totals.reasoningTokens += usage.reasoning;
  totals.cost += cost;
  totals.requests += 1;
}

function buildSeries(records, window, tzOffset) {
  const bucket = window.id === 'today' ? 'hour' : 'day';
  const isAll = window.id === 'all';
  let firstTime = window.start;
  for (const record of records) {
    if (firstTime === 0 || record.time < firstTime) firstTime = record.time;
  }
  if (isAll && firstTime === 0) firstTime = window.end - 30 * DAY_MS;
  const spanDays = Math.max(1, (window.end - firstTime) / DAY_MS);
  const useMonths = (isAll || window.id === '1y') && spanDays > 120;

  const buckets = new Map();
  const order = [];

  const push = (key, label) => {
    if (buckets.has(key)) return buckets.get(key);
    const value = { key, label, ...emptyTotals() };
    buckets.set(key, value);
    order.push(value);
    return value;
  };

  if (bucket === 'hour') {
    for (let hour = 0; hour < 24; hour += 1) {
      push(String(hour).padStart(2, '0'), String(hour).padStart(2, '0') + ':00');
    }
  } else if (useMonths) {
    const startMonth = startOfLocalMonth(firstTime, tzOffset);
    const endMonth = startOfLocalMonth(window.end, tzOffset);
    for (let cursor = startMonth; cursor <= endMonth; cursor = addLocalMonths(cursor, 1, tzOffset)) {
      const shifted = new Date(cursor + tzOffset * 60_000);
      const key = shifted.toISOString().slice(0, 7);
      push(key, key);
    }
  } else {
    const startDay = startOfLocalDay(isAll ? firstTime : window.start, tzOffset);
    for (let cursor = startDay; cursor <= window.end; cursor += DAY_MS) {
      const key = localDayKey(cursor, tzOffset);
      push(key, key.slice(5));
    }
  }

  for (const record of records) {
    const key = useMonths
      ? localDayKey(record.time, tzOffset).slice(0, 7)
      : bucket === 'hour'
        ? String(localHour(record.time, tzOffset)).padStart(2, '0')
        : localDayKey(record.time, tzOffset);
    let slot = buckets.get(key);
    if (!slot) {
      // A record outside the generated range can only belong to the last bucket.
      slot = order[order.length - 1];
      if (!slot) continue;
    }
    addUsage(slot, record.usage, record.cost);
  }

  return { bucket: useMonths ? 'month' : bucket, series: order };
}

export function apply(ctx) {
  let sessions = ctx.get('sessions');
  let persistence = ctx.get('sessionPersistence');
  let sessionQuery = ctx.get('sessionQuery');
  let account = ctx.get('deepseekAccount');
  let credentials = ctx.get('credentials');

  // A host row can be applied before an async provider has finished its
  // service init; ctx.get() is a strict snapshot and returns undefined in that
  // window. Keep the optional services live instead of freezing "signed out"
  // and empty statistics for the whole page lifetime.
  if (!sessions) ctx.inject(['sessions'], (sub) => { sessions = sub.sessions; });
  if (!persistence) ctx.inject(['sessionPersistence'], (sub) => { persistence = sub.sessionPersistence; });
  if (!sessionQuery) ctx.inject(['sessionQuery'], (sub) => { sessionQuery = sub.sessionQuery; });
  if (!account) ctx.inject(['deepseekAccount'], (sub) => { account = sub.deepseekAccount; });
  if (!credentials) ctx.inject(['credentials'], (sub) => { credentials = sub.credentials; });

  /** The account service when ready, otherwise the stored platform grant. */
  async function platformSession() {
    if (account && typeof account.getPlatformSession === 'function') {
      try {
        const session = await withTimeout(account.getPlatformSession(), MAX_ACCOUNT_WAIT_MS, 'platform session');
        if (session && session.origin && session.token) return session;
      } catch {
        /* fall through to the stored grant */
      }
    }
    const token = storedPlatformToken();
    return token ? { origin: 'https://platform.deepseek.com', token, requestHeaders: {} } : undefined;
  }

  const liveCache = new Map();
  const persistedCache = new Map();
  let fallbackStaticCache = null;
  let balanceCache = { at: 0, value: null };
  /** @type {Promise<any> | null} */
  let balanceInFlight = null;
  let platformCache = { at: 0, value: null };
  /** @type {Promise<any> | null} */
  let platformInFlight = null;
  const usageCache = new Map();
  const usageInFlight = new Map();

  function liveRecords(session) {
    try {
      const seq = typeof session.seq === 'number' ? session.seq : -1;
      const cached = liveCache.get(session.id);
      if (cached && cached.seq === seq) return cached.records;
      const events = typeof session.ownEvents === 'function' ? session.ownEvents() : [];
      const records = foldEvents(events);
      liveCache.set(session.id, { seq, records });
      return records;
    } catch (error) {
      console.error('[usage-center] live session fold failed', error);
      return [];
    }
  }

  async function persistedRecords(snapshot) {
    if (!persistence) return null;
    const id = snapshot.header.id;
    const revision = String(snapshot.revision ?? '') + ':' + String(snapshot.eventCount ?? '') + ':' + String(snapshot.sizeBytes ?? '');
    const cached = persistedCache.get(id);
    if (cached && cached.revision === revision) return cached.records;

    const handle = await persistence.open(id, 'read');
    try {
      const read = await handle.read();
      const inherited = finiteNumber(handle.inheritedEventCount);
      const events = Array.isArray(read.events) ? read.events.slice(inherited) : [];
      const records = foldEvents(events);
      persistedCache.set(id, { revision, records });
      return records;
    } finally {
      await handle.close().catch(() => {});
    }
  }

  async function collectRecords() {
    const bySession = new Map();
    let liveCount = 0;
    let persistedCount = 0;
    let failed = 0;

    const liveSessions = sessions && typeof sessions.list === 'function' ? sessions.list() : [];
    for (const session of liveSessions) {
      liveCount += 1;
      bySession.set(session.id, liveRecords(session));
    }

    if (persistence && typeof persistence.list === 'function') {
      let snapshots = [];
      try {
        snapshots = await persistence.list();
      } catch (error) {
        console.error('[usage-center] session list failed', error);
        return { bySession, liveCount, persistedCount, failed: failed + 1 };
      }
      const pending = snapshots.filter((snapshot) => !bySession.has(snapshot.header.id));
      for (let index = 0; index < pending.length; index += 4) {
        const batch = pending.slice(index, index + 4);
        const results = await Promise.allSettled(batch.map((snapshot) => persistedRecords(snapshot)));
        results.forEach((result, offset) => {
          const snapshot = batch[offset];
          persistedCount += 1;
          if (result.status === 'fulfilled' && result.value) {
            bySession.set(snapshot.header.id, result.value);
          } else if (result.status === 'rejected') {
            failed += 1;
            console.error('[usage-center] session read failed', snapshot.header.id, result.reason);
          }
        });
      }
      return { bySession, liveCount, persistedCount, failed };
    }

    if (sessionQuery && typeof sessionQuery.listSessions === 'function') {
      if (fallbackStaticCache) {
        const merged = new Map(fallbackStaticCache.bySession);
        for (const [id, records] of bySession) merged.set(id, records);
        return { ...fallbackStaticCache, bySession: merged };
      }
      const records = await sessionQuery.listSessions();
      let unavailable = 0;
      for (const record of records) {
        if (bySession.has(record.header.id)) continue;
        try {
          const snapshot = await sessionQuery.readSession(record.header.id);
          const inherited = finiteNumber(snapshot.inheritedEventCount);
          const events = Array.isArray(snapshot.events) ? snapshot.events.slice(inherited) : [];
          bySession.set(record.header.id, foldEvents(events));
          persistedCount += 1;
        } catch (error) {
          unavailable += 1;
          failed += 1;
          console.error('[usage-center] session query read failed', record.header.id, error);
        }
      }
      fallbackStaticCache = { liveCount, persistedCount, failed, bySession: new Map(bySession) };
      return { bySession, liveCount, persistedCount, failed };
    }

    return { bySession, liveCount, persistedCount, failed };
  }

  async function readBalance(locale, tzOffset) {
    const now = Date.now();
    if (balanceCache.value && now - balanceCache.at < BALANCE_TTL_MS) return balanceCache.value;

    if (balanceInFlight) return balanceInFlight;
    balanceInFlight = (async () => {
      const client = {
        version: '0.2.1',
        locale: locale === 'en' ? 'en-US' : 'zh-CN',
        timezoneOffsetSeconds: tzOffset * 60,
      };

      let signedIn = false;
      let links = normalizeLinks(null);
      let wallets = [];
      let source = null;
      let error = null;

      if (account) {
        try {
          const state = await withTimeout(account.getState(), MAX_ACCOUNT_WAIT_MS, 'account state');
          if (state && state.status === 'credential-stored') signedIn = true;
          links = normalizeLinks(state && state.links);
        } catch (accountError) {
          console.error('[usage-center] account state failed', accountError);
        }

        if (signedIn) {
          try {
            const balance = await withTimeout(account.getBalance(client), MAX_BALANCE_WAIT_MS, 'account balance');
            if (balance && balance.status === 'ready') {
              const byCurrency = new Map();
              const ensure = (currency) => {
                if (!byCurrency.has(currency)) {
                  byCurrency.set(currency, { currency, recharge: 0, bonus: 0, total: 0 });
                }
                return byCurrency.get(currency);
              };
              for (const wallet of balance.value || []) {
                const amount = pickNumber(wallet.balance);
                if (amount === null) continue;
                const entry = ensure(wallet.currency || 'CNY');
                entry.recharge += amount;
                entry.total += amount;
              }
              for (const wallet of balance.bonusWallets || []) {
                const amount = pickNumber(wallet.balance);
                if (amount === null) continue;
                const entry = ensure(wallet.currency || 'CNY');
                entry.bonus += amount;
                entry.total += amount;
              }
              wallets = Array.from(byCurrency.values());
              source = 'account';
            } else if (balance && balance.status === 'failed') {
              error = 'balance-unavailable';
            }
          } catch (balanceError) {
            console.error('[usage-center] account balance failed', balanceError);
            error = 'balance-unavailable';
          }
        }
      }

      if (!signedIn && credentials && typeof credentials.resolve === 'function') {
        try {
          const resolved = await withTimeout(credentials.resolve('DEEPSEEK_API_KEY'), MAX_BALANCE_WAIT_MS, 'api key');
          const key = resolved && typeof resolved.value === 'string' ? resolved.value : null;
          if (key) {
            const response = await withTimeout(fetch('https://api.deepseek.com/user/balance', {
              headers: { Authorization: 'Bearer ' + key },
              signal: AbortSignal.timeout(MAX_BALANCE_WAIT_MS),
            }), MAX_BALANCE_WAIT_MS, 'api balance');
            if (response.ok) {
              const parsed = await response.json();
              const infos = Array.isArray(parsed && parsed.balance_infos) ? parsed.balance_infos : [];
              wallets = infos
                .map((wallet) => {
                  const total = pickNumber(wallet.total_balance);
                  if (total === null) return null;
                  return {
                    currency: wallet.currency || 'CNY',
                    recharge: pickNumber(wallet.topped_up_balance) ?? 0,
                    bonus: pickNumber(wallet.granted_balance) ?? 0,
                    total,
                  };
                })
                .filter(Boolean);
              if (wallets.length > 0) {
                source = 'api-key';
                error = null;
              }
            } else {
              error = 'balance-unavailable';
            }
          }
        } catch (keyError) {
          console.error('[usage-center] api-key balance failed', keyError);
          error = 'balance-unavailable';
        }
      }

      if (wallets.length === 0 && !error) error = 'balance-unavailable';

      const value = {
        ok: wallets.length > 0,
        source,
        signedIn,
        wallets,
        links,
        checkedAt: Date.now(),
        error,
      };
      balanceCache = { at: Date.now(), value };
      return value;
    })().finally(() => {
      balanceInFlight = null;
    });

    return balanceInFlight;
  }

  async function fetchPlatformOverview() {
    try {
      const session = await platformSession();
      if (!session) return { ok: false, error: account ? 'signed-out' : 'account-service-missing' };
      const url = new URL('/api/v0/users/get_user_summary', session.origin);
      const response = await withTimeout(fetch(url, {
        headers: {
          ...(session.requestHeaders || {}),
          accept: 'application/json',
          'x-dsh-auth-token': session.token,
        },
        signal: AbortSignal.timeout(MAX_BALANCE_WAIT_MS),
      }), MAX_BALANCE_WAIT_MS + 2_000, 'platform summary');
      if (!response.ok) return { ok: false, error: 'http-' + response.status };
      const json = await response.json();
      return { ok: true, raw: json };
    } catch (error) {
      console.error('[usage-center] platform summary failed', error);
      return { ok: false, error: 'request-failed' };
    }
  }

  function platformBounds(window, tzOffset) {
    const endSec = Math.floor((startOfLocalDay(window.end, tzOffset) + DAY_MS) / 1000);
    const startSec = window.start === 0
      ? Math.floor(startOfLocalDay(PLATFORM_EARLIEST, tzOffset) / 1000)
      : Math.floor(window.start / 1000);
    return { startSec, endSec };
  }

  async function fetchPlatformUsageRange(path, startSec, endSec, tzOffset) {
    try {
      const session = await platformSession();
      if (!session) return { ok: false, error: account ? 'signed-out' : 'account-service-missing' };
      const url = new URL(path, session.origin);
      url.searchParams.set('start', String(startSec));
      url.searchParams.set('end', String(endSec));
      url.searchParams.set('tz', String(tzOffset * 60));
      const response = await withTimeout(fetch(url, {
        headers: {
          ...(session.requestHeaders || {}),
          accept: 'application/json',
          'x-dsh-auth-token': session.token,
        },
        signal: AbortSignal.timeout(MAX_BALANCE_WAIT_MS),
      }), MAX_BALANCE_WAIT_MS + 2_000, 'platform usage');
      if (!response.ok) return { ok: false, error: 'http-' + response.status };
      return { ok: true, raw: await response.json() };
    } catch (error) {
      console.error('[usage-center] platform usage failed', path, error);
      return { ok: false, error: 'request-failed' };
    }
  }

  async function fetchPlatformUsage(path, window, tzOffset) {
    const { startSec, endSec } = platformBounds(window, tzOffset);
    return fetchPlatformUsageRange(path, startSec, endSec, tzOffset);
  }

  async function getPlatformOverview() {
    const now = Date.now();
    if (platformCache.value && now - platformCache.at < PLATFORM_TTL_MS) return platformCache.value;
    if (platformInFlight) return platformInFlight;
    platformInFlight = fetchPlatformOverview()
      .then((value) => {
        platformCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        platformInFlight = null;
      });
    return platformInFlight;
  }

  function normalizePlatformOverview(result) {
    if (!result || !result.ok) return { ok: false, error: result ? result.error : 'unavailable' };
    const biz = result.raw && result.raw.data && result.raw.data.biz_data;
    if (!biz) return { ok: false, error: 'unexpected-response' };
    const costs = Array.isArray(biz.total_costs)
      ? biz.total_costs.map((entry) => ({
        currency: entry && entry.currency ? entry.currency : 'CNY',
        amount: pickNumber(entry && entry.amount),
      })).filter((entry) => entry.amount !== null)
      : [];
    const byCurrency = new Map();
    const ensure = (currency) => {
      const code = currency || 'CNY';
      if (!byCurrency.has(code)) byCurrency.set(code, { currency: code, recharge: 0, bonus: 0, total: 0 });
      return byCurrency.get(code);
    };
    for (const wallet of biz.normal_wallets || []) {
      const amount = pickNumber(wallet && wallet.balance);
      if (amount === null) continue;
      const entry = ensure(wallet.currency);
      entry.recharge += amount;
      entry.total += amount;
    }
    for (const wallet of biz.bonus_wallets || []) {
      const amount = pickNumber(wallet && wallet.balance);
      if (amount === null) continue;
      const entry = ensure(wallet.currency);
      entry.bonus += amount;
      entry.total += amount;
    }
    return {
      ok: true,
      currentToken: pickNumber(biz.current_token),
      totalUsage: biz.total_usage ?? null,
      monthlyUsage: biz.monthly_usage ?? null,
      totalAvailableTokenEstimation: pickNumber(biz.total_available_token_estimation),
      totalCosts: costs,
      wallets: Array.from(byCurrency.values()),
    };
  }

  function parsePlatformUsage(costResult, amountResult, tzOffset) {
    const amountBiz = amountResult && amountResult.ok && amountResult.raw
      && amountResult.raw.data && amountResult.raw.data.biz_data;
    if (!amountBiz || !Array.isArray(amountBiz.series)) return null;

    const costBiz = costResult && costResult.ok && costResult.raw
      && costResult.raw.data && costResult.raw.data.biz_data;
    if (!costBiz || !Array.isArray(costBiz.data)) return null;
    const bucket = Number(amountBiz.bucket) || Number(costBiz.bucket) || 86400;
    const entries = new Map();
    const models = new Map();

    const entryAt = (time) => {
      const key = String(time);
      if (!entries.has(key)) {
        entries.set(key, {
          key,
          time: Number(time),
          label: platformBucketLabel(Number(time), bucket, tzOffset),
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          cost: 0,
          requests: 0,
        });
      }
      return entries.get(key);
    };

    const modelAt = (model) => {
      const key = model || 'unknown';
      if (!models.has(key)) {
        models.set(key, {
          model: key,
          tokens: 0,
          requests: 0,
          input: 0,
          output: 0,
          cacheRead: 0,
          cost: 0,
        });
      }
      return models.get(key);
    };

    for (const series of amountBiz.series) {
      const model = modelAt(series.model);
      for (const point of series.buckets || []) {
        const usage = point.usage || {};
        const hit = finiteNumber(usage.PROMPT_CACHE_HIT_TOKEN);
        const miss = finiteNumber(usage.PROMPT_CACHE_MISS_TOKEN);
        const output = finiteNumber(usage.RESPONSE_TOKEN);
        const requests = finiteNumber(usage.REQUEST);
        const entry = entryAt(point.time);
        entry.cacheReadTokens += hit;
        entry.inputTokens += miss;
        entry.outputTokens += output;
        entry.totalTokens += hit + miss + output;
        entry.requests += requests;

        model.cacheRead += hit;
        model.input += miss;
        model.output += output;
        model.tokens += hit + miss + output;
        model.requests += requests;
      }
    }

    const costData = costBiz && Array.isArray(costBiz.data)
      ? (costBiz.data.find((item) => item.currency === 'CNY') || costBiz.data[0])
      : null;
    if (!costData) return null;
    if (costData) {
      for (const series of costData.series || []) {
        const model = modelAt(series.model);
        for (const point of series.buckets || []) {
          const cost = finiteNumber(point.cost);
          entryAt(point.time).cost += cost;
          model.cost += cost;
        }
      }
      for (const series of costData.function_series || []) {
        for (const point of series.buckets || []) {
          const cost = finiteNumber(point.cost);
          entryAt(point.time).cost += cost;
        }
      }
    }

    const series = Array.from(entries.values()).sort((a, b) => a.time - b.time);
    const totals = emptyTotals();
    for (const point of series) {
      totals.totalTokens += point.totalTokens;
      totals.inputTokens += point.inputTokens;
      totals.outputTokens += point.outputTokens;
      totals.cacheReadTokens += point.cacheReadTokens;
      totals.cacheWriteTokens += point.cacheWriteTokens;
      totals.reasoningTokens += point.reasoningTokens;
      totals.cost += point.cost;
      totals.requests += point.requests;
    }

    return {
      bucket: bucket <= 3600 ? 'hour' : bucket >= 28 * 86400 ? 'month' : 'day',
      series,
      totals,
      models: Array.from(models.values()).sort((a, b) => b.tokens - a.tokens),
    };
  }

  async function attachTaskTitles(tasks) {
    if (!sessionQuery || tasks.length === 0) return tasks;
    const titles = new Map();
    if (typeof sessionQuery.readTitleSnapshots === 'function') {
      try {
        const results = await sessionQuery.readTitleSnapshots(tasks.map((task) => task.id));
        for (const result of results || []) {
          if (!result || result.status !== 'fulfilled' || !result.value || !result.value.title) continue;
          const title = result.value.title.title;
          if (typeof title === 'string' && title.trim()) titles.set(result.sessionId, title.trim().slice(0, 120));
        }
      } catch (error) {
        console.error('[usage-center] task titles failed', error);
      }
    }
    return tasks.map((task) => ({ ...task, title: titles.get(task.id) || null }));
  }

  function mergePlatformUsage(parts) {
    const valid = parts.filter(Boolean);
    if (valid.length === 0) return null;

    const seriesByKey = new Map();
    const modelsByKey = new Map();
    const totals = emptyTotals();

    for (const part of valid) {
      for (const point of part.series) {
        let entry = seriesByKey.get(point.key);
        if (!entry) {
          entry = { ...point };
          seriesByKey.set(point.key, entry);
        } else {
          entry.totalTokens += point.totalTokens;
          entry.inputTokens += point.inputTokens;
          entry.outputTokens += point.outputTokens;
          entry.cacheReadTokens += point.cacheReadTokens;
          entry.cacheWriteTokens += point.cacheWriteTokens;
          entry.reasoningTokens += point.reasoningTokens;
          entry.cost += point.cost;
          entry.requests += point.requests;
        }
      }
      for (const model of part.models) {
        let entry = modelsByKey.get(model.model);
        if (!entry) {
          entry = { ...model };
          modelsByKey.set(model.model, entry);
        } else {
          entry.tokens += model.tokens;
          entry.requests += model.requests;
          entry.input += model.input;
          entry.output += model.output;
          entry.cacheRead += model.cacheRead;
          entry.cost += model.cost;
        }
      }
      totals.totalTokens += part.totals.totalTokens;
      totals.inputTokens += part.totals.inputTokens;
      totals.outputTokens += part.totals.outputTokens;
      totals.cacheReadTokens += part.totals.cacheReadTokens;
      totals.cacheWriteTokens += part.totals.cacheWriteTokens;
      totals.reasoningTokens += part.totals.reasoningTokens;
      totals.cost += part.totals.cost;
      totals.requests += part.totals.requests;
    }

    return {
      bucket: valid[0].bucket,
      series: Array.from(seriesByKey.values()).sort((a, b) => a.time - b.time),
      models: Array.from(modelsByKey.values()).sort((a, b) => b.tokens - a.tokens),
      totals,
    };
  }

  function aggregatePlatformByMonth(usage, tzOffset) {
    const months = new Map();
    for (const point of usage.series) {
      const shifted = new Date((point.time + tzOffset * 60) * 1000);
      const year = shifted.getUTCFullYear();
      const month = pad2(shifted.getUTCMonth() + 1);
      const key = year + '-' + month;
      let entry = months.get(key);
      if (!entry) {
        entry = {
          key,
          time: Math.floor(startOfLocalMonth(point.time * 1000, tzOffset) / 1000),
          label: key,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          cost: 0,
          requests: 0,
        };
        months.set(key, entry);
      }
      entry.totalTokens += point.totalTokens;
      entry.inputTokens += point.inputTokens;
      entry.outputTokens += point.outputTokens;
      entry.cacheReadTokens += point.cacheReadTokens;
      entry.cacheWriteTokens += point.cacheWriteTokens;
      entry.reasoningTokens += point.reasoningTokens;
      entry.cost += point.cost;
      entry.requests += point.requests;
    }
    return {
      ...usage,
      bucket: 'month',
      series: Array.from(months.values()).sort((a, b) => a.time - b.time),
    };
  }

  async function fetchPlatformChunk(startSec, endSec, tzOffset) {
    const [cost, amount] = await Promise.all([
      fetchPlatformUsageRange('/api/v0/usage/by_api_key/cost', startSec, endSec, tzOffset),
      fetchPlatformUsageRange('/api/v0/usage/by_api_key/amount', startSec, endSec, tzOffset),
    ]);
    if (!cost.ok || !amount.ok) return null;
    const parsed = parsePlatformUsage(cost, amount, tzOffset);
    if (parsed) return parsed;

    const spanDays = Math.floor((endSec - startSec) / DAY_SECONDS);
    if (spanDays <= MIN_PLATFORM_SPAN_DAYS) return null;
    const leftDays = Math.max(1, Math.floor(spanDays / 2));
    const middle = startSec + leftDays * DAY_SECONDS;
    if (middle <= startSec || middle >= endSec) return null;
    const [left, right] = await Promise.all([
      fetchPlatformChunk(startSec, middle, tzOffset),
      fetchPlatformChunk(middle, endSec, tzOffset),
    ]);
    return mergePlatformUsage([left, right]);
  }

  async function fetchPlatformUsagePair(window, tzOffset) {
    const now = Date.now();
    const stamp = window.id === 'today'
      ? Math.floor(now / 60_000)
      : Math.floor(window.start / DAY_MS);
    const key = window.id + ':' + tzOffset + ':' + stamp;
    const ttl = window.id === '1y' || window.id === 'all' ? 300_000 : 60_000;
    const cached = usageCache.get(key);
    if (cached && now - cached.at < (cached.value ? ttl : 60_000)) return cached.value;
    if (usageInFlight.has(key)) return usageInFlight.get(key);

    const pending = (async () => {
      const { startSec, endSec } = platformBounds(window, tzOffset);
      const chunks = [];
      for (let cursor = startSec; cursor < endSec && chunks.length < 16;) {
        const next = Math.min(endSec, cursor + MAX_PLATFORM_SPAN_DAYS * DAY_SECONDS);
        chunks.push([cursor, next]);
        cursor = next;
      }
      const parts = await Promise.all(chunks.map(([start, end]) => fetchPlatformChunk(start, end, tzOffset)));
      const merged = mergePlatformUsage(parts);
      if (!merged) return null;
      return window.id === '1y' || window.id === 'all'
        ? aggregatePlatformByMonth(merged, tzOffset)
        : merged;
    })()
      .then((value) => {
        usageCache.set(key, { at: Date.now(), value });
        return value;
      })
      .catch((error) => {
        console.error('[usage-center] platform usage pair failed', error);
        usageCache.set(key, { at: Date.now(), value: null });
        return null;
      })
      .finally(() => {
        usageInFlight.delete(key);
      });

    usageInFlight.set(key, pending);
    return pending;
  }

  async function buildSummary({ period, tzOffset, locale, debug }) {
    const now = Date.now();
    const window = periodWindow(period, now, tzOffset);

    const [accountBalance, collected, platformResult, platformUsage] = await Promise.all([
      readBalance(locale, tzOffset),
      collectRecords(),
      getPlatformOverview(),
      fetchPlatformUsagePair(window, tzOffset).catch((error) => {
        console.error('[usage-center] platform usage pair failed', error);
        return null;
      }),
    ]);
    const platform = normalizePlatformOverview(platformResult);
    let balance = accountBalance;
    if (platform.ok && Array.isArray(platform.wallets) && platform.wallets.length > 0) {
      balance = {
        ...accountBalance,
        ok: true,
        source: 'account',
        signedIn: true,
        wallets: platform.wallets,
        error: null,
      };
    }
    let platformUsageDebug = null;
    if (debug) {
      const [costUsage, amountUsage] = await Promise.all([
        fetchPlatformUsage('/api/v0/usage/by_api_key/cost', window, tzOffset),
        fetchPlatformUsage('/api/v0/usage/by_api_key/amount', window, tzOffset),
      ]);
      platformUsageDebug = { cost: costUsage, amount: amountUsage };
    }

    const records = [];
    const sessionsWithUsage = new Set();
    const tasksById = new Map();
    const totals = emptyTotals();
    const models = new Map();
    let allTimeCost = 0;
    let allTimeTokens = 0;
    let allTimeRequests = 0;
    for (const [sessionId, calls] of collected.bySession) {
      for (const call of calls) {
        allTimeCost += call.cost;
        allTimeTokens += call.usage.total;
        allTimeRequests += 1;
        if (call.time < window.start || call.time > window.end) continue;
        records.push(call);
        sessionsWithUsage.add(sessionId);
        let task = tasksById.get(sessionId);
        if (!task) {
          task = { id: sessionId, tokens: 0, localCost: 0, requests: 0, lastAt: 0 };
          tasksById.set(sessionId, task);
        }
        task.tokens += call.usage.total;
        task.localCost += call.cost;
        task.requests += 1;
        task.lastAt = Math.max(task.lastAt, call.time);
      }
    }
    for (const record of records) {
      addUsage(totals, record.usage, record.cost);
      const key = record.model || 'unknown';
      const entry = models.get(key) || { model: key, ...emptyTotals() };
      addUsage(entry, record.usage, record.cost);
      models.set(key, entry);
    }

    const modelList = Array.from(models.values())
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 8)
      .map((entry) => ({
        model: entry.model,
        tokens: entry.totalTokens,
        requests: entry.requests,
        input: entry.inputTokens,
        output: entry.outputTokens,
        cacheRead: entry.cacheReadTokens,
        cost: entry.cost,
      }));

    const localSeries = buildSeries(records, window, tzOffset);
    const usePlatform = platformUsage !== null;
    const finalTotals = usePlatform ? platformUsage.totals : totals;
    const finalModels = usePlatform ? platformUsage.models : modelList;
    const finalSeries = usePlatform ? platformUsage.series : localSeries.series;
    const finalBucket = usePlatform ? platformUsage.bucket : localSeries.bucket;
    const platformCostEntry = Array.isArray(platform.totalCosts)
      ? (platform.totalCosts.find((entry) => entry.currency === 'CNY') || platform.totalCosts[0])
      : null;
    const platformCostTotal = platformCostEntry ? platformCostEntry.amount : null;
    const effectiveAllTimeCost = platformCostTotal !== null ? platformCostTotal : allTimeCost;
    if (period === 'all' && platformCostTotal !== null) finalTotals.cost = platformCostTotal;
    const cacheDenominator = finalTotals.inputTokens + finalTotals.cacheReadTokens + finalTotals.cacheWriteTokens;

    const titledTasks = await attachTaskTitles(Array.from(tasksById.values()));
    const localTaskTokens = titledTasks.reduce((sum, task) => sum + task.tokens, 0);
    const localTaskCost = titledTasks.reduce((sum, task) => sum + task.localCost, 0);
    const taskFactor = usePlatform && localTaskCost > 0 ? finalTotals.cost / localTaskCost : 1;
    const taskRows = titledTasks
      .map((task) => ({
        id: task.id,
        title: task.title || null,
        tokens: task.tokens,
        cost: task.localCost * taskFactor,
        localCost: task.localCost,
        requests: task.requests,
        lastAt: task.lastAt,
        share: localTaskTokens > 0 ? Math.round((task.tokens / localTaskTokens) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    return {
      ok: true,
      generatedAt: now,
      period: {
        id: window.id,
        start: window.start,
        end: window.end,
        tzOffset,
      },
      balance,
      usage: {
        ...finalTotals,
        cacheHitRate: cacheDenominator > 0 ? Math.round((finalTotals.cacheReadTokens / cacheDenominator) * 1000) / 10 : 0,
        sessions: sessionsWithUsage.size,
        models: finalModels,
        series: finalSeries,
        bucket: finalBucket,
        source: usePlatform ? 'platform' : 'local',
        costCurrency: 'CNY',
        tasks: taskRows,
        taskBasis: usePlatform ? 'allocated' : 'local',
        taskLocalTokens: localTaskTokens,
        taskLocalCost: localTaskCost,
        taskCount: taskRows.length,
        allTime: {
          cost: effectiveAllTimeCost,
          costSource: platformCostTotal !== null ? 'platform' : 'local',
          tokens: allTimeTokens,
          requests: allTimeRequests,
        },
        pricing: {
          currency: 'CNY',
          estimated: !usePlatform,
          source: usePlatform ? 'platform' : 'local',
          effectiveFrom: NEW_PRICING_FROM,
          note: usePlatform ? 'actual Platform usage and cost' : 'peak/off-peak by Beijing time',
        },
      },
      platform: debug ? { ...platform, raw: platformResult && platformResult.raw } : platform,
      platformUsage: debug ? platformUsageDebug : undefined,
      coverage: {
        liveSessions: collected.liveCount,
        persistedSessions: collected.persistedCount,
        failedSessions: collected.failed,
        partial: collected.failed > 0,
      },
    };
  }

  function isLoopbackRequest(req) {
    const remote = req.socket && req.socket.remoteAddress;
    if (!remote) return true; // Electron IPC bridge and Unix-socket-style transports.
    const normalized = String(remote).replace(/^::ffff:/, '');
    return normalized === '::1' || normalized === 'localhost' || /^127\./.test(normalized);
  }

  function isAllowedOrigin(req) {
    const origin = req.headers && req.headers.origin;
    if (!origin || origin === 'null' || origin === 'file://') return true;
    try {
      const url = new URL(origin);
      if (url.protocol === 'file:' || url.protocol === 'app:' || url.protocol === 'dsh:') return true;
      if (url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === 'localhost') return true;
      const host = req.headers && req.headers.host;
      if (host && url.host === host) return true;
    } catch {
      return false;
    }
    return false;
  }

  async function handleSummary(req, res) {
    const send = (status, payload) => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(JSON.stringify(payload));
    };

    if (req.method !== 'GET') {
      send(405, { ok: false, error: 'method-not-allowed' });
      return;
    }
    if (!isLoopbackRequest(req) || !isAllowedOrigin(req)) {
      send(403, { ok: false, error: 'forbidden' });
      return;
    }

    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const requested = url.searchParams.get('period') || '7d';
      const period = PERIODS.has(requested) ? requested : '7d';
      const offsetParam = url.searchParams.get('tzOffset');
      const rawOffset = offsetParam === null ? NaN : Number(offsetParam);
      const tzOffset = Number.isFinite(rawOffset) ? clamp(Math.round(rawOffset), -840, 840) : -new Date().getTimezoneOffset();
      const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'zh';
      const debug = url.searchParams.get('debug') === '1';
      send(200, await buildSummary({ period, tzOffset, locale, debug }));
    } catch (error) {
      console.error('[usage-center] summary failed', error);
      send(200, {
        ok: false,
        error: 'summary-failed',
        generatedAt: Date.now(),
        balance: {
          ok: false,
          source: null,
          signedIn: false,
          wallets: [],
          links: DEFAULT_LINKS,
          checkedAt: Date.now(),
          error: 'balance-unavailable',
        },
        usage: {
          ...emptyTotals(),
          cacheHitRate: 0,
          sessions: 0,
          models: [],
          series: [],
          bucket: 'day',
          tasks: [],
          taskBasis: 'local',
          taskLocalTokens: 0,
          taskLocalCost: 0,
          taskCount: 0,
          allTime: { cost: 0, tokens: 0, requests: 0 },
          pricing: { currency: 'CNY', estimated: true, effectiveFrom: NEW_PRICING_FROM },
        },
        platform: { ok: false, error: 'summary-failed' },
        coverage: { liveSessions: 0, persistedSessions: 0, failedSessions: 0, partial: true },
      });
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-center/summary',
    handler: handleSummary,
  }), 'usage-center: summary route');
}
