# FeeEye 自动化运营第十七阶段：Cloudflare 加密聚合采集

日期：2026-09-04。本阶段使用已验证的`Account Analytics Read` Token和实际GraphQL schema，只读取Cloudflare Web Analytics/RUM汇总。

采集窗口固定为截止昨日的完整28个UTC日。请求同时绑定FeeEye account tag、Web Analytics site tag、`feeeye.com`主机和`bot=0`。页面加载数据只请求日期、referrer host、事件计数和访问数；referrer host在内存中立即映射为`direct/search/ai/social/self/other`六类，不保存原始值。不请求路径、IP、User-Agent、国家、设备指纹或用户标识。

性能仅保留每日P75的FCP、页面加载时间、LCP、INP、CLS和TTFB。完整结果使用`FEEEYE_OPS_DATA_KEY`执行AES-256-GCM认证加密，密文以窗口截止日命名写入`automation-receipts/analytics/cloudflare/`。公开日志和artifact仅包含窗口、天数、六个类别名和加密状态，不含指标值。

定时工作流每周一02:27 UTC运行，只在`FEEEYE_CLOUDFLARE_ANALYTICS=enabled`时启用。手动运行可用于预检，但同样只能执行读取与密文保存，不能修改Cloudflare配置。
