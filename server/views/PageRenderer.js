/**
 * View renderer responsible for generating HTML pages (Single Responsibility)
 */
class PageRenderer {
  constructor(options = {}) {
    this.isStaticSite = options.isStaticSite || false;
    this.baseUrl = options.baseUrl || '';
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

      let html = `<style>
        .directory-listing .entry-image {
          box-sizing: border-box;
          padding: 12px 8px 8px 8px;
        }
        .directory-listing .entry-image-thumb {
          display: block;
          margin: 0 auto 4px auto;
          max-width: 100%;
          height: 300px;
          width: auto;
          box-sizing: border-box;
          border-radius: 6px;
          object-fit: contain;
          background: #fff;
        }
        .directory-listing .entry-image-name {
          display: block;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0 auto;
          text-align: center;
        }
      </style>`;
    html += '<div class="directory-listing">';

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

    // 2. Images as thumbnails
    for (const entry of imageFiles) {
      let src;
      if (this.isStaticSite) {
        src = this.baseUrl ? `${this.baseUrl}/content/${entry.path}` : `/content/${entry.path}`;
      } else {
        src = `/content/${entry.path}`;
      }
      html += `
        <div class="entry entry-image">
          <a href="${src}" target="_blank">
              <img class="entry-image-thumb" src="${src}" alt="${entry.name}" />
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
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Documentation Portal</title>
  
  <!-- Embedded Styles -->
  <style>
  /* Print Styles - Hide navigation and optimize for printing */
  @media print {
    .sidebar {
      display: none !important;
    }
    
    .main-content {
      margin-left: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
    
    .content {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 1rem !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: #fff !important;
      min-height: auto !important;
    }
    
    .breadcrumb {
      display: none !important;
    }
    
    body {
      background: #fff !important;
      color: #000 !important;
      font-size: 12pt !important;
      line-height: 1.4 !important;
    }
    
    .app-container {
      display: block !important;
    }
    
    /* Optimize typography for print */
    h1, h2, h3, h4, h5, h6 {
      color: #000 !important;
      page-break-after: avoid !important;
    }
    
    .markdown-content h1 {
      font-size: 18pt !important;
      margin-top: 0 !important;
    }
    
    .markdown-content h2 {
      font-size: 16pt !important;
    }
    
    .markdown-content h3 {
      font-size: 14pt !important;
    }
    
    .markdown-content p, .markdown-content li {
      font-size: 11pt !important;
      line-height: 1.4 !important;
    }
    
    /* Ensure proper page breaks */
    .directory-listing .entry {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Hide interactive elements that don't work in print */
    .entry:hover {
      transform: none !important;
      box-shadow: none !important;
    }
    
    /* Ensure links show URLs in print */
    .markdown-content a:after {
      content: " (" attr(href) ")";
      font-size: 10pt;
      color: #666;
    }
    
    /* Hide emojis/icons that might not print well */
    .icon {
      font-size: 0 !important;
    }
    
    .icon:before {
      content: "• ";
      font-size: 11pt !important;
    }
  }
    /* Modern Documentation Portal Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #fafbfc;
      color: #24292f;
      line-height: 1.6;
    }

    .app-container {
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar Navigation */
    .sidebar {
      width: 280px;
      background: #fff;
      border-right: 1px solid #e1e4e8;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      z-index: 1000;
    }

    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e1e4e8;
    }

    .sidebar-header h2 a {
      text-decoration: none;
      color: #0366d6;
      font-size: 1.4rem;
      font-weight: 600;
    }

    /* Sidebar controls */
    .sidebar-controls {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #e1e4e8;
      display: flex;
      gap: 0.5rem;
      background: #fafbfc;
    }

    .sidebar-controls button {
      flex: 1;
      padding: 0.4rem 0.5rem;
      background: #fff;
      border: 1px solid #e1e4e8;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #586069;
      font-weight: 500;
    }

    .sidebar-controls button:hover {
      background: #f6f8fa;
      border-color: #d0d7de;
      color: #24292f;
    }

    .sidebar-controls button:active {
      transform: scale(0.98);
    }

    .navigation {
      padding: 1rem 0;
    }

    .navigation ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .navigation li {
      margin: 0.1rem 0;
    }

    /* Navigation item wrapper */
    .nav-item-wrapper {
      display: flex;
      align-items: center;
      position: relative;
    }

    /* Toggle button for expand/collapse */
    .nav-toggle {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      color: #586069;
      font-size: 0.75rem;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .nav-toggle:hover {
      background: #e1e4e8;
      color: #24292f;
    }

    .nav-toggle:focus {
      outline: 2px solid #0366d6;
      outline-offset: 2px;
    }

    .nav-toggle-icon {
      display: inline-block;
      transition: transform 0.2s ease;
      font-size: 0.7rem;
      line-height: 1;
    }

    /* Spacer for items without toggle */
    .nav-toggle-spacer {
      width: 28px;
      flex-shrink: 0;
    }

    /* Navigation link */
    .navigation .nav-link {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 0.5rem 0.5rem 0.5rem 0;
      text-decoration: none;
      color: #586069;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      border-radius: 4px;
      margin-right: 0.5rem;
    }

    .navigation .nav-link:hover {
      background: #f6f8fa;
      color: #0366d6;
    }

    .navigation .nav-icon {
      margin-right: 0.5rem;
      flex-shrink: 0;
    }

    .navigation .nav-name {
      flex: 1;
    }

    /* Active state */
    .nav-active > .nav-item-wrapper > .nav-link {
      background: #e1f0ff;
      color: #0366d6;
      font-weight: 600;
      border-left: 3px solid #0366d6;
      padding-left: 0.5rem;
    }

    .nav-active > .nav-item-wrapper > .nav-toggle {
      color: #0366d6;
    }

    /* Collapsed/Expanded state */
    .nav-collapsed > .nav-children {
      display: none;
    }

    .nav-expanded > .nav-children {
      display: block;
    }

    /* Smooth animation for collapse/expand */
    .nav-children {
      overflow: hidden;
      transition: opacity 0.2s ease;
    }

    /* Nested indentation */
    .nav-level-0 {
      padding: 0;
    }

    .nav-level-1 > li > .nav-item-wrapper {
      padding-left: 1rem;
    }

    .nav-level-2 > li > .nav-item-wrapper {
      padding-left: 2rem;
    }

    /* Visual hierarchy */
    .nav-level-0 > .nav-directory > .nav-item-wrapper > .nav-link {
      font-weight: 600;
      font-size: 0.95rem;
      color: #24292f;
    }

    .nav-level-1 > .nav-directory > .nav-item-wrapper > .nav-link {
      font-size: 0.88rem;
    }

    .nav-level-2 > .nav-directory > .nav-item-wrapper > .nav-link {
      font-size: 0.85rem;
    }

    /* Hover effect for entire nav item */
    .navigation li:hover > .nav-item-wrapper {
      background: #f6f8fa;
      border-radius: 6px;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 280px;
      padding: 2rem;
      max-width: calc(100vw - 280px);
    }

    .content {
      width: 90%;
      max-width: 96%;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 2rem;
      min-height: 80vh;
    }

    /* Breadcrumb */
    .breadcrumb {
      margin-bottom: 1.5rem;
    }

    .breadcrumb ol {
      list-style: none;
      display: flex;
      align-items: center;
      font-size: 0.9rem;
    }

    .breadcrumb li {
      margin-right: 0.5rem;
    }

    .breadcrumb li:not(:last-child)::after {
      content: '›';
      margin-left: 0.5rem;
      color: #586069;
    }

    .breadcrumb a {
      color: #0366d6;
      text-decoration: none;
    }

    .breadcrumb a:hover {
      text-decoration: underline;
    }

    /* Directory Listing */
    .directory-listing {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .entry {
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .entry:hover {
      border-color: #0366d6;
      box-shadow: 0 2px 8px rgba(3, 102, 214, 0.15);
      transform: translateY(-1px);
    }

    .entry a {
      display: flex;
      align-items: center;
      padding: 1rem;
      text-decoration: none;
      color: #24292f;
    }

    .entry .icon {
      font-size: 1.5rem;
      margin-right: 0.75rem;
    }

    .entry .name {
      font-weight: 500;
    }

    .entry-directory {
      background: #f6f8fa;
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      color: #24292f;
      margin-bottom: 1rem;
      line-height: 1.25;
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      border-bottom: 1px solid #e1e4e8;
      padding-bottom: 0.5rem;
    }

    /* Markdown Content Styles */
    .markdown-content {
      line-height: 1.6;
      color: #24292f;
    }

    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: #1f2328;
    }

    .markdown-content h1 {
      font-size: 2em;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 0.3em;
    }

    .markdown-content h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 0.3em;
    }

    .markdown-content h3 {
      font-size: 1.25em;
    }

    .markdown-content h4 {
      font-size: 1em;
    }

    .markdown-content h5 {
      font-size: 0.875em;
    }

    .markdown-content h6 {
      font-size: 0.85em;
      color: #656d76;
    }

    .markdown-content p {
      margin-bottom: 16px;
    }

    .markdown-content a {
      color: #0969da;
      text-decoration: none;
    }

    .markdown-content a:hover {
      text-decoration: underline;
    }

    .markdown-content strong {
      font-weight: 600;
    }

    .markdown-content em {
      font-style: italic;
    }

    .markdown-content code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      white-space: break-spaces;
      background-color: #afb8c133;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    }

    .markdown-content pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      color: #1f2328;
      background-color: #f6f8fa;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .markdown-content pre code {
      display: inline;
      max-width: auto;
      padding: 0;
      margin: 0;
      overflow: visible;
      line-height: inherit;
      word-wrap: normal;
      background-color: transparent;
      border: 0;
    }

    .markdown-content blockquote {
      padding: 0 1em;
      color: #656d76;
      border-left: 0.25em solid #d0d7de;
      margin-bottom: 16px;
    }

    .markdown-content blockquote > :first-child {
      margin-top: 0;
    }

    .markdown-content blockquote > :last-child {
      margin-bottom: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin-bottom: 16px;
      padding-left: 2em;
    }

    .markdown-content ul ul,
    .markdown-content ul ol,
    .markdown-content ol ol,
    .markdown-content ol ul {
      margin-top: 0;
      margin-bottom: 0;
    }

    .markdown-content li {
      word-wrap: break-all;
    }

    .markdown-content li > p {
      margin-top: 16px;
    }

    .markdown-content li + li {
      margin-top: 0.25em;
    }

    .markdown-content dl {
      padding: 0;
    }

    .markdown-content dl dt {
      padding: 0;
      margin-top: 16px;
      font-size: 1em;
      font-style: italic;
      font-weight: 600;
    }

    .markdown-content dl dd {
      padding: 0 16px;
      margin-bottom: 16px;
    }

    .markdown-content table {
      border-spacing: 0;
      border-collapse: collapse;
      display: block;
      width: max-content;
      max-width: 100%;
      overflow: auto;
      margin-bottom: 16px;
    }

    .markdown-content table tr {
      background-color: #ffffff;
      border-top: 1px solid #d0d7de;
    }

    .markdown-content table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }

    .markdown-content table th,
    .markdown-content table td {
      padding: 6px 13px;
      border: 1px solid #d0d7de;
    }

    .markdown-content table th {
      font-weight: 600;
      background-color: #f6f8fa;
    }

    .markdown-content img {
      max-width: 100%;
      height: auto;
      box-sizing: content-box;
    }

    .markdown-content hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #d0d7de;
      border: 0;
    }

    .markdown-content input[type="checkbox"] {
      margin: 0 0.2em 0.25em -1.4em;
      vertical-align: middle;
    }

    .mermaid {
      text-align: center;
      margin: 2rem 0;
    }

    .katex {
      font-size: 1.1em;
    }

    .katex-display {
      margin: 1rem 0;
      text-align: center;
    }

    /* Mobile Menu Toggle Button */
    .mobile-menu-toggle {
      display: none;
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 1001;
      background: #0366d6;
      color: white;
      border: none;
      border-radius: 6px;
      width: 44px;
      height: 44px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
    }

    .mobile-menu-toggle:hover {
      background: #0256cc;
      transform: scale(1.05);
    }

    .mobile-menu-toggle:active {
      transform: scale(0.95);
    }

    /* Hamburger icon */
    .mobile-menu-toggle::before {
      content: '☰';
      font-size: 18px;
      line-height: 1;
    }

    .mobile-menu-toggle.open::before {
      content: '✕';
      font-size: 16px;
    }

    /* Mobile Overlay */
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 999;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .mobile-overlay.show {
      opacity: 1;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .sidebar {
        width: 240px;
      }
      
      .main-content {
        margin-left: 240px;
        max-width: calc(100vw - 240px);
      }
    }

    @media (max-width: 768px) {
      .mobile-menu-toggle {
        display: block;
      }

      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        width: 280px;
        z-index: 1000;
      }
      
      .sidebar.open {
        transform: translateX(0);
      }
      
      .main-content {
        margin-left: 0;
        padding: 1rem;
        padding-top: 4rem; /* Account for mobile menu button */
        max-width: 100vw;
      }

      .content {
        width: 100%;
        max-width: 100%;
        padding: 1.5rem;
        margin: 0;
      }
      
      .directory-listing {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .breadcrumb {
        font-size: 0.8rem;
        margin-bottom: 1rem;
      }

      .breadcrumb ol {
        flex-wrap: wrap;
      }

      .breadcrumb li {
        margin-right: 0.3rem;
        margin-bottom: 0.2rem;
      }

      /* Better button spacing on mobile */
      .entry {
        padding: 1rem;
        margin-bottom: 0.5rem;
      }

      .entry .name {
        font-size: 0.9rem;
      }

      /* Adjust navigation text on mobile */
      .sidebar nav a {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
      }

      .nav-level-1 a {
        padding-left: 1.5rem;
        font-size: 0.8rem;
      }

      .nav-level-2 a {
        padding-left: 2rem;
        font-size: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .main-content {
        padding: 0.5rem;
        padding-top: 3.5rem;
      }

      .content {
        padding: 1rem;
        border-radius: 0;
        box-shadow: none;
      }

      .sidebar-header {
        padding: 1rem;
      }

      .sidebar-header h2 a {
        font-size: 1.2rem;
      }

      .entry {
        padding: 0.8rem;
      }

      .entry .icon {
        font-size: 1.2rem;
      }

      .markdown-content h1 {
        font-size: 1.8rem;
      }

      .markdown-content h2 {
        font-size: 1.5rem;
      }

      .markdown-content h3 {
        font-size: 1.3rem;
      }

      .markdown-content pre {
        font-size: 0.8rem;
        padding: 0.8rem;
      }

      .markdown-content table {
        font-size: 0.8rem;
      }
    }

    /* Smooth scrolling for better mobile experience */
    html {
      scroll-behavior: smooth;
    }

    /* Better touch targets */
    @media (hover: none) and (pointer: coarse) {
      .entry a,
      .sidebar nav a,
      .breadcrumb a {
        min-height: 44px;
        display: flex;
        align-items: center;
      }
    }
  </style>
  
  <!-- Highlight.js CSS for syntax highlighting -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
  
  <!-- Mermaid for diagrams -->
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
  
</head>
<body>
  <!-- Mobile Menu Toggle Button -->
  <button class="mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
  </button>
  
  <!-- Mobile Overlay -->
  <div class="mobile-overlay"></div>
  
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2><a href="${this.isStaticSite ? this.baseUrl + '/' : '/'}">📚 Docs Portal</a></h2>
      </div>
      
      <!-- Sidebar controls for collapse/expand all -->
      <div class="sidebar-controls">
        <button onclick="collapseAll()" title="Collapse all folders">
          ⬆️ Collapse All
        </button>
        <button onclick="expandAll()" title="Expand all folders">
          ⬇️ Expand All
        </button>
      </div>
      
      <nav class="navigation">
        ${navigation}
      </nav>
    </aside>
    
    <main class="main-content">
      <div class="content">
        ${content}
      </div>
    </main>
  </div>

  <!-- Mobile Navigation JavaScript -->
  <script>
    // ========================================
    // NAVIGATION COLLAPSE/EXPAND FUNCTIONALITY
    // ========================================
    
    function initNavigationToggle() {
      const navToggles = document.querySelectorAll('.nav-toggle');
      
      navToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const navItem = this.closest('li');
          const navChildren = navItem.querySelector('.nav-children');
          const isExpanded = navItem.classList.contains('nav-expanded');
          const icon = this.querySelector('.nav-toggle-icon');
          const path = navItem.getAttribute('data-path');
          
          if (isExpanded) {
            // Collapse
            navItem.classList.remove('nav-expanded');
            navItem.classList.add('nav-collapsed');
            icon.textContent = '▶';
            this.setAttribute('aria-expanded', 'false');
            if (navChildren) {
              navChildren.style.display = 'none';
            }
            
            // Save state
            saveNavigationState(path, false);
          } else {
            // Expand
            navItem.classList.remove('nav-collapsed');
            navItem.classList.add('nav-expanded');
            icon.textContent = '▼';
            this.setAttribute('aria-expanded', 'true');
            if (navChildren) {
              navChildren.style.display = 'block';
            }
            
            // Save state
            saveNavigationState(path, true);
          }
        });
      });
    }

    // Save navigation state to localStorage
    function saveNavigationState(path, isExpanded) {
      try {
        const state = JSON.parse(localStorage.getItem('navState') || '{}');
        state[path] = isExpanded;
        localStorage.setItem('navState', JSON.stringify(state));
      } catch (e) {
        console.warn('Could not save navigation state:', e);
      }
    }

    // Load navigation state from localStorage
    function loadNavigationState() {
      try {
        const state = JSON.parse(localStorage.getItem('navState') || '{}');
        
        Object.keys(state).forEach(path => {
          const isExpanded = state[path];
          const navItem = document.querySelector(\`li[data-path="\${path}"]\`);
          
          if (navItem) {
            const toggle = navItem.querySelector('.nav-toggle');
            const icon = toggle?.querySelector('.nav-toggle-icon');
            const navChildren = navItem.querySelector('.nav-children');
            
            if (isExpanded) {
              navItem.classList.add('nav-expanded');
              navItem.classList.remove('nav-collapsed');
              if (icon) icon.textContent = '▼';
              if (toggle) toggle.setAttribute('aria-expanded', 'true');
              if (navChildren) navChildren.style.display = 'block';
            } else {
              navItem.classList.add('nav-collapsed');
              navItem.classList.remove('nav-expanded');
              if (icon) icon.textContent = '▶';
              if (toggle) toggle.setAttribute('aria-expanded', 'false');
              if (navChildren) navChildren.style.display = 'none';
            }
          }
        });
      } catch (e) {
        console.warn('Could not load navigation state:', e);
      }
    }

    // Detect and highlight active path (for static sites)
    function detectAndHighlightActivePath() {
      // Get current page path - handle both static and dynamic sites
      let currentPath = window.location.pathname;
      
      // Remove base URL if present (for GitHub Pages)
      const baseUrl = '${this.isStaticSite ? this.baseUrl : ''}';
      if (baseUrl && currentPath.startsWith(baseUrl)) {
        currentPath = currentPath.substring(baseUrl.length);
      }
      
      // Normalize path
      currentPath = currentPath
        .replace(/^\\//, '')                  // Remove leading slash
        .replace(/\\/index\\.html$/, '')       // Remove /index.html
        .replace(/\\.html$/, '.md')           // Convert .html to .md for matching
        .replace(/\\/$/, '');                  // Remove trailing slash
      
      if (!currentPath) return; // Skip for home page
      
      // Find and highlight active nav item
      const navItems = document.querySelectorAll('.navigation li[data-path]');
      
      navItems.forEach(item => {
        const itemPath = item.getAttribute('data-path');
        
        // Check for exact match or if current path starts with item path (for directories)
        if (currentPath === itemPath || currentPath.startsWith(itemPath + '/')) {
          item.classList.add('nav-active');
          
          // Expand all parent folders
          let parent = item.parentElement.closest('li[data-path]');
          while (parent) {
            if (parent.classList.contains('nav-collapsed')) {
              const toggle = parent.querySelector(':scope > .nav-item-wrapper > .nav-toggle');
              if (toggle) {
                // Expand without triggering save
                parent.classList.remove('nav-collapsed');
                parent.classList.add('nav-expanded');
                const icon = toggle.querySelector('.nav-toggle-icon');
                if (icon) icon.textContent = '▼';
                toggle.setAttribute('aria-expanded', 'true');
                const children = parent.querySelector(':scope > .nav-children');
                if (children) children.style.display = 'block';
              }
            }
            parent = parent.parentElement.closest('li[data-path]');
          }
        }
      });
    }

    // Collapse all folders
    function collapseAll() {
      const navItems = document.querySelectorAll('.nav-expandable');
      navItems.forEach(item => {
        if (item.classList.contains('nav-expanded')) {
          const toggle = item.querySelector('.nav-toggle');
          if (toggle) toggle.click();
        }
      });
    }

    // Expand all folders
    function expandAll() {
      const navItems = document.querySelectorAll('.nav-expandable');
      navItems.forEach(item => {
        if (item.classList.contains('nav-collapsed')) {
          const toggle = item.querySelector('.nav-toggle');
          if (toggle) toggle.click();
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      const focused = document.activeElement;
      
      // Arrow right: expand folder if collapsed
      if (e.key === 'ArrowRight' && focused.classList.contains('nav-toggle')) {
        const navItem = focused.closest('li');
        if (navItem.classList.contains('nav-collapsed')) {
          focused.click();
        }
      }
      
      // Arrow left: collapse folder if expanded
      if (e.key === 'ArrowLeft' && focused.classList.contains('nav-toggle')) {
        const navItem = focused.closest('li');
        if (navItem.classList.contains('nav-expanded')) {
          focused.click();
        }
      }
    });

    // ========================================
    // MOBILE MENU FUNCTIONALITY
    // ========================================

    document.addEventListener('DOMContentLoaded', function() {
      // Initialize navigation features
      detectAndHighlightActivePath();
      initNavigationToggle();
      loadNavigationState();
      
      // Mobile menu functionality
      const mobileToggle = document.querySelector('.mobile-menu-toggle');
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.mobile-overlay');
      const body = document.body;

      function toggleMobileMenu() {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
          // Close menu
          sidebar.classList.remove('open');
          overlay.classList.remove('show');
          mobileToggle.classList.remove('open');
          mobileToggle.setAttribute('aria-expanded', 'false');
          body.style.overflow = '';
          
          // Hide overlay after animation
          setTimeout(() => {
            overlay.style.display = 'none';
          }, 300);
        } else {
          // Open menu
          sidebar.classList.add('open');
          overlay.style.display = 'block';
          mobileToggle.classList.add('open');
          mobileToggle.setAttribute('aria-expanded', 'true');
          body.style.overflow = 'hidden'; // Prevent background scrolling
          
          // Show overlay with animation
          setTimeout(() => {
            overlay.classList.add('show');
          }, 10);
        }
      }

      // Toggle menu on button click
      mobileToggle.addEventListener('click', toggleMobileMenu);

      // Close menu when clicking overlay
      overlay.addEventListener('click', toggleMobileMenu);

      // Close menu on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
          toggleMobileMenu();
        }
      });

      // Close menu when window is resized to desktop size
      window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          overlay.classList.remove('show');
          overlay.style.display = 'none';
          mobileToggle.classList.remove('open');
          mobileToggle.setAttribute('aria-expanded', 'false');
          body.style.overflow = '';
        }
      });

      // Handle navigation link clicks on mobile
      const navLinks = document.querySelectorAll('.sidebar nav a');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          // Close mobile menu when a navigation link is clicked
          if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            setTimeout(() => {
              toggleMobileMenu();
            }, 150);
          }
        });
      });
    });
  </script>
</body>
</html>
    `.trim();
  }
}

module.exports = PageRenderer;
