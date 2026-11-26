const SITE_URL = 'https://feeeye.com';
const DISCLAIMER = '\n\n⚠️ <i>Not financial advice. Always verify live fees and contract risks before transacting.</i>';

const USDT_FEES = [
  { exchange: 'Binance', sol: 0.8, arb: 0.1, base: 0.1, trc20: 1.0, erc20: 4.0 },
  { exchange: 'Bybit', sol: 1.0, arb: 0.3, base: 0.3, trc20: 1.3, erc20: 4.5 },
  { exchange: 'OKX', sol: 0.8, arb: 0.1, base: 0.1, trc20: 1.0, erc20: 3.5 },
  { exchange: 'Bitget', sol: 0.8, arb: 0.1, base: 0.1, trc20: 1.0, erc20: 4.0 },
  { exchange: 'KuCoin', sol: 1.0, arb: 0.5, base: 0.5, trc20: 1.5, erc20: 5.0 },
  { exchange: 'Kraken', sol: 1.0, arb: 1.0, base: null, trc20: 2.0, erc20: 5.0 },
  { exchange: 'Coinbase', sol: 0.5, arb: 0.1, base: 0.0, trc20: null, erc20: 3.5 },
];

const SPOT_TAKER_FEES = [
  { exchange: 'Binance', rate: 0.001, label: '0.10%' },
  { exchange: 'Bybit', rate: 0.001, label: '0.10%' },
  { exchange: 'OKX', rate: 0.001, label: '0.10%' },
  { exchange: 'Bitget', rate: 0.001, label: '0.10%' },
  { exchange: 'KuCoin', rate: 0.001, label: '0.10%' },
  { exchange: 'Kraken', rate: 0.006, label: '0.60%' },
  { exchange: 'Coinbase', rate: 0.008, label: '0.80%' },
];

const EVM_CHAINS = {
  eth: { id: '1', name: 'Ethereum' },
  ethereum: { id: '1', name: 'Ethereum' },
  bsc: { id: '56', name: 'BNB Chain' },
  bnb: { id: '56', name: 'BNB Chain' },
  base: { id: '8453', name: 'Base' },
  arb: { id: '42161', name: 'Arbitrum' },
  arbitrum: { id: '42161', name: 'Arbitrum' },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(token, chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
  return res.json();
}

function handleStartOrHelp() {
  const text = [
    '<b>FeeEye Crypto Fee & Risk Bot</b>',
    'Instant exchange fee comparison, token security checks, and market sentiment.',
    '',
    '<b>Commands:</b>',
    '• <code>/usdt [network]</code> — Compare USDT withdrawal fees (sol, arb, base, trc20, erc20)',
    '• <code>/cost [amount]</code> — Calculate spot taker fees across 7 exchanges (default: 1000 USDT)',
    '• <code>/check &lt;contract&gt;</code> — Scan EVM (<code>0x...</code>, optional <code>bsc</code>/<code>base</code>/<code>arb</code>) or Solana tokens',
    '• <code>/fear</code> — Live Crypto Fear & Greed Index',
    '• <code>/help</code> — Show this menu',
    '',
    `More tools: <a href="${SITE_URL}">${SITE_URL}</a>`,
  ].join('\n') + DISCLAIMER;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: 'FeeEye Home', url: SITE_URL },
        { text: 'USDT Withdrawal Fees', url: `${SITE_URL}/tools/usdt-withdrawal-fees` },
      ],
      [
        { text: 'Total Cost Calculator', url: `${SITE_URL}/tools/total-cost-calculator` },
        { text: 'Token Security Checker', url: `${SITE_URL}/tools/token-security-checker` },
      ],
    ],
  };

  return { text, replyMarkup };
}

