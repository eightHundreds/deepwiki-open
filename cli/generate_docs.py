#!/usr/bin/env python3
"""
DeepWiki CLI Documentation Generator

This script generates comprehensive documentation for a code repository.
It analyzes the repository structure and generates markdown documentation
in a .repo-wiki directory.
"""

import os
import sys
import argparse
import json
import glob
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Optional

import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Default exclusions
DEFAULT_EXCLUDED_DIRS = [
    ".venv", "venv", "env", "virtualenv",
    "node_modules", "bower_components", "jspm_packages",
    ".git", ".svn", ".hg", ".bzr",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".coverage",
    "dist", "build", "out", "target", "bin", "obj",
    "docs", "_docs", "site-docs", "_site",
    ".idea", ".vscode", ".vs", ".eclipse", ".settings",
    "logs", "log", "tmp", "temp",
]

DEFAULT_EXCLUDED_FILES = [
    "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json", "poetry.lock",
    "Pipfile.lock", ".DS_Store", "Thumbs.db", ".env",
    ".gitignore", ".gitattributes", "package-lock.json",
]

# Model configurations
DEFAULT_MODELS = {
    'google': {
        'model': 'gemini-2.5-flash',
        'temperature': 0.7,
        'top_p': 0.8,
        'top_k': 40
    },
    'openai': {
        'model': 'gpt-4o',
        'temperature': 0.7,
        'top_p': 0.8
    },
    'ollama': {
        'model': 'llama3',
        'temperature': 0.7,
        'top_p': 0.8
    }
}


def get_file_tree(repo_path: str, excluded_dirs: List[str], excluded_files: List[str]) -> str:
    """
    Generate a file tree representation of the repository.
    
    Args:
        repo_path: Path to the repository
        excluded_dirs: List of directories to exclude
        excluded_files: List of files to exclude
        
    Returns:
        String representation of the file tree
    """
    file_tree = []
    
    for root, dirs, files in os.walk(repo_path):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in excluded_dirs and not d.startswith('.')]
        
        # Calculate depth for indentation
        depth = root.replace(repo_path, '').count(os.sep)
        indent = '  ' * depth
        folder_name = os.path.basename(root) or repo_path
        file_tree.append(f"{indent}{folder_name}/")
        
        # Add files
        sub_indent = '  ' * (depth + 1)
        for file in sorted(files):
            if file not in excluded_files and not file.startswith('.'):
                file_tree.append(f"{sub_indent}{file}")
    
    return '\n'.join(file_tree)


def read_readme(repo_path: str) -> str:
    """
    Read the README file from the repository.
    
    Args:
        repo_path: Path to the repository
        
    Returns:
        Content of the README file, or empty string if not found
    """
    readme_names = ['README.md', 'README.MD', 'readme.md', 'README', 'readme.txt']
    
    for readme_name in readme_names:
        readme_path = os.path.join(repo_path, readme_name)
        if os.path.exists(readme_path):
            try:
                with open(readme_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"Warning: Could not read {readme_name}: {e}")
                continue
    
    return "No README file found in the repository."


