#!/usr/bin/env node
const http = require('http');

const PORT = process.env.MOCK_DEEPSEEK_PORT ? Number(process.env.MOCK_DEEPSEEK_PORT) : 3800;

const structureXml = `<?xml version="1.0" encoding="UTF-8"?>
<wiki_structure>
  <title>DeepWiki Open Project Wiki</title>
  <description>Concise documentation generated via the DeepSeek provider for the deepwiki-open repository.</description>
  <pages>
    <page>
      <id>project-overview</id>
      <title>Project Overview</title>
      <description>Summarises the Node.js/Next.js application, CLI, and supporting infrastructure.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>package.json</file_path>
        <file_path>next.config.ts</file_path>
        <file_path>README.md</file_path>
      </relevant_files>
    </page>
    <page>
      <id>cli-engine</id>
      <title>CLI Documentation Generator</title>
      <description>Explains how the Node CLI orchestrates repository analysis and DeepSeek requests.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>bin/deepwiki.js</file_path>
        <file_path>cli/generate-docs.js</file_path>
        <file_path>CLI_README.md</file_path>
      </relevant_files>
    </page>
    <page>
      <id>frontend-ux</id>
      <title>Frontend Workflow</title>
      <description>Outlines the Next.js UI flow for submitting repositories and reviewing generated wikis.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>src/app/page.tsx</file_path>
        <file_path>src/components/ConfigurationModal.tsx</file_path>
        <file_path>src/hooks/useProcessedProjects.ts</file_path>
      </relevant_files>
    </page>
    <page>
      <id>api-integration</id>
      <title>API Bridge to Python Backend</title>
      <description>Details the Next.js API routes that proxy requests to the legacy Python service.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>src/app/api/wiki/projects/route.ts</file_path>
        <file_path>src/app/api/chat/route.ts</file_path>
        <file_path>src/app/api/models/route.ts</file_path>
      </relevant_files>
    </page>
    <page>
      <id>internationalization</id>
      <title>Internationalization Setup</title>
      <description>Describes how translations and language switching are implemented.</description>
      <importance>low</importance>
      <relevant_files>
        <file_path>src/i18n.ts</file_path>
        <file_path>src/contexts/LanguageContext.tsx</file_path>
        <file_path>src/messages/en.json</file_path>
      </relevant_files>
    </page>
  </pages>
</wiki_structure>`;

