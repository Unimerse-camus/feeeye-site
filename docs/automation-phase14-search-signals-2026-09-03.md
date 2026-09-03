# FeeEye 自动化运营第十四阶段：搜索数据桥接

日期：2026-09-03。状态：GSC连接器本地实现；凭据与变量未配置，不访问Google、Bing或Cloudflare。

## Google Search Console

连接器使用OAuth 2.0和`webmasters.readonly`最小范围。每周读取延迟3天的最终28日窗口，只请求`page`维度、点击、曝光和平均排名；不请求或保存查询词、国家、设备或用户信息。

返回页面必须属于`https://feeeye.com`且存在于当前canonical manifest。带查询参数、站外地址和未登记页面被丢弃，同时把覆盖标记为partial；达到25,000行上限也标记partial。输出直接进入现有页面机会队列，但只生成已有页面审查候选，不自动建页或发布。GSC页面数据与机会详情使用`FEEEYE_OPS_DATA_KEY`执行AES-256-GCM认证加密；公开分支和持久artifact只保留密文，非敏感summary仅包含行数和覆盖状态。

定时工作流`search-signals-gsc.yml`每周一02:17 UTC运行，要求`FEEEYE_GSC=enabled`、三个OAuth Secrets、精确GSC property变量以及私有数据加密Secret。当前均未配置，因此不会运行。

## Bing

旧SOAP/POX接口已于2026-08-31退役，策略明确禁止接入。等待确认新版REST认证和响应结构后再实现，不使用旧apikey示例继续运行。

## Cloudflare

官方推荐使用限制到Account Analytics Read的API Token访问GraphQL。实现前需对FeeEye所在zone执行只读schema/dataset introspection，确认当前套餐可用的Web Analytics数据集；在此之前不猜测dataset名称。

官方依据：

- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- https://developers.google.com/webmaster-tools/v1/api_reference_index
- https://learn.microsoft.com/en-us/bingwebmaster/
- https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/
