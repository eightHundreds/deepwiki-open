#!/usr/bin/env node

/**
 * DeepWiki CLI Documentation Generator (Node.js)
 * 
 * This module generates comprehensive documentation for a code repository.
 * It analyzes the repository structure and generates markdown documentation
 * in a .repo-wiki directory.
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parseStringPromise } = require('xml2js');
require('dotenv').config();

// Default exclusions
const DEFAULT_EXCLUDED_DIRS = [
  '.venv', 'venv', 'env', 'virtualenv',
  'node_modules', 'bower_components', 'jspm_packages',
  '.git', '.svn', '.hg', '.bzr',
  '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.coverage',
  'dist', 'build', 'out', 'target', 'bin', 'obj',
  'docs', '_docs', 'site-docs', '_site',
  '.idea', '.vscode', '.vs', '.eclipse', '.settings',
  'logs', 'log', 'tmp', 'temp',
];

const DEFAULT_EXCLUDED_FILES = [
  'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'poetry.lock',
  'Pipfile.lock', '.DS_Store', 'Thumbs.db', '.env',
  '.gitignore', '.gitattributes', 'package-lock.json',
];

// Model configurations
const DEFAULT_MODELS = {
  google: {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  },
  openai: {
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 0.8,
  },
  ollama: {
    model: 'llama3',
    temperature: 0.7,
    topP: 0.8,
  },
};

/**
 * Generate a file tree representation of the repository
 */
function getFileTree(repoPath, excludedDirs, excludedFiles) {
  const fileTree = [];

  function walkDir(dir, depth = 0) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const indent = '  '.repeat(depth);
    const folderName = path.basename(dir) || repoPath;
    
    if (depth === 0 || !excludedDirs.includes(path.basename(dir))) {
      fileTree.push(`${indent}${folderName}/`);
    }

    for (const entry of entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })) {
      if (entry.name.startsWith('.')) continue;
      
      if (entry.isDirectory()) {
        if (!excludedDirs.includes(entry.name)) {
          const subPath = path.join(dir, entry.name);
          walkDir(subPath, depth + 1);
        }
      } else {
        if (!excludedFiles.includes(entry.name)) {
          const subIndent = '  '.repeat(depth + 1);
          fileTree.push(`${subIndent}${entry.name}`);
        }
      }
    }
  }

  try {
    walkDir(repoPath);
  } catch (error) {
    console.error(`Error walking directory: ${error.message}`);
  }

  return fileTree.join('\n');
}

/**
 * Read the README file from the repository
 */
function readReadme(repoPath) {
  const readmeNames = ['README.md', 'README.MD', 'readme.md', 'README', 'readme.txt'];
  
  for (const readmeName of readmeNames) {
    const readmePath = path.join(repoPath, readmeName);
    if (fs.existsSync(readmePath)) {
      try {
        return fs.readFileSync(readmePath, 'utf-8');
      } catch (error) {
        console.warn(`Warning: Could not read ${readmeName}: ${error.message}`);
      }
    }
  }
  
  return 'No README file found in the repository.';
}

/**
 * Read content from a file
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    return '';
  }
}

/**
 * Parse the XML wiki structure returned by the LLM
 */
