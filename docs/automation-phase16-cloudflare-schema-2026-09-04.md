# FeeEye 自动化运营第十六阶段：Cloudflare Analytics 安全探测

日期：2026-09-04。目标是在建设正式采集器前，用最小权限验证FeeEye账号实际可用的Web Analytics/RUM GraphQL数据集和类型。

Cloudflare后台已确认`feeeye.com` Web Analytics为自动注入，并选择“Enable, excluding visitor data in the EU”。新Account API Token只有`Account Analytics Read`权限，无DNS、WAF、Pages、Workers或计费修改权限。

`cloudflare-analytics-probe.yml`仅支持手动执行，不定时，不写仓库，不查询任何访问数据行。它只对Cloudflare GraphQL schema执行introspection，并仅保留三个预注册RUM数据集的名称、参数、filter输入字段以及`dimensions/sum/avg`嵌套类型字段。日志不输出Token、账号ID、site tag、URL、referrer或任何指标值。

探测通过后才能根据实际schema建设正式采集器。正式采集仍必须使用固定窗口、只保留汇总访问和受控来源类别，并在持久化前加密。

官方依据：

- https://developers.cloudflare.com/analytics/graphql-api/getting-started/explore-graphql-schema/
- https://developers.cloudflare.com/analytics/graphql-api/features/data-sets/
- https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/
