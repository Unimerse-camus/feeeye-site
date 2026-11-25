import fs from 'node:fs/promises';
import path from 'node:path';
import { buildOAuthHeader, credentialsFromEnv } from './x_connection_check.mjs';

const POST_URL = 'https://api.x.com/2/tweets';
const ME_URL = 'https://api.x.com/2/users/me';
const DEFAULT_QUEUE = 'ops/content/x-evergreen-queue.json';
const DEFAULT_LEDGER_DIR = '../receipt-ledger/x';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const opts = {
    queue: DEFAULT_QUEUE,
    ledgerDir: DEFAULT_LEDGER_DIR,
    execute: false,
    postId: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--queue' && argv[i + 1]) {
      opts.queue = argv[++i];
    } else if (arg === '--ledger-dir' && argv[i + 1]) {
      opts.ledgerDir = argv[++i];
    } else if (arg === '--execute') {
      opts.execute = true;
    } else if (arg === '--post-id' && argv[i + 1]) {
      opts.postId = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return opts;
}

const xLength = (text) =>
  23 +
  [...text.replace(/https:\/\/\S+/g, '')].reduce(
    (n, c) => n + (c.codePointAt(0) > 0x7ff ? 2 : 1),
    0,
  );

async function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (err) {
    if (err?.code === 'ENOENT' && fallback !== null) return fallback;
    throw err;
  }
}

function normalizeLandingPath(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return `${u.origin.toLowerCase()}${u.pathname.replace(/\/+$/, '') || '/'}`;
  } catch {
    return String(rawUrl || '').trim();
  }
}

function selectPost(posts, history, requestedPostId, nowMs) {
  if (requestedPostId) {
    const found = posts.find((p) => p.post_id === requestedPostId);
    if (!found) {
      throw new Error(`Post not found in queue: ${requestedPostId}`);
    }
    return found;
  }

  const lastPublishedById = new Map();
  for (const entry of history) {
    if (!entry?.post_id || !entry?.published_at) continue;
    const ts = Date.parse(entry.published_at);
    if (!Number.isFinite(ts)) continue;
    const prev = lastPublishedById.get(entry.post_id) ?? -Infinity;
    if (ts > prev) lastPublishedById.set(entry.post_id, ts);
  }

  const unpublished = posts.find((p) => !lastPublishedById.has(p.post_id));
  if (unpublished) return unpublished;

  const eligible = posts
    .map((p) => ({ post: p, lastTs: lastPublishedById.get(p.post_id) }))
    .filter((item) => nowMs - item.lastTs > COOLDOWN_MS)
    .sort((a, b) => a.lastTs - b.lastTs);

  if (eligible.length > 0) return eligible[0].post;
  throw new Error('No eligible evergreen post found (all published within 30 days)');
}

async function xRequest(credentials, method, url, body = null) {
  const headers = {
    Authorization: buildOAuthHeader(credentials, { method, url }),
  };
  const init = { method, headers };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`X API ${method} ${url} failed (${res.status}): ${text}`);
  }
  return data;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const queueData = await readJsonSafe(opts.queue);
  const posts = Array.isArray(queueData) ? queueData : queueData?.posts;
  if (!Array.isArray(posts) || posts.length === 0) {
    throw new Error(`Invalid or empty queue file: ${opts.queue}`);
  }

  const historyPath = path.join(opts.ledgerDir, 'evergreen-history.json');
  const historyData = await readJsonSafe(historyPath, []);
  const history = Array.isArray(historyData) ? historyData : historyData?.entries ?? [];

  const nowMs = Date.now();
  const selected = selectPost(posts, history, opts.postId, nowMs);

  if (
    typeof selected.text !== 'string' ||
    selected.text.length < 40 ||
    selected.text.length > 270 ||
    xLength(selected.text) > 280 ||
    /(^|[^A-Za-z0-9_])@[A-Za-z0-9_]+/.test(selected.text)
  ) {
    throw new Error(`Selected post failed validation: ${selected.post_id}`);
  }

  if (!opts.execute) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          post_id: selected.post_id,
          text: selected.text,
          char_count: selected.text.length,
          x_length: xLength(selected.text),
          url: selected.url,
        },
        null,
        2,
      ),
    );
    return;
  }

  const credentials = credentialsFromEnv();
  const meRes = await xRequest(credentials, 'GET', ME_URL);
  const account = meRes?.data;
  if (!account?.id || account.username?.toLowerCase() !== 'feeeyeofficial') {
    throw new Error(`Unexpected X account: ${account?.username || 'unknown'}`);
  }

  const recentUrl = `https://api.x.com/2/users/${account.id}/tweets?max_results=10&exclude=replies%2Cretweets&tweet.fields=created_at,entities`;
  const recentRes = await xRequest(credentials, 'GET', recentUrl);
  const recent = Array.isArray(recentRes?.data) ? recentRes.data : [];

  const sevenDaysAgo = nowMs - SEVEN_DAYS_MS;
  const recent7dCount = recent.filter(
    (post) =>
      typeof post.created_at === 'string' &&
      Number.isFinite(Date.parse(post.created_at)) &&
      Date.parse(post.created_at) >= sevenDaysAgo,
  ).length;
  if (recent7dCount >= 3) {
    throw new Error(`7-day publish limit reached (${recent7dCount} >= 3)`);
  }

  const targetLanding = normalizeLandingPath(selected.url);
  const duplicateLanding = recent.some((post) => {
    const urls = post?.entities?.urls || [];
    return urls.some((u) => {
      const candidate = u.unwound_url || u.expanded_url || u.url;
      return candidate && normalizeLandingPath(candidate) === targetLanding;
    });
  });
  if (duplicateLanding) {
    throw new Error(`Landing page already published recently: ${targetLanding}`);
  }

  const publishRes = await xRequest(credentials, 'POST', POST_URL, {
    text: selected.text,
    made_with_ai: true,
  });
  const tweetId = publishRes?.data?.id;
  if (!tweetId) {
    throw new Error(`Missing tweet_id in X API response: ${JSON.stringify(publishRes)}`);
  }

  const publishedAt = new Date().toISOString();
  const receipt = {
    post_id: selected.post_id,
    tweet_id: tweetId,
    published_at: publishedAt,
    url: selected.url,
  };

  await fs.mkdir(opts.ledgerDir, { recursive: true });
  const nextHistory = [...history, receipt];
  await fs.writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ mode: 'execute', ...receipt }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
