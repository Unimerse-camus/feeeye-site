export const LEARNING_REVIEWED_AT = '2026-08-25';

export const LEARNING_SOURCES = {
  oecd: { label: 'OECD · Crypto-asset financial literacy', url: 'https://www.oecd.org/en/publications/improving-the-digital-financial-literacy-of-crypto-asset-users_19cfecad-en/full-report.html' },
  cftcRisk: { label: 'CFTC · Risks of virtual currency trading', url: 'https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/understand_risks_of_virtual_currency.html' },
  cftcFraud: { label: 'CFTC · Digital asset frauds', url: 'https://www.cftc.gov/LearnAndProtect/digitalassetfrauds' },
  investorScams: { label: 'Investor.gov · Crypto scams', url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-scams' },
  investorAccounts: { label: 'Investor.gov · Account security', url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated-2' },
  bitcoinBasics: { label: 'Bitcoin.org · What you need to know', url: 'https://bitcoin.org/en/you-need-to-know' },
  ethereumSecurity: { label: 'Ethereum.org · Security and scam prevention', url: 'https://ethereum.org/security/' },
  ethereumGuides: { label: 'Ethereum.org · Practical guides', url: 'https://ethereum.org/guides' }
};

const A = (slug, category, risk, sources, zh, en) => ({ slug, category, risk, sources, zh, en });

export const LEARNING_ARTICLES = [
  A('before-you-start', 'start', 'caution', ['oecd', 'cftcRisk'], {
    title: '开始 Crypto 前的 10 项检查', summary: '先判断资金、地区和风险条件是否允许你继续，而不是先找“买什么”。', readTime: '6 分钟',
    outcomes: ['区分学习、支付、投资和短期投机', '设定不会影响生活的损失上限', '知道哪些条件不满足时应暂停'],
    sections: [
      { title: '先回答三个问题', paragraphs: ['你为什么接触 Crypto：跨境支付、长期研究、短期交易，还是因为朋友说会涨？目标不同，适用工具和风险完全不同。'], bullets: ['如果资金来自借款、信用卡、应急金或近期必需支出，先暂停。', '如果无法解释资产如何产生价值、如何退出和最坏会损失什么，先不行动。', '如果平台在你的地区不可用或身份验证规则不清楚，不要尝试绕过限制。'] },
      { title: '把“可能全部损失”变成具体边界', paragraphs: ['不要只说“我能承受风险”。写下金额、时间和退出条件，并把诈骗、平台停提、稳定币脱锚和转账错误纳入最坏情景。'], bullets: ['单独保留生活应急资金。', '第一次只学习现货和小额操作，不碰杠杆。', '提前决定何时停止追加资金。'] },
      { title: '10 项开始前检查', checklist: ['资金不是借款、信用卡或应急金', '已核对所在地区法律与平台可用性', '理解价格可能大幅波动或归零', '能说清买入资产与退出方式', '已开启独立邮箱、强密码和 2FA', '知道客服永远不需要助记词或私钥', '会核对手续费、价差、提币费和 Gas', '准备先做小额现货而非合约', '每个关键事实都有官方来源', '没有因倒计时、群聊或他人收益截图而赶时间'] }
    ],
    quiz: [['哪类资金不应投入？', '借款、应急金或近期必需支出。'], ['为什么“只投一点”仍需核对地区？', '因为账户限制、身份验证和出金问题与金额大小无关。'], ['第一阶段为什么不含杠杆？', '杠杆会放大亏损并引入强平风险。']],
    tool: { label: '按地区和需求比较交易所', path: 'tools/exchange-comparator.html' }
  }, {
    title: '10 Checks Before You Start With Crypto', summary: 'Check your money, jurisdiction, and risk conditions before asking what to buy.', readTime: '6 min',
    outcomes: ['Separate learning, payments, investing, and speculation', 'Set a loss limit that does not affect daily life', 'Know when missing conditions mean stop'],
    sections: [
      { title: 'Answer three questions first', paragraphs: ['Why are you exploring crypto: payments, long-term research, short-term trading, or a tip from someone else? Different goals require different tools and risk controls.'], bullets: ['Pause if the money comes from debt, credit, emergency savings, or near-term expenses.', 'Do not act if you cannot explain the asset, exit route, and worst-case loss.', 'Do not bypass jurisdiction or identity-verification restrictions.'] },
      { title: 'Turn “I can lose it” into a boundary', paragraphs: ['Write down an amount, time horizon, and stop condition. Include scams, withdrawal freezes, stablecoin depegs, and transfer mistakes in the worst case.'], bullets: ['Keep emergency savings separate.', 'Learn spot and small-value operations before leverage.', 'Decide in advance when you will stop adding funds.'] },
      { title: 'Pre-start checklist', checklist: ['No debt, credit, emergency savings, or near-term expense money', 'Jurisdiction and platform availability verified', 'Prepared for severe decline or total loss', 'Asset and exit method understood', 'Separate email, strong password, and 2FA ready', 'Know that support never needs a seed phrase or private key', 'Can identify fees, spread, withdrawal charges, and gas', 'Starting with small spot activity, not derivatives', 'Critical facts have primary sources', 'No urgency from countdowns, chats, or profit screenshots'] }
    ],
    quiz: [['Which money should stay out?', 'Debt, emergency savings, and money needed soon.'], ['Why verify jurisdiction for a small amount?', 'Account, verification, and withdrawal restrictions do not depend on amount.'], ['Why exclude leverage at first?', 'It magnifies losses and introduces liquidation.']],
    tool: { label: 'Compare exchanges by jurisdiction and need', path: 'tools/exchange-comparator.html' }
  }),

  A('avoid-crypto-scams', 'security', 'high', ['cftcFraud', 'investorScams', 'ethereumSecurity'], {
    title: '5 类常见 Crypto 骗局与红旗', summary: '识别假平台、假客服、关系诱导、拉高出货和二次追回骗局。', readTime: '7 分钟',
    outcomes: ['识别高收益和假提现页面', '知道收到陌生私信后该做什么', '被骗后先停止追加损失'],
    sections: [
      { title: '五类常见套路', bullets: ['假投资平台：显示虚假盈利，提现时索要“税费”或“解冻费”。', '关系诱导：陌生人长期建立信任，再指导买币并转入指定地址。', '假客服与钓鱼：仿冒域名、邮件、二维码或远程协助，索要凭据。', '拉高出货：群聊统一喊单，在低流动性代币中让后来者接盘。', '二次追回：声称能追回损失，先收服务费或要求私钥。'] },
      { title: '看到这些信号立即停下', warning: '保证收益、催促保密、要求离开原平台聊天、索要助记词、用更多钱才能提现，任何一项都足以暂停。', bullets: ['不要用消息里的链接登录；自己输入已核实的官方域名。', '不要因为对方允许过一次小额提现就相信平台。', '不要向“调查员”“黑客”或“律师”发送恢复短语。'] },
      { title: '怀疑被骗后的动作', checklist: ['停止转账和与对方争辩', '保存网址、地址、交易哈希和聊天记录', '从官方渠道联系所用平台', '修改相关密码并撤销可疑授权', '向所在地执法或监管渠道报告', '拒绝任何先收费的追回服务'] }
    ],
    quiz: [['提现前要求再付税费意味着什么？', '这是典型预付费诈骗红旗，应停止付款。'], ['客服可以索要助记词吗？', '不可以，获得助记词的人可能控制全部相关资产。'], ['小额提现成功能证明平台真实吗？', '不能，诈骗者常用它建立信任。']],
    tool: { label: '检查代币合约风险标记', path: 'tools/token-security-checker.html' }
  }, {
    title: 'Five Common Crypto Scams and Their Red Flags', summary: 'Recognize fake platforms, support impersonation, relationship scams, pump-and-dumps, and recovery fraud.', readTime: '7 min',
    outcomes: ['Identify fake returns and withdrawal screens', 'Know what to do after an unsolicited message', 'Stop further loss after suspected fraud'],
    sections: [
      { title: 'Five common patterns', bullets: ['Fake investment platform: shows invented profits and demands tax or unlock fees.', 'Relationship grooming: builds trust, then directs crypto to a controlled address.', 'Fake support and phishing: impersonated domains, messages, QR codes, or remote help.', 'Pump and dump: coordinated hype in a thin market leaves late buyers exposed.', 'Recovery fraud: promises to recover losses for an upfront fee or private key.'] },
      { title: 'Stop on any of these signals', warning: 'Guaranteed returns, secrecy, moving chats off-platform, requests for a recovery phrase, or paying more to withdraw are each enough to stop.', bullets: ['Type a verified official domain instead of using a message link.', 'One successful small withdrawal does not prove legitimacy.', 'Never give a recovery phrase to an investigator, hacker, lawyer, or support agent.'] },
      { title: 'If fraud is suspected', checklist: ['Stop transfers and arguments', 'Preserve URLs, addresses, transaction hashes, and messages', 'Contact the platform through an official channel', 'Change related passwords and revoke suspicious approvals', 'Report through local law-enforcement or regulatory channels', 'Reject fee-first recovery services'] }
    ],
    quiz: [['What does an extra tax before withdrawal signal?', 'A classic advance-fee red flag; stop paying.'], ['Can support ask for a recovery phrase?', 'No. Anyone with it may control the associated assets.'], ['Does one small withdrawal prove legitimacy?', 'No. Scammers use it to build trust.']],
    tool: { label: 'Check token contract risk flags', path: 'tools/token-security-checker.html' }
  }),

  A('secure-crypto-account', 'security', 'high', ['investorAccounts', 'ethereumSecurity'], {
    title: '账户安全设置：密码、2FA、邮箱与防钓鱼', summary: '在入金前完成账户、邮箱和恢复方式的基础加固。', readTime: '6 分钟',
    outcomes: ['建立不复用的登录凭据', '选择更合适的第二因素', '安全保存恢复码并识别钓鱼'],
    sections: [
      { title: '先保护邮箱，再保护交易账户', paragraphs: ['邮箱往往能重置交易平台密码。若邮箱被接管，平台上的强密码也可能失去作用。'], bullets: ['邮箱和交易平台使用不同的长密码或 Passkey。', '使用密码管理器生成并保存唯一密码。', '检查邮箱转发规则和已登录设备。'] },
      { title: '2FA 不是都一样', paragraphs: ['硬件安全密钥和 Passkey 通常更抗钓鱼；验证器 App 通常优于短信。短信仍可能遭遇 SIM 换卡。'], bullets: ['不要把验证码告诉任何人。', '恢复码离线保存，不能和密码放在同一位置。', '启用提现地址白名单时，先理解等待期和恢复流程。'] },
{ title: 'KYC 实名认证需要提前准备什么', bullets: ['提前准备有效身份证或护照（部分地区需住址证明）', '通常只需约 5 分钟完成审核', '务必仅在已核对的官方域名或官方 App 内提交证件照'] },
      { title: '入金前安全清单', checklist: ['邮箱与平台密码不重复', '已开启平台支持的最强 2FA', '恢复码已离线备份', '官方域名已加入书签', '登录和提现提醒已开启', '已检查 API Key、活跃会话和授权设备', '没有安装来源不明的浏览器扩展'] }
      
    ],
    quiz: [['为什么先保护邮箱？', '邮箱常用于重置平台密码。'], ['短信 2FA 的主要问题是什么？', '可能受到 SIM 换卡和号码劫持影响。'], ['恢复码应放哪里？', '离线、与密码分开且可安全取回的位置。']],
    tool: { label: '查阅 2FA、钓鱼与私钥术语', path: 'tools/glossary.html' }
  }, {
    title: 'Secure Your Account: Passwords, 2FA, Email, and Phishing', summary: 'Harden your account, email, and recovery methods before funding.', readTime: '6 min',
    outcomes: ['Create non-reused credentials', 'Choose a stronger second factor', 'Store recovery codes and spot phishing'],
    sections: [
      { title: 'Secure email before the exchange account', paragraphs: ['Email often resets a platform password. If email is taken over, a strong exchange password may no longer protect the account.'], bullets: ['Use different long passwords or passkeys for email and the platform.', 'Use a password manager to generate and store unique credentials.', 'Review email forwarding rules and signed-in devices.'] },
      { title: 'Not all 2FA is equal', paragraphs: ['Hardware security keys and passkeys are generally more phishing-resistant; authenticator apps are usually preferable to SMS, which can face SIM swaps.'], bullets: ['Never share a one-time code.', 'Store recovery codes offline and separately from passwords.', 'Understand waiting periods and recovery before enabling withdrawal allowlists.'] },
   , { title: 'What to prepare for KYC verification', bullets: ['Prepare a valid national ID or passport (and proof of address in some regions)', 'Verification usually takes around 5 minutes to complete', 'Only submit ID photos on the verified official domain or inside the official app'] }
     , { title: 'Before-funding checklist', checklist: ['Email and platform passwords are unique', 'Strongest supported 2FA enabled', 'Recovery codes backed up offline', 'Official domain bookmarked', 'Login and withdrawal alerts enabled', 'API keys, sessions, and trusted devices reviewed', 'No unknown browser extensions installed'] }
    ],
    quiz: [['Why secure email first?', 'It often controls platform password resets.'], ['What is the main SMS risk?', 'SIM swapping and number takeover.'], ['Where should recovery codes go?', 'Offline, separate from passwords, and safely retrievable.']],
    tool: { label: 'Review 2FA, phishing, and key terms', path: 'tools/glossary.html' }
  }),

  A('choose-crypto-exchange', 'trading', 'caution', ['oecd', 'cftcRisk'], {
    title: '怎样选择适合你的交易所', summary: '不存在全球统一的“最好”；先核对地区、出入金、托管和真实成本。', readTime: '7 分钟',
    outcomes: ['按任务而不是榜单筛选平台', '识别返佣和费率展示的局限', '保留可退出路径'],
    sections: [
      { title: '先做可用性筛选', bullets: ['确认服务你的法律实体和支持地区。', '核对身份验证材料及是否支持你的证件。', '确认法币入金、卖出和提现方式，不只看买入入口。'] },
      { title: '再比较四类事实', bullets: ['托管与资产隔离：谁控制密钥，发生问题时由谁负责。', '真实成本：入金、价差、交易费、提币费和 Gas。', '产品复杂度：新手只需要现货，不应因功能多而加分。', '证据质量：官方规则、更新日期、提款记录和事故披露。'], warning: '储备证明是一个时点的证据，不能单独证明全部负债、内部控制或持续偿付能力。' },
      { title: '开户前检查', checklist: ['地区和法律实体已确认', 'KYC 材料与隐私政策已阅读', '入金和退出渠道都可用', '基础费率之外的成本已计算', '只启用当前需要的产品', '返佣关系已披露', '准备先用小额测试充值与提现'] }
    , { title: '新手常见的三种入金买币方式', bullets: ['银行转账：通常费率最低，适合不急着立刻成交', '银行卡快捷买币：最方便但通道费较高，约 1.5%–3.5%', 'P2P/C2C 买 USDT：支持本地支付方式，务必只选高成交率认证商家且不脱离平台聊天'] }
    ],
    quiz: [['为什么不能给全球统一推荐？', '地区、法律实体、KYC和出入金条件不同。'], ['PoR 能证明什么？', '通常只能提供某一时点的部分资产和余额覆盖证据。'], ['为什么先看退出？', '能买入不等于能顺利卖出或提现。']],
    tool: { label: '打开交易所综合对比', path: 'tools/exchange-comparator.html' }
  }, {
    title: 'How to Choose a Crypto Exchange for Your Needs', summary: 'There is no universal best exchange; verify jurisdiction, funding, custody, and total cost first.', readTime: '7 min',
    outcomes: ['Filter by task instead of rankings', 'See limits of affiliate and fee claims', 'Preserve an exit route'],
    sections: [
      { title: 'Start with availability', bullets: ['Identify the legal entity serving you and supported jurisdiction.', 'Verify identity documents and eligibility.', 'Confirm fiat funding, selling, and withdrawal—not just the buy flow.'] },
      { title: 'Then compare four fact groups', bullets: ['Custody and segregation: who controls keys and bears recovery responsibility.', 'Total cost: funding, spread, trading, withdrawal, and gas.', 'Product complexity: beginners need spot, not the most features.', 'Evidence: official rules, review dates, withdrawal history, and incident disclosure.'], warning: 'Proof of reserves is point-in-time evidence and cannot alone prove all liabilities, controls, or continuing solvency.' },
      { title: 'Before-opening checklist', checklist: ['Jurisdiction and legal entity verified', 'KYC documents and privacy policy reviewed', 'Funding and exit rails available', 'Costs beyond headline rate calculated', 'Only needed products enabled', 'Affiliate relationship disclosed', 'Small deposit and withdrawal test planned'] }
   , { title: 'Three common ways beginners fund an account', bullets: ['Bank transfer: usually the lowest fees, best when you do not need instant execution', 'Card instant buy: most convenient, but carries higher gateway fees (around 1.5%–3.5%)', 'P2P/C2C buying USDT: supports local payment methods; only pick verified high-completion merchants and never chat off-platform'] }
    ],
    quiz: [['Why no universal recommendation?', 'Jurisdiction, entity, KYC, and funding conditions differ.'], ['What does PoR prove?', 'Usually selected asset and balance coverage at a point in time.'], ['Why inspect the exit first?', 'Buying does not guarantee easy selling or withdrawal.']],
    tool: { label: 'Open the exchange comparator', path: 'tools/exchange-comparator.html' }
  }),

  A('first-spot-trade', 'trading', 'caution', ['cftcRisk'], {
    title: '第一次小额现货买入', summary: '识别现货、交易对、市价单和限价单，在确认页看清数量与费用。', readTime: '6 分钟',
    outcomes: ['避免误入合约和杠杆页面', '读懂交易对与订单方向', '在提交前核对成本和成交方式'],
    sections: [
  { title: '第 0 步：先准备好第一笔 USDT', paragraphs: ['新手买 BTC/ETH 现货前，通常先通过银行卡、银行转账或 P2P 买入少量 USDT（如 20–50 美元试水），确认到账至「现货账户」后再下单。'] }, 
      { title: '确认你在现货页面', paragraphs: ['现货买入后持有资产；合约页面通常出现杠杆倍数、保证金、强平价、做多和做空等字段。看到这些词先退出。'], bullets: ['BTC/USDT 表示用 USDT 为 BTC 定价。', 'Buy BTC 表示花费报价资产得到 BTC。', '检查最小订单金额和可用余额。'] },
      { title: '市价单与限价单', bullets: ['市价单按当前盘口立即成交，通常按吃单（Taker）费率扣费；限价单可自定义买入价挂单等待，成交时通常按挂单（Maker）费率扣费。', '市价单优先立即成交，但最终均价可能因订单簿产生滑点。', '限价单只在指定价格或更优价格成交，但可能一直不成交。', '限价单如果立即与订单簿成交，也可能按 Taker 收费。'] },
      { title: '提交前 7 项检查', checklist: ['页面明确标为 Spot / 现货', '交易对和买卖方向正确', '金额使用的是预期计价币', '已查看预计收到数量', '已查看手续费和价差', '市价单可能滑点已理解', '金额足够小且不影响生活'] }
    ],
    quiz: [['现货和合约最关键区别？', '现货交付资产；合约建立价格敞口并可能使用杠杆。'], ['限价单一定是 Maker 吗？', '不一定，立即成交的限价单也可能是 Taker。'], ['市价单保证屏幕价格吗？', '不保证，实际均价取决于订单簿和订单规模。']],
    tool: { label: '下单前估算完整成本', path: 'tools/total-cost-calculator.html' }
  }, {
    title: 'Your First Small Spot Purchase', summary: 'Identify spot, pairs, market orders, and limit orders, then read the confirmation screen.', readTime: '6 min',
    outcomes: ['Avoid derivatives and leverage by mistake', 'Read pair and order direction', 'Verify cost and execution before submitting'],
    sections: [
    { title: 'Step 0: Get your first USDT', paragraphs: ['Before buying BTC or ETH on spot, beginners typically buy a small amount of USDT (such as $20–$50 to test) via card, bank transfer, or P2P, and confirm it has arrived in their Spot Account before placing an order.'] }, 
      { title: 'Confirm you are on spot', paragraphs: ['A spot purchase delivers the asset. Derivatives screens often show leverage, margin, liquidation price, long, or short—leave if you see them during a first purchase.'], bullets: ['BTC/USDT quotes BTC in USDT.', 'Buy BTC spends the quote asset to receive BTC.', 'Check minimum order and available balance.'] },
      { title: 'Market versus limit', bullets: ['In plain terms: a market order fills immediately at the current order book price and usually pays the taker fee; a limit order lets you set your own buy price and wait, usually paying the maker fee when filled.', 'A market order prioritizes immediate execution but may have slippage.', 'A limit order only fills at the limit or better but may remain open.', 'A limit order that matches immediately can still pay taker fees.'] },
      { title: 'Seven checks before submit', checklist: ['Page says Spot', 'Pair and buy/sell direction are correct', 'Amount uses the intended quote currency', 'Estimated received amount reviewed', 'Fee and spread reviewed', 'Market-order slippage understood', 'Amount is small and non-essential'] }
    ],
    quiz: [['Key difference between spot and derivatives?', 'Spot delivers an asset; derivatives create price exposure and may use leverage.'], ['Is every limit order a maker?', 'No. An immediately matching limit order can be a taker.'], ['Does market order guarantee the displayed price?', 'No. Average execution depends on the book and order size.']],
    tool: { label: 'Estimate total cost before ordering', path: 'tools/total-cost-calculator.html' }
  }),

  A('crypto-total-cost', 'trading', 'caution', ['cftcRisk'], {
    title: 'Crypto 真实总成本', summary: '基础费率只是开始；把入金、价差、滑点、提币费和 Gas 放进同一次计算。', readTime: '6 分钟',
    outcomes: ['区分费率和总成本', '理解固定费用为何伤害小额交易', '知道哪些数据无法提前精确'],
    sections: [
      { title: '一条完整路径的成本', bullets: ['入金：银行卡、银行转账或第三方支付费用。', '成交：买卖价差、交易手续费和滑点。', '转出：平台提币费与最低提币额。', '链上：网络 Gas，且目标网络可能还需原生币。', '退出：卖出价差、提现费用和可能适用的税务。'] },
      { title: '为什么宣传费率会误导', paragraphs: ['“0.1%”通常只代表某产品、某等级的交易费。相同费率的平台，价差、提币费和入金渠道不同，总结果也会不同。'], warning: '无法可靠获取的价差、外部支付费或实时 Gas 应明确标为未知，不应用拍脑袋估算填满。' },
      { title: '计算前检查', checklist: ['金额和计价币一致', '使用正确 Maker/Taker 费率', '价差与滑点单独考虑', '提币网络和固定费已核对', '目标链 Gas 资产已准备', '所有数据有来源和更新时间', '未知成本没有被当成零'] }
    ],
    quiz: [['基础费率等于总成本吗？', '不等于，还可能有价差、滑点、入金、提币和 Gas。'], ['固定提币费对谁影响更大？', '对小额转账的比例影响更大。'], ['无法核实的费用应如何处理？', '标为未知并在行动前到官方页面核对。']],
    tool: { label: '打开全成本计算器', path: 'tools/total-cost-calculator.html' }
  }, {
    title: 'The Real Total Cost of Crypto', summary: 'Headline fees are only the start; include funding, spread, slippage, withdrawal, and gas.', readTime: '6 min',
    outcomes: ['Separate fee rate from total cost', 'See why fixed fees hurt small transfers', 'Know which inputs cannot be exact in advance'],
    sections: [
      { title: 'Cost across one full path', bullets: ['Funding: card, bank, or payment-provider charges.', 'Execution: spread, trading fee, and slippage.', 'Withdrawal: platform fee and minimum amount.', 'On-chain: network gas and any native token requirement.', 'Exit: selling spread, cash withdrawal, and possible tax obligations.'] },
      { title: 'Why headline rates mislead', paragraphs: ['A quoted 0.1% often covers one product and one account tier. Equal rates can still produce different outcomes because spread, withdrawal, and funding differ.'], warning: 'If spread, external payment cost, or live gas cannot be verified, mark it unknown rather than inventing an estimate.' },
      { title: 'Before-calculation checklist', checklist: ['Amount and quote currency match', 'Correct maker/taker rate used', 'Spread and slippage considered separately', 'Withdrawal network and fixed fee checked', 'Native gas asset prepared', 'Every input has source and date', 'Unknown cost is not treated as zero'] }
    ],
    quiz: [['Is the base rate total cost?', 'No. Spread, slippage, funding, withdrawal, and gas may apply.'], ['Who is hit harder by a fixed withdrawal fee?', 'A small transfer in percentage terms.'], ['How should an unverifiable fee be handled?', 'Mark it unknown and verify it on the official page before acting.']],
    tool: { label: 'Open the total-cost calculator', path: 'tools/total-cost-calculator.html' }
  }),

  A('safe-crypto-transfer', 'wallet', 'high', ['bitcoinBasics', 'ethereumGuides', 'ethereumSecurity'], {
    title: '第一次转账安全清单', summary: '逐项核对币种、网络、完整地址、Memo/Tag、金额和到账状态。', readTime: '7 分钟',
    outcomes: ['理解不可逆转账的责任', '避免选错网络和漏填 Memo', '使用小额测试降低错误影响'],
    sections: [
      { title: '六个字段必须同时正确', bullets: ['资产：USDT、USDC、ETH 等不能只看名称相似。', '网络：发送端与接收端必须支持同一网络。', '地址：复制后核对完整地址，防止地址投毒。', 'Memo/Tag：接收平台要求时必须填写。', '金额：考虑提币费和最小到账额。', '状态：广播、确认和平台入账是不同阶段。'] },
      { title: '先小额测试，再发送剩余金额', paragraphs: ['测试金额也会产生费用，但可以验证地址、网络和平台入账流程。测试到账后，从同一个已验证入口再次复制地址，不要盲信交易历史里的相似地址。'], warning: '链上交易确认后通常无法由平台、矿工或开发者撤销。任何催促你跳过核对的人都在增加你的风险。' },
      { title: '发送前清单', checklist: ['币种完全一致', '发送和接收网络完全一致', '从可信入口获取接收地址', '完整地址已核对', 'Memo/Tag 要求已确认', '提币费与实际到账额已查看', '先发送可承受损失的测试金额', '测试已确认并在接收端入账', '剩余金额再次独立核对'] }
    ],
    quiz: [['地址相同就能跨任意网络发送吗？', '不能，接收平台还必须支持所选网络和资产。'], ['Pending 等于到账吗？', '不等于，还需区块确认和接收平台入账。'], ['为什么不只核对地址首尾？', '地址投毒可制造首尾相似的恶意地址。']],
    tool: { label: '查阅网络、Gas 与地址术语', path: 'tools/glossary.html' }
  }, {
    title: 'Safe First Crypto Transfer Checklist', summary: 'Verify asset, network, full address, memo or tag, amount, and final credit.', readTime: '7 min',
    outcomes: ['Understand irreversible-transfer responsibility', 'Avoid wrong-network and missing-memo errors', 'Use a test transfer to limit impact'],
    sections: [
      { title: 'Six fields must all be right', bullets: ['Asset: similar names do not make USDT, USDC, and ETH interchangeable.', 'Network: both sending and receiving sides must support the same network.', 'Address: verify the full address after copying.', 'Memo/tag: include it when the receiving platform requires it.', 'Amount: account for fees and minimum credit.', 'Status: broadcast, confirmation, and platform credit are different stages.'] },
      { title: 'Test small, then send the remainder', paragraphs: ['A test costs fees but validates address, network, and credit flow. After it arrives, copy from the same verified destination again rather than trusting a lookalike in transaction history.'], warning: 'A confirmed on-chain transaction generally cannot be reversed by a platform, miner, or developer. Anyone rushing you to skip checks increases your risk.' },
      { title: 'Before-send checklist', checklist: ['Exact asset matches', 'Sending and receiving network match', 'Address obtained from a trusted destination', 'Full address verified', 'Memo/tag requirement confirmed', 'Fee and net received amount reviewed', 'Loss-tolerable test sent first', 'Test confirmed and credited', 'Remainder independently rechecked'] }
    ],
    quiz: [['Can the same-looking address accept every network?', 'No. The destination must support the selected network and asset.'], ['Does pending mean credited?', 'No. Block confirmation and destination credit still remain.'], ['Why not check only address ends?', 'Address poisoning can create convincing lookalikes.']],
    tool: { label: 'Review network, gas, and address terms', path: 'tools/glossary.html' }
  }),

  A('custody-vs-self-custody', 'wallet', 'high', ['bitcoinBasics', 'ethereumSecurity'], {
    title: '托管钱包 vs 自托管', summary: '比较谁控制密钥、谁负责恢复，以及你是否具备安全备份能力。', readTime: '7 分钟',
    outcomes: ['理解“币在链上，钱包管密钥”', '权衡平台风险与个人操作风险', '建立不泄露助记词的备份方案'],
    sections: [
      { title: '两种责任模型', bullets: ['托管：平台控制密钥，你通过账户登录；恢复依赖平台流程，也承担平台停提、运营和对手方风险。', '自托管：你控制密钥和签名；不依赖平台批准转账，但丢失或泄露恢复信息可能永久失去资产。'], paragraphs: ['自托管不是自动更安全。它把一部分平台风险换成密钥、设备、备份和签名判断风险。'] },
      { title: '助记词不是普通密码', bullets: ['它可能派生多个账户和私钥。', '正规客服、空投和升级都不需要它。', '不要截图、上传云盘或输入陌生网站。', '硬件钱包降低私钥接触联网设备的风险，但不能阻止你确认恶意交易。'] },
      { title: '选择前检查', checklist: ['知道当前由谁控制私钥', '理解平台和自托管各自最坏情况', '恢复信息可离线、安全取回', '备份与设备不放在同一处', '能在设备屏幕核对地址和交易', '先用小额测试恢复和转账流程', '不会因口号把全部资产迁往不熟悉的钱包'] }
    ],
    quiz: [['钱包里真的存着币吗？', '资产记录在链上，钱包主要管理密钥和签名。'], ['自托管一定更安全吗？', '不一定，它减少部分对手方风险，但增加个人操作和备份责任。'], ['硬件钱包能阻止恶意授权吗？', '不能，如果用户在设备上确认了恶意交易，仍可能损失资产。']],
    tool: { label: '查阅钱包、助记词与私钥', path: 'tools/glossary.html' }
  }, {
    title: 'Custody vs Self-custody', summary: 'Compare who controls keys, who handles recovery, and whether you can maintain safe backups.', readTime: '7 min',
    outcomes: ['Understand that assets are on-chain and wallets manage keys', 'Balance platform risk and user error', 'Build a recovery plan without exposing the phrase'],
    sections: [
      { title: 'Two responsibility models', bullets: ['Custody: a platform controls keys and you log into an account; recovery depends on its process, with platform and withdrawal risks.', 'Self-custody: you control keys and signatures; transfers do not need platform approval, but lost or exposed recovery data can permanently lose assets.'], paragraphs: ['Self-custody is not automatically safer. It exchanges some counterparty risk for key, device, backup, and signing risk.'] },
      { title: 'A recovery phrase is not a password', bullets: ['It may derive many accounts and private keys.', 'Legitimate support, airdrops, and upgrades do not need it.', 'Do not screenshot, cloud-upload, or enter it on an unknown site.', 'Hardware wallets reduce key exposure but cannot stop you approving a malicious transaction.'] },
      { title: 'Before choosing', checklist: ['Know who currently controls the keys', 'Understand worst cases for both models', 'Recovery data is offline and retrievable', 'Backup and device are stored separately', 'Can verify address and transaction on-device', 'Test recovery and transfers with small value', 'Do not move everything based on a slogan'] }
    ],
    quiz: [['Are coins stored inside a wallet?', 'Asset records are on-chain; the wallet mainly manages keys and signatures.'], ['Is self-custody always safer?', 'No. It reduces some counterparty risk but adds user and backup responsibility.'], ['Can hardware wallets stop malicious approvals?', 'No. A confirmed malicious transaction can still cause loss.']],
    tool: { label: 'Review wallet, phrase, and private-key terms', path: 'tools/glossary.html' }
  }),
A('cheapest-usdt-withdrawal-network', 'wallet', 'caution', ['cftcRisk', 'ethereumSecurity'], {
  title: '哪条链提 USDT 最便宜？TRC20、SOL、Arbitrum 与 ERC20 费用对比',
  summary: '对比 TRC20、SOL、Arbitrum 与 ERC20 提现 USDT 的网络手续费与到账速度，帮助新手避开高额 Gas 费与选错链风险。',
  readTime: '6 分钟',
  outcomes: [
    '看懂主流提币网络的手续费与到账时间差异',
    '理解为什么新手小额提币应尽量避开 ERC20',
    '掌握提币前核对地址、网络与 Memo 的 4 项防丢币清单'
  ],
  sections: [
    {
      title: '主流提币网络费用梯度对比',
      paragraphs: [
        '同一笔 USDT 从交易所提到钱包或另一家平台，手续费差异可能高达十倍以上。通常 Solana（SOL）与 Arbitrum 等二层网络的固定提币费最低，往往只需零点几美元；TRC20 稳定且兼容性广，常见固定费率在 1 USDT 左右；而以太坊主网 ERC20 受主网拥堵影响，提币费往往最高。',
        '不同交易所会对各条链收取不同的固定提现手续费，提币前应优先在平台提现页面或费率速查器中核对实时收费与最低提币限额。'
      ]
    },
    {
      title: '为什么新手尽量避开 ERC20',
      bullets: [
        '单笔成本高：ERC20 提现手续费通常显著高于 TRC20、SOL 和 Arbitrum，小额转出损耗极大。',
        '链上后续操作更贵：即使成功提到自托管钱包，之后在以太坊主网转出或授权仍需额外准备 ETH 作为 Gas 费。',
        '仅在特定场景使用：只有当接收方明确只支持 ERC20（例如部分冷门 DeFi 协议或特定托管地址）时，才考虑使用 ERC20。'
      ]
    },
    {
      title: '提币防丢币 4 项核对清单',
      checklist: [
        '核对发送端与接收端选择的网络名称是否完全一致（例如同为 TRC20 或同为 Arbitrum One）',
        '确认接收地址前缀与格式匹配对应链（如 TRC20 通常以 T 开头，ERC20/Arbitrum 以 0x 开头）',
        '检查是否需要填写 Memo 或 Tag（部分中心化平台充币有特殊标签要求）',
        '大额转账前先做一笔最低限额的小额测试，确认到账后再转剩余资金'
      ]
    }
  ],
  quiz: [
    ['如果对方钱包支持 TRC20、SOL 和 ERC20，小额提 USDT 通常应优先排除哪条链？', '通常应优先排除 ERC20，因为以太坊主网提现与后续链上 Gas 成本最高。'],
    ['把 TRC20 的 USDT 直接提到仅支持 ERC20 的地址会发生什么？', '不同链互不兼容，选错网络可能导致资产无法直接到账甚至永久丢失。'],
    ['大额提币前最稳妥的操作是什么？', '先核对网络与地址格式，并先发送一笔小额测试转账确认到账。']
  ],
  tool: { label: '打开 USDT 跨链提币费率速查器', path: 'tools/usdt-withdrawal-fees.html' }
}, {
  title: 'Cheapest Network to Withdraw USDT: TRC20 vs SOL vs Arbitrum vs ERC20',
  summary: 'Compare withdrawal fees, confirmation speed, and compatibility across TRC20, SOL, Arbitrum, and ERC20 so beginners avoid overpaying or losing funds.',
  readTime: '6 min',
  outcomes: [
    'Compare fee tiers across major USDT withdrawal networks',
    'Understand why beginners should usually avoid ERC20 for small transfers',
    'Follow a 4-point checklist to prevent irreversible wrong-network losses'
  ],
  sections: [
    {
      title: 'Fee tiers across major withdrawal networks',
      paragraphs: [
        'Withdrawing the exact same USDT amount can cost very different fees depending on the network you pick. Solana (SOL) and Layer-2 networks like Arbitrum usually offer the lowest fixed withdrawal fees, while TRC20 provides wide exchange compatibility at a moderate flat fee. Ethereum mainnet (ERC20) typically carries the highest fee.',
        'Because exchanges set their own flat withdrawal fees and minimums, always check the live fee table before confirming a transfer.'
      ]
    },
    {
      title: 'Why beginners should usually avoid ERC20',
      bullets: [
        'High fixed cost: ERC20 withdrawal fees often take a large bite out of small transfers compared with SOL, Arbitrum, or TRC20.',
        'Expensive follow-up transfers: moving USDT out of a self-custody wallet on Ethereum mainnet also requires holding ETH for gas.',
        'Use only when required: choose ERC20 mainly when the receiving platform or protocol strictly accepts only Ethereum mainnet.'
      ]
    },
    {
      title: '4-point checklist to prevent lost funds',
      checklist: [
        'Verify the exact same network is selected on both the sending and receiving sides',
        'Match address format to the network (e.g. T-prefix for TRC20, 0x-prefix for ERC20/Arbitrum)',
        'Check whether a Memo or Tag is required by the receiving exchange',
        'Send a small test transaction first before transferring a large balance'
      ]
    }
  ],
  quiz: [
    ['Which network is usually the most expensive option for small USDT withdrawals?', 'ERC20 (Ethereum mainnet), due to higher withdrawal fees and mainnet gas costs.'],
    ['What happens if you send TRC20 USDT to an ERC20-only deposit address?', 'The networks are incompatible and funds may fail to credit or be permanently lost.'],
    ['What is the safest habit before a large USDT withdrawal?', 'Double-check network and address format, then send a small test transfer first.']
  ],
  tool: { label: 'Open USDT Withdrawal Fee Checker', path: 'tools/usdt-withdrawal-fees.html' }
}),
A('p2p-vs-card-buy-crypto', 'trading', 'caution', ['oecd', 'cftcRisk'], {
  title: '新手买币怎么入金最划算？银行卡、银行转账与 P2P/C2C 费率与避坑对比',
  summary: '拆解银行卡刷卡、银行转账与 P2P/C2C 三种入金方式的显性手续费与汇率点差，帮新手用更低成本安全完成首次买币。',
  readTime: '7 分钟',
  outcomes: [
    '看清银行卡、银行转账与 P2P/C2C 的真实总成本差异',
    '掌握 P2P/C2C 挑选商家的 4 条核心防骗底线',
    '完成首次小额入金前的安全核对清单'
  ],
  sections: [
    {
      title: '三种常见入金方式的真实成本差异',
      paragraphs: [
        '新手买币常只看页面显示的“0 手续费”，却忽略了隐含汇率点差。银行卡（Visa/Mastercard）购买通常到账最快，但常伴随 1.5% 到 3.5% 以上的通道费与发卡行跨境费用；银行转账（如 SEPA、FPS 或本地电汇）费率通常最低，但受地区支持与到账时间限制；P2P/C2C 点对点交易页面往往无平台手续费，实际成本体现在商家报价与实时汇率的溢价点差中。',
        '计算入金成本时，务必用“实际扣款法币金额 ÷ 到账 USDT 数量”算出综合汇率，再与现货中间价对比。'
      ]
    },
    {
      title: 'P2P/C2C 选商家的 4 条防骗底线',
      bullets: [
        '只看高成交量与高完成率认证商家：优先选择注册时间久、历史成交数千笔以上且好评率高的商家。',
        '坚持平台内聊天与托管放币：绝不脱离平台转到微信、Telegram 等第三方沟通，也不要在未收到款或未确认到账前放币。',
        '严格核对实名一致性：付款或收款账户姓名必须与平台实名信息一致，拒绝第三方代付或陌生账户转款。',
        '保留完整付款凭证：转账备注避免出现敏感词汇，并保存回执截图以便申诉仲裁。'
      ]
    },
    {
      title: '新手首次小额入金检查清单',
      checklist: [
        '确认所用交易所与入金通道在当前地区合法可用且已完成 KYC',
        '先用小额资金测试完整买币与到账流程，熟悉申诉与客服入口',
        '对比实际到账单价而非仅看“免手续费”宣传字样',
        '入金完成后先熟悉现货限价下单，避免急于开高倍合约'
      ]
    }
  ],
  quiz: [
    ['为什么“0 手续费”的快捷买币或 P2P 报价依然可能有隐性成本？', '因为成本往往隐藏在高于市场中间价的汇率点差与溢价中。'],
    ['在 P2P/C2C 交易中遇到对方要求加外部聊天软件并提前放币，应该怎么做？', '立即拒绝并仅在平台托管与站内聊天内完成沟通与核验。'],
    ['为什么不建议在 P2P 交易中接受第三方代付？', '第三方代付容易引发黑钱或冻卡风险，且违反大多数平台的实名一致性规则。']
  ],
  tool: { label: '用现货总成本计算器测算入金费用', path: 'tools/total-cost-calculator.html' }
}, {
  title: 'Card vs Bank Transfer vs P2P: Cheapest & Safest Ways to Buy Crypto',
  summary: 'Compare explicit fees, hidden FX spreads, and counterparty risks across card purchases, bank transfers, and P2P/C2C markets.',
  readTime: '7 min',
  outcomes: [
    'Compare true all-in costs of cards, bank transfers, and P2P/C2C',
    'Apply 4 strict safety rules when choosing a P2P merchant',
    'Follow a pre-deposit checklist before your first small crypto purchase'
  ],
  sections: [
    {
      title: 'True cost differences across three deposit methods',
      paragraphs: [
        'Many beginners only look at advertised "zero fee" banners and miss hidden exchange-rate spreads. Credit or debit card purchases are instant but often carry 1.5% to 3.5%+ in processor and FX fees. Bank transfers (such as SEPA, FPS, or local wires) usually offer the lowest fees where supported, though settlement can take longer. P2P/C2C markets often charge no platform fee, so the real cost is the markup baked into the merchant quote.',
        'Always calculate your effective rate by dividing total fiat paid by total USDT received.'
      ]
    },
    {
      title: '4 anti-scam rules for choosing a P2P/C2C merchant',
      bullets: [
        'Pick verified, high-volume merchants: prioritize merchants with thousands of completed orders and a near-100% completion rate.',
        'Stay inside platform escrow and chat: never move communication to external apps or release crypto before verifying settled funds.',
        'Require matching real-name accounts: reject third-party payments from unfamiliar bank or wallet names.',
        'Keep full payment receipts: avoid sensitive keywords in transfer memos and save proof for dispute resolution.'
      ]
    },
    {
      title: 'First-time small deposit checklist',
      checklist: [
        'Confirm the exchange and payment rail are supported in your region and KYC is complete',
        'Start with a small test deposit to verify settlement speed and support channels',
        'Compare effective unit price rather than "0% fee" marketing labels',
        'Start with simple spot orders after funding instead of jumping into leverage'
      ]
    }
  ],
  quiz: [
    ['How can a "0% fee" crypto purchase still cost more than expected?', 'The cost can be hidden inside a wide FX spread or price markup.'],
    ['What should you do if a P2P counterparty asks to chat off-platform or release early?', 'Refuse immediately and keep all communication and verification inside platform escrow.'],
    ['Why should you reject third-party P2P payments?', 'They violate real-name matching rules and increase fraud or bank-freeze risk.']
  ],
  tool: { label: 'Estimate deposit costs in Spot Calculator', path: 'tools/total-cost-calculator.html' }
}),
A('maker-vs-taker-fees-explained', 'trading', 'caution', ['cftcRisk', 'oecd'], {
  title: '挂单（Maker）与吃单（Taker）手续费区别：新手省手续费实操指南',
  summary: '用通俗语言讲清挂单（Maker）与吃单（Taker）的撮合原理、费率差异与限价单省钱技巧，帮新手避免高频市价吃单损耗。',
  readTime: '5 分钟',
  outcomes: [
    '一句话分清 Maker 挂单与 Taker 吃单的本质区别',
    '学会在合适时机使用限价单（Limit Order）降低交易手续费',
    '掌握下单前检查费率等级、平台币折扣与滑点的自查清单'
  ],
  sections: [
    {
      title: '一句话看懂 Maker 与 Taker 的区别',
      paragraphs: [
        '判断一笔订单是 Maker 还是 Taker，不看订单名字，而看它是否“立刻成交”。当你挂出限价单且没有立刻匹配盘口现有对手单，而是进入订单簿排队等待成交时，你为市场提供了流动性，这就是挂单（Maker）；当你使用市价单或价格直接穿透盘口的限价单立刻成交时，你消耗了市场流动性，这就是吃单（Taker）。',
        '大多数交易所对 Maker 收取更低甚至显著优惠的手续费，因为挂单能增加订单簿深度。'
      ]
    },
    {
      title: '何时用限价单省手续费',
      bullets: [
        '非极端急迫买卖时：将买入限价设在略低于卖一价、卖出限价设在略高于买一价的位置，耐心等待成交。',
        '勾选只做 Maker（Post-Only）：如果担心限价单不小心立刻吃单，可开启 Post-Only 选项，确保订单只会以 Maker 身份挂单。',
        '急需止损或快速成交时不要硬省：剧烈行情下为省千分之一手续费而错过成交，可能带来更大滑点或踏空风险。'
      ]
    },
    {
      title: '下单前费率自查清单',
      checklist: [
        '确认当前账户 VIP 等级与对应现货 Maker/Taker 基准费率',
        '检查是否开启平台币抵扣或持有手续费返现/折扣券',
        '在盘口深度较浅的币对上优先使用限价单，避免市价单产生过大滑点',
        '下单预览时核对预计手续费与实际成交金额是否符合预期'
      ]
    }
  ],
  quiz: [
    ['决定一笔订单属于 Maker 还是 Taker 的核心标准是什么？', '订单是否进入订单簿排队等待成交（提供流动性为 Maker，立刻成交消耗流动性为 Taker）。'],
    ['如何防止限价单意外按 Taker 费率立刻成交？', '把价格挂在盘口未成交区间，或开启“只做 Maker（Post-Only）”选项。'],
    ['为什么市价单（Market Order）在流动性差的币对上成本尤其高？', '除了通常按较高的 Taker 费率收费外，还容易产生明显的价格滑点。']
  ],
  tool: { label: '对比 7 大交易所现货费率与功能', path: 'tools/exchange-comparator.html' }
}, {
  title: 'Maker vs Taker Fees Explained: How Beginners Cut Trading Costs',
  summary: 'Learn how Maker and Taker orders work on an order book, why Maker fees are usually lower, and when to use limit orders to save on trading costs.',
  readTime: '5 min',
  outcomes: [
    'Distinguish Maker orders from Taker orders in one sentence',
    'Use limit and Post-Only orders to capture lower Maker fee tiers',
    'Check fee tiers, token discounts, and slippage before placing an order'
  ],
  sections: [
    {
      title: 'Maker vs Taker in one sentence',
      paragraphs: [
        'Whether an order is classified as Maker or Taker depends on whether it fills immediately. When your limit order rests on the order book waiting for a match, you add liquidity and pay the Maker fee. When you place a market order or a limit order that crosses the spread and fills right away, you remove liquidity and pay the Taker fee.',
        'Most exchanges charge lower fees for Maker orders because resting orders deepen market liquidity.'
      ]
    },
    {
      title: 'When to use limit orders to save on fees',
      bullets: [
        'Routine entries and exits: set a limit buy slightly below the best ask or a limit sell slightly above the best bid.',
        'Use Post-Only when available: enabling Post-Only prevents your limit order from accidentally filling immediately as a Taker.',
        'Do not force Maker orders during urgent exits: in fast-moving markets, guaranteed execution can matter more than a small fee difference.'
      ]
    },
    {
      title: 'Pre-order fee self-check list',
      checklist: [
        'Verify your current account tier and spot Maker/Taker rates',
        'Check whether exchange-token fee discounts or fee vouchers are active',
        'Prefer limit orders on thin order books to avoid heavy market-order slippage',
        'Review estimated fees and total cost in the order preview before confirming'
      ]
    }
  ],
  quiz: [
    ['What determines whether an order pays the Maker or Taker fee?', 'Whether it rests on the order book to add liquidity (Maker) or fills immediately (Taker).'],
    ['How can you prevent a limit order from accidentally executing as a Taker order?', 'Place the price away from immediate fill levels or enable the Post-Only option.'],
    ['Why are market orders especially costly on low-liquidity pairs?', 'They usually pay the higher Taker fee and suffer additional price slippage.']
  ],
  tool: { label: 'Compare exchange fees & features', path: 'tools/exchange-comparator.html' }
})
];

export function validateLearningContent(articles = LEARNING_ARTICLES, sources = LEARNING_SOURCES) {
  const errors = [];
  const seen = new Set();
  const allowedCategories = new Set(['start', 'security', 'trading', 'wallet']);
  const allowedRisks = new Set(['standard', 'caution', 'high']);
  for (const article of articles) {
    if (!article.slug || !/^[a-z0-9-]+$/.test(article.slug)) errors.push(`invalid slug: ${article.slug}`);
    if (seen.has(article.slug)) errors.push(`duplicate slug: ${article.slug}`);
    seen.add(article.slug);
    if (!allowedCategories.has(article.category)) errors.push(`${article.slug}: invalid category`);
    if (!allowedRisks.has(article.risk)) errors.push(`${article.slug}: invalid risk`);
    if (!Array.isArray(article.sources) || !article.sources.length) errors.push(`${article.slug}: source required`);
    for (const key of article.sources || []) if (!sources[key]) errors.push(`${article.slug}: unknown source ${key}`);
    for (const lang of ['zh', 'en']) {
      const copy = article[lang];
      for (const field of ['title', 'summary', 'readTime']) if (!copy?.[field]) errors.push(`${article.slug}: ${lang}.${field} required`);
      if (!Array.isArray(copy?.outcomes) || copy.outcomes.length < 2) errors.push(`${article.slug}: ${lang}.outcomes incomplete`);
      if (!Array.isArray(copy?.sections) || copy.sections.length < 3) errors.push(`${article.slug}: ${lang}.sections incomplete`);
      if (!Array.isArray(copy?.quiz) || copy.quiz.length < 3) errors.push(`${article.slug}: ${lang}.quiz incomplete`);
      if (!copy?.tool?.label || !copy?.tool?.path) errors.push(`${article.slug}: ${lang}.tool required`);
    }
  }
  for (const [key, source] of Object.entries(sources)) {
    if (!source.label || !/^https:\/\//.test(source.url || '')) errors.push(`invalid source: ${key}`);
  }
  return errors;
}
