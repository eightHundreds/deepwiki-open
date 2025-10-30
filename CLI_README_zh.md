# DeepWiki CLI - 项目文档生成工具

DeepWiki CLI 是一个命令行工具，可以为您的代码仓库生成全面的文档。它使用 AI 分析仓库结构，并在 `.repo-wiki` 目录中生成 Markdown 文档。

## 功能特点

- 🤖 使用 AI（Google Gemini、OpenAI 或 Ollama）自动生成文档
- 📁 在项目中的 `.repo-wiki` 目录生成文档
- 🌍 支持多语言（英语、中文、日语、西班牙语、韩语、越南语、葡萄牙语、法语、俄语）
- 📊 自动生成 Mermaid 架构图
- ⚙️ 可配置的输出，支持自定义排除规则
- 📚 可选择简洁（4-6 页）或全面（8-12 页）的文档

## 安装

### 前置要求

- Node.js 18+ 和 npm
- Python 3.11+
- Poetry（用于 Python 依赖）

### 安装依赖

1. 安装 Node.js 依赖：
```bash
npm install
# 或
yarn install
```

2. 安装 Python 依赖：
```bash
cd api
poetry install
cd ..
```

### 全局安装 CLI（可选）

要在任何地方使用 `deepwiki` 命令：

```bash
npm link
# 或
yarn link
```

## 使用方法

### 基本用法

为当前目录生成文档：

```bash
node bin/deepwiki.js
```

或者如果已全局安装：

```bash
deepwiki
```

### 为特定仓库生成文档

```bash
deepwiki /path/to/your/repo
```

### 选项

```
Usage: deepwiki [options] [path]

为您的代码仓库生成全面的文档

Arguments:
  path                           仓库路径（默认为当前目录）

Options:
  -V, --version                  输出版本号
  -o, --output <dir>             输出目录名称（默认：".repo-wiki"）
  -l, --language <lang>          文档语言（en, zh, ja, es, kr, vi, pt-br, fr, ru）（默认："en"）
  --provider <provider>          LLM 提供商（google, openai, ollama）（默认："google"）
  --model <model>                使用的模型名称
  --exclude-dirs <dirs>          要排除的目录列表（逗号分隔）
  --exclude-files <files>        要排除的文件列表（逗号分隔）
  --comprehensive                生成全面的文档（8-12 页而不是 4-6 页）
  --api-key <key>                LLM 提供商的 API 密钥（或使用环境变量）
  -h, --help                     显示帮助信息
```

### 示例

#### 使用 Google Gemini 生成文档（默认）

```bash
export GOOGLE_API_KEY=your_api_key
deepwiki
```

#### 使用 OpenAI 生成文档

```bash
export OPENAI_API_KEY=your_api_key
deepwiki --provider openai
```

#### 生成中文的全面文档

```bash
deepwiki --comprehensive --language zh
```

#### 排除特定目录

```bash
deepwiki --exclude-dirs node_modules,dist,build
```

#### 为特定仓库生成文档

```bash
deepwiki /path/to/repo --output /path/to/repo/.repo-wiki
```

#### 使用特定模型

```bash
deepwiki --provider google --model gemini-2.5-pro
```

## 环境变量

CLI 使用以下环境变量：

- `GOOGLE_API_KEY`: Google Gemini API 密钥（使用 Google 提供商时必需）
- `OPENAI_API_KEY`: OpenAI API 密钥（使用 OpenAI 提供商时必需）
- `OLLAMA_HOST`: Ollama 主机 URL（可选，默认为 http://localhost:11434）

您可以在项目根目录的 `.env` 文件中设置这些变量：

```bash
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 输出结构

CLI 会生成一个 `.repo-wiki` 目录（或自定义输出目录），结构如下：

```
.repo-wiki/
├── README.md           # 索引页面，包含所有文档页面的链接
├── _structure.json     # wiki 结构的元数据
├── page-1.md          # 各个文档页面
├── page-2.md
└── ...
```

每个页面包括：
- 标题和描述
- 相关代码示例
- 架构图（使用 Mermaid）
- 最佳实践和使用指南

## 支持的语言

- `en` - English（英语）
- `zh` - Simplified Chinese（简体中文）
- `zh-tw` - Traditional Chinese（繁体中文）
- `ja` - Japanese（日本語）
- `es` - Spanish（Español）
- `kr` - Korean（한국어）
- `vi` - Vietnamese（Tiếng Việt）
- `pt-br` - Brazilian Portuguese（Português Brasileiro）
- `fr` - French（Français）
- `ru` - Russian（Русский）

## LLM 提供商

### Google Gemini（默认）

```bash
export GOOGLE_API_KEY=your_api_key
deepwiki --provider google
```

默认模型：`gemini-2.5-flash`

### OpenAI

```bash
export OPENAI_API_KEY=your_api_key
deepwiki --provider openai
```

默认模型：`gpt-4o`

### Ollama（本地）

```bash
# 确保 Ollama 在本地运行
deepwiki --provider ollama --model llama3
```

## 故障排除

### API 密钥问题

如果您遇到有关缺少 API 密钥的错误：
- 确保您已设置适当的环境变量（GOOGLE_API_KEY 或 OPENAI_API_KEY）
- 或使用 `--api-key` 选项直接提供密钥

### Python 依赖

如果您遇到导入错误：
- 确保您已安装 Python 依赖：`cd api && poetry install`
- 验证 Python 3.11+ 已安装：`python3 --version`

### 权限问题

如果您遇到权限拒绝错误：
- 确保输出目录可写
- 检查您对仓库目录有读取权限

## 开发

要为 DeepWiki CLI 做出贡献：

1. 克隆仓库
2. 安装依赖（Node.js 和 Python）
3. 进行更改
4. 测试 CLI：`node bin/deepwiki.js`
5. 提交拉取请求

## 许可证

MIT 许可证 - 详见 LICENSE 文件

## 相关项目

- [DeepWiki Web](https://github.com/AsyncFuncAI/deepwiki-open) - 具有交互式 UI 和聊天功能的完整 Web 应用程序
