# 参赛版验证记录

日期：2026-10-15；本地运行环境：Windows、Node.js 24.19.0。

| 层次 | 结果 | 覆盖与限制 |
|---|---|---|
| 核心与存储 | 27/27通过 | 引文完整匹配、证据编号、无证据阻断、余额/密钥失败、去重、副标题、作者边界、返回DOI核对、XML字符、SQLite条件写入与重启恢复 |
| 模拟API路由 | 21/21通过 | 实际研究路由；外部模型、数据源、身份与存储采用测试专用fixtures，覆盖完整AI模拟链路及冲突/故障；无真实模型费用 |
| 独立生产构建HTTP | 本地16/16；此前含外网检查曾16/16、复测15/16 | 最新本地检查增加PUBLIC_ORIGIN代理回归；覆盖前端资源、会话隔离、错误输入、暂停、重启、跨站拒绝、私密文件不可下载。此前外网故障记录保留 |
| 生产构建 | 通过 | 前端约251KB JS、28KB CSS；服务端约63KB，Node内置SQLite，无运行时第三方依赖安装 |
| 魔搭Docker与线上浏览器 | 已运行，部分验收通过 | 免费检索3篇、3篇Crossref身份一致；正确引用通过，错误作者存疑；原会话刷新保留研究，新标签页不显示其他记录；导出与未登录访客继续验收 |
| GitHub CI | 2026-10-17通过 | 代码提交d1047f6：构建、27核心/存储、21模拟路由、16HTTP、Docker构建；[检查记录](https://github.com/Yiiiiihhhh/biomed-evidence-agent/actions/runs/38997001782) |
| 多用户负载 | 待验收 | 两标签页会话对照不能替代并发负载测试 |
| 真实AI摘要阅读/综述 | 2026-10-17小规模通过 | 3篇摘要阅读、9条引文匹配、综述生成；科学解释人工复核与全文读取仍未验收，见live-ai-acceptance.md |

核心/存储27项、模拟路由21项与本地HTTP16项均通过。真实检索曾遇到两来源同时超时，返回SEARCH_FAILED并保留任务；该失败保存在live-outage-http.json。之后魔搭浏览器验收成功，但仍不能据此宣称全程稳定。所有工程检查均不构成准确率、科学性或临床有效性指标。

## 真实检索观察

实际HTTP免费流程输入 `STAT1 AND interferon AND virus`，2020–2026，目标3篇。PubMed命中633条，获取前40条，限量选取3篇；Europe PMC本次失败，保留失败记录。2篇身份字段一致，1篇存在年份差异：检索记录2022年、Crossref来源2021年。保留为人工核对，不将差异直接解释为伪造。

较早的三个真实主题检索为：STAT1/干扰素/病毒，SGLT2/心衰，深度学习/胸片/外部验证。对应历史结果已放在公开存档中；命中数量会随数据库变化，不能推断查全率或纳入质量。

## 魔搭线上观察

空间：https://modelscope.cn/studios/Yiiiiihhhh/biomed-evidence-agent 。实际应用：https://yiiiiihhhh-biomed-evidence-agent.ms.show 。2026年10月15日确认Docker镜像构建成功，空间运行中。反向代理改写Host曾触发来源拒绝，配置实际PUBLIC_ORIGIN后免费流程成功；来源校验未关闭。

浏览器输入 `("type I interferon" OR interferon) AND STAT1 AND (virus OR viral)`，2020–2026，目标3篇。PubMed命中704条、获取前40条，选取3篇均为Crossref身份一致；其中一篇另有更正标记，仍需人工复查。Europe PMC本次查询未完成，审计单独显示。未调用AI、0条证据，不把检索结果当作问题答案。

引用对照：`AI in health and medicine`、Rajpurkar P、2022、DOI `10.1038/s41591-021-01614-0` 返回通过；仅把作者改为Zhang L返回存疑。导出按钮已触发，自动下载回执超时，落盘尚未确认。

引用页误显示研究入口已在本地源码删除并重新构建；魔搭app.css隐藏规则已提交并重新部署，确认运行中且多余按钮不再显示。线上与完整源码的JS构建同步仍需记录。

## 本轮新增修正

- 移除对Sites登录、Cloudflare运行时和R2的依赖，补充可独立启动的HTTP服务与SQLite存储。
- 增加免费流程，完成时明确标为未执行AI阅读；历史数据单独标为存档。
- 研究者会话使用随机凭据隔离，存储只保存凭据哈希，私密数据目录不公开。
- 同一版本条件更新与执行租约阻止重复付费步骤；执行中的任务不允许被删除。
- 修复历史任务的问题列表回填为逗号串的情况，恢复成逐行问题。
- XML十六进制字符正常解码；无效码点不导致解析崩溃。
- 姓氏需要规范化后完整匹配，避免Smith误接受Smithson；返回的DOI也需与请求标识符一致。
- 年份等身份差异给出具体说明；CSV导出防止以公式起始的文本被表格软件解释。

## 可复现证据

运行README中的命令即可生成 `test-results/route-scenarios.json` 和 `test-results/portable-http.json`。测试fixture只存在测试脚本中，生产服务器没有测试账号、伪造结果或绕过身份的开关。

真实免费流程依赖公开接口。当外部服务不可达时，测试会失败并留下错误，不能为了测试通过而把来源故障改成空检索结果。

## 2026年10月17日公开发布

完整50文件首次源码已发布到[公开仓库](https://github.com/Yiiiiihhhh/biomed-evidence-agent)，代码提交`d1047f69e24b0729bd153ea23ebbfc5631ecfe91`。[远端CI](https://github.com/Yiiiiihhhh/biomed-evidence-agent/actions/runs/38997001782)全部步骤成功。证据见test-evidence/github-ci.json；未调用付费模型，不代表真实AI科学解释效果。后续若仅更新文档，以该代码提交的CI证据为准。

## 真实AI验收补充

10月17日已跑通实际DeepSeek连接与3篇摘要AI阅读，9条引文匹配、综述生成，见live-ai-acceptance.md与test-evidence/live-ai-browser.json。来源截断、Europe PMC查询未完成及更正标记如实披露。导出落盘尚未确认，不重复调用付费模型冒充导出测试。