def read_file_content(file_path: str) -> str:
    """
    Read content from a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        File content or empty string if file cannot be read
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Warning: Could not read file {file_path}: {e}")
        return ""


def parse_wiki_structure(xml_text: str) -> Dict:
    """
    Parse the XML wiki structure returned by the LLM.
    
    Args:
        xml_text: XML string containing the wiki structure
        
    Returns:
        Dictionary with parsed wiki structure
    """
    # Remove markdown code blocks if present
    xml_text = xml_text.strip()
    if xml_text.startswith('```xml'):
        xml_text = xml_text[6:]
    if xml_text.startswith('```'):
        xml_text = xml_text[3:]
    if xml_text.endswith('```'):
        xml_text = xml_text[:-3]
    xml_text = xml_text.strip()
    
    try:
        root = ET.fromstring(xml_text)
        
        structure = {
            'title': root.find('title').text if root.find('title') is not None else 'Repository Wiki',
            'description': root.find('description').text if root.find('description') is not None else '',
            'pages': [],
            'sections': []
        }
        
        # Parse pages
        pages_elem = root.find('pages')
        if pages_elem is not None:
            for page_elem in pages_elem.findall('page'):
                page = {
                    'id': page_elem.get('id'),
                    'title': page_elem.find('title').text if page_elem.find('title') is not None else '',
                    'description': page_elem.find('description').text if page_elem.find('description') is not None else '',
                    'importance': page_elem.find('importance').text if page_elem.find('importance') is not None else 'medium',
                    'filePaths': [],
                    'relatedPages': []
                }
                
                # Parse relevant files
                relevant_files = page_elem.find('relevant_files')
                if relevant_files is not None:
                    for file_path_elem in relevant_files.findall('file_path'):
                        if file_path_elem.text:
                            page['filePaths'].append(file_path_elem.text)
                
                # Parse related pages
                related_pages = page_elem.find('related_pages')
                if related_pages is not None:
                    for related_elem in related_pages.findall('related'):
                        if related_elem.text:
                            page['relatedPages'].append(related_elem.text)
                
                structure['pages'].append(page)
        
        # Parse sections if they exist
        sections_elem = root.find('sections')
        if sections_elem is not None:
            for section_elem in sections_elem.findall('section'):
                section = {
                    'id': section_elem.get('id'),
                    'title': section_elem.find('title').text if section_elem.find('title') is not None else '',
                    'pages': []
                }
                
                # Parse page references
                pages = section_elem.find('pages')
                if pages is not None:
                    for page_ref in pages.findall('page_ref'):
                        if page_ref.text:
                            section['pages'].append(page_ref.text)
                
                structure['sections'].append(section)
        
        return structure
        
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        print("XML text:")
        print(xml_text[:500])
        raise


def generate_wiki_structure(repo_path: str, provider: str, model: str, language: str, 
                           comprehensive: bool, excluded_dirs: List[str], 
                           excluded_files: List[str]) -> Dict:
    """
    Generate the wiki structure using an LLM.
    
    Args:
        repo_path: Path to the repository
        provider: LLM provider (google, openai, ollama)
        model: Model name
        language: Documentation language
        comprehensive: Whether to generate comprehensive documentation
        excluded_dirs: Directories to exclude
        excluded_files: Files to exclude
        
    Returns:
        Dictionary with wiki structure
    """
    print("📋 Analyzing repository structure...")
    
    # Get file tree and README
    file_tree = get_file_tree(repo_path, excluded_dirs, excluded_files)
    readme = read_readme(repo_path)
    
    # Get repository name
    repo_name = os.path.basename(repo_path)
    
    # Language names
    language_names = {
        'en': 'English',
        'ja': 'Japanese (日本語)',
        'zh': 'Mandarin Chinese (中文)',
        'zh-tw': 'Traditional Chinese (繁體中文)',
        'es': 'Spanish (Español)',
        'kr': 'Korean (한국어)',
        'vi': 'Vietnamese (Tiếng Việt)',
        'pt-br': 'Brazilian Portuguese (Português Brasileiro)',
        'fr': 'Français (French)',
        'ru': 'Русский (Russian)'
    }
    language_name = language_names.get(language, 'English')
    
    # Create prompt
    prompt = f"""Analyze this code repository and create a wiki structure for it.

1. The complete file tree of the project:
<file_tree>
{file_tree}
</file_tree>

2. The README file of the project:
<readme>
{readme}
</readme>

I want to create a wiki for this repository. Determine the most logical structure for a wiki based on the repository's content.

IMPORTANT: The wiki content will be generated in {language_name} language.

When designing the wiki structure, include pages that would benefit from visual diagrams, such as:
- Architecture overviews
- Data flow descriptions
- Component relationships
- Process workflows
- State machines
- Class hierarchies

"""
    
    if comprehensive:
        prompt += """Create a structured wiki with the following main sections:
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
1. Create 8-12 pages that would make a comprehensive wiki for this repository
"""
    else:
        prompt += """Return your analysis in the following XML format:

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
1. Create 4-6 pages that would make a concise wiki for this repository
"""
    
    prompt += """2. Each page should focus on a specific aspect of the codebase
3. The relevant_files should be actual files from the repository that would be used to generate that page
4. Return ONLY valid XML with the structure specified above, with no markdown code block delimiters

