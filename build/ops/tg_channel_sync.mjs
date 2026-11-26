#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    queue: 'ops/content/x-evergreen-queue.json',
    postId: '',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--queue' && argv[i + 1]) {
      args.queue = argv[++i];
    } else if (flag.startsWith('--queue=')) {
      args.queue = flag.slice('--queue='.length);
    } else if (flag === '--post-id' && argv[i + 1]) {
      args.postId = argv[++i];
    } else if (flag.startsWith('--post-id=')) {
      args.postId = flag.slice('--post-id='.length);
    } else if (flag === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function truncateCaption(text, maxLen = 1024) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

async function main() {
  const { queue, postId, dryRun } = parseArgs(process.argv.slice(2));

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const channelId = (process.env.TELEGRAM_CHANNEL_ID || '').trim();

  if (!token || !channelId) {
    console.log(
      '[tg_channel_sync] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not configured.'
    );
    process.exit(0);
  }

  if (!postId) {
    console.error('[tg_channel_sync] Missing required --post-id argument.');
    process.exit(1);
  }

  const queuePath = path.resolve(process.cwd(), queue);
  if (!fs.existsSync(queuePath)) {
    console.error(`[tg_channel_sync] Queue file not found: ${queuePath}`);
    process.exit(1);
  }

  const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const posts = Array.isArray(queueData?.posts) ? queueData.posts : [];
  const post = posts.find((item) => item.post_id === postId);

  if (!post) {
    console.error(`[tg_channel_sync] Post ID "${postId}" not found in ${queuePath}`);
    process.exit(1);
  }

  const rawText = (post.text || '').trim();
  const targetUrl = (post.url || '').trim();
  const replyMarkup = targetUrl
    ? {
        inline_keyboard: [[{ text: 'Read Full Benchmark on FeeEye', url: targetUrl }]],
      }
    : undefined;

  const imagePath = post.image ? path.resolve(process.cwd(), post.image) : '';
  const hasImage = Boolean(imagePath && fs.existsSync(imagePath));

  if (dryRun) {
    console.log('[tg_channel_sync] Dry run summary:', {
      method: hasImage ? 'sendPhoto' : 'sendMessage',
      channelId,
      postId,
      imagePath: hasImage ? imagePath : null,
      text: hasImage ? truncateCaption(rawText) : rawText,
      replyMarkup,
    });
    process.exit(0);
  }

  if (hasImage) {
    const fileBuf = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuf], { type: getMimeType(imagePath) });
    const form = new FormData();
    form.append('chat_id', channelId);
    form.append('photo', blob, path.basename(imagePath));
    form.append('caption', truncateCaption(rawText));
    if (replyMarkup) {
      form.append('reply_markup', JSON.stringify(replyMarkup));
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) {
      throw new Error(`Telegram sendPhoto failed (${res.status}): ${JSON.stringify(result)}`);
    }
    console.log(`[tg_channel_sync] Sent photo post "${postId}" to ${channelId}.`);
    return;
  }

  const payload = {
    chat_id: channelId,
    text: rawText,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.ok) {
    throw new Error(`Telegram sendMessage failed (${res.status}): ${JSON.stringify(result)}`);
  }
  console.log(`[tg_channel_sync] Sent text post "${postId}" to ${channelId}.`);
}

main().catch((err) => {
  console.error('[tg_channel_sync] Error:', err);
  process.exit(1);
});