function handleUsdt(arg) {
  const rawNet = (arg || '').trim().toLowerCase();
  const netMap = {
    sol: 'sol',
    solana: 'sol',
    arb: 'arb',
    arbitrum: 'arb',
    base: 'base',
    trc: 'trc20',
    trc20: 'trc20',
    tron: 'trc20',
    erc: 'erc20',
    erc20: 'erc20',
    eth: 'erc20',
  };
  const sortKey = netMap[rawNet] || null;
  const rows = [...USDT_FEES];

  if (sortKey) {
    rows.sort((a, b) => {
      const va = a[sortKey] === null ? Infinity : a[sortKey];
      const vb = b[sortKey] === null ? Infinity : b[sortKey];
      return va - vb;
    });
  }

  const fmt = (v) => (v === null ? '—' : `$${v.toFixed(2)}`);
  const header = sortKey
    ? `<b>USDT Withdrawal Fees (Sorted by ${sortKey.toUpperCase()})</b>`
    : '<b>USDT Withdrawal Fees Across 7 Exchanges</b>';

  const lines = rows.map((r) => {
    if (sortKey) {
      return `• <b>${r.exchange}</b>: ${fmt(r[sortKey])} (${sortKey.toUpperCase()})`;
    }
    return `• <b>${r.exchange}</b>: SOL ${fmt(r.sol)} | ARB ${fmt(r.arb)} | Base ${fmt(r.base)} | TRC20 ${fmt(r.trc20)} | ERC20 ${fmt(r.erc20)}`;
  });

  const text = [
    header,
    ...lines,
    '',
    'Tip: Use <code>/usdt sol</code>, <code>/usdt arb</code>, <code>/usdt base</code>, <code>/usdt trc20</code>, or <code>/usdt erc20</code> to sort.',
    `Live matrix: <a href="${SITE_URL}/tools/usdt-withdrawal-fees">${SITE_URL}/tools/usdt-withdrawal-fees</a>`,
  ].join('\n') + DISCLAIMER;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'Open USDT Withdrawal Checker', url: `${SITE_URL}/tools/usdt-withdrawal-fees` }],
    ],
  };

  return { text, replyMarkup };
}

function handleCost(arg) {
  const parsed = arg ? Number(arg.replace(/[,$]/g, '').trim()) : 1000;
  const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;

  const lines = SPOT_TAKER_FEES.map((item) => {
    const fee = amount * item.rate;
    return `• <b>${item.exchange}</b> (${item.label}): <b>$${fee.toFixed(2)}</b>`;
  });

  const text = [
    `<b>Spot Taker Fee Estimate for $${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</b>`,
    ...lines,
    '',
    'Base tiers shown: 0.10% / 0.60% / 0.80% (before VIP or maker discounts).',
    `Full calculator: <a href="${SITE_URL}/tools/total-cost-calculator">${SITE_URL}/tools/total-cost-calculator</a>`,
  ].join('\n') + DISCLAIMER;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'Open Total Cost Calculator', url: `${SITE_URL}/tools/total-cost-calculator` }],
    ],
  };

  return { text, replyMarkup };
}

