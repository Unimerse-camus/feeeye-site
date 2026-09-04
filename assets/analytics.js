(function () {
  var EVENT_FIELDS = {
    coin_search_open: [],
    coin_search_result_open: ['symbol', 'position'],
    coin_search_no_result: ['query_length'],
    tool_interaction: ['tool'],
    article_end_view: ['article_id'],
    learn_quiz_open: ['article_id', 'question_number'],
    learn_tool_open: ['article_id', 'tool'],
    content_feedback_helpful: [],
    content_feedback_unclear: [],
    content_feedback_missing_step: [],
    content_feedback_outdated: [],
    content_feedback_broken_link: [],
    content_feedback_other: [],
    research_tool_open: ['benchmark_id', 'tool'],
    compare_advanced_open: ['pair'],
    exchange_outbound_open: ['exchange']
  };
  var FEEDBACK_ARTICLES = ['before-you-start','avoid-crypto-scams','secure-crypto-account','choose-crypto-exchange','first-spot-trade','crypto-total-cost','safe-crypto-transfer','custody-vs-self-custody'];
  var FEEDBACK_REASONS = ['none','unclear','missing_step','outdated','broken_link','other'];
  var FEEDBACK_EVENTS = {none:'content_feedback_helpful',unclear:'content_feedback_unclear',missing_step:'content_feedback_missing_step',outdated:'content_feedback_outdated',broken_link:'content_feedback_broken_link',other:'content_feedback_other'};
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
    if (/\/research\//.test(p)) return 'research';
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
    var channels = { x: 'social', youtube: 'video', reddit: 'community', telegram: 'social', newsletter: 'email' };
    var campaigns = ['1000-usdt-fee', 'safe-transfer', 'usdt-cost-2026-09', 'feeeye-launch'];
    // Reject unknown/raw identifiers instead of turning arbitrary personal text into valid-looking tags.
    if (params.getAll('utm_source').length === 1 && params.getAll('utm_medium').length === 1 &&
        params.getAll('utm_campaign').length === 1 &&
        params.get('utm_source') === source && params.get('utm_medium') === medium &&
        params.get('utm_campaign') === campaign &&
        Object.prototype.hasOwnProperty.call(channels, source) && channels[source] === medium &&
        campaigns.indexOf(campaign) !== -1) {
      out.utm_source = source;
      out.utm_medium = medium;
      out.utm_campaign = campaign;
    }
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
        track('tool_interaction', { tool: location.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
      });
      document.addEventListener('click', function (event) {
        if (usedTool || event.target.closest('header,.foot,a')) return;
        if (!event.target.closest('button,.filter,.tab')) return;
        usedTool = true;
        track('tool_interaction', { tool: location.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
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
          track('article_end_view', { article_id: articleId });
          observer.disconnect();
        }, { threshold: 0.25 });
        observer.observe(finish);
      }
      var feedback = document.querySelector('[data-content-feedback]');
      if (feedback) {
        var feedbackKey = 'feeeye_feedback_v1_' + ((document.documentElement.lang || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en') + '_' + articleId;
        var feedbackDone = false;
        try { feedbackDone = sessionStorage.getItem(feedbackKey) === '1'; } catch (_) {}
        var prompt = feedback.querySelector('[data-feedback-prompt]');
        var reasons = feedback.querySelector('[data-feedback-reasons]');
        var thanks = feedback.querySelector('[data-feedback-thanks]');
        var unavailable = feedback.querySelector('[data-feedback-unavailable]');
        function finishFeedback(sentiment, reason) {
          if (feedbackDone) return;
          var eventName = FEEDBACK_ARTICLES.indexOf(articleId) !== -1 && ((sentiment === 'helpful' && reason === 'none') || (sentiment === 'needs_improvement' && reason !== 'none')) ? FEEDBACK_EVENTS[reason] : null;
          if (!eventName || !track(eventName)) {
            if (reasons) reasons.hidden = true;
            if (unavailable) unavailable.hidden = false;
            return;
          }
          feedbackDone = true;
          try { sessionStorage.setItem(feedbackKey, '1'); } catch (_) {}
          if (prompt) prompt.hidden = true;
          if (reasons) reasons.hidden = true;
          if (thanks) thanks.hidden = false;
        }
        if (feedbackDone) { if (prompt) prompt.hidden = true; if (thanks) thanks.hidden = false; }
        feedback.addEventListener('click', function (event) {
          var button = event.target.closest && event.target.closest('button[data-feedback-value]');
          if (!button || feedbackDone) return;
          var value = button.getAttribute('data-feedback-value');
          if (value === 'helpful') finishFeedback('helpful', 'none');
          else if (value === 'needs_improvement') { if (reasons) reasons.hidden = false; }
          else if (FEEDBACK_REASONS.indexOf(value) !== -1 && value !== 'none') finishFeedback('needs_improvement', value);
        });
      }
    }

    if (pageType() === 'research') {
      var benchmarkId = pathSlug('research');
      document.querySelectorAll('.benchmark-actions a').forEach(function (link) {
        if (!/\/tools\//.test(link.pathname)) return;
        link.addEventListener('click', function () {
          track('research_tool_open', { benchmark_id: benchmarkId, tool: link.pathname.split('/').pop().replace(/(?:\.zh)?\.html$/, '') });
        });
      });
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
