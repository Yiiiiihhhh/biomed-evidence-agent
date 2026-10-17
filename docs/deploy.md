# 上线与提交：按顺序操作

项目建议命名 `biomed-evidence-agent`。你提供的 GitHub 和魔搭用户名均为 `Yiiiiihhhh`。以下地址只描述命名规则，在实际创建、公开访问验收之前都不是已上线证明。

## 一、发布GitHub源码

2026年10月17日已创建公开仓库：https://github.com/Yiiiiihhhh/biomed-evidence-agent 。下列步骤保留供复现，现有项目无需重复创建。

1. 解压参赛包，找到有 `README.md`、`package.json` 和 `Dockerfile` 的目录。
2. 登录 [GitHub新建仓库页](https://github.com/new)。Owner应为自己的账号。
3. Repository name填 `biomed-evidence-agent`，选择 **Public**。简介可填“可追溯的生物医学文献检索、引用核验与AI阅读工作台”。
4. 不在网页另外生成README或许可证；源码包已经带有说明和来源记录。你已确认参考源码可以公开发布，来源说明保存在PROVENANCE.md中。
5. 点击Create repository。进入仓库后选择Upload files，拖入解压目录中的文件和子文件夹，保留目录结构。不要只上传整个ZIP当作源码。
6. 提交说明填 `Prepare BioMed hackathon release`，完成提交。
7. 用未登录的浏览器打开仓库，确认能看到README、Dockerfile和源码文件夹。预期命名下的地址格式为 `https://github.com/Yiiiiihhhh/biomed-evidence-agent`，必须以实际仓库页面复制的地址为准。

GitHub支持浏览器上传文件/目录，一次最多100个文件、每个最多25MiB。此交付包规模在该范围内。[GitHub官方上传说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 二、部署魔搭

1. 登录 [魔搭创空间](https://modelscope.cn/studios)。
2. 本项目使用Docker运行环境。按魔搭要求先完成阿里云账号绑定和实名认证；由你本人在官方页面完成身份信息和协议步骤。[官方部署文档](https://modelscope.cn/docs/studios/docker)
3. 新建代码类创空间，名称填 `biomed-evidence-agent`，运行环境选择 **Docker**。
4. 可见性选公开，选择页面实时提供的**免费CPU**资源，不需要GPU。`ms_deploy.json`中的资源标识只是候选配置；若页面没有免费选项，先停止，不选择收费资源。
5. 通过创建页面提供的项目上传入口上传解压后的完整目录；若页面只提供Git方式，使用该页面给出的实际仓库地址同步代码。根目录必须能看见Dockerfile与package.json，不能多套一层文件夹。
6. 服务监听 `0.0.0.0:7860`，Dockerfile已配置。持久数据目录为 `/mnt/workspace/biomed`，需对容器node用户可写。不要把自己的DeepSeek密钥加入环境变量或源码给所有人共享。
7. 等待构建和启动日志显示成功。若有日志错误，保留完整错误信息再排查；不要把状态“创建成功”当成“应用已运行”。
8. 打开实际空间页面，按下方验收步骤检查。部署链接从成功运行的空间页面复制，应为HTTPS魔搭空间地址。

魔搭Docker运行端口、账号前置条件与持久目录依据[ModelScope官方维护的部署说明](https://modelscope.cn/skills/modelscope/modelscope-studio)。资源额度和可用选项以创建时页面为准。

## 三、上线验收

先在未登录浏览器中打开网站，确认不用站长账号也能进入。按演示脚本完成免费检索、引用核验、导出审计文件；再开启第二个独立浏览器空间，确认看不到第一个人的研究记录。

若反向代理把Host改成内部地址导致同源校验报错，设置 `PUBLIC_ORIGIN` 为实际应用的HTTPS源地址，不带路径；不要通过关闭来源校验来修复。确认魔搭嵌入页面和独立应用页面都可用。本次实际创空间已设置 PUBLIC_ORIGIN=https://yiiiiihhhh-biomed-evidence-agent.ms.show；复制项目到其他空间时，应使用该空间自己的实际域名。

有可用模型余额时，使用你自己的密钥完成一次3篇以内的AI阅读与综述，并检查每条原文引文和论断。该步骤按模型平台规则产生费用。2026年10月17日已完成真实3篇摘要AI阅读、9条引文匹配及综述生成，见live-ai-acceptance.md；专业解释复核和全文读取尚未验收。

检查容器重启后同一会话能否恢复任务；持久目录或访问入口失效时，要如实说明。然后录制三分钟真实演示；不要把测试fixture或静态HTML录像当成线上运行。

## 四、填写比赛表单

作品名称：`BioMed 循证文献工作台——AI驱动的可追溯研究助手`

GitHub仓库链接：粘贴实际公开仓库地址。

魔搭部署链接：粘贴实际成功运行的公开创空间地址。

先保存草稿，确认两条链接在评委视角可访问、作品说明与真实功能一致，再正式提交。

提交入口：[天猫OPC孵化赛道初赛](https://www.tuotuzju.com/hackathon/2/challenges?track=campus&stage=initial)。2026年10月17日重新核实，官网当前显示初赛10.18 00:00—10.20 23:00，线上、自由命题、尚未开放，鼓励运行演示、试点验证与用户反馈；GitHub与魔搭链接需为HTTPS且评委可直接访问。医学方向要求数据可靠、注明来源并由专业人员复核，不替代诊疗意见。赛题PDF尚未提供，团队资格、最新变动和PDF细则仍需核对。

本轮除项目名称、GitHub和魔搭链接，还需商业一页纸（PDF/PPT/PPTX≤30MB）与Demo视频（MP4/WebM/MOV≤200MB），网页均有必填标记。商业附件已准备business-onepager.pdf；视频待录制，尚未完成正式提交。