async function parseWikiStructure(xmlText) {
  // Remove markdown code blocks if present
  let cleanXml = xmlText.trim();
  if (cleanXml.startsWith('```xml')) {
    cleanXml = cleanXml.slice(6);
  }
  if (cleanXml.startsWith('```')) {
    cleanXml = cleanXml.slice(3);
  }
  if (cleanXml.endsWith('```')) {
    cleanXml = cleanXml.slice(0, -3);
  }
  cleanXml = cleanXml.trim();

  try {
    const result = await parseStringPromise(cleanXml, {
      explicitArray: false,
      mergeAttrs: true,
    });

    const wikiStructure = result.wiki_structure;
    
    const structure = {
      title: wikiStructure.title || 'Repository Wiki',
      description: wikiStructure.description || '',
      pages: [],
      sections: [],
    };

    // Parse pages
    if (wikiStructure.pages && wikiStructure.pages.page) {
      const pages = Array.isArray(wikiStructure.pages.page) 
        ? wikiStructure.pages.page 
        : [wikiStructure.pages.page];
      
      for (const page of pages) {
        const pageObj = {
          id: page.id,
          title: page.title || '',
          description: page.description || '',
          importance: page.importance || 'medium',
          filePaths: [],
          relatedPages: [],
        };

        // Parse relevant files
        if (page.relevant_files && page.relevant_files.file_path) {
          const filePaths = Array.isArray(page.relevant_files.file_path)
            ? page.relevant_files.file_path
            : [page.relevant_files.file_path];
          pageObj.filePaths = filePaths.filter(fp => fp);
        }

        // Parse related pages
        if (page.related_pages && page.related_pages.related) {
          const relatedPages = Array.isArray(page.related_pages.related)
            ? page.related_pages.related
            : [page.related_pages.related];
          pageObj.relatedPages = relatedPages.filter(rp => rp);
        }

        structure.pages.push(pageObj);
      }
    }

    // Parse sections if they exist
    if (wikiStructure.sections && wikiStructure.sections.section) {
      const sections = Array.isArray(wikiStructure.sections.section)
        ? wikiStructure.sections.section
        : [wikiStructure.sections.section];
      
      for (const section of sections) {
        const sectionObj = {
          id: section.id,
          title: section.title || '',
          pages: [],
        };

        // Parse page references
        if (section.pages && section.pages.page_ref) {
          const pageRefs = Array.isArray(section.pages.page_ref)
            ? section.pages.page_ref
            : [section.pages.page_ref];
          sectionObj.pages = pageRefs.filter(pr => pr);
        }

        structure.sections.push(sectionObj);
      }
    }

    return structure;
  } catch (error) {
    console.error(`Error parsing XML: ${error.message}`);
    console.error('XML text:');
    console.error(cleanXml.slice(0, 500));
    throw error;
  }
}

/**
 * Generate the wiki structure using an LLM
 */
async function generateWikiStructure(repoPath, provider, model, language, comprehensive, excludedDirs, excludedFiles) {
  console.log('📋 Analyzing repository structure...');

  // Get file tree and README
  const fileTree = getFileTree(repoPath, excludedDirs, excludedFiles);
  const readme = readReadme(repoPath);
  const repoName = path.basename(repoPath);

  // Language names
  const languageNames = {
    en: 'English',
    ja: 'Japanese (日本語)',
    zh: 'Mandarin Chinese (中文)',
    'zh-tw': 'Traditional Chinese (繁體中文)',
    es: 'Spanish (Español)',
    kr: 'Korean (한국어)',
    vi: 'Vietnamese (Tiếng Việt)',
    'pt-br': 'Brazilian Portuguese (Português Brasileiro)',
    fr: 'Français (French)',
    ru: 'Русский (Russian)',
  };
  const languageName = languageNames[language] || 'English';

  // Create prompt
  let prompt = `Analyze this code repository and create a wiki structure for it.

1. The complete file tree of the project:
<file_tree>
${fileTree}
</file_tree>

2. The README file of the project:
<readme>
${readme}
</readme>

I want to create a wiki for this repository. Determine the most logical structure for a wiki based on the repository's content.

IMPORTANT: The wiki content will be generated in ${languageName} language.

When designing the wiki structure, include pages that would benefit from visual diagrams, such as:
- Architecture overviews
- Data flow descriptions
- Component relationships
- Process workflows
- State machines
- Class hierarchies

`;

  if (comprehensive) {
    prompt += `Create a structured wiki with the following main sections:
- Overview (general information about the project)
- System Architecture (how the system is designed)
- Core Features (key functionality)
- Data Management/Flow: If applicable, how data is stored, processed, accessed, and managed
- Frontend Components (UI elements, if applicable)
- Backend Systems (server-side components)
- Model Integration (AI model connections, if applicable)
- Deployment/Infrastructure (how to deploy, what's the infrastructure like)
- Extensibility and Customization: If the project architecture supports it

Each section should contain relevant pages.

Return your analysis in the following XML format:

<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <sections>
    <section id="section-1">
      <title>[Section title]</title>
      <pages>
        <page_ref>page-1</page_ref>
        <page_ref>page-2</page_ref>
      </pages>
    </section>
  </sections>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <importance>high|medium|low</importance>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
    </page>
  </pages>
</wiki_structure>

IMPORTANT:
1. Create 8-12 pages that would make a comprehensive wiki for this repository`;
  } else {
    prompt += `Return your analysis in the following XML format:

<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository]</description>
  <pages>
    <page id="page-1">
      <title>[Page title]</title>
      <description>[Brief description of what this page will cover]</description>
      <importance>high|medium|low</importance>
      <relevant_files>
        <file_path>[Path to a relevant file]</file_path>
      </relevant_files>
      <related_pages>
        <related>page-2</related>
      </related_pages>
    </page>
  </pages>
</wiki_structure>

IMPORTANT:
1. Create 4-6 pages that would make a concise wiki for this repository`;
  }

  prompt += `
2. Each page should focus on a specific aspect of the codebase
3. The relevant_files should be actual files from the repository that would be used to generate that page
4. Return ONLY valid XML with the structure specified above, with no markdown code block delimiters

IMPORTANT FORMATTING INSTRUCTIONS:
- Return ONLY the valid XML structure specified above
- DO NOT wrap the XML in markdown code blocks (no \`\`\` or \`\`\`xml)
- DO NOT include any explanation text before or after the XML
- Ensure the XML is properly formatted and valid
- Start directly with <wiki_structure> and end with </wiki_structure>
`;

  // Generate response using LLM
  console.log(`🤖 Generating wiki structure with ${provider}...`);

  if (provider === 'google') {
    const modelConfig = DEFAULT_MODELS.google;
    const modelName = model || modelConfig.model;
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const llm = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
    });

    const result = await llm.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse the XML response
    const structure = await parseWikiStructure(responseText);
    console.log(`✅ Wiki structure created with ${structure.pages.length} pages`);
    
    return structure;
  } else {
    throw new Error(`Provider ${provider} not yet implemented in CLI`);
  }
}

