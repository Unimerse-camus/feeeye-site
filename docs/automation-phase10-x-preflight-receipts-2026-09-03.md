# FeeEye 自动化运营第十阶段：X预检证据与追加式回执

日期：2026-09-03。状态：本地实现；X发布仍关闭，预检工作流不读取X Secrets、不调用X API、不发送帖子。

## 自动预检

`x-preflight.yml`只能从冻结的FeeEye教育文案中选择一条无图片帖子。它先生成当前构建，等待`feeeye-site.pages.dev`的`release.json`精确匹配当前main revision与build ID，再执行八组线上中英文页面检查。只有两份回执匹配，才生成绑定正文、落地页、部署版本、Git revision、五项门禁和幂等键的单帖请求。

生成的请求有5分钟准备期和15分钟发布窗口，但当前策略固定返回blocked shadow报告。工作流上传部署回执、双语回执、请求和预检报告，保留30天，不接触X凭据。

## 长期回执模型

`x_receipt_store.mjs`把每个发布回执按64位幂等键保存为独立JSON。首次写入使用排他创建；相同内容重复写入返回既有记录，不同内容复用同一幂等键会失败。回执必须匹配请求、`@FeeEyeOfficial`、真实帖子URL、时间和`post_created/reconciled`互斥状态。

未来启用真实写入时，回执应保存到独立的、非部署分支或同等的长期追加式存储；GitHub Actions artifact只作为短期证据，不能单独充当永久账本。若发帖响应不明确，发布器先查询近期帖子对账；没有匹配时停止，禁止重发。

## 当前不做

- 不创建真实发布workflow。
- 不把`mode`改为`autonomous`。
- 不启用`publishing_enabled`或X渠道。
- 不自动发帖、回复、私信、点赞、转发或删除。
- 不把Secrets写入构建产物、artifact、日志或回执。
