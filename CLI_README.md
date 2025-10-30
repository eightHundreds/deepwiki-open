# DeepWiki CLI

DeepWiki CLI is a command-line tool that generates comprehensive documentation for your code repositories using AI. It analyzes your repository structure and generates markdown documentation in a `.repo-wiki` directory.

## Features

- 🤖 AI-powered documentation generation using Google Gemini, OpenAI, or Ollama
- 📁 Generates documentation in a `.repo-wiki` directory within your project
- 🌍 Multi-language support (English, Chinese, Japanese, Spanish, Korean, Vietnamese, Portuguese, French, Russian)
- 📊 Automatic generation of Mermaid diagrams for architecture visualization
- ⚙️ Configurable output with customizable exclusions
- 📚 Choose between concise (4-6 pages) or comprehensive (8-12 pages) documentation

## Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Poetry (for Python dependencies)

### Install Dependencies

1. Install Node.js dependencies:
```bash
npm install
# or
yarn install
```

2. Install Python dependencies:
```bash
cd api
poetry install
cd ..
```

### Install CLI Globally (Optional)

To use the `deepwiki` command from anywhere:

```bash
npm link
# or
yarn link
```

## Usage

### Basic Usage

Generate documentation for the current directory:

```bash
node bin/deepwiki.js
```

Or if installed globally:

```bash
deepwiki
```

### Generate Documentation for a Specific Repository

```bash
deepwiki /path/to/your/repo
```

### Options

```
Usage: deepwiki [options] [path]

Generate comprehensive documentation for your code repository

Arguments:
  path                           Path to the repository (defaults to current directory)

Options:
  -V, --version                  output the version number
  -o, --output <dir>             Output directory name (default: ".repo-wiki")
  -l, --language <lang>          Documentation language (en, zh, ja, es, kr, vi, pt-br, fr, ru) (default: "en")
  --provider <provider>          LLM provider (google, openai, ollama) (default: "google")
  --model <model>                Model name to use
  --exclude-dirs <dirs>          Comma-separated list of directories to exclude
  --exclude-files <files>        Comma-separated list of files to exclude
  --comprehensive                Generate comprehensive documentation (8-12 pages instead of 4-6)
  --api-key <key>                API key for the LLM provider (or use environment variables)
  -h, --help                     display help for command
```

### Examples

#### Generate documentation with Google Gemini (default)

```bash
export GOOGLE_API_KEY=your_api_key
deepwiki
```

#### Generate documentation with OpenAI

```bash
export OPENAI_API_KEY=your_api_key
deepwiki --provider openai
```

#### Generate comprehensive documentation in Chinese

```bash
deepwiki --comprehensive --language zh
```

#### Exclude specific directories

```bash
deepwiki --exclude-dirs node_modules,dist,build
```

#### Generate documentation for a specific repository

```bash
deepwiki /path/to/repo --output /path/to/repo/.repo-wiki
```

#### Use a specific model

```bash
deepwiki --provider google --model gemini-2.5-pro
```

## Environment Variables

The CLI uses the following environment variables:

- `GOOGLE_API_KEY`: Google Gemini API key (required when using Google provider)
- `OPENAI_API_KEY`: OpenAI API key (required when using OpenAI provider)
- `OLLAMA_HOST`: Ollama host URL (optional, defaults to http://localhost:11434)

You can set these in a `.env` file in the project root:

```bash
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Output Structure

The CLI generates a `.repo-wiki` directory (or custom output directory) with the following structure:

```
.repo-wiki/
├── README.md           # Index page with links to all documentation pages
├── _structure.json     # Metadata about the wiki structure
├── page-1.md          # Individual documentation pages
├── page-2.md
└── ...
```

Each page includes:
- Title and description
- Relevant code examples
- Architecture diagrams (using Mermaid)
- Best practices and usage guidelines

## Supported Languages

- `en` - English
- `zh` - Simplified Chinese (中文)
- `zh-tw` - Traditional Chinese (繁體中文)
- `ja` - Japanese (日本語)
- `es` - Spanish (Español)
- `kr` - Korean (한국어)
- `vi` - Vietnamese (Tiếng Việt)
- `pt-br` - Brazilian Portuguese (Português Brasileiro)
- `fr` - French (Français)
- `ru` - Russian (Русский)

## LLM Providers

### Google Gemini (Default)

```bash
export GOOGLE_API_KEY=your_api_key
deepwiki --provider google
```

Default model: `gemini-2.5-flash`

### OpenAI

```bash
export OPENAI_API_KEY=your_api_key
deepwiki --provider openai
```

Default model: `gpt-4o`

### Ollama (Local)

```bash
# Make sure Ollama is running locally
deepwiki --provider ollama --model llama3
```

## Troubleshooting

### API Key Issues

If you get an error about missing API keys:
- Make sure you've set the appropriate environment variable (GOOGLE_API_KEY or OPENAI_API_KEY)
- Or use the `--api-key` option to provide the key directly

### Python Dependencies

If you get import errors:
- Make sure you've installed the Python dependencies: `cd api && poetry install`
- Verify that Python 3.11+ is installed: `python3 --version`

### Permission Issues

If you get permission denied errors:
- Make sure the output directory is writable
- Check that you have read permissions for the repository directory

## Development

To contribute to DeepWiki CLI:

1. Clone the repository
2. Install dependencies (Node.js and Python)
3. Make your changes
4. Test the CLI: `node bin/deepwiki.js`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Related Projects

- [DeepWiki Web](https://github.com/AsyncFuncAI/deepwiki-open) - Full web application with interactive UI and chat features
