# FeeEye 自动化运营第二十一阶段：反馈聚合、加密与改进队列

日期：2026-09-04。Phase 20 的真实 schema 探测显示，`zarazTrackAdaptiveGroups` 可查询的维度只包括时间、`trackName` 和 `urlPath`，不包括 Zaraz 自定义事件属性。因此本阶段不假设属性可读，而是把反馈类别编码为六个固定事件名，文章和语言由已注册学习页的 `urlPath` 映射。

允许的事件仅为：

- `content_feedback_helpful`
- `content_feedback_unclear`
- `content_feedback_missing_step`
- `content_feedback_outdated`
- `content_feedback_broken_link`
- `content_feedback_other`

采集器另读取 `article_end_view` 作为分母上界。查询使用截至昨日的28个完整UTC日，仅请求 `count` 以及 `date / trackName / urlPath`，行数上限1万。未注册路径、非学习文章或异常行立即排除，并将覆盖标记为 `partial`。

合法路径只在内存中用于映射已注册的文章ID和 `en/zh`，原始路径不进入快照、日志或公开摘要。聚合快照与改进队列都使用 AES-256-GCM 加密。

改进队列延续Phase 20的预注册门槛：普通候选需至少5份反馈、3份负向且负向率至少40%；同页至少2次链接错误或内容过时可进入紧急复核。任何候选仍需一手来源、中英语义复核、实验冲突检查和部署验证；自动改页与自动发布保持关闭。

工作流在每周一 03:07 UTC 有计划入口，但只有 `FEEEYE_FEEDBACK=enabled` 时才会自动执行。它还需要精确的 `FEEEYE_CLOUDFLARE_ZONE_ID`；在变量和权限完成前保持 fail closed。
