/**
 * Habit memory - the Host half.
 *
 * What it does
 * ------------
 * 1. Watches every durable `user/message` in every Session (live sessions plus a
 *    catch-up scan of persisted ones), and folds explicit preference statements
 *    into a small, stable "habit profile".
 * 2. Exposes the profile to the model as a system-prompt section, so every task
 *    in every conversation starts with the user's standing preferences.
 * 3. Registers three model-facing tools (`habit_list`, `habit_remember`,
 *    `habit_forget`) so the assistant can also record a habit it inferred from
 *    context instead of an explicit keyword.
 * 4. Serves a small JSON API for the sidebar panel (read / edit / toggle /
 *    re-learn).
 *
 * Storage is a single JSON document in the Harness cache directory, written
 * atomically and debounced. Nothing here mutates a Session log.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const ROW_NAME = '@local/azl-habits';
const PROMPT_SECTION = 'azl-habits/profile';
const API_PREFIX = '/api/azl-habits';
const STORE_VERSION = 1;
const MAX_TEXT = 400;
const MAX_EVIDENCE = 6;

const HABIT_KINDS = ['language', 'style', 'workflow', 'tooling', 'format', 'content', 'safety', 'other'];

/* ------------------------------------------------------------------ storage */

function cacheRoot() {
  const base = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(base, 'cache', 'azl-habits');
}

function storePath() {
  return join(cacheRoot(), 'habits.json');
}

function emptyProfile() {
  return {
    version: STORE_VERSION,
    updatedAt: 0,
    autoLearn: true,
    inject: true,
    habits: [],
    stats: { messages: 0, sessions: 0, extractions: 0, modelWrites: 0 },
    cursors: {},
  };
}

