export function validateExchangeData(exchanges, compare, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const warnings = [];
  const ageDays = (date) => Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
  const isRate = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 0.1;

  for (const [slug, ex] of Object.entries(exchanges)) {
    if (slug !== ex.slug) errors.push(`${slug}: slug field is ${ex.slug || 'missing'}`);
    if (!ex.name || !ex.official_url || !ex.source) errors.push(`${slug}: missing name, official_url or source`);
    if (!/^https:\/\//.test(ex.source || '')) warnings.push(`${slug}: source is not a single HTTPS URL`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.last_updated || '')) errors.push(`${slug}: invalid last_updated`);
    else if (ageDays(ex.last_updated) > 7) warnings.push(`${slug}: volatile fee snapshot is ${ageDays(ex.last_updated)} days old`);

    for (const [market, rates] of [['spot', ex.spot], ['futures', ex.futures]]) {
      if (!rates || !isRate(rates.maker) || !isRate(rates.taker)) errors.push(`${slug}: invalid ${market} maker/taker rate`);
    }

    const withdrawal = ex.withdrawal_fees || {};
    if (!Object.keys(withdrawal).length) errors.push(`${slug}: no USDT withdrawal networks`);
    if (!Object.values(withdrawal).some((fee) => fee?.amount != null)) warnings.push(`${slug}: no publicly comparable USDT withdrawal fee; withdrawal winner will be suppressed`);
    for (const [network, fee] of Object.entries(withdrawal)) {
      if (fee?.model === 'unknown') {
        if (fee.amount != null) errors.push(`${slug}: unknown ${network} fee must use a null amount`);
      } else if (typeof fee?.amount !== 'number' || !Number.isFinite(fee.amount) || fee.amount < 0) errors.push(`${slug}: invalid ${network} withdrawal fee`);
      if (!['fixed_snapshot', 'dynamic_snapshot', 'unknown'].includes(fee?.model)) errors.push(`${slug}: invalid ${network} withdrawal model`);
      if (!(ex.supported_networks || []).includes(network)) warnings.push(`${slug}: ${network} has a withdrawal fee but is absent from supported_networks`);
    }
    if (ex.withdrawal_processing != null) {
      if (!isRate(ex.withdrawal_processing.rate)) errors.push(`${slug}: invalid withdrawal processing rate`);
      if (typeof ex.withdrawal_processing.cap !== 'number' || ex.withdrawal_processing.cap <= 0) errors.push(`${slug}: processing fee needs a positive cap`);
      if (ex.withdrawal_processing.model !== 'percentage_with_cap') errors.push(`${slug}: invalid processing fee model`);
    }
    for (const network of ex.supported_networks || []) if (withdrawal[network] == null) warnings.push(`${slug}: ${network} is supported but has no withdrawal fee`);

    if (!(ex.deposit_methods || []).length) warnings.push(`${slug}: no funding methods`);
    for (const method of ex.deposit_methods || []) {
      if (!method.m || typeof method.fee !== 'number' || method.fee < 0) errors.push(`${slug}: invalid funding method`);
      if (method.fee_max != null && method.fee_max < method.fee) errors.push(`${slug}: ${method.m} fee_max is below fee`);
    }

    const cd = compare[slug];
    if (!cd) { errors.push(`${slug}: missing EXCHANGE_COMPARE record`); continue; }
    for (const key of ['max_leverage', 'coins', 'trust']) if (cd[key] == null) errors.push(`${slug}: compare.${key} missing`);
    for (const key of ['kyc', 'licenses', 'reserve', 'incident']) if (!cd[key]?.en || !cd[key]?.zh) errors.push(`${slug}: compare.${key} needs en and zh`);
    for (const key of ['trading_fees', 'withdrawal_fees', 'kyc', 'regulation', 'reserves']) {
      const evidence = ex.evidence?.[key];
      if (!evidence?.url || !/^https:\/\//.test(evidence.url)) errors.push(`${slug}: evidence.${key} needs an HTTPS URL`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence?.checked_at || '')) errors.push(`${slug}: evidence.${key} needs checked_at`);
    }
  }

  for (const slug of Object.keys(compare)) if (!exchanges[slug]) errors.push(`${slug}: orphan EXCHANGE_COMPARE record`);
  const slugs = Object.keys(exchanges);
  let pairs = 0;
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      pairs++;
      const a = exchanges[slugs[i]].withdrawal_fees || {};
      const b = exchanges[slugs[j]].withdrawal_fees || {};
      if (!Object.keys(a).some((network) => b[network] != null)) errors.push(`${slugs[i]} vs ${slugs[j]}: no common USDT withdrawal network`);
    }
  }
  return { errors, warnings, exchanges: slugs.length, pairs, today };
}
