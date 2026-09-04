# FeeEye 自动化运营第二十二阶段：反馈驱动的修订证据规划

日期：2026-09-04。Phase 21 已将用户反馈安全聚合为文章、语言和固定原因计数。本阶段将通过样本门槛的候选转换为可执行的证据路由，但不在缺少证据时生成或推送内容改动。

路由规则：

- `broken_link` 进入 HTTP 状态、重定向链和一手来源范围核验。
- `outdated` 进入官方来源时效与适用范围复核。
- `missing_step` 进入任务流程缺口检查。
- `unclear` 进入歧义声明或操作指令定位。
- `other` 进入用户任务与页面范围检查。

每个计划强制绑定当前生产构建ID、Git revision、中英两张canonical页面及其SHA-256。若任一对应页正在另一实验中，计划只能 `hold_for_active_experiment`。

反馈只证明“值得复核”，不证明用户的事实判断正确。在官方来源、中英语义、当前build和实验冲突证据齐全前，`content_patch_allowed`、`pull_request_allowed`、自动发布全部为 `false`。

工作流可在每周一 03:17 UTC 运行，但只有 `FEEEYE_FEEDBACK_REVISION=enabled` 时才会定时触发。它仅解密内部回执、生成当前站点inventory并写入新的加密规划，不调用Google、Cloudflare、X或任何外部API。