IMPORTANT FORMATTING INSTRUCTIONS:
- Return ONLY the valid XML structure specified above
- DO NOT wrap the XML in markdown code blocks (no ``` or ```xml)
- DO NOT include any explanation text before or after the XML
- Ensure the XML is properly formatted and valid
- Start directly with <wiki_structure> and end with </wiki_structure>
"""
    
    # Generate response using LLM
    print(f"🤖 Generating wiki structure with {provider}...")
    
    if provider == 'google':
        # Get model config
        if not model:
            model = DEFAULT_MODELS['google']['model']
        model_cfg = DEFAULT_MODELS.get('google', {})
        
        genai.configure(api_key=os.environ.get('GOOGLE_API_KEY'))
        llm = genai.GenerativeModel(
            model_name=model,
            generation_config={
                'temperature': model_cfg.get('temperature', 0.7),
                'top_p': model_cfg.get('top_p', 0.8),
                'top_k': model_cfg.get('top_k', 40)
            }
        )
        response = llm.generate_content(prompt)
        response_text = response.text
    else:
        raise NotImplementedError(f"Provider {provider} not yet implemented in CLI")
    
    # Parse the XML response
    structure = parse_wiki_structure(response_text)
    
    print(f"✅ Wiki structure created with {len(structure['pages'])} pages")
    
    return structure


def generate_page_content(page: Dict, repo_path: str, provider: str, model: str, 
                         language: str, repo_name: str) -> str:
    """
    Generate content for a single wiki page.
    
    Args:
        page: Page definition from wiki structure
        repo_path: Path to the repository
        provider: LLM provider
        model: Model name
        language: Documentation language
        repo_name: Repository name
        
    Returns:
        Generated markdown content
    """
    print(f"  📝 Generating: {page['title']}")
    
    # Read relevant files
    file_contents = []
    for file_path in page.get('filePaths', []):
        full_path = os.path.join(repo_path, file_path)
        if os.path.exists(full_path):
            content = read_file_content(full_path)
            if content:
                file_contents.append(f"## File: {file_path}\n\n```\n{content[:5000]}\n```\n")
    
    files_context = '\n\n'.join(file_contents) if file_contents else "No specific files referenced."
    
    # Language names
    language_names = {
        'en': 'English',
        'ja': 'Japanese (日本語)',
        'zh': 'Mandarin Chinese (中文)',
        'zh-tw': 'Traditional Chinese (繁體中文)',
        'es': 'Spanish (Español)',
        'kr': 'Korean (한국어)',
        'vi': 'Vietnamese (Tiếng Việt)',
        'pt-br': 'Brazilian Portuguese (Português Brasileiro)',
        'fr': 'Français (French)',
        'ru': 'Русский (Russian)'
    }
    language_name = language_names.get(language, 'English')
    
    # Create prompt for page generation
    prompt = f"""You are creating documentation for the repository: {repo_name}

Page Title: {page['title']}
Page Description: {page.get('description', '')}

IMPORTANT: Write the entire documentation in {language_name} language.

Here are the relevant files from the repository:

{files_context}

Please write comprehensive documentation for this page that covers:
1. {page['title']} - what it is and why it's important
2. Key concepts and components
3. Code examples and explanations where relevant
4. Best practices and usage guidelines

