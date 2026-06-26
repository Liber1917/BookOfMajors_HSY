# 华师一高校指南

基于 [Docusaurus](https://docusaurus.io/) 构建的高校专业选择指南网站，集成 AI 问答助手（RAG + DeepSeek）。

## 项目结构

```
├── api/
│   └── chat.js              # Vercel Serverless Function (处理 /api/chat)
├── chat-backend/             # Express 后端（本地开发/自部署用）
│   ├── server.js
│   └── .env
├── patches/                  # vetradocs-docusaurus 补丁
│   ├── patch-vetradocs.mjs   # 中文搜索、RAG context、CSS 等
│   └── postinstall.sh        # yarn install 后自动应用
├── src/
│   ├── theme/Root.js         # 注入 AI 聊天组件
│   └── css/custom.css        # 样式覆盖
├── static/search-index.json  # 构建时生成（.gitignore）
├── docusaurus.config.js
├── vercel.json
└── package.json
```

## 前置要求

- Node.js >= 18
- yarn
- DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com/)）

## 本地开发

### 安装依赖

```bash
yarn install
```

`postinstall` 脚本会自动给 `vetradocs-docusaurus` 打补丁（中文搜索、RAG context、CSS 等）。

### 启动后端

```bash
cd chat-backend
# 编辑 .env，填入你的 DeepSeek API Key
node server.js
# 服务运行在 http://localhost:3001
```

### 启动前端

```bash
yarn dev
# 服务运行在 http://localhost:3000
```

前端开发服务器自动代理 `/api/chat` 到后端。

## 部署（统一用 Vercel）

前端和后端可以一起部署到 Vercel，无需单独服务器。

### 架构

```
Vercel
├── /            → Docusaurus 静态站点 (build/)
└── /api/chat    → Serverless Function (api/chat.js)
                    → 调用 DeepSeek API + RAG context
```

### 部署步骤

1. **推送代码到 GitHub**

2. **在 Vercel 导入项目**
   - Vercel 自动检测 Docusaurus，使用 `yarn build` 构建
   - `api/chat.js` 自动识别为 Serverless Function

3. **设置环境变量**（Vercel Dashboard → Settings → Environment Variables）

   | 变量 | 说明 |
   |------|------|
   | `CHAT_API_KEY` | 前后端认证 Key，与 `docusaurus.config.js` 中 `chatApiKey` 一致 |
   | `LLM_API_KEY` | DeepSeek API Key |
   | `LLM_BASE_URL` | 可选，默认 `https://api.deepseek.com/v1` |
   | `LLM_MODEL` | 可选，默认 `deepseek-v4-flash` |

4. **部署完成**
   - 前端访问 `https://你的域名.vercel.app`
   - API 自动在 `https://你的域名.vercel.app/api/chat`

> 无需设置 `CHAT_API_ENDPOINT`，前端默认使用同域路径 `/api/chat`。

### 构建流程

```bash
yarn build
# 1. docusaurus build        → 生成 build/
# 2. build-index.mjs         → 生成 static/search-index.json
# 3. cp search-index.json     → 复制到 build/search-index.json
```

## 自部署后端（可选）

如果不想用 Vercel Function，也可以用独立服务器部署 `chat-backend/`：

```bash
cd chat-backend
npm install
export FRONTEND_URL=https://你的前端域名
export LLM_API_KEY=你的DeepSeekKey
node server.js
```

然后用 nginx 反代 `/api/chat`。

## 环境变量说明

| 变量 | 用途 | 生效位置 |
|------|------|----------|
| `CHAT_API_KEY` | 前后端认证 Key（可选，不设则跳过认证） | Vercel / chat-backend / docusaurus.config.js |
| `LLM_API_KEY` | DeepSeek API Key | Vercel / chat-backend |
| `LLM_BASE_URL` | API 地址，默认 DeepSeek | Vercel / chat-backend |
| `LLM_MODEL` | 模型名，默认 `deepseek-v4-flash` | Vercel / chat-backend |

> `.env` 文件仅用于本地开发，**不会**提交到 Git。Vercel 部署时必须在 Dashboard 设置环境变量。

## 技术栈

- **前端:** Docusaurus v3, React 18
- **搜索:** Bigram 字符匹配（替代 Orama，解决中文分词问题）
- **AI:** DeepSeek API（模型: `deepseek-v4-flash`）
- **后端:** Vercel Function / Express（本地开发）
- **流式传输:** SSE