const pageContent = {
  'Project Overview': `## Application Purpose\n\nThe project delivers an end-to-end experience for generating Git-style wiki documentation from source repositories. The web UI runs on **Next.js 15** with React 19 and provides configuration flows for provider selection, language preferences, and repository scoping. A complementary CLI mirrors the same generation pipeline and persists output into a \`.repo-wiki\` folder.\n\n## Runtime and Tooling\n\n- **Node.js & Next.js** power the frontend and server routes. The Next configuration in \`next.config.ts\` enables the app directory and strict TypeScript handling.\n- **Command line generator** exposed via \`bin/deepwiki.js\` wires Commander CLI parsing to the documentation engine in \`cli/generate-docs.js\`.\n- Project metadata and scripts are declared in \`package.json\`, including the \`deepwiki\` binary entry and lint/build tasks.\n\n## Deployment & Containerisation\n\nThe repository contains Docker assets (\`Dockerfile\`, \`docker-compose.yml\`) to run the Next app alongside the Python backend. These images include environment variables for provider credentials such as \`GOOGLE_API_KEY\`, \`DEEPSEEK_API_KEY\`, and the legacy service host.\n\n## Documentation Outputs\n\nGenerated wikis are saved to \`.repo-wiki\` with an index \`README.md\` plus one page per generated topic. Each markdown page begins with a level-one heading injected by the CLI and may embed Mermaid diagrams, code samples, and file excerpts.`,
  'CLI Documentation Generator': `## Entry Point\n\nThe CLI is launched via the executable script at \`bin/deepwiki.js\`. Commander parses repository path, language, provider, and advanced flags such as \`--comprehensive\`. The handler normalises the repository path, sets provider-specific API keys (including the DeepSeek key via \`DEEPSEEK_API_KEY\`), and calls \`generateDocumentation\`.\n\n## Repository Analysis\n\nInside \`cli/generate-docs.js\` the generator walks the project tree while honouring default exclusions (\`node_modules\`, build artifacts, VCS directories, etc.). It collects the README, builds a textual file map, and assembles prompts for the language model.\n\n## DeepSeek Integration\n\nA dedicated helper, \`callDeepseekChat\`, now accepts an optional \`DEEPSEEK_BASE_URL\` and automatically wires corporate proxies through undici's \`ProxyAgent\`. It posts JSON payloads that include the desired model, message history, temperature, and top-p values. Failures raise descriptive errors so the CLI can surface actionable diagnostics.\n\n## Output Writing\n\nAfter the LLM returns a wiki structure and per-page markdown, \`saveDocumentation\` materialises files under the target directory. It creates an index README listing pages, writes each page with a prepended \`# Title\`, and stores the parsed structure as \`structure.json\` for future diffing.`,
  'Frontend Workflow': `## Home Flow\n\nThe landing view in \`src/app/page.tsx\` manages repository submission. It pulls translations from the \`LanguageContext\`, renders demo Mermaid diagrams, and persists repository-specific configuration (language, provider, model, filters) into localStorage.\n\n## Configuration Modal\n\n\`src/components/ConfigurationModal.tsx\` presents advanced settings such as directory inclusion/exclusion, auth tokens, and output language. It communicates changes back to the main page via callback props, ensuring the CLI and UI stay aligned.\n\n## Processed Projects List\n\nThe custom hook \`useProcessedProjects\` fetches cached wiki runs through the \`/api/wiki/projects\` endpoint and exposes loading/error states. The resulting data feeds \`ProcessedProjects\`, allowing users to revisit previously generated documentation.`,
  'API Bridge to Python Backend': `## Wiki Cache Proxy\n\nThe API route at \`src/app/api/wiki/projects/route.ts\` forwards GET requests to the legacy Python backend (default \`http://localhost:8001\`). It validates DELETE payloads when clearing cached wiki data and relays error responses with detailed logging.\n\n## Chat Generation Endpoint\n\n\`src/app/api/chat/route.ts\` exposes a POST endpoint used by the web UI to trigger documentation generation. It proxies credentials and payloads to the backend service, returning streamed responses to the client.\n\n## Model Metadata\n\n\`src/app/api/models/route.ts\` lists available providers and models by querying the backend. This keeps the Next.js UI in sync with whichever LLMs the Python service and CLI expose.`,
  'Internationalization Setup': `## Next-Intl Configuration\n\nThe file \`src/i18n.ts\` configures locales and async message loading with \`next-intl\`. It defines default languages and resolves translation files based on the incoming request.\n\n## Language Context\n\n\`src/contexts/LanguageContext.tsx\` wraps the app with a React context that exposes the current language, available translations, and helpers for switching locales. Components such as \`ThemeToggle\` and \`ConfigurationModal\` consume this context to render localised copy.\n\n## Translation Catalogues\n\nLanguage-specific message bundles live in \`src/messages\`, including \`en.json\` for English strings. Adding a new locale involves creating a matching JSON file and registering it within \`i18n.ts\`.`
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}');
      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      const fullPrompt = messages.map(msg => msg.content || '').join('\n');

      let content = '';
      if (fullPrompt.includes('Return ONLY valid XML')) {
        content = structureXml;
      } else {
        const titleMatch = fullPrompt.match(/Page Title:\s*(.*)/);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          content = pageContent[title] || '## Content\n\nNo data available.';
        } else {
          content = '## Content\n\nNo data available.';
        }
      }

      const response = {
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: payload.model || 'deepseek-chat',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content,
            },
          },
        ],
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mock DeepSeek server listening on http://localhost:${PORT}`);
});
