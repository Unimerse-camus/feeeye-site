(function () {
  var EVENT_FIELDS = {
    coin_search_open: [],
    coin_search_result_open: ['symbol', 'position'],
    coin_search_no_result: ['query_length'],
    tool_use: ['tool'],
    learn_article_complete: ['article_id'],
    learn_quiz_open: ['article_id', 'question_number'],
    learn_tool_open: ['article_id', 'tool'],
    compare_advanced_open: ['pair'],
    exchange_outbound_open: ['exchange']
  };
  var EXCHANGE_HOSTS = {
    'binance.com': 'binance', 'www.binance.com': 'binance',
    'okx.com': 'okx', 'www.okx.com': 'okx',
    'kucoin.com': 'kucoin', 'www.kucoin.com': 'kucoin',
    'bybit.com': 'bybit', 'www.bybit.com': 'bybit',
    'bitget.com': 'bitget', 'www.bitget.com': 'bitget',
    'kraken.com': 'kraken', 'www.kraken.com': 'kraken',
    'coinbase.com': 'coinbase', 'www.coinbase.com': 'coinbase'
  };

  function cleanText(value, max) {
    return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, max || 48);
  }
  function pageType() {
    var p = location.pathname;
    if (/\/learn\/(?:index\.html)?$/.test(p) || /\/learn\/$/.test(p)) return 'learn_hub';
    if (/\/learn\//.test(p)) return 'learn_article';
    if (/\/tools\//.test(p)) return 'tool';
    if (/\/compare\//.test(p)) return 'compare';
    if (/\/exchanges\//.test(p)) return 'exchange';
    if (/\/where-to-buy\//.test(p)) return 'where_to_buy';
    if (/^\/(?:zh\/)?(?:index\.html)?$/.test(p)) return 'home';
    return 'other';
  }
  function pathSlug(prefix) {
    var match = location.pathname.match(new RegExp('/' + prefix + '/([^/]+?)(?:\\.html)?$'));
    return match ? cleanText(match[1]) : '';
  }
  function campaignProps() {
    var params = new URLSearchParams(location.search);
    var out = {};
    var source = cleanText(params.get('utm_source'));
    var medium = cleanText(params.get('utm_medium'));
    var campaign = cleanText(params.get('utm_campaign'));
    if (source) out.utm_source = source;
    if (medium) out.utm_medium = medium;
    if (campaign) out.utm_campaign = campaign;
    return out;
  }
  function track(name, properties) {
    if (!Object.prototype.hasOwnProperty.call(EVENT_FIELDS, name)) return false;
    var allowed = EVENT_FIELDS[name];
    var payload = {
      lang: (document.documentElement.lang || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en',
      page_type: pageType()
    };
    var campaign = campaignProps();
    Object.keys(campaign).forEach(function (key) { payload[key] = campaign[key]; });
    allowed.forEach(function (key) {
      var value = properties && properties[key];
      if (value == null || value === '') return;
      if (key === 'position' || key === 'query_length' || key === 'question_number') payload[key] = Math.max(0, Math.min(999, Number(value) || 0));
      else payload[key] = cleanText(value);
    });
    if (!window.zaraz || typeof window.zaraz.track !== 'function') return false;
    try {
      Promise.resolve(window.zaraz.track(name, payload)).catch(function () {});
      return true;
    } catch (_) {
      return false;
    }
  }
  window.FeeEyeAnalytics = Object.freeze({ track: track });

  document.addEventListener('DOMContentLoaded', function () {
    var search = document.getElementById('idxCoinInput');
    var searchOpened = false;
    if (search) search.addEventListener('focus', function () {
      if (searchOpened) return;
      searchOpened = true;
      track('coin_search_open');
    });
    var usedTool = false;
    if (/\/tools\//.test(location.pathname)) {
      document.addEventListener('change', function (event) {
        if (usedTool || event.target.closest('header,.foot')) return;
        if (!event.target.matches('input,select,textarea')) return;
        usedTool = true;
        track('tool_use', { tool: location.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
      });
      document.addEventListener('click', function (event) {
        if (usedTool || event.target.closest('header,.foot,a')) return;
        if (!event.target.closest('button,.filter,.tab')) return;
        usedTool = true;
        track('tool_use', { tool: location.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
      });
    }

    var articleId = pathSlug('learn');
    if (pageType() === 'learn_article') {
      document.querySelectorAll('.learn-quiz details').forEach(function (details, index) {
        details.addEventListener('toggle', function () {
          if (details.open) track('learn_quiz_open', { article_id: articleId, question_number: index + 1 });
        });
      });
      document.querySelectorAll('.learn-tool a').forEach(function (link) {
        link.addEventListener('click', function () {
          track('learn_tool_open', { article_id: articleId, tool: link.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
        });
      });
      var finish = document.querySelector('.learn-sources');
      if (finish && 'IntersectionObserver' in window) {
        var completed = false;
        var observer = new IntersectionObserver(function (entries) {
          if (completed || !entries.some(function (entry) { return entry.isIntersecting; })) return;
          completed = true;
          track('learn_article_complete', { article_id: articleId });
          observer.disconnect();
        }, { threshold: 0.25 });
        observer.observe(finish);
      }
    }

    document.querySelectorAll('.compare-advanced').forEach(function (details) {
      var sent = false;
      details.addEventListener('toggle', function () {
        if (!details.open || sent) return;
        sent = true;
        track('compare_advanced_open', { pair: pathSlug('compare') });
      });
    });

    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href]');
      if (!link) return;
      var url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      var exchange = EXCHANGE_HOSTS[url.hostname.toLowerCase()];
      if (exchange) track('exchange_outbound_open', { exchange: exchange });
    });
  });
})();
