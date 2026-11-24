/**
 * Minimal GitHub REST client for the vault.
 *
 * Only the endpoints needed to read a repository tree and write one atomic
 * commit are implemented. The token never leaves the Host process.
 */

const BASE = 'https://api.github.com';
const TIMEOUT_MS = 30_000;

export class GithubError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'GithubError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function friendlyMessage(status, data, headers) {
  const remaining = headers && headers.get ? headers.get('x-ratelimit-remaining') : null;
  const reset = headers && headers.get ? headers.get('x-ratelimit-reset') : null;
  if (status === 401) return 'GitHub 令牌无效或已过期，请重新登录。';
  if (status === 403 && remaining === '0') {
    const when = reset ? new Date(Number(reset) * 1000).toLocaleString('zh-CN', { hour12: false }) : '';
    return `GitHub API 额度已用尽${when ? `，将于 ${when} 重置` : ''}。`;
  }
  if (status === 403) return '令牌权限不足，或该操作被 GitHub 拒绝。';
  if (status === 404) return 'GitHub 上未找到该仓库、分支或路径。';
  if (status === 409) return '仓库尚无提交，或引用状态冲突。';
  if (status === 422) {
    const reason = data && data.message ? data.message : 'GitHub 拒绝了请求参数';
    return `${reason}。请检查仓库名、分支名与文件路径。`;
  }
  if (status === 429) return '请求过于频繁，请稍后再试。';
  if (status >= 500) return 'GitHub 服务暂时不可用，请稍后再试。';
  return data && data.message ? `GitHub 返回：${data.message}` : `GitHub 请求失败（HTTP ${status}）。`;
}

function errorCode(status, data) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status >= 500) return 'server';
  return data && data.message ? 'github' : 'http';
}

function encode(value) {
  return encodeURIComponent(String(value));
}

export class Github {
  constructor(token) {
    this.token = token;
  }

  async call(method, apiPath, { body, allowNotFound = false } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(BASE + apiPath, {
        method,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
          'user-agent': 'dsh-github-vault',
          'x-github-api-version': '2022-11-28',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = error && error.name === 'AbortError';
      throw new GithubError(
        0,
        aborted ? 'timeout' : 'network',
        aborted ? 'GitHub 请求超时。' : '无法连接 GitHub，请检查网络。',
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!response.ok) {
      if (allowNotFound && (response.status === 404 || response.status === 409)) return null;
      throw new GithubError(
        response.status,
        errorCode(response.status, data),
        friendlyMessage(response.status, data, response.headers),
        {
          githubMessage: data && typeof data.message === 'string' ? data.message : undefined,
          documentationUrl: data && typeof data.documentation_url === 'string' ? data.documentation_url : undefined,
        },
      );
    }
    return { data, headers: response.headers };
  }

  async getUser() {
    const { data, headers } = await this.call('GET', '/user');
    return {
      login: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
      scopes: headers.get('x-oauth-scopes') || '',
      type: data.type,
    };
  }

  async getRepo(owner, repo) {
    const result = await this.call('GET', `/repos/${encode(owner)}/${encode(repo)}`, { allowNotFound: true });
    return result ? result.data : null;
  }

  async createRepo(owner, name, { private: isPrivate, description, login }) {
    const org = owner && login && owner.toLowerCase() !== login.toLowerCase();
    const path = org ? `/orgs/${encode(owner)}/repos` : '/user/repos';
    const { data } = await this.call('POST', path, {
      body: {
        name,
        description: description || '',
        private: Boolean(isPrivate),
        has_issues: true,
        has_wiki: false,
        auto_init: false,
      },
    });
    return data;
  }

  async getRef(owner, repo, branch) {
    const result = await this.call(
      'GET',
      `/repos/${encode(owner)}/${encode(repo)}/git/ref/heads/${encode(branch)}`,
      { allowNotFound: true },
    );
    return result ? result.data : null;
  }

  async getCommit(owner, repo, sha) {
    const { data } = await this.call('GET', `/repos/${encode(owner)}/${encode(repo)}/git/commits/${encode(sha)}`);
    return data;
  }

  async getTree(owner, repo, ref) {
    const result = await this.call(
      'GET',
      `/repos/${encode(owner)}/${encode(repo)}/git/trees/${encode(ref)}?recursive=1`,
      { allowNotFound: true },
    );
    return result ? result.data : null;
  }

  async createBlob(owner, repo, content) {
    const { data } = await this.call('POST', `/repos/${encode(owner)}/${encode(repo)}/git/blobs`, {
      body: { content, encoding: 'base64' },
    });
    return data.sha;
  }

  async createTree(owner, repo, tree, baseTree) {
    const body = { tree };
    if (baseTree) body.base_tree = baseTree;
    const { data } = await this.call('POST', `/repos/${encode(owner)}/${encode(repo)}/git/trees`, { body });
    return data.sha;
  }

  async createCommit(owner, repo, message, tree, parents) {
    const { data } = await this.call('POST', `/repos/${encode(owner)}/${encode(repo)}/git/commits`, {
      body: { message, tree, parents },
    });
    return data;
  }

  async updateRef(owner, repo, branch, sha) {
    const { data } = await this.call(
      'PATCH',
      `/repos/${encode(owner)}/${encode(repo)}/git/refs/heads/${encode(branch)}`,
      { body: { sha, force: false } },
    );
    return data;
  }

  async createRef(owner, repo, branch, sha) {
    const { data } = await this.call('POST', `/repos/${encode(owner)}/${encode(repo)}/git/refs`, {
      body: { ref: `refs/heads/${branch}`, sha },
    });
    return data;
  }

  async patchRepo(owner, repo, body) {
    const { data } = await this.call('PATCH', `/repos/${encode(owner)}/${encode(repo)}`, { body });
    return data;
  }

  async setTopics(owner, repo, names) {
    let existing = [];
    try {
      const { data } = await this.call('GET', `/repos/${encode(owner)}/${encode(repo)}/topics`);
      if (data && Array.isArray(data.names)) existing = data.names;
    } catch {
      /* topics are optional */
    }
    const merged = [...new Set([...existing, ...names])].slice(0, 20);
    await this.call('PUT', `/repos/${encode(owner)}/${encode(repo)}/topics`, { body: { names: merged } });
  }
}

export function isGithubError(error) {
  return error instanceof GithubError;
}
