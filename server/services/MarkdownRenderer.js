const { marked } = require('marked');
const hljs = require('highlight.js');

/**
 * Server-side markdown renderer with full feature support
 */
class MarkdownRenderer {
  constructor(options = {}) {
    this.isStaticSite = options.isStaticSite || false;
    this.baseUrl = options.baseUrl || '';
    this.currentPath = options.currentPath || '';
    this.configureMarked();
  }

  /**
   * Configure marked with syntax highlighting and custom renderers
   */
  configureMarked() {
    // Configure highlight.js
    marked.setOptions({
      highlight: function(code, lang) {
        // Ensure code is a string
        if (!code || typeof code !== 'string') {
          return code || '';
        }
        
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.warn('Highlight.js error:', err);
            return code;
          }
        }
        try {
          return hljs.highlightAuto(code).value;
        } catch (err) {
          console.warn('Highlight.js auto error:', err);
          return code;
        }
      },
      langPrefix: 'hljs language-',
      breaks: false,  // Disable automatic line breaks to prevent math splitting
      gfm: true,
    });

    // Custom renderer for links and headers
    const renderer = new marked.Renderer();
    
    // Store headers for TOC generation
    const headers = [];
    
    // Generate slug for header IDs
    const slugify = (text) => {
      if (!text || typeof text !== 'string') {
        text = String(text || '');
      }
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/--+/g, '-') // Replace multiple - with single -
        .trim();
    };

    // Override heading renderer to add anchor IDs
    renderer.heading = (token) => {
      const text = typeof token === 'object' ? token.text : String(token);
      const level = token.depth || 1;
      const slug = slugify(text);
      
      this.headers.push({
        text,
        level,
        slug
      });
      
      return `<h${level} id="${slug}">
        <a href="#${slug}" class="header-anchor">
          ${text}
        </a>
      </h${level}>`;
    };
    
    // Override link renderer to handle both dynamic and static sites
    renderer.link = (token) => {
      // Extract href, title, and text from the token object
      const href = token.href || '';
      const title = token.title || '';
      const text = token.text || '';
      
      let processedHref = href;
      
      // Handle relative markdown links
      if (processedHref && processedHref.endsWith('.md') && !processedHref.startsWith('http') && !processedHref.startsWith('/')) {
        if (this.isStaticSite) {
          // For static sites, convert .md to .html and keep relative
          processedHref = processedHref.replace('.md', '.html');
        } else {
          // For dynamic sites, convert to content paths
          processedHref = `/content/${processedHref}`;
        }
      }
      
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${processedHref}"${titleAttr}>${text}</a>`;
    };

    // Override code renderer to support Mermaid diagrams
    renderer.code = (token) => {
      // Extract code and language from the token object
      const code = token.text || token.code || '';
      const language = token.lang || token.language || '';
      
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      
      // Default code block with syntax highlighting
      const langClass = language ? ` class="hljs language-${language}"` : ' class="hljs"';
      
      try {
        let highlighted = code;
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(code, { language }).value;
        } else if (code) {
          highlighted = hljs.highlightAuto(code).value;
        }
        
        return `<pre><code${langClass}>${highlighted}</code></pre>`;
      } catch (error) {
        console.warn('Highlight.js error for language', language, ':', error.message);
        // Fallback to plain code block if highlighting fails
        return `<pre><code${langClass}>${code}</code></pre>`;
      }
    };

    marked.use({ renderer });
  }

  /**
   * Generate table of contents HTML from collected headers
   */
  generateTOC(headers) {
    if (!headers || headers.length === 0) return '';
    
    let toc = '<div class="table-of-contents">\n<ul>\n';
    let currentLevel = 0;
    
    headers.forEach(header => {
      while (currentLevel < header.level - 1) {
        toc += '<ul>\n';
        currentLevel++;
      }
      while (currentLevel > header.level - 1) {
        toc += '</ul>\n';
        currentLevel--;
      }
      
      toc += `<li><a href="#${header.slug}">${header.text}</a></li>\n`;
    });
    
    while (currentLevel >= 0) {
      toc += '</ul>\n';
      currentLevel--;
    }
    
    return toc + '</div>';
  }

  /**
   * Render markdown content to HTML
   */
  render(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }
    
    try {
      // Clear headers array before rendering
      this.headers = [];
      
      // Render markdown content
      const content = marked(markdown);
      
      // Generate TOC if there are headers
      const toc = this.generateTOC(this.headers);
      
      // Return content with TOC if headers exist
      return this.headers.length > 0 ? toc + content : content;
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return `<pre><code>${markdown}</code></pre>`;
    }
  }

}

module.exports = MarkdownRenderer;