function clampText(value, limit = MAX_TEXT) {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function freshId() {
  return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Keep the stored document small and structurally valid whatever we read. */
function normalize(raw) {
  const base = emptyProfile();
  if (!raw || typeof raw !== 'object') return base;
  const habits = Array.isArray(raw.habits) ? raw.habits : [];
  const seen = new Set();
  for (const item of habits) {
    if (!item || typeof item !== 'object') continue;
    const text = clampText(item.text).replace(/^User preference:\s*/u, '').trim();
    if (!text) continue;
    // 语言规则、寒暄与任务式记录都不算习惯；旧版本学到的会在加载时清掉。
    if (item.kind === 'language' || LANGUAGE_RULE.test(text) || BOILERPLATE.test(text)) continue;
    // Store hygiene: an "explicit" learning that is really a one-off task request
    // (learned by an earlier, looser extractor) is dropped on load.
    if (text.startsWith('User preference: ')) {
      const sentence = text.slice('User preference: '.length);
      if (looksLikeTaskRequest(sentence)) continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    base.habits.push({
      id: typeof item.id === 'string' && item.id ? item.id : freshId(),
      text,
      kind: HABIT_KINDS.includes(item.kind) ? item.kind : 'other',
      strength: Number.isFinite(item.strength) ? Math.max(1, Math.min(9, Math.round(item.strength))) : 3,
      enabled: item.enabled !== false,
      source: typeof item.source === 'string' ? item.source.slice(0, 24) : 'learned',
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
      hits: Number.isFinite(item.hits) ? item.hits : 1,
      evidence: Array.isArray(item.evidence)
        ? item.evidence
            .filter((e) => e && typeof e.text === 'string')
            .slice(-MAX_EVIDENCE)
            .map((e) => ({ text: clampText(e.text, 160), session: typeof e.session === 'string' ? e.session : '', at: Number.isFinite(e.at) ? e.at : 0 }))
        : [],
    });
  }
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  base.updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  base.autoLearn = raw.autoLearn !== false;
  base.inject = raw.inject !== false;
  base.habits = base.habits.slice(0, 120);
  base.stats = {
    messages: Number.isFinite(stats.messages) ? stats.messages : 0,
    sessions: Number.isFinite(stats.sessions) ? stats.sessions : 0,
    extractions: Number.isFinite(stats.extractions) ? stats.extractions : 0,
    modelWrites: Number.isFinite(stats.modelWrites) ? stats.modelWrites : 0,
  };
  base.cursors = raw.cursors && typeof raw.cursors === 'object' ? raw.cursors : {};
  return base;
}

/* ---------------------------------------------------------------- extraction */

/** 强标记：只有带「长期」语义的句子才可能是习惯；弱词（简洁/测试/提交）不再单独触发。 */
const STRONG_MARKER =
  /(以后|今后|下次|往后|从现在开始|从今以后|记住|记得|不要再|别再|不要用|别用|不许|务必|一定要|我喜欢|我不喜欢|我习惯|我更倾向|我偏向|我希望你|请你总是|总是|统一用|都用|改用|换成|默认用|默认使用|always|never|from now on|every time|each time|remember (?:to|that)|i prefer|i'd rather|i would rather|don't use|do not use|stop using|keep using|use .* instead|by default)/i;

const TASK_SHAPED =
  /^(\s*)(请|帮我|帮忙|给我|麻烦|写|编|做|创建|制作|实现|开发|生成|设计|修复|改|添加|加个|加一个|来|弄|搞|需|把|build|create|make|write|implement|add|fix|design|generate)/i;
const TASK_VERB =
  /(写|编|做|创建|制作|实现|开发|生成|设计|修复|改|添加|加个|加一个|弄|搞|请|把|build|create|make|write|implement|add|fix|design|generate)/i;

/**
 * 语言类规则是设置项，不是习惯：用户切换一下语言就变了，也不携带任何项目知识。
 * 只匹配「用中文回答 / 英文回复」这类句子，不误伤「注释用中文」。
 */
const LANGUAGE_RULE =
  /(中文|英文|汉语|英语|chinese|english)[^，。；!?]{0,6}(回答|回复|reply|answer)|(回答|回复|reply|answer|speak)[^，。；!?]{0,8}(中文|英文|汉语|英语|chinese|english)|always answer in (chinese|english)/i;
const BOILERPLATE = /^(谢谢|多谢|好的|好|可以|行|继续|收到|嗯|ok|okay|thanks|thank you)[。！!~～\s]*$/i;

/**
 * A sentence is a one-off task request (not a standing preference) when it reads
 * like a request and carries no strong preference marker. Long sentences and
 * request-shaped verbs are treated as tasks: real preferences are short rules.
 */
function looksLikeTaskRequest(sentence) {
  if (sentence.length > 80) return true;
  if (STRONG_MARKER.test(sentence)) return false;
  return TASK_SHAPED.test(sentence) || TASK_VERB.test(sentence);
}

/** 提炼：去掉连接词、第一人称前缀与句末标点，留一句能直接执行的短句。 */
function distill(sentence) {
  const text = sentence
    .replace(/^(另外|还有|对了|然后|其次|此外|同时|补充一点|顺便说一句)[，,、:：\s]*/u, '')
    .replace(/^(请)?(记住|记得|务必记住)[，,、:：\s]*/u, '')
    .replace(/^我(希望|想|想要|要求|需要)\s*/u, '')
    .replace(/^用户偏好[:：]\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。；;，,、\s]+$/u, '');
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/** 由句子本身判断类别，不再用关键词替换用户的话。 */
function inferKind(text) {
  if (/(不要|别|禁止|安全|备份|删除|safety|never|must not)/i.test(text)) return 'safety';
  if (/(格式|markdown|表格|代码块|json|format|bullet|编号|列表)/i.test(text)) return 'format';
  if (/(流程|先|再|然后|测试|提交|workflow|first|then|test|commit)/i.test(text)) return 'workflow';
  if (/(工具|命令|powershell|bash|windows|terminal|tooling)/i.test(text)) return 'tooling';
  if (/(字体|颜色|配色|样式|语气|简洁|详细|style|tone|font|color)/i.test(text)) return 'style';
  return 'other';
}

/**
 * 只从带强标记的句子里提炼一条习惯；语言设置、寒暄、任务请求一律跳过。
 */
function preferenceSentence(text) {
  // 「记住，X」把标记与内容分开写：先按这个形状取 X。
  const led = /^(?:请)?(?:记住|记得|务必记住)[，,、:：\\s]+(.{2,})$/u.exec(text.trim());
  if (led) {
    const body = led[1].trim();
    if (!LANGUAGE_RULE.test(body) && !BOILERPLATE.test(body) && !looksLikeTaskRequest(body)) return body;
  }
  const parts = text
    .split(/[。！？!?；;，,\n]/)
    .map((part) => clampText(part, 180))
    .filter(Boolean);
  for (const part of parts) {
    if (!STRONG_MARKER.test(part)) continue;
    if (looksLikeTaskRequest(part)) continue;
    if (LANGUAGE_RULE.test(part) || BOILERPLATE.test(part.trim())) continue;
    return part;
  }
  return '';
}

/**
 * 把一条用户消息提炼成零到一条习惯：保留并凝练用户自己的要求，
 * 不再用预设模板替换（模板会丢掉真正的要求，还会把一次性任务记成习惯）。
 */
export function extractHabits(text) {
  const clean = clampText(text, 600);
  if (!clean) return [];
  const found = [];
  const sentence = preferenceSentence(clean);
  if (sentence) {
    const distilled = distill(sentence);
    if (distilled) {
      found.push({ kind: inferKind(distilled), text: distilled, strength: 4, rule: 'explicit' });
    }
  }
  if (/#habit\b/i.test(clean)) {
    const body = distill(clean.replace(/#habit\b/gi, '').trim());
    if (
      body &&
      !LANGUAGE_RULE.test(body) &&
      !BOILERPLATE.test(body) &&
      !found.some((item) => item.text === body)
    ) {
      found.push({ kind: inferKind(body), text: body, strength: 6, rule: 'tagged' });
    }
  }
  return found;
}

/* ------------------------------------------------------------- prompt shaping */

function renderProfile(profile) {
  const habits = profile.habits.filter((habit) => habit.enabled);
  if (habits.length === 0) {
    return [
      'No standing habits have been recorded yet.',
      'When the user states a lasting preference (language, tone, format, workflow, safety rule), call `habit_remember` so it applies to every later task.',
    ].join('\n');
  }
  const byKind = new Map();
  for (const habit of habits) {
    if (!byKind.has(habit.kind)) byKind.set(habit.kind, []);
    byKind.get(habit.kind).push(habit);
  }
  const labels = {
    language: 'Language',
    style: 'Tone and length',
    format: 'Output format',
    workflow: 'Workflow',
    tooling: 'Environment and tooling',
    content: 'Content conventions',
    safety: 'Safety and permissions',
    other: 'Other preferences',
  };
  const lines = [];
  for (const [kind, items] of byKind) {
    lines.push(`- ${labels[kind] || 'Other'}:`);
    for (const item of items) lines.push(`  - ${item.text}`);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------- plugin */

export const name = ROW_NAME;
export const inject = ['tools', 'systemPrompt'];


export function apply(ctx, config = {}) {
  const settings = {
    enabled: config.enabled !== false,
    learn: config.learnFromConversations !== false,
    injectPrompt: config.injectIntoPrompt !== false,
    maxHabits: Number.isFinite(config.maxHabits) ? Math.max(5, Math.min(120, config.maxHabits)) : 40,
    maxEvidence: Number.isFinite(config.maxEvidencePerSession) ? config.maxEvidencePerSession : 200,
  };

  const sessions = ctx.get('sessions');
  const persistence = ctx.get('sessionPersistence');
  const log = (message, error) => {
    if (error) console.error('[azl-habits] ' + message, error);
    else console.log('[azl-habits] ' + message);
  };

  let profile = emptyProfile();
  let loaded = false;
  let saveTimer = null;
  let saveChain = Promise.resolve();
  let cursorCache = new Map();

  /* ---- persistence ------------------------------------------------------ */

  function scheduleSave() {
    profile.updatedAt = Date.now();
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const snapshot = JSON.stringify(profile, null, 2);
      saveChain = saveChain
        .then(async () => {
          const target = storePath();
          await mkdir(dirname(target), { recursive: true });
          const temp = target + '.tmp';
          await writeFile(temp, snapshot, 'utf8');
          await rename(temp, target);
        })
        .catch((error) => log('save failed', error));
    }, 400);
    if (typeof saveTimer.unref === 'function') saveTimer.unref();
  }

  async function load() {
    try {
      const raw = await readFile(storePath(), 'utf8');
      profile = normalize(JSON.parse(raw));
    } catch (error) {
      if (error && error.code !== 'ENOENT') log('load failed, starting empty', error);
      profile = emptyProfile();
    }
    loaded = true;
  }

  /* ---- habit mutation --------------------------------------------------- */

  function findHabit(id) {
    return profile.habits.find((habit) => habit.id === id);
  }

  function upsertHabit(input, source, sessionId, evidenceText) {
    const text = clampText(input.text);
    if (!text) return { ok: false, reason: 'empty' };
    const kind = HABIT_KINDS.includes(input.kind) ? input.kind : 'other';
    const strength = Number.isFinite(input.strength) ? Math.max(1, Math.min(9, Math.round(input.strength))) : 4;
    const key = text.toLowerCase();
    let habit = profile.habits.find((item) => item.text.toLowerCase() === key);
    const now = Date.now();
    if (habit) {
      habit.kind = kind;
      habit.strength = Math.max(habit.strength, strength);
      habit.hits += 1;
      habit.updatedAt = now;
      habit.enabled = true;
      if (evidenceText && habit.evidence.length < MAX_EVIDENCE) {
        habit.evidence.push({ text: clampText(evidenceText, 160), session: sessionId || '', at: now });
      }
    } else {
      habit = {
        id: freshId(),
        text,
        kind,
        strength,
        enabled: true,
        source,
        createdAt: now,
        updatedAt: now,
        hits: 1,
        evidence: evidenceText ? [{ text: clampText(evidenceText, 160), session: sessionId || '', at: now }] : [],
      };
      profile.habits.push(habit);
      profile.stats.extractions += source === 'learned' ? 1 : 0;
      if (source === 'model') profile.stats.modelWrites += 1;
    }
    prune();
    scheduleSave();
    return { ok: true, habit };
  }

  function prune() {
    if (profile.habits.length <= settings.maxHabits) return;
    profile.habits.sort((a, b) => {
      const scoreA = a.enabled ? a.strength + Math.min(3, a.hits * 0.5) : -10;
      const scoreB = b.enabled ? b.strength + Math.min(3, b.hits * 0.5) : -10;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.updatedAt - a.updatedAt;
    });
    const enabled = profile.habits.filter((habit) => habit.enabled).slice(0, settings.maxHabits);
    const disabled = profile.habits.filter((habit) => !habit.enabled).slice(0, 20);
    profile.habits = [...enabled, ...disabled];
  }

  /* ---- learning --------------------------------------------------------- */

  function textsFromEvent(event) {
    if (!event || event.type !== 'user/message') return null;
    const data = event.data;
    if (!data || data.role !== 'user') return null;
    const source = data.source || {};
    // Ignore synthetic inputs: approvals, steering echoes and tool injections.
    if (source.kind && source.kind !== 'user') return null;
    const parts = Array.isArray(data.content) ? data.content : [];
    const text = parts
      .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();
    if (!text) return null;
    if (/^\[(?:attachment|image|file)/i.test(text)) return null;
    if (text.startsWith('The approval policy changed')) return null;
    return clampText(text, 2000);
  }

  function learnFromMessage(sessionId, text) {
    if (!settings.learn || !settings.enabled) return 0;
    profile.stats.messages += 1;
    let count = 0;
    for (const candidate of extractHabits(text)) {
      const result = upsertHabit(candidate, 'learned', sessionId, text);
      if (result.ok) count += 1;
    }
    if (count > 0) scheduleSave();
    return count;
  }

  function scopedEvents(session) {
    const inherited = Number.isFinite(session.inheritedEventCount) ? session.inheritedEventCount : 0;
    return session.ownEvents().filter((event) => event.seq >= inherited);
  }

  function catchUpSession(session) {
    if (!settings.learn || !settings.enabled) return;
    const id = String(session.id);
    let events;
    try {
      events = scopedEvents(session);
    } catch {
      return;
    }
    let last = Number.isFinite(profile.cursors[id]) ? profile.cursors[id] : -1;
    let learned = 0;
    for (const event of events) {
      if (event.seq <= last) continue;
      last = event.seq;
      const text = textsFromEvent(event);
      if (text) learned += learnFromMessage(id, text) ? 1 : 0;
    }
    if (last !== profile.cursors[id]) {
      profile.cursors[id] = last;
      profile.stats.sessions = Object.keys(profile.cursors).length;
      scheduleSave();
    }
    if (learned > 0) log(`re-learned ${learned} habit signal(s) from ${id}`);
  }

  async function catchUpPersisted(limitSessions = 12) {
    if (!settings.learn || !settings.enabled || !persistence) return;
    let snapshots = [];
    try {
      snapshots = await persistence.list();
    } catch (error) {
      log('persisted session list failed', error);
      return;
    }
    const pending = snapshots.filter((snapshot) => !(profile.cursors[snapshot.header.id] > -1)).slice(0, limitSessions);
    for (const snapshot of pending) {
      try {
        const handle = await persistence.open(snapshot.header.id, 'read');
        try {
          const read = await handle.read();
          const inherited = Number(handle.inheritedEventCount) || 0;
          const events = Array.isArray(read.events) ? read.events.slice(inherited) : [];
          const messages = events
            .map((event) => ({ event, text: textsFromEvent(event) }))
            .filter((entry) => entry.text)
            .slice(-settings.maxEvidence);
          for (const entry of messages) learnFromMessage(snapshot.header.id, entry.text);
          const lastSeq = events.length > 0 ? events[events.length - 1].seq : -1;
          profile.cursors[snapshot.header.id] = lastSeq;
        } finally {
          await handle.close().catch(() => {});
        }
      } catch (error) {
        log('persisted session read failed: ' + snapshot.header.id, error);
      }
    }
    if (pending.length > 0) {
      profile.stats.sessions = Object.keys(profile.cursors).length;
      scheduleSave();
      log(`catch-up scanned ${pending.length} stored session(s)`);
    }
  }

  function watchSession(session) {
    const id = String(session.id);
    catchUpSession(session);
    const dispose = ctx.on('session/event', (eventSession, event) => {
      if (String(eventSession.id) !== id) return;
      if (!event || typeof event.seq !== 'number') return;
      if (Number.isFinite(profile.cursors[id]) && event.seq <= profile.cursors[id]) return;
      profile.cursors[id] = event.seq;
      const text = textsFromEvent(event);
      if (text) learnFromMessage(id, text);
    });
    return dispose;
  }

  /* ---- prompt section --------------------------------------------------- */

  if (settings.enabled && settings.injectPrompt) {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: PROMPT_SECTION,
          order: 1000,
          text: () => {
            if (!profile.inject || profile.habits.filter((habit) => habit.enabled).length === 0) return '';
            return [
              '## Standing user habits (learned across conversations)',
              'These preferences are part of the working preset. Apply them without being asked, and let an explicit instruction in the current conversation override them.',
              renderProfile(profile),
            ].join('\n');
          },
        }),
      'azl-habits: prompt section',
    );
  }

  /* ---- tools ------------------------------------------------------------ */

  if (settings.enabled) {
    ctx.effect(
      () =>
        ctx.tools.register({
          name: 'habit_list',
          description:
            'List the distilled standing requirements learned across conversations. They are already part of your system prompt; use this only when you need the raw records or their ids (for example before forgetting or correcting one).',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
          output: {
            schema: {
              type: 'object',
              properties: {
                habits: { type: 'array', items: { type: 'object' } },
                stats: { type: 'object' },
              },
            },
            render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
          },
          async execute() {
            return {
              habits: profile.habits.map((habit) => ({
                id: habit.id,
                text: habit.text,
                kind: habit.kind,
                strength: habit.strength,
                enabled: habit.enabled,
                source: habit.source,
                hits: habit.hits,
              })),
              stats: profile.stats,
            };
          },
        }),
      'azl-habits: habit_list',
    );

    ctx.effect(
      () =>
        ctx.tools.register({
          name: 'habit_remember',
          description:
            'Record one durable, non-obvious requirement that changes how later tasks are done (workflow, tooling, safety, output shape, aesthetic direction). Distill it into one short imperative sentence in the user\'s language. Never record reply language, politeness defaults, or one-off task instructions — those are settings, not habits.',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'One short imperative sentence in the user’s language, distilled from what they asked, e.g. "改代码前先读现有实现".' },
              kind: { type: 'string', enum: HABIT_KINDS, description: 'Category of the habit.' },
              strength: { type: 'integer', minimum: 1, maximum: 9, description: 'How strongly the user insisted (default 4).' },
            },
            required: ['text'],
            additionalProperties: false,
          },
          output: {
            schema: { type: 'object', properties: { ok: { type: 'boolean' }, habit: { type: 'object' } } },
            render: (_args, value) => [
              { type: 'text', text: value && value.habit ? 'Remembered: ' + value.habit.text : 'No habit recorded.' },
            ],
          },
          async execute(args) {
            const input = args && typeof args === 'object' ? args : {};
            const result = upsertHabit(
              { text: input.text, kind: input.kind, strength: input.strength },
              'model',
              currentSessionId(),
              typeof input.text === 'string' ? input.text : '',
            );
            return result.ok ? { ok: true, habit: result.habit } : { ok: false, habit: null };
          },
        }),
      'azl-habits: habit_remember',
    );

    ctx.effect(
      () =>
        ctx.tools.register({
          name: 'habit_forget',
          description: 'Remove one standing habit by id (use habit_list first to find the id).',
          parameters: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Habit id from habit_list.' } },
            required: ['id'],
            additionalProperties: false,
          },
          output: {
            schema: { type: 'object', properties: { ok: { type: 'boolean' }, removed: { type: 'string' } } },
            render: (_args, value) => [{ type: 'text', text: value && value.ok ? 'Removed habit ' + value.removed : 'Habit not found.' }],
          },
          async execute(args) {
            const id = args && typeof args.id === 'string' ? args.id : '';
            const before = profile.habits.length;
            profile.habits = profile.habits.filter((habit) => habit.id !== id);
            if (profile.habits.length === before) return { ok: false, removed: id };
            scheduleSave();
            return { ok: true, removed: id };
          },
        }),
      'azl-habits: habit_forget',
    );
  }

  /* ---- session observation --------------------------------------------- */

  if (sessions && typeof sessions.list === 'function') {
    for (const session of sessions.list()) {
      ctx.effect(() => watchSession(session), 'azl-habits: watch ' + String(session.id));
    }
  }

  function currentSessionId() {
    try {
      const initiator = ctx.get('agents') && ctx.get('agents').currentInitiator && ctx.get('agents').currentInitiator();
      return initiator && initiator.id ? String(initiator.id) : '';
    } catch {
      return '';
    }
  }
  ctx.effect(
    () =>
      ctx.on('session/created', (session) => {
        if (sessions) ctx.effect(() => watchSession(session), 'azl-habits: watch ' + String(session.id));
      }),
    'azl-habits: session/created',
  );

  /* ---- small JSON API for the panel ------------------------------------ */

  const webServer = ctx.get('webServer');
  if (webServer) {
    const send = (res, status, payload) => {
      const body = JSON.stringify(payload);
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      });
      res.end(body);
    };

    const snapshot = () => ({
      ok: true,
      enabled: settings.enabled,
      learn: settings.learn,
      inject: settings.injectPrompt,
      autoLearn: profile.autoLearn,
      profileInject: profile.inject,
      habits: profile.habits,
      stats: profile.stats,
      updatedAt: profile.updatedAt,
    });

    const handleApi = async (req, res) => {
      const url = new URL(req.url || API_PREFIX, 'http://localhost');
      const action = url.pathname.slice(API_PREFIX.length).replace(/^\//, '') || 'state';
      try {
        if (req.method === 'GET' && (action === 'state' || action === '')) {
          if (!loaded) await load();
          send(res, 200, snapshot());
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 64 * 1024) break;
          }
          let input = {};
          if (body) {
            try {
              input = JSON.parse(body);
            } catch {
              send(res, 400, { ok: false, error: 'bad-json' });
              return;
            }
          }
          if (!loaded) await load();
          switch (action) {
            case 'add': {
              const result = upsertHabit(
                { text: input.text, kind: input.kind, strength: input.strength },
                'user',
                typeof input.session === 'string' ? input.session : '',
                '',
              );
              send(res, result.ok ? 200 : 400, result.ok ? { ...snapshot(), habit: result.habit } : { ok: false, error: 'empty' });
              return;
            }
            case 'update': {
              const habit = findHabit(typeof input.id === 'string' ? input.id : '');
              if (!habit) {
                send(res, 404, { ok: false, error: 'not-found' });
                return;
              }
              if (typeof input.text === 'string' && input.text.trim()) habit.text = clampText(input.text);
              if (HABIT_KINDS.includes(input.kind)) habit.kind = input.kind;
              if (typeof input.enabled === 'boolean') habit.enabled = input.enabled;
              if (Number.isFinite(input.strength)) habit.strength = Math.max(1, Math.min(9, Math.round(input.strength)));
              habit.updatedAt = Date.now();
              scheduleSave();
              send(res, 200, snapshot());
              return;
            }
            case 'delete': {
              const id = typeof input.id === 'string' ? input.id : '';
              profile.habits = profile.habits.filter((habit) => habit.id !== id);
              scheduleSave();
              send(res, 200, snapshot());
              return;
            }
            case 'toggle': {
              if (typeof input.autoLearn === 'boolean') profile.autoLearn = input.autoLearn;
              if (typeof input.inject === 'boolean') profile.inject = input.inject;
              scheduleSave();
              send(res, 200, snapshot());
              return;
            }
            case 'relearn': {
              for (const session of sessions.list()) catchUpSession(session);
              await catchUpPersisted(24);
              send(res, 200, snapshot());
              return;
            }
            default:
              send(res, 404, { ok: false, error: 'unknown-action' });
              return;
          }
        }
        send(res, 405, { ok: false, error: 'method-not-allowed' });
      } catch (error) {
        log('api failed', error);
        send(res, 500, { ok: false, error: 'internal' });
      }
    };

    ctx.effect(
      () => webServer.register({ kind: 'prefix', path: API_PREFIX, handler: handleApi }),
      'azl-habits: api route',
    );
  }

  /* ---- boot ------------------------------------------------------------- */

  ctx.effect(() => {
    load()
      .then(() => {
        if (!settings.learn) return;
        // Catch up on stored conversations once the profile is available.
        return catchUpPersisted(8);
      })
      .catch((error) => log('boot scan failed', error));
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, 'azl-habits: boot');
}

export default { name, inject, apply };
