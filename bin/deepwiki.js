#!/usr/bin/env node

/**
 * DeepWiki CLI - Generate repository documentation
 * 
 * This CLI tool generates comprehensive documentation for a code repository
 * and saves it in a .repo-wiki directory.
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { generateDocumentation } = require('../cli/generate-docs');

// Package version
const packageJson = require('../package.json');

program
  .name('deepwiki')
  .description('Generate comprehensive documentation for your code repository')
  .version(packageJson.version);

program
  .argument('[path]', 'Path to the repository (defaults to current directory)', '.')
  .option('-o, --output <dir>', 'Output directory name', '.repo-wiki')
  .option('-l, --language <lang>', 'Documentation language (en, zh, ja, es, kr, vi, pt-br, fr, ru)', 'en')
  .option('--provider <provider>', 'LLM provider (google, openai, ollama)', 'google')
  .option('--model <model>', 'Model name to use')
  .option('--exclude-dirs <dirs>', 'Comma-separated list of directories to exclude')
  .option('--exclude-files <files>', 'Comma-separated list of files to exclude')
  .option('--comprehensive', 'Generate comprehensive documentation (8-12 pages instead of 4-6)', false)
  .option('--api-key <key>', 'API key for the LLM provider (or use environment variables)')
  .action(async (repoPath, options) => {
    try {
      console.log('🚀 DeepWiki - Generating documentation...\n');

      // Resolve the repository path
      const absoluteRepoPath = path.resolve(process.cwd(), repoPath);
      
      // Check if the path exists
      if (!fs.existsSync(absoluteRepoPath)) {
        console.error(`❌ Error: Repository path does not exist: ${absoluteRepoPath}`);
        process.exit(1);
      }

      // Check if it's a directory
      if (!fs.lstatSync(absoluteRepoPath).isDirectory()) {
        console.error(`❌ Error: Path is not a directory: ${absoluteRepoPath}`);
        process.exit(1);
      }

      // Resolve output directory
      const outputDir = path.resolve(absoluteRepoPath, options.output);

      console.log(`📁 Repository: ${absoluteRepoPath}`);
      console.log(`📝 Output: ${outputDir}`);
      console.log(`🌍 Language: ${options.language}`);
      console.log(`🤖 Provider: ${options.provider}`);
      console.log(`📚 Mode: ${options.comprehensive ? 'Comprehensive' : 'Concise'}\n`);

      // Set API key if provided
      if (options.apiKey) {
        if (options.provider === 'google') {
          process.env.GOOGLE_API_KEY = options.apiKey;
        } else if (options.provider === 'openai') {
          process.env.OPENAI_API_KEY = options.apiKey;
        }
      }

      // Check if required API keys are set
      if (options.provider === 'google' && !process.env.GOOGLE_API_KEY) {
        console.error('❌ Error: GOOGLE_API_KEY environment variable is required for Google provider');
        console.error('   Set it with: export GOOGLE_API_KEY=your_key');
        console.error('   Or use: --api-key your_key');
        process.exit(1);
      }

      if (options.provider === 'openai' && !process.env.OPENAI_API_KEY) {
        console.error('❌ Error: OPENAI_API_KEY environment variable is required for OpenAI provider');
        console.error('   Set it with: export OPENAI_API_KEY=your_key');
        console.error('   Or use: --api-key your_key');
        process.exit(1);
      }

      // Call the documentation generator
      const exitCode = await generateDocumentation({
        repoPath: absoluteRepoPath,
        outputDir: outputDir,
        language: options.language,
        provider: options.provider,
        model: options.model,
        excludeDirs: options.excludeDirs,
        excludeFiles: options.excludeFiles,
        comprehensive: options.comprehensive,
      });

      if (exitCode === 0) {
        console.log(`   Output directory: ${outputDir}`);
      }

      process.exit(exitCode);

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
