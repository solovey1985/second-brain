/**
 * View renderer responsible for generating HTML pages (Single Responsibility)
 */
class PageRenderer {
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
      html += `${indent}  <li class="nav-${item.type}">\n`;
      html += `${indent}    <a href="/content/${item.path}">${icon} ${item.name}</a>\n`;

      if (item.children && item.children.length > 0) {
        html += this.renderNavigation(item.children, level + 1);
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
    html += '<li><a href="/">🏠 Home</a></li>';

    for (const item of breadcrumb) {
      html += `<li><a href="/content/${item.path}">${item.name}</a></li>`;
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

    let html = '<div class="directory-listing">';

    for (const entry of entries) {
      const icon =
        entry.type === "directory" ? "📁" : this.getFileIcon(entry.extension);
      const href = `/content/${entry.path}`;

      html += `
        <div class="entry entry-${entry.type}">
          <a href="${href}">
            <span class="icon">${icon}</span>
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

    .navigation {
      padding: 1rem 0;
    }

    .navigation ul {
      list-style: none;
      padding: 0;
    }

    .navigation li {
      margin: 0;
    }

    .navigation a {
      display: block;
      padding: 0.5rem 1.5rem;
      text-decoration: none;
      color: #586069;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .navigation a:hover {
      background: #f6f8fa;
      color: #0366d6;
    }

    .nav-level-1 a {
      padding-left: 2rem;
      font-size: 0.85rem;
    }

    .nav-level-2 a {
      padding-left: 2.5rem;
      font-size: 0.8rem;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      margin-left: 280px;
      padding: 2rem;
      max-width: calc(100vw - 280px);
    }

    .content {
      max-width: 900px;
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

    /* Responsive Design */
    @media (max-width: 1024px) {
      .sidebar {
        width: 240px;
      }
      
      .main-content {
        margin-left: 240px;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      
      .sidebar.open {
        transform: translateX(0);
      }
      
      .main-content {
        margin-left: 0;
        padding: 1rem;
      }
      
      .directory-listing {
        grid-template-columns: 1fr;
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
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2><a href="/">📚 Docs Portal</a></h2>
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
</body>
</html>
    `.trim();
  }
}

module.exports = PageRenderer;