Format the output in clean Markdown with:
- Clear headings (##, ###)
- Code blocks with appropriate syntax highlighting
- Lists and emphasis where appropriate
- Mermaid diagrams where they would help visualize concepts (use ```mermaid code blocks)

DO NOT include a top-level # heading (the page title will be added automatically).
Start with ## headings for main sections.

Write in a clear, professional style suitable for technical documentation.
"""
    
    # Generate content using LLM
    if provider == 'google':
        # Get model config
        if not model:
            model = DEFAULT_MODELS['google']['model']
        model_cfg = DEFAULT_MODELS.get('google', {})
        
        genai.configure(api_key=os.environ.get('GOOGLE_API_KEY'))
        llm = genai.GenerativeModel(
            model_name=model,
            generation_config={
                'temperature': model_cfg.get('temperature', 0.7),
                'top_p': model_cfg.get('top_p', 0.8),
                'top_k': model_cfg.get('top_k', 40)
            }
        )
        response = llm.generate_content(prompt)
        return response.text
    else:
        raise NotImplementedError(f"Provider {provider} not yet implemented in CLI")


def save_documentation(structure: Dict, pages_content: Dict, output_dir: str, repo_name: str):
    """
    Save the generated documentation to the output directory.
    
    Args:
        structure: Wiki structure
        pages_content: Dictionary mapping page IDs to their content
        output_dir: Output directory path
        repo_name: Repository name
    """
    print(f"\n💾 Saving documentation to {output_dir}...")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Create index page
    index_content = f"# {structure['title']}\n\n"
    index_content += f"{structure['description']}\n\n"
    index_content += "## Pages\n\n"
    
    # Group pages by section if sections exist
    if structure.get('sections'):
        for section in structure['sections']:
            index_content += f"### {section['title']}\n\n"
            for page_id in section['pages']:
                page = next((p for p in structure['pages'] if p['id'] == page_id), None)
                if page:
                    filename = f"{page['id']}.md"
                    index_content += f"- [{page['title']}]({filename})\n"
            index_content += "\n"
    else:
        # No sections, list pages directly
        for page in structure['pages']:
            filename = f"{page['id']}.md"
            index_content += f"- [{page['title']}]({filename})"
            if page.get('description'):
                index_content += f": {page['description']}"
            index_content += "\n"
    
    # Save index
    index_path = os.path.join(output_dir, 'README.md')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)
    
    # Save individual pages
    for page in structure['pages']:
        page_id = page['id']
        if page_id in pages_content:
            filename = f"{page_id}.md"
            filepath = os.path.join(output_dir, filename)
            
            # Add page title and content
            full_content = f"# {page['title']}\n\n{pages_content[page_id]}"
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(full_content)
    
    # Save structure metadata as JSON
    metadata = {
        'title': structure['title'],
        'description': structure['description'],
        'pages': structure['pages'],
        'sections': structure.get('sections', [])
    }
    metadata_path = os.path.join(output_dir, '_structure.json')
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"✅ Saved {len(pages_content)} pages to {output_dir}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Generate comprehensive documentation for a code repository'
    )
    parser.add_argument('--repo-path', required=True, help='Path to the repository')
    parser.add_argument('--output-dir', required=True, help='Output directory for documentation')
    parser.add_argument('--language', default='en', help='Documentation language')
    parser.add_argument('--provider', default='google', help='LLM provider (google, openai, ollama)')
    parser.add_argument('--model', help='Model name (optional, uses default if not specified)')
    parser.add_argument('--exclude-dirs', help='Comma-separated list of directories to exclude')
    parser.add_argument('--exclude-files', help='Comma-separated list of files to exclude')
    parser.add_argument('--comprehensive', action='store_true', help='Generate comprehensive documentation')
    
    args = parser.parse_args()
    
    # Parse exclusions
    excluded_dirs = set(DEFAULT_EXCLUDED_DIRS)
    excluded_files = set(DEFAULT_EXCLUDED_FILES)
    
    if args.exclude_dirs:
        excluded_dirs.update(args.exclude_dirs.split(','))
    
    if args.exclude_files:
        excluded_files.update(args.exclude_files.split(','))
    
    # Convert to lists
    excluded_dirs = list(excluded_dirs)
    excluded_files = list(excluded_files)
    
    # Get model name
    model = args.model
    if not model:
        # Use default model for provider
        model = DEFAULT_MODELS.get(args.provider, {}).get('model', 'gemini-2.5-flash')
    
    try:
        # Generate wiki structure
        structure = generate_wiki_structure(
            args.repo_path,
            args.provider,
            model,
            args.language,
            args.comprehensive,
            excluded_dirs,
            excluded_files
        )
        
        # Generate content for each page
        print("\n📚 Generating page content...")
        pages_content = {}
        repo_name = os.path.basename(args.repo_path)
        
        for page in structure['pages']:
            content = generate_page_content(
                page,
                args.repo_path,
                args.provider,
                model,
                args.language,
                repo_name
            )
            pages_content[page['id']] = content
        
        # Save documentation
        save_documentation(structure, pages_content, args.output_dir, repo_name)
        
        print("\n🎉 Documentation generation complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