/**
 * Generate content for a single wiki page
 */
async function generatePageContent(page, repoPath, provider, model, language, repoName) {
  console.log(`  📝 Generating: ${page.title}`);

  // Read relevant files
  const fileContents = [];
  for (const filePath of page.filePaths || []) {
    const fullPath = path.join(repoPath, filePath);
    if (fs.existsSync(fullPath)) {
      const content = readFileContent(fullPath);
      if (content) {
        fileContents.push(`## File: ${filePath}\n\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\`\n`);
      }
    }
  }

  const filesContext = fileContents.length > 0 
    ? fileContents.join('\n\n') 
    : 'No specific files referenced.';

  // Language names
  const languageNames = {
    en: 'English',
    ja: 'Japanese (日本語)',
    zh: 'Mandarin Chinese (中文)',
    'zh-tw': 'Traditional Chinese (繁體中文)',
    es: 'Spanish (Español)',
    kr: 'Korean (한국어)',
    vi: 'Vietnamese (Tiếng Việt)',
    'pt-br': 'Brazilian Portuguese (Português Brasileiro)',
    fr: 'Français (French)',
    ru: 'Русский (Russian)',
  };
  const languageName = languageNames[language] || 'English';

  // Create prompt for page generation
  const prompt = `You are creating documentation for the repository: ${repoName}

Page Title: ${page.title}
Page Description: ${page.description || ''}

IMPORTANT: Write the entire documentation in ${languageName} language.

Here are the relevant files from the repository:

${filesContext}

Please write comprehensive documentation for this page that covers:
1. ${page.title} - what it is and why it's important
2. Key concepts and components
3. Code examples and explanations where relevant
4. Best practices and usage guidelines

Format the output in clean Markdown with:
- Clear headings (##, ###)
- Code blocks with appropriate syntax highlighting
- Lists and emphasis where appropriate
- Mermaid diagrams where they would help visualize concepts (use \`\`\`mermaid code blocks)

DO NOT include a top-level # heading (the page title will be added automatically).
Start with ## headings for main sections.

Write in a clear, professional style suitable for technical documentation.
`;

  // Generate content using LLM
  if (provider === 'google') {
    const modelConfig = DEFAULT_MODELS.google;
    const modelName = model || modelConfig.model;
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const llm = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
    });

    const result = await llm.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } else {
    throw new Error(`Provider ${provider} not yet implemented in CLI`);
  }
}

/**
 * Save the generated documentation to the output directory
 */
function saveDocumentation(structure, pagesContent, outputDir, repoName) {
  console.log(`\n💾 Saving documentation to ${outputDir}...`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create index page
  let indexContent = `# ${structure.title}\n\n`;
  indexContent += `${structure.description}\n\n`;
  indexContent += `## Pages\n\n`;

  // Group pages by section if sections exist
  if (structure.sections && structure.sections.length > 0) {
    for (const section of structure.sections) {
      indexContent += `### ${section.title}\n\n`;
      for (const pageId of section.pages) {
        const page = structure.pages.find(p => p.id === pageId);
        if (page) {
          const filename = `${page.id}.md`;
          indexContent += `- [${page.title}](${filename})\n`;
        }
      }
      indexContent += '\n';
    }
  } else {
    // No sections, list pages directly
    for (const page of structure.pages) {
      const filename = `${page.id}.md`;
      indexContent += `- [${page.title}](${filename})`;
      if (page.description) {
        indexContent += `: ${page.description}`;
      }
      indexContent += '\n';
    }
  }

  // Save index
  const indexPath = path.join(outputDir, 'README.md');
  fs.writeFileSync(indexPath, indexContent, 'utf-8');

  // Save individual pages
  for (const page of structure.pages) {
    const pageId = page.id;
    if (pagesContent[pageId]) {
      const filename = `${pageId}.md`;
      const filepath = path.join(outputDir, filename);

      // Add page title and content
      const fullContent = `# ${page.title}\n\n${pagesContent[pageId]}`;

      fs.writeFileSync(filepath, fullContent, 'utf-8');
    }
  }

  // Save structure metadata as JSON
  const metadata = {
    title: structure.title,
    description: structure.description,
    pages: structure.pages,
    sections: structure.sections || [],
  };
  const metadataPath = path.join(outputDir, '_structure.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  console.log(`✅ Saved ${Object.keys(pagesContent).length} pages to ${outputDir}`);
}

/**
 * Main function to generate documentation
 */
async function generateDocumentation(options) {
  const {
    repoPath,
    outputDir,
    language = 'en',
    provider = 'google',
    model = null,
    excludeDirs = '',
    excludeFiles = '',
    comprehensive = false,
  } = options;

  // Parse exclusions
  const excludedDirs = new Set(DEFAULT_EXCLUDED_DIRS);
  const excludedFiles = new Set(DEFAULT_EXCLUDED_FILES);

  if (excludeDirs) {
    excludeDirs.split(',').forEach(dir => excludedDirs.add(dir.trim()));
  }

  if (excludeFiles) {
    excludeFiles.split(',').forEach(file => excludedFiles.add(file.trim()));
  }

  // Convert to arrays
  const excludedDirsList = Array.from(excludedDirs);
  const excludedFilesList = Array.from(excludedFiles);

  try {
    // Generate wiki structure
    const structure = await generateWikiStructure(
      repoPath,
      provider,
      model,
      language,
      comprehensive,
      excludedDirsList,
      excludedFilesList
    );

    // Generate content for each page
    console.log('\n📚 Generating page content...');
    const pagesContent = {};
    const repoName = path.basename(repoPath);

    for (const page of structure.pages) {
      const content = await generatePageContent(
        page,
        repoPath,
        provider,
        model,
        language,
        repoName
      );
      pagesContent[page.id] = content;
    }

    // Save documentation
    saveDocumentation(structure, pagesContent, outputDir, repoName);

    console.log('\n🎉 Documentation generation complete!');
    return 0;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    return 1;
  }
}

module.exports = {
  generateDocumentation,
  getFileTree,
  readReadme,
  parseWikiStructure,
  generateWikiStructure,
  generatePageContent,
  saveDocumentation,
};

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  console.error('This module should be imported, not run directly.');
  console.error('Use: node bin/deepwiki.js');
  process.exit(1);
}
