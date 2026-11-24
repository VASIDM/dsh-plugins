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

const ROW_NAME = '@local/l';
const PROMPT_SECTION = 'l/profile';
const API_PREFIX = '/api/l';
const STORE_VERSION = 1;
const MAX_TEXT = 400;
const MAX_EVIDENCE = 6;
const MAX_PENDING = 20;
const AUTO_CONFIDENCE = 0.75;

const HABIT_KINDS = ['language', 'style', 'workflow', 'tooling', 'format', 'content', 'safety', 'other'];

/* ------------------------------------------------------------------ storage */

const LEGACY_STORE_DIR = 'azl-habits';

function cacheRoot() {
  const base = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(base, 'cache', 'l');
}

function storePath() {
  return join(cacheRoot(), 'habits.json');
}

/** Read the pre-rename store once, so existing habits survive the rename. */
async function legacyStorePath() {
  const base = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(base, 'cache', LEGACY_STORE_DIR, 'habits.json');
}

function emptyProfile() {
  return {
    version: STORE_VERSION,
    updatedAt: 0,
    autoLearn: true,
    inject: true,
    habits: [],
    pending: [],
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
      confidence: Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.6,
    });
  }
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const pendingRaw = Array.isArray(raw.pending) ? raw.pending : [];
  const pendingSeen = new Set();
  for (const item of pendingRaw) {
    if (!item || typeof item !== 'object') continue;
    const text = clampText(item.text);
    if (!text || pendingSeen.has(text.toLowerCase())) continue;
    pendingSeen.add(text.toLowerCase());
    base.pending.push({
      id: typeof item.id === 'string' && item.id ? item.id : freshId(),
      text,
      kind: HABIT_KINDS.includes(item.kind) ? item.kind : 'other',
      confidence: Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      reason: typeof item.reason === 'string' ? item.reason.slice(0, 80) : '待确认',
      session: typeof item.session === 'string' ? item.session : '',
      evidence: clampText(typeof item.evidence === 'string' ? item.evidence : '', 200),
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
    });
  }
  base.pending = base.pending.slice(0, MAX_PENDING);
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

/**
 * 习惯提取不是关键词命中。这里把一条消息拆成句子，再判断它是不是
 * 「跨任务的长期规则」：
 *
 *   - 明确的长期标记（以后/每次/默认/始终）→ 高置信度，自动生效；
 *   - 第一人称偏好（我喜欢/我习惯/我偏向）→ 高置信度，自动生效；
 *   - 记住/请记住 → 显式记忆请求，自动生效；
 *   - 单纯「不要/改用/应该」→ 只进「待确认」，不自动写进档案；
 *   - 一次性限定（这次/现在/这个/刚才）或任务型句子 → 不进待确认。
 */

const TASK_SHAPED =
  /^(\s*)(请|帮我|帮忙|给我|麻烦|写|编|做|创建|制作|实现|开发|生成|设计|修复|改|添加|加个|加一个|来|弄|搞|需|把|build|create|make|write|implement|add|fix|design|generate)/i;
const TASK_VERB =
  /(写|编|做|创建|制作|实现|开发|生成|设计|修复|改|添加|加个|加一个|弄|搞|请|把|build|create|make|write|implement|add|fix|design|generate)/i;

const LANGUAGE_RULE =
  /(中文|英文|汉语|英语|chinese|english)[^，。；!?]{0,6}(回答|回复|reply|answer)|(回答|回复|reply|answer|speak)[^，。；!?]{0,8}(中文|英文|汉语|英语|chinese|english)|always answer in (chinese|english)/i;
const BOILERPLATE = /^(谢谢|多谢|好的|好|可以|行|继续|收到|嗯|ok|okay|thanks|thank you)[。！!~～\s]*$/i;

/** 长期标记：句子自带「以后都这样」的语义。 */
const STANDING =
  /(以后|今后|从今以后|从现在开始|往后|每次|每一次|一律|始终|永远|总是|默认|默认用|默认使用|统一用|都用|全部用|再也不|绝不|from now on|always|never|by default|every time|each time)/i;
/** 第一人称偏好：不是任务要求，而是对自己的描述。 */
const PREFERENCE =
  /(我喜欢|我不喜欢|我更喜欢|我偏爱|我偏好|我习惯|我倾向于|我更倾向|我更愿意|我通常|我一般|对我来说|我的偏好|我的习惯|我要求|我希望)/i;
/** 祈使式长期规则；单独出现时只算候选，不自动生效。 */
const DIRECTIVE =
  /(请记住|记住|记得|务必|一定要|不要再|别再|不要用|别用|不要|别|禁止|改用|换成|改成)/i;
