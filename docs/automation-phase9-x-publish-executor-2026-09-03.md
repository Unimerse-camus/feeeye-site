# FeeEye 自动化运营第九阶段：X发布执行器

日期：2026-09-03。状态：本地实现与离线测试；尚未部署发布工作流、尚未发送测试帖，生产政策仍为`shadow`且X渠道关闭。

## 已实现边界

- 只调用官方X API：身份检查`GET /2/users/me`、最近帖子对账`GET /2/users/{id}/tweets`、根级发帖`POST /2/tweets`。
- 目标账号必须精确匹配`@FeeEyeOfficial`；请求不允许任何`@mention`，执行器没有回复、私信、点赞、关注、转发或删除接口。
- 每次只允许一条根级教育帖，必须包含且只包含一个`https://feeeye.com`落地页，UTM限定为`x / social / <registered-campaign>`，拒绝额外参数、用户信息、片段和站外链接。
- 内容类型只允许策略白名单；部署build、Git revision、生产验证时间、中英文验证时间、五项门禁和内容幂等键必须全部匹配。
- 发布窗口固定15分钟。太早、过期、shadow、总发布开关关闭、X渠道关闭、应急停止、预算不在`(0,5]`美元或live环境变量缺失时均拒绝。
- 发布前读取最近10条非回复/非转发根帖：相同正文与展开后落地页直接返回对账回执，不重发；七天已有3条根帖时停止。
- 发帖JSON只有`text`和`made_with_ai:true`。网络异常后只做一次最近帖子对账；仍不明确时进入`unknown/reconciliation`错误，禁止自动重试。
- 成功回执只保存request ID、幂等键、账号、帖子URL、是否由对账发现、是否本次创建和时间；不会输出密钥或完整正文。

## 尚未启用的原因

连接检查已经证明OAuth凭据可读取`@FeeEyeOfficial`，但真实写入仍需独立的小范围验收，并需要把成功/未知回执放到跨运行持久存储中。目前`autonomy-policy.json`保持`mode=shadow`、`publishing_enabled=false`、`channels.x.enabled=false`，因此即使Secrets存在也无法发帖。

下一步应先部署只做preflight的工作流并保存构建与双语验证回执；随后用一条明确批准的品牌教育测试帖验证写入与回执。在测试通过、X公开页面可见、账单符合预期、重复运行只对账不重发之后，才评估启用定时队列。

官方依据：X允许合规的信息类自动帖子，但禁止非API网页脚本、重复/近似刷屏、误导链接、自动点赞以及未经请求的批量回复或私信。发帖使用`POST /2/tweets`，OAuth 1.0a User Context受支持。

- https://help.x.com/en/rules-and-policies/x-automation
- https://docs.x.com/x-api/posts/create-post
- https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping
