const { marked } = require('marked');
const hljs = require('highlight.js');

/**
 * Server-side markdown renderer with full feature support
 */
class MarkdownRenderer {
  constructor() {
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

    // Custom renderer for links to handle internal navigation
    const renderer = new marked.Renderer();
    
    // Override link renderer to convert relative .md links to /content/ paths
    renderer.link = (token) => {
      // Extract href, title, and text from the token object
      const href = token.href || '';
      const title = token.title || '';
      const text = token.text || '';
      
      let processedHref = href;
      
      // Convert relative markdown links to content paths
      if (processedHref && processedHref.endsWith('.md') && !processedHref.startsWith('http') && !processedHref.startsWith('/')) {
        processedHref = `/content/${processedHref}`;
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
   * Render markdown content to HTML
   */
  render(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }
    
    try {
      return marked(markdown);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return `<pre><code>${markdown}</code></pre>`;
    }
  }

}

module.exports = MarkdownRenderer;
