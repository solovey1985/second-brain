/**
 * View renderer responsible for generating HTML pages (Single Responsibility)
 */
class PageRenderer {
  constructor(options = {}) {
    this.isStaticSite = options.isStaticSite || false;
    this.baseUrl = options.baseUrl || '';
    this.commitInfo = options.commitInfo || null;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Render directory listing page
   */
  renderDirectoryPage({
    title,
    path,
    navigation,
    directoryListing,
    breadcrumb,
  }) {
    const navigationHtml = this.renderNavigation(navigation);
    const breadcrumbHtml = this.renderBreadcrumb(breadcrumb);
    const directoryHtml = this.renderDirectoryListing(directoryListing);

    return this.renderLayout({
      title,
      content: `
        ${breadcrumbHtml}
        <h1>${title}</h1>
        ${directoryHtml}
      `,
      navigation: navigationHtml,
    });
  }

  /**
   * Render markdown file page
   */
  renderMarkdownPage({ title, path, navigation, content, breadcrumb }) {
    const navigationHtml = this.renderNavigation(navigation);
    const breadcrumbHtml = this.renderBreadcrumb(breadcrumb);

    return this.renderLayout({
      title,
      content: `
        ${breadcrumbHtml}
        <div class="markdown-content">
          ${content}
        </div>
      `,
      navigation: navigationHtml,
    });
  }

  /**
   * Render navigation menu
   */
  renderNavigation(navigation, level = 0) {
    if (!navigation || navigation.length === 0) return "";

    const indent = "  ".repeat(level);
    let html = `${indent}<ul class="nav-level-${level}">\n`;

    for (const item of navigation) {
      const icon = item.type === "directory" ? "📁" : "📄";
      const hasChildren = item.hasChildren;
      const isExpanded = item.isExpanded !== false; // Default to expanded if not specified
      const isActive = item.isActive;
      
      // CSS classes for state management
      const itemClasses = [
        `nav-${item.type}`,
        hasChildren ? 'nav-expandable' : '',
        isExpanded ? 'nav-expanded' : 'nav-collapsed',
        isActive ? 'nav-active' : ''
      ].filter(Boolean).join(' ');

      html += `${indent}  <li class="${itemClasses}" data-path="${item.path}">\n`;
      
      if (item.type === "directory") {
        // Directory with expand/collapse button
        html += `${indent}    <div class="nav-item-wrapper">\n`;
        
        if (hasChildren) {
          // Toggle button for expand/collapse
          html += `${indent}      <button class="nav-toggle" aria-label="Toggle ${item.name}" aria-expanded="${isExpanded}">
          <span class="nav-toggle-icon">${isExpanded ? '▼' : '▶'}</span>
        </button>\n`;
        } else {
          // Spacer for alignment when no children
          html += `${indent}      <span class="nav-toggle-spacer"></span>\n`;
        }
        
        // Generate URL
        let url;
        if (this.isStaticSite) {
          url = this.baseUrl ? `${this.baseUrl}/${item.path}/` : `/${item.path}/`;
        } else {
          url = `/content/${item.path}`;
        }
        
        html += `${indent}      <a href="${url}" class="nav-link"><span class="nav-icon">${icon}</span> <span class="nav-name">${item.name}</span></a>\n`;
        html += `${indent}    </div>\n`;
        
        // Render children with collapse state
        if (hasChildren && item.children.length > 0) {
          const childrenStyle = isExpanded ? '' : ' style="display: none;"';
          html += `${indent}    <div class="nav-children"${childrenStyle}>\n`;
          html += this.renderNavigation(item.children, level + 1);
          html += `${indent}    </div>\n`;
        }
      } else {
        // File item
        let url;
        if (this.isStaticSite) {
          url = this.baseUrl ? `${this.baseUrl}/${item.path.replace('.md', '.html')}` : `/${item.path.replace('.md', '.html')}`;
        } else {
          url = `/content/${item.path}`;
        }
        
        html += `${indent}    <div class="nav-item-wrapper">\n`;
        html += `${indent}      <span class="nav-toggle-spacer"></span>\n`;
        html += `${indent}      <a href="${url}" class="nav-link"><span class="nav-icon">${icon}</span> <span class="nav-name">${item.name}</span></a>\n`;
        html += `${indent}    </div>\n`;
      }

      html += `${indent}  </li>\n`;
    }

    html += `${indent}</ul>\n`;
    return html;
  }

  /**
   * Render breadcrumb navigation
   */
  renderBreadcrumb(breadcrumb) {
    if (!breadcrumb || breadcrumb.length === 0) return "";

    let html = '<nav class="breadcrumb"><ol>';
    
    // Generate home link based on site type
    const homeUrl = this.isStaticSite ? `${this.baseUrl}/` : '/';
    html += `<li><a href="${homeUrl}">🏠 Home</a></li>`;

    for (const item of breadcrumb) {
      // Generate breadcrumb links based on site type
      const itemUrl = this.isStaticSite 
        ? `${this.baseUrl}${item.path}` 
        : `/content/${item.path}`;
      html += `<li><a href="${itemUrl}">${item.name}</a></li>`;
    }

    html += "</ol></nav>";
    return html;
  }

  /**
   * Render directory listing
   */
  renderDirectoryListing(entries) {
    if (!entries || entries.length === 0) {
      return "<p>This directory is empty.</p>";
    }

    // Separate entries
    const mdFiles = entries.filter(e => e.type === 'file' && e.name.endsWith('.md'));
    const imageFiles = entries.filter(e => e.type === 'file' && /\.(jpg|jpeg|png|webp|gif)$/i.test(e.name));
    const otherFiles = entries.filter(e => e.type === 'file' && !e.name.endsWith('.md') && !/\.(jpg|jpeg|png|webp|gif)$/i.test(e.name));
    const directories = entries.filter(e => e.type === 'directory');

    let html = '<div class="directory-listing">';

    // 1. Markdown files as links
    for (const entry of mdFiles) {
      let href;
      if (this.isStaticSite) {
        href = this.baseUrl ? `${this.baseUrl}/${entry.path.replace('.md', '.html')}` : `/${entry.path.replace('.md', '.html')}`;
      } else {
        href = `/content/${entry.path}`;
      }
      html += `
        <div class="entry entry-file">
          <a href="${href}">
            <span class="icon">📄</span>
            <span class="name">${entry.name}</span>
          </a>
        </div>
      `;
    }

    // 2. Images as thumbnails with lightbox
    for (const entry of imageFiles) {
      let src;
      if (this.isStaticSite) {
        src = this.baseUrl ? `${this.baseUrl}/content/${entry.path}` : `/content/${entry.path}`;
      } else {
        src = `/content/${entry.path}`;
      }
      html += `
        <div class="entry entry-image">
          <a href="#" class="lightbox-trigger" data-image-src="${src}" data-image-name="${entry.name}">
              <img class="entry-image-thumb" src="${src}" alt="${entry.name}" loading="lazy" />
              <span class="name entry-image-name">${entry.name}</span>
          </a>
        </div>
      `;
    }

    // 3. Other files
    for (const entry of otherFiles) {
      let href;
      if (this.isStaticSite) {
        href = this.baseUrl ? `${this.baseUrl}/content/${entry.path}` : `/content/${entry.path}`;
      } else {
        href = `/content/${entry.path}`;
      }
      html += `
        <div class="entry entry-file">
          <a href="${href}">
            <span class="icon">${this.getFileIcon(entry.extension)}</span>
            <span class="name">${entry.name}</span>
          </a>
        </div>
      `;
    }

    // 4. Directories
    for (const entry of directories) {
      let href;
      if (this.isStaticSite) {
        href = this.baseUrl ? `${this.baseUrl}/${entry.path}/` : `/${entry.path}/`;
      } else {
        href = `/content/${entry.path}`;
      }
      html += `
        <div class="entry entry-directory">
          <a href="${href}">
            <span class="icon">📁</span>
            <span class="name">${entry.name}</span>
          </a>
        </div>
      `;
    }

    html += "</div>";
    return html;
  }

  /**
   * Get icon for file type
   */
  getFileIcon(extension) {
    const icons = {
      ".md": "📄",
      ".pdf": "📕",
      ".txt": "📝",
      ".jpg": "🖼️",
      ".png": "🖼️",
      ".gif": "🖼️",
    };
    return icons[extension] || "📄";
  }

  /**
   * Main layout template
   */
  renderLayout({ title, content, navigation }) {
    // Determine CSS and JS paths based on site type
    // Files are served from /assets/css and /assets/scripts (dev) or root for static site
    const cssPath = this.isStaticSite
      ? `${this.baseUrl}/app.css`
      : '/assets/css/app.css';
    const jsPath = this.isStaticSite
      ? `${this.baseUrl}/app.js`
      : '/assets/scripts/app.js';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta version="1.0.1">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Documentation Portal</title>
  
  <!-- External Stylesheet -->
  <link rel="stylesheet" type="text/css" href="${cssPath}">
  
  <!-- Highlight.js CSS for syntax highlighting -->
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">

  <!-- KaTeX for LaTeX math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05" crossorigin="anonymous"></script>

  <!-- Mermaid for diagrams -->
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
  
  <!-- Initialize KaTeX auto-render -->
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    });
  </script>
  
</head>
<body${this.isStaticSite ? ` data-base-url="${this.baseUrl}"` : ''}>
  <!-- Mobile Menu Toggle Button -->
  <button class="mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
  </button>
  
