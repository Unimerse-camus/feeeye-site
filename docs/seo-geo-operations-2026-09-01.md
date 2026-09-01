# FeeEye SEO + GEO 自动化工作流

日期：2026-09-01。状态：本地候选实现；未推送、未部署、未提交IndexNow。

## 结论

FeeEye不建立一套独立于SEO的“AI文章工厂”。SEO负责可抓取、可索引、内链、页面体验和搜索意图；GEO在同一页面上进一步强调可验证事实、明确范围、原始来源、复核日期、结构清晰和跨文本/图片/视频一致。

Google在2026年官方指南中明确：生成式搜索仍以搜索索引和核心质量系统为基础，不需要专用GEO Schema、特殊AI标记或`llms.txt`；批量覆盖query fan-out变体可能落入scaled content abuse。https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

OpenAI官方文档区分OAI-SearchBot与GPTBot：前者用于ChatGPT搜索结果，后者与训练用途相关，可在robots.txt中独立控制。FeeEye本阶段明确允许OAI-SearchBot，没有改变GPTBot的既有通用抓取策略。https://developers.openai.com/api/docs/bots

Bing Webmaster Tools的AI Performance公开预览提供总引用、平均被引用页面、grounding queries样本和URL级引用活动；IndexNow可帮助搜索与AI体验更快发现新增、修改和删除内容，但受理不等于收录或引用。https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview

## 本阶段实现

- `robots.txt`明确允许OAI-SearchBot，并继续允许普通抓取和提供sitemap。
- 全站增加英文、中文和`x-default` hreflang。
- 全站增加一致的Organization和WebSite实体，不虚构人员、奖项、评分或特殊GEO Schema。
- 学习文章和benchmark的Article/Dataset JSON-LD引用页面真实可见的官方来源。
- 修复where-to-buy FAQ使用错误`answer`字段的问题，统一为`acceptedAnswer`。
- `seo_geo_audit.mjs`逐页检查H1、title、description、canonical、hreflang、noindex、JSON-LD、Article日期/来源、FAQ字段、robots和canonical总数。
- 周报增加AI referral visits、Bing AI citations和average cited pages；缺少后台导出时保持`null`。

## 内容准入

SEO/GEO候选页必须同时满足：

1. 回答一个真实任务，不为关键词变体批量造近重复页面；
2. 数值、公式和结论能追溯到冻结事实或官方来源；
3. 清楚写出观察日期、适用地区/产品/档位和未知项；
4. 关键答案以可见文本提供，图片和视频不承担唯一事实来源；
5. 中英文事实一致，但允许按地区语境重写；
6. 页面、图表、CSV、视频脚本和社交文案引用同一事实版本；
7. 内容变化后走PR、全量验证、生产回执和增量URL通知；不伪造lastmod。

## 衡量

- Google：Search Console搜索点击/曝光，以及账号实际提供时的生成式AI表现报告。
- Bing/Copilot：AI citations、average cited pages和URL级引用变化。
- ChatGPT及其他AI来源：仅使用Cloudflare可获得的聚合referrer访问，不尝试识别个人或反推提示词。
- 所有平台：引用、点击、收录和转化分别记录；引用不等于点击，IndexNow 200不等于索引。

至少观察28天。缺数据不记0，不因单次AI引用批量扩页，也不购买声称掌握“内部AI排名”的服务。
