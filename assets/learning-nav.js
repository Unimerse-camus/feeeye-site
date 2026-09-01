(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var oldLink = Array.prototype.find.call(nav.children, function (node) {
    return node.tagName === 'A' && /\/tools\/glossary(?:\.zh)?\.html$/.test(node.getAttribute('href') || '');
  });
  if (!oldLink) return;

  var zh = (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
  var prefix = zh ? '/zh/' : '/';
  var active = /\/learn\//.test(location.pathname) || /\/glossary(?:\.zh)?\.html$/.test(location.pathname);
  var svg = {
    route: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>',
    shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    receipt: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/></svg>',
    wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>'
  };
  var items = zh ? [
    ['learn/index.html', svg.route, '新手路线'],
    ['learn/avoid-crypto-scams.html', svg.shield, '安全与防骗'],
    ['learn/crypto-total-cost.html', svg.receipt, '买币与费用'],
    ['learn/safe-crypto-transfer.html', svg.wallet, '钱包与转账'],
    ['research/1000-usdt-spot-cost.html', svg.receipt, '1000 USDT 费率对比'],
    ['tools/glossary.zh.html', svg.route, '术语表']
  ] : [
    ['learn/index.html', svg.route, 'Beginner Path'],
    ['learn/avoid-crypto-scams.html', svg.shield, 'Safety & Scams'],
    ['learn/crypto-total-cost.html', svg.receipt, 'Buying & Costs'],
    ['learn/safe-crypto-transfer.html', svg.wallet, 'Wallets & Transfers'],
    ['research/1000-usdt-spot-cost.html', svg.receipt, '$1,000 Fee Benchmark'],
    ['tools/glossary.html', svg.route, 'Glossary']
  ];
  var chev = '<svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var item = document.createElement('div');
  item.className = 'nav-item';
  item.innerHTML = '<button type="button" class="nav-btn' + (active ? ' active' : '') + '" aria-haspopup="true" aria-expanded="false">' + (zh ? '学习' : 'Learn') + ' ' + chev + '</button><div class="dropdown">' + items.map(function (entry) {
    return '<a href="' + prefix + entry[0] + '">' + entry[1] + '<span>' + entry[2] + '</span></a>';
  }).join('') + '</div>';
  oldLink.replaceWith(item);

  var button = item.querySelector('.nav-btn');
  function setOpen(open) {
    item.classList.toggle('open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  button.addEventListener('click', function (event) {
    event.stopPropagation();
    var willOpen = !item.classList.contains('open');
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item.open'), function (node) { node.classList.remove('open'); });
    setOpen(willOpen);
  });
  document.addEventListener('click', function () { setOpen(false); });
})();