async function handleCheck(args) {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return {
      text: [
        '<b>Token Security Checker</b>',
        'Usage:',
        '• <code>/check 0x...</code> (Ethereum default)',
        '• <code>/check bsc 0x...</code> | <code>/check base 0x...</code> | <code>/check arb 0x...</code>',
        '• <code>/check &lt;Solana_Mint_Address&gt;</code>',
        '',
        `Web tool: <a href="${SITE_URL}/tools/token-security-checker">${SITE_URL}/tools/token-security-checker</a>`,
      ].join('\n') + DISCLAIMER,
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'Open Token Security Checker', url: `${SITE_URL}/tools/token-security-checker` }],
        ],
      },
    };
  }

  let chainKey = 'eth';
  let address = tokens[0];
  if (tokens.length >= 2 && EVM_CHAINS[tokens[0].toLowerCase()]) {
    chainKey = tokens[0].toLowerCase();
    address = tokens[1];
  }

  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address);
  const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'Deep Scan on FeeEye', url: `${SITE_URL}/tools/token-security-checker` }],
    ],
  };

  if (isEvm) {
    const chain = EVM_CHAINS[chainKey] || EVM_CHAINS.eth;
    const url = `https://api.gopluslabs.io/api/v1/token_security/${chain.id}?contract_addresses=${address.toLowerCase()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GoPlus HTTP ${res.status}`);
    const data = await res.json();
    const info = data?.result?.[address.toLowerCase()];
    if (!info) {
      return {
        text: `No GoPlus security record found for <code>${escapeHtml(address)}</code> on <b>${chain.name}</b>.` + DISCLAIMER,
        replyMarkup,
      };
    }

    const flag = (v) => (v === '1' ? '🔴 YES' : v === '0' ? '🟢 NO' : '⚪ Unknown');
    const pct = (v) => (v !== undefined && v !== '' ? `${(Number(v) * 100).toFixed(2)}%` : 'N/A');

    const text = [
      `<b>EVM Token Security (${chain.name})</b>`,
      `Token: <b>${escapeHtml(info.token_name || 'Unknown')}</b> (${escapeHtml(info.token_symbol || '?')})`,
      `Contract: <code>${escapeHtml(address)}</code>`,
      '',
      `• Honeypot: ${flag(info.is_honeypot)}`,
      `• Buy / Sell Tax: <b>${pct(info.buy_tax)}</b> / <b>${pct(info.sell_tax)}</b>`,
      `• Mintable: ${flag(info.is_mintable)}`,
      `• Blacklist / Freeze: ${flag(info.is_blacklisted)}`,
      '',
      `Web scanner: <a href="${SITE_URL}/tools/token-security-checker">${SITE_URL}/tools/token-security-checker</a>`,
    ].join('\n') + DISCLAIMER;

    return { text, replyMarkup };
  }

  if (isSolana) {
    const url = `https://api.rugcheck.xyz/v1/tokens/${address}/report/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`RugCheck HTTP ${res.status}`);
    const info = await res.json();

    const risks = Array.isArray(info.risks) ? info.risks : [];
    const riskNames = risks.map((r) => `${r.name || 'Risk'} (${r.level || 'info'})`);
    const hasMint = risks.some((r) => /mint/i.test(r.name || ''));
    const hasFreeze = risks.some((r) => /freeze/i.test(r.name || ''));

    const text = [
      '<b>Solana Token Security (RugCheck)</b>',
      `Mint: <code>${escapeHtml(address)}</code>`,
      `Risk Score: <b>${info.score ?? 'N/A'}</b>`,
      '',
      `• Mint Authority Risk: ${hasMint ? '🔴 Detected' : '🟢 Clear / Not Flagged'}`,
      `• Freeze Authority Risk: ${hasFreeze ? '🔴 Detected' : '🟢 Clear / Not Flagged'}`,
      `• Flags (${risks.length}): ${riskNames.length ? escapeHtml(riskNames.slice(0, 5).join(', ')) : 'None'}`,
      '',
      `Web scanner: <a href="${SITE_URL}/tools/token-security-checker">${SITE_URL}/tools/token-security-checker</a>`,
    ].join('\n') + DISCLAIMER;

    return { text, replyMarkup };
  }

  return {
    text: 'Invalid contract address. Provide an EVM <code>0x...</code> address or a valid Solana mint address.' + DISCLAIMER,
    replyMarkup,
  };
}

async function handleFear() {
  const res = await fetch('https://api.alternative.me/fng/?limit=2');
  if (!res.ok) throw new Error(`Alternative.me HTTP ${res.status}`);
  const payload = await res.json();
  const today = payload?.data?.[0];
  const yesterday = payload?.data?.[1];
  if (!today) throw new Error('Missing Fear & Greed data');

  const val = Number(today.value);
  const emoji = val <= 25 ? '😱' : val <= 45 ? '😨' : val <= 55 ? '😐' : val <= 75 ? '😏' : '🤑';
  const prevLine = yesterday ? `Yesterday: <b>${yesterday.value}</b> (${escapeHtml(yesterday.value_classification)})` : '';

  const text = [
    `${emoji} <b>Crypto Fear &amp; Greed Index</b>`,
    `Today: <b>${escapeHtml(today.value)} / 100</b> — <b>${escapeHtml(today.value_classification)}</b>`,
    prevLine,
    '',
    `Compare trading fees: <a href="${SITE_URL}">${SITE_URL}</a>`,
  ]
    .filter(Boolean)
    .join('\n') + DISCLAIMER;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'Explore FeeEye Tools', url: SITE_URL }],
    ],
  };

  return { text, replyMarkup };
}

export async function onRequestPost(context) {
  const token = context?.env?.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return jsonResponse({ ok: true, skipped: 'missing_token' });
  }

  const secret = context?.env?.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = context.request.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== secret) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
    }
  }

  try {
    const update = await context.request.json();
    const msg = update?.message || update?.edited_message;
    const chatId = msg?.chat?.id;
    const rawText = (msg?.text || '').trim();

    if (!chatId || !rawText.startsWith('/')) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const [rawCmd, ...rest] = rawText.split(/\s+/);
    const cmd = rawCmd.split('@')[0].toLowerCase();
    const argStr = rest.join(' ');

    let response;
    if (cmd === '/start' || cmd === '/help') {
      response = handleStartOrHelp();
    } else if (cmd === '/usdt') {
      response = handleUsdt(argStr);
    } else if (cmd === '/cost') {
      response = handleCost(argStr);
    } else if (cmd === '/check') {
      response = await handleCheck(argStr);
    } else if (cmd === '/fear') {
      response = await handleFear();
    } else {
      response = handleStartOrHelp();
    }

    await sendTelegramMessage(token, chatId, response.text, response.replyMarkup);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('tg-webhook error:', err);
    return jsonResponse({ ok: true, error: err?.message || 'internal_error' });
  }
}
