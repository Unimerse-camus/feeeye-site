# FeeEye 匿名行为统计方案（待 Cloudflare 后台启用）

## 当前状态（2026-08-20）

- 隐私政策写明使用 Cloudflare Web Analytics。
- 线上 HTML 未检测到 Web Analytics Beacon 或 Zaraz 脚本，因此当前没有可用的页面访问和关键点击数据。
- Cloudflare 后台需要登录，当前自动化浏览器没有登录态；未创建 Token、未启用脚本，也没有发送测试事件。

## 推荐实现

使用 Cloudflare Zaraz 的 `zaraz.track(eventName, properties)` 记录少量产品事件。官方文档：

https://developers.cloudflare.com/zaraz/web-api/track/

代码只在 `window.zaraz?.track` 存在时调用；Cloudflare 未启用时必须安全地无操作，不能影响导航和搜索。

## 第一阶段事件

| 事件 | 触发点 | 允许属性 |
|---|---|---|
| `coin_search_open` | 用户首次聚焦首页币种搜索 | `lang` |
| `coin_search_result_open` | 用户打开搜索结果 | `lang`, `symbol`, `position` |
| `coin_search_no_result` | 输入后无匹配，去重后记录 | `lang`, `query_length` |
| `compare_advanced_open` | 展开合约/高风险能力 | `lang`, `pair` |
| `exchange_outbound_open` | 打开交易所官网或注册链接 | `lang`, `exchange`, `page_type` |

## 明确禁止采集

- 不发送用户输入的完整搜索词；只发送长度和最终选择的公开币种代码。
- 不发送IP、邮箱、钱包地址、持仓、计算器金额或任何可识别个人的信息。
- 不设置FeeEye自有用户ID，不跨站跟踪，不做用户画像。
- 不在用户完成任何金融交易后采集结果；FeeEye也无法观察交易所内行为。

## 启用前检查

1. 登录Cloudflare，确认 Web Analytics 或 Zaraz 的实际配置与数据保留口径。
2. 启用隐藏IP地址、隐藏查询参数等适用的隐私设置。
3. 更新中英文隐私政策，明确列出页面浏览和上述交互事件。
4. 先在预览/调试模式验证事件，不把测试事件混入正式数据。
5. 上线后检查浏览器是否新增Cookie或本地存储；若实践与政策不一致，先停用采集。

## 第一批产品指标

- 搜索使用率：`coin_search_open / 首页浏览量`
- 搜索选择率：`coin_search_result_open / coin_search_open`
- 无结果率：`coin_search_no_result / coin_search_open`
- 对比页进阶功能兴趣：`compare_advanced_open / 对比页浏览量`
- 交易所出站率：`exchange_outbound_open / 对比页或详情页浏览量`

这些指标用于验证页面结构，不用于投资推荐或个体用户评分。