/** 弱建议词：单独出现不构成习惯。 */
const WEAK = /(应该|最好|建议|尽量|希望|需要|要|改用|换成|改成|调整成)/i;

/** 一次性限定：出现时降低置信度，避免把「这次」记成长期规则。 */
const ONE_OFF = /(这次|本次|现在|今天|今晚|刚才|刚刚|这个|该|上面|下面|暂时|临时|当前|这一版|这一轮|这一步|此处|这里)/i;
const PAST = /(上次|之前|以前|刚才|当时)/i;
const QUESTION = /[?？]\s*$/;
const CODE = /```|`[^`]+`|https?:\/\//i;

function normalizeForCompare(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function bigrams(text) {
  const set = new Set();
  for (let i = 0; i < text.length - 1; i += 1) set.add(text.slice(i, i + 2));
  return set;
}

/** 近似重复：共享 bigram 的 Dice 系数，或短句被长句完整包含。 */
function similarText(left, right) {
  const a = normalizeForCompare(left);
  const b = normalizeForCompare(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 6 || b.length < 6) return false;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.72;
  }
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return false;
  let hit = 0;
  for (const gram of A) if (B.has(gram)) hit += 1;
  return (2 * hit) / (A.size + B.size) >= 0.72;
}

function looksLikeTaskRequest(sentence) {
  if (CODE.test(sentence)) return true;
  if (sentence.length > 180) return true;
  if (STANDING.test(sentence) || PREFERENCE.test(sentence) || DIRECTIVE.test(sentence)) return false;
  return TASK_SHAPED.test(sentence) || TASK_VERB.test(sentence);
}

/** 提炼：去掉连接词、记忆前缀与句末标点，保留用户自己的表达。 */
function distill(sentence) {
  const text = sentence
    .replace(/^(另外|还有|对了|然后|其次|此外|同时|补充一点|顺便说一句)[，,、:：\s]*/u, '')
    .replace(/^(请|麻烦|帮我|帮忙)?\s*(记住|记得|务必记住)[，,、:：\s]*/u, '')
    .replace(/^(以后|今后|从今以后|从现在开始|往后|以后都|今后都)[，,、:：\s]*/u, '')
    .replace(/^我(希望|想|想要|要求|需要)\s*/u, '')
    .replace(/^用户偏好[:：]\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。；;，,、\s]+$/u, '');
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/** 由句子本身判断类别，不再用关键词替换用户的话。 */
function inferKind(text) {
  if (/(安全|备份|删除|权限|危险|覆盖|safety|must not|never delete|drop\s+table|rm\s+-rf)/i.test(text)) return 'safety';
  if (/(格式|markdown|表格|代码块|json|format|bullet|编号|列表)/i.test(text)) return 'format';
  if (/(流程|先|再|然后|测试|提交|workflow|first|then|test|commit)/i.test(text)) return 'workflow';
  if (/(工具|命令|powershell|bash|windows|terminal|tooling)/i.test(text)) return 'tooling';
  if (/(字体|颜色|配色|样式|语气|简洁|详细|style|tone|font|color)/i.test(text)) return 'style';
  return 'other';
}

/** 找到句子里最早出现的「偏好信号」，从那里截取真正的要求。 */
function preferenceClause(sentence) {
  let index = -1;
  for (const pattern of [PREFERENCE, STANDING, DIRECTIVE]) {
    const match = pattern.exec(sentence);
    if (match && (index < 0 || match.index < index)) index = match.index;
  }
  if (index > 0) return sentence.slice(index).trim();
  return sentence.trim();
}

function hasRuleShape(sentence) {
  return /(都|一律|统一|默认|不要|别|禁止|必须|应该|不能|不准|用|使用|采用|写成|格式|回答|回复|先|再|每次|所有|全部)/.test(sentence);
}

function confidenceOf(text, sentence) {
  const standing = STANDING.test(sentence);
  const pref = PREFERENCE.test(sentence);
  const directive = DIRECTIVE.test(sentence);
  const weak = WEAK.test(sentence);
  // 只在截取后的规则正文里看一次性限定；对「这个项目先这样，以后都…」
  // 这种前置语境，standing 出现后就在正文里判定，不能把整句的“这个”算进去。
  const oneOff = ONE_OFF.test(text) || (!standing && ONE_OFF.test(sentence));
  const past = PAST.test(sentence);
  const explicitRemember = /^(?:请|麻烦|帮我|帮忙)?\s*(?:记住|记得|务必记住)/u.test(sentence);

  if (!standing && !pref && !directive && !weak) return { confidence: 0, reason: '' };
  if (past && !standing) return { confidence: 0, reason: '' };
  if (QUESTION.test(sentence) && !explicitRemember) return { confidence: 0, reason: '' };
  // 叙述句里的“总是/永远”不是规则，例如“我总是忘记保存”。
  if (standing && !pref && !directive && !hasRuleShape(sentence)) {
    return { confidence: 0, reason: '' };
  }
  if (/忘记|忘了|记不住|有时候|偶尔|经常不/u.test(sentence) && !explicitRemember) {
    return { confidence: 0, reason: '' };
  }
  // “记住检查一下文件”是一次性动作，不是长期习惯。
  if (explicitRemember && /^(?:检查|查看|打开|运行|执行|删除|修改|写|生成|帮我|请|把)/u.test(text)) {
    return { confidence: 0.5, reason: '显式记忆请求，但内容像一次动作，需要确认' };
  }

  let confidence = 0;
  let reason = '';
  if (explicitRemember) {
    confidence = 0.92;
    reason = '显式的记忆请求';
  } else if (pref) {
    confidence = 0.85;
    reason = '第一人称偏好';
  } else if (standing) {
    confidence = 0.88;
    reason = '带有长期语义（以后/每次/默认）';
  } else if (directive) {
    confidence = 0.55;
    reason = '祈使句，可能只是一次性要求，需要确认';
  } else if (weak) {
    confidence = 0.35;
    reason = '弱建议词，需要确认';
  }
  if (oneOff && !explicitRemember) {
    confidence = Math.min(confidence, standing ? 0.68 : 0.4);
    reason = '含一次性限定词（这次/现在/这个等），需要确认';
  }
  if (text.length > 120) confidence = Math.max(0, confidence - 0.15);
  return { confidence, reason };
}

function analyzeSentence(rawSentence, whole) {
  const sentence = clampText(rawSentence, 220).trim();
  if (!sentence || sentence.length < 4) return null;
  if (BOILERPLATE.test(sentence)) return null;
  if (LANGUAGE_RULE.test(sentence)) return null;
  if (CODE.test(sentence)) return null;
  if (looksLikeTaskRequest(sentence)) return null;
  if (!STANDING.test(sentence) && !PREFERENCE.test(sentence) && !DIRECTIVE.test(sentence) && !WEAK.test(sentence)) return null;

  const clause = preferenceClause(sentence);
  const text = distill(clause);
  if (!text || text.length < 3) return null;
  if (BOILERPLATE.test(text)) return null;
  if (TASK_SHAPED.test(text) && !DIRECTIVE.test(sentence) && !PREFERENCE.test(sentence) && !STANDING.test(sentence)) return null;

  const { confidence, reason } = confidenceOf(text, sentence);
  if (confidence <= 0) return null;
  // 一条消息里只取最清晰的一条，避免把整段任务要求拆成多条规则。
  const strength = confidence >= 0.9 ? 5 : confidence >= 0.75 ? 4 : 3;
  return {
    text,
    kind: inferKind(text),
    strength,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    auto: confidence >= AUTO_CONFIDENCE,
    evidence: clampText(whole, 200),
  };
}

/**
 * 把一条用户消息提炼成候选：只有 auto=true 的才自动写入档案，
 * 其余进入待确认区，由用户在面板里接受或丢弃。
 */
export function extractHabits(text) {
  const clean = clampText(text, 600);
  if (!clean) return [];
  const found = [];
  const tagged = /#habit\b/i.test(clean);
  if (tagged) {
    const body = distill(clean.replace(/#habit\b/gi, '').trim());
    if (body && !LANGUAGE_RULE.test(body) && !BOILERPLATE.test(body)) {
      found.push({
        text: body,
        kind: inferKind(body),
        strength: 6,
        confidence: 1,
        reason: '用户用 #habit 显式标记',
        auto: true,
        evidence: clampText(clean, 200),
      });
    }
  }

  const sentences = clean.split(/[。！？!?；;\n]+/u).map((part) => part.trim()).filter(Boolean);
  for (const sentence of sentences) {
    const candidate = analyzeSentence(sentence, clean);
    if (!candidate) continue;
    if (found.some((item) => similarText(item.text, candidate.text))) continue;
    found.push(candidate);
  }
  return found.slice(0, 2);
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

  let sessions = ctx.get('sessions');
  let persistence = ctx.get('sessionPersistence');
  if (!sessions) ctx.inject(['sessions'], (sub) => { sessions = sub.sessions; });
  if (!persistence) ctx.inject(['sessionPersistence'], (sub) => { persistence = sub.sessionPersistence; });
  const log = (message, error) => {
    if (error) console.error('[l] ' + message, error);
    else console.log('[l] ' + message);
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
      try {
        const legacy = await readFile(await legacyStorePath(), 'utf8');
        profile = normalize(JSON.parse(legacy));
        log('migrated habit profile from the pre-rename store');
        scheduleSave();
      } catch {
        /* no legacy store: start empty */
      }
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
    let habit = profile.habits.find((item) => item.text.toLowerCase() === key)
      || profile.habits.find((item) => similarText(item.text, text));
    const now = Date.now();
    if (habit) {
      habit.kind = kind;
      habit.strength = Math.max(habit.strength, strength);
      habit.confidence = Math.max(Number.isFinite(habit.confidence) ? habit.confidence : 0.6, Number.isFinite(input.confidence) ? input.confidence : 0.6);
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
        confidence: Number.isFinite(input.confidence) ? Math.max(0, Math.min(1, input.confidence)) : 0.6,
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

  /* ---- pending suggestions --------------------------------------------- */

  /**
   * A medium-confidence sentence is not a habit yet. It waits in the panel;
   * nothing reaches the system prompt until the user accepts it.
   */
  function addSuggestion(candidate, sessionId, evidenceText) {
    if (!candidate || !candidate.text) return false;
    if (candidate.confidence < 0.3) return false;
    if (profile.habits.some((habit) => similarText(habit.text, candidate.text))) return false;
    if (profile.pending.some((item) => similarText(item.text, candidate.text))) return false;
    profile.pending.unshift({
      id: freshId(),
      text: candidate.text,
      kind: HABIT_KINDS.includes(candidate.kind) ? candidate.kind : 'other',
      confidence: Math.round(candidate.confidence * 100) / 100,
      reason: candidate.reason || '待确认',
      session: sessionId || '',
      evidence: clampText(evidenceText || candidate.evidence || '', 200),
      createdAt: Date.now(),
    });
    profile.pending = profile.pending.slice(0, MAX_PENDING);
    scheduleSave();
    return true;
  }

  function acceptSuggestion(id) {
    const index = profile.pending.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false, reason: 'not-found' };
    const [suggestion] = profile.pending.splice(index, 1);
    const result = upsertHabit(
      { text: suggestion.text, kind: suggestion.kind, strength: 5, confidence: Math.max(0.7, suggestion.confidence) },
      'user',
      suggestion.session,
      suggestion.evidence,
    );
    scheduleSave();
    return result;
  }

  function rejectSuggestion(id) {
    const before = profile.pending.length;
    profile.pending = profile.pending.filter((item) => item.id !== id);
    if (profile.pending.length !== before) scheduleSave();
    return { ok: profile.pending.length !== before };
  }

  function prune() {
    profile.pending = profile.pending.slice(0, MAX_PENDING);
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
    let learned = 0;
    for (const candidate of extractHabits(text)) {
      if (candidate.auto) {
        const result = upsertHabit(candidate, 'learned', sessionId, text);
        if (result.ok) learned += 1;
      } else {
        addSuggestion(candidate, sessionId, text);
      }
    }
    if (learned > 0) scheduleSave();
    return learned;
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
      'l: prompt section',
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
      'l: habit_list',
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
      'l: habit_remember',
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
      'l: habit_forget',
    );
  }

  /* ---- session observation --------------------------------------------- */

  if (sessions && typeof sessions.list === 'function') {
    for (const session of sessions.list()) {
      ctx.effect(() => watchSession(session), 'l: watch ' + String(session.id));
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
        if (sessions) ctx.effect(() => watchSession(session), 'l: watch ' + String(session.id));
      }),
    'l: session/created',
  );

  /* ---- small JSON API for the panel ------------------------------------ */

  // webServer is an async provider too: ctx.get() at apply time can return
  // undefined, and then the panel's /api/l route silently never exists.
  ctx.inject(['webServer'], (sub) => {
    const webServer = sub.webServer;
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
      pending: profile.pending,
      pendingCount: profile.pending.length,
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
            case 'pending-accept': {
              const id = typeof input.id === 'string' ? input.id : '';
              const result = acceptSuggestion(id);
              send(res, result.ok ? 200 : 404, result.ok ? { ...snapshot(), habit: result.habit } : { ok: false, error: 'not-found' });
              return;
            }
            case 'pending-reject': {
              const id = typeof input.id === 'string' ? input.id : '';
              const result = rejectSuggestion(id);
              send(res, result.ok ? 200 : 404, result.ok ? snapshot() : { ok: false, error: 'not-found' });
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
      'l: api route',
    );
  });

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
  }, 'l: boot');
}

export default { name, inject, apply };