  <!-- Mobile Overlay -->
  <div class="mobile-overlay"></div>
  
  <!-- Image Lightbox -->
  <div id="image-lightbox" class="lightbox" style="display: none;">
    <div class="lightbox-overlay"></div>
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
      <button class="lightbox-prev" aria-label="Previous image">&#8249;</button>
      <button class="lightbox-next" aria-label="Next image">&#8250;</button>
      <img class="lightbox-image" src="" alt="" />
      <div class="lightbox-caption"></div>
      <div class="lightbox-counter"></div>
    </div>
  </div>
  
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2><a href="${this.isStaticSite ? this.baseUrl + '/' : '/'}">📚 Docs Portal</a></h2>
      </div>
      
      ${this.commitInfo ? `
      <!-- Commit Info Banner -->
      <div class="commit-info-banner">
        <div class="commit-icon">🔄</div>
        <div class="commit-details">
          <div class="commit-message" title="${this.escapeHtml(this.commitInfo.fullMessage || this.commitInfo.message)}">
            ${this.escapeHtml(this.commitInfo.shortMessage)}
          </div>
          <div class="commit-meta">
            <span class="commit-hash">${this.commitInfo.hash}</span>
            <span class="commit-date">${this.commitInfo.dateRelative}</span>
          </div>
        </div>
      </div>
      ` : ''}
      
      <!-- Sidebar controls for collapse/expand all -->
      <div class="sidebar-controls">
        <button onclick="collapseAll()" title="Collapse all folders">
          ⬆️ Collapse All
        </button>
        <button onclick="expandAll()" title="Expand all folders">
          ⬇️ Expand All
        </button>
      </div>
      
      <nav class="navigation" id="nav-container">
        ${this.isStaticSite ? `
        <!-- Navigation will be loaded from navigation.json -->
        <div class="nav-loading">
          <div class="nav-loading-spinner"></div>
          <p>Loading navigation...</p>
        </div>
        ` : navigation}
      </nav>
    </aside>
    
    <main class="main-content">
      <div class="content">
        ${content}
      </div>
    </main>
  </div>

  <!-- External JavaScript -->
  <script src="${jsPath}"></script>
</body>
</html>
`;
  }
}

module.exports = PageRenderer;
