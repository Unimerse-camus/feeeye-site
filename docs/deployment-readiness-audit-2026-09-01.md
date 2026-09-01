# FeeEye 部署前远程门禁审计

日期：2026-09-01。范围：GitHub公开只读接口、Cloudflare后台只读页面、本地候选。没有修改远程配置，没有推送或部署。

## 结论

Cloudflare会自动部署main的每次push，因此候选不能直接push到main。审计时缺失的GitHub保护和Cloudflare明文变量已在获得明确授权后整改；候选仍应通过功能分支PR进入main。

## 本地候选

- 候选已rebase到远程`ae29d3a`之后，保留最新`data/coins.json`。
- 修复了自动行情刷新错误改写7家交易所整体`last_updated`的问题：恢复为实际费率证据日期2026-08-27；以后只写独立的行情字段获取时间。
- 完整本地验证通过：392个canonical URL；IndexNow仍为dry run。
- 旧的`submit_indexnow.mjs --submit`全量旁路已关闭；提交必须绑定增量清单、同build部署回执和新回执路径，并在提交前再次核对线上release。

## GitHub只读结果

- 仓库：`Unimerse-camus/feeeye-site`，公开，默认分支`main`。
- 审计时远程main：`ae29d3a`，由行情刷新机器人生成。
- 审计初始状态为`protected=false`且规则集为空。整改后创建经典main保护，并由GitHub公开分支接口确认`protected=true`。
- 必须通过PR；单人仓库没有设置强制他人批准，避免无法批准自己的PR。
- 必过检查为GitHub Actions的`validate`，合并前分支必须与最新main同步。
- 管理员不得绕过；force push和删除保持禁用。
- Actions变量接口要求认证，本次不能据此断言`FEEEYE_OPS_MONITORING`是否存在；新增健康排程本身仍有代码级变量锁。
- GitHub Pages接口404符合预期：实际托管为Cloudflare Pages，不是GitHub Pages。

## Cloudflare Pages只读结果

- 项目：`feeeye-site`；Git仓库连接为上述GitHub仓库。
- 构建命令：`node build/generate.mjs`。
- 输出目录：`dist`；根目录留空，即仓库根目录。
- 生产分支：`main`；Automatic deployments为Enabled。
- Build watch include paths为`*`；Build system Version 3；Build cache Disabled；没有Deploy Hooks。
- 生产域名包括`feeeye.com`、`www.feeeye.com`和pages.dev域名。
- 最新生产部署与GitHub远程`ae29d3a`一致，说明main push会触发生产部署。
- Preview部署默认公开。当前站点无用户后台和私有预览数据，但未来若加入私有功能需重新评估。

## 凭据风险

Cloudflare中存在名为`COINGECKO_API_KEY`的变量，类型显示为普通Text，后台直接展示值，而不是加密Secret。实际值不会写入本报告或代码。

当前Cloudflare构建命令只运行`generate.mjs`，不会调用CoinGecko抓取；行情刷新在GitHub Actions中使用GitHub Secrets。因此该Cloudflare变量对当前构建没有必要。

整改结果：获得逐步明确授权后，Cloudflare中的普通文本变量已删除并复核不存在；CoinGecko新Key已创建并写入GitHub加密Secret，旧`feeeye-prod` Key已删除。实际值未写入聊天、文件或报告。

## 安全发布顺序

1. CoinGecko密钥轮换及Cloudflare普通文本副本删除均已完成。
2. main保护已启用：要求PR和`validate`，禁止管理员绕过、force push与删除。候选代码已将行情机器人改成专用分支PR，不再直接push main。
3. 重新获取远程main并rebase候选，运行全套验证。
4. 明确批准push。Cloudflare会自动生产部署，不能把push视为“仅上传代码”。
5. 等待Cloudflare成功后，用release.json确认build ID和source revision。
6. 另行批准增量IndexNow提交；受理不等于收录。
7. 最后批准X首批内容；保存帖子URL并复核公开可见。

第1、2步均已完成。候选代码已在本地功能分支准备好；推送和创建PR仍需单独授权。

## 远程整改回执

- Cloudflare变量删除：已保存，变量表为空状态已复核。
- GitHub保护创建：页面显示“Branch protection rule created”。
- GitHub公开分支接口：`protected=true`，required check context为`validate`，来源为GitHub Actions。
- 以上修改没有触发Cloudflare生产部署；生产main仍停留在`ae29d3a`。

## 凭据轮换回执

- 新Key标签：`FeeEye GitHub Rotation 2026-09-01`。
- GitHub Repository Secret `COINGECKO_API_KEY`更新时间已变为2026-09-01。
- 手动验证运行：`refresh-coin-data #189`。日志确认通过新Secret从CoinGecko取得150个币种。
- 验证目标达成后立即请求取消运行，避免继续消耗额度和旧版工作流尝试写main。
- CoinGecko旧`feeeye-prod` Key已删除并在刷新后的列表中确认不存在。
- `feeeye-ci`未修改；新轮换Key保留。最终Key数量为2/5。
- 任何Key值均未写入仓库、本地文件或本报告。

## 行情自动化整改补充

候选中的`refresh-coins.yml`已移除普通main push触发，只保留每日定时与手动触发。发现数据变化后：

- 在专用`automation/refresh-market-data`分支提交。
- 对提交后的精确树再次运行完整验证。
- 更新专用远程分支并创建/更新PR。
- 需要`pull-requests: write`，但没有main直接push步骤。
- 并发组禁止同一刷新任务互相覆盖运行。

专用自动化分支允许`--force-with-lease`更新候选，但不能对main使用；main保护规则仍是远程必需项。
