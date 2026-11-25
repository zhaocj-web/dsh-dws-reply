# DSH · 钉钉个人代答

基于 DeepSeek Harness 和 DWS 的个人钉钉代答插件，使用 TypeScript / React 开发。

## 功能

- 私聊及群聊 @ 消息监听、指定名单、草稿与自动发送模式。
- 全局和会话专属回复规则、回复风格、模型选择。
- 内部 AI 对话：根据对话意图发送到当前会话或调整专属规则，显示实际执行结果。
- 来信、回复、模型推理、工具调用及知识库参考片段的本地保存。
- 本地 TXT / Markdown / 问答资料，钉钉知识库浏览、预览与手动同步。
- 图片消息处理、重复消息防护、实例锁及失效锁清理。

## 开发

需要 Node.js 22+。DSH 宿主提供 React 与 `@deepseek-ai/dsh-llm` 运行时。

```sh
npm ci --legacy-peer-deps
npm run check
npm run build
```

构建结果在 `lib/`，通过 DSH 的本地插件加载机制加载项目。插件标识为 `dsh-dws-personal-reply`，注册配置在 `cordis.patch.yml`。后端接口或运行逻辑更新后需要重启宿主。

DWS 默认路径为 `~/.local/bin/dws`，可通过宿主进程的 `DWS_BIN` 环境变量覆盖。首次使用需要关联已登录的钉钉账号、配置回复名单并保存。默认关闭监听和自动发送。

## 数据与当前限制

- 本地配置及记录位于 `$DSH_HOME/plugins/dws-personal-reply/`；未设置时使用 `~/.dsh/plugins/dws-personal-reply/`。
- 当前每个账号仅保留最近 30 条处理记录，不是无限历史归档。
- 知识库使用本地关键词检索，不是向量检索。钉钉文档使用手动同步的本地文字副本。
- 本地资料支持 TXT / Markdown；钉钉资料目前支持在线文字文档，暂不解析表格或 PDF。
- 个人微信尚未接入。
- 发送结果未知时不自动重发。真实账号及模型兼容性需在对应环境中验证。

开发规范见 [AGENTS.md](AGENTS.md)。仓库不包含运行账号配置、聊天数据、依赖目录或构建产物。
