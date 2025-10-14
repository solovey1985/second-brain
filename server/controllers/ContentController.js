const PageRenderer = require('../views/PageRenderer');
const MarkdownRenderer = require('../services/MarkdownRenderer');
const GitService = require('../services/GitService');

/**
 * Controller responsible for handling content requests (Single Responsibility)
 */
class ContentController {
  constructor(fileService, navigationService) {
    this.fileService = fileService;
    this.navigationService = navigationService;
    this.gitService = new GitService();
    
    // Get commit info once during initialization
    const commitInfo = this.gitService.getCommitInfoForDisplay();
    
    this.pageRenderer = new PageRenderer({ commitInfo });
    this.markdownRenderer = new MarkdownRenderer();
  }

  /**
   * Render the index page
   */
  async renderIndex(req, res) {
    try {
      // Generate navigation without currentPath for home page
      const navigation = await this.navigationService.generateNavigationMenu('', 3, 0, '');
      
      // For the home page, show a welcome message instead of directory listing
      const html = this.pageRenderer.renderLayout({
        title: 'Documentation Portal',
        content: `
          <h1>📚 Documentation Portal</h1>
          <p>Welcome to your personal knowledge base and documentation portal.</p>
          
          <div class="welcome-sections">
            <h2>🚀 Getting Started</h2>
            <p>Use the navigation menu on the left to browse through your documentation files and folders.</p>
            
            <h2>🔍 Features</h2>
            <ul>
              <li><strong>Markdown Rendering</strong> - Full support for markdown with syntax highlighting</li>
              <li><strong>Mathematical Formulas</strong> - LaTeX support with KaTeX</li>
              <li><strong>Diagrams</strong> - Mermaid diagrams for flowcharts, sequences, and more</li>
              <li><strong>File Navigation</strong> - Browse through your content with an intuitive interface</li>
              <li><strong>Responsive Design</strong> - Works great on desktop and mobile devices</li>
            </ul>
            
            <h2>📄 Quick Links</h2>
            <p>Start exploring your documentation:</p>
            <ul>
              <li><a href="/content/sample-showcase.md">📋 Feature Showcase</a> - See all supported markdown features</li>
              <li><a href="/content/index.md">🏠 Main Index</a> - Your main content index</li>
            </ul>
          </div>
        `,
        navigation: this.pageRenderer.renderNavigation(navigation)
      });

      res.send(html);
    } catch (error) {
      console.error('Error rendering index:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * Render content (directory or file)
   */
  async renderContent(req, res) {
    const requestPath = req.params[0] || '';
    
    try {
      // Generate navigation with currentPath for active path highlighting
      const navigation = await this.navigationService.generateNavigationMenu('', 3, 0, requestPath);
      const breadcrumb = this.navigationService.generateBreadcrumb(requestPath);

      // If it's the root path, redirect to home page
      if (requestPath === '' || requestPath === '/') {
        return res.redirect('/');
      }

      // Check if path is a directory
      if (await this.fileService.isDirectory(requestPath)) {
        const directoryListing = await this.fileService.getDirectoryListing(requestPath);
        
        const html = this.pageRenderer.renderDirectoryPage({
          title: `Directory: ${requestPath || 'Root'}`,
          path: requestPath,
          navigation,
          directoryListing,
          breadcrumb
        });

        return res.send(html);
      }

      // Check if path is a markdown file
      if (await this.fileService.isFile(requestPath) && requestPath.endsWith('.md')) {
        const markdownContent = await this.fileService.readFile(requestPath);
        const htmlContent = this.markdownRenderer.render(markdownContent);
        
        const html = this.pageRenderer.renderMarkdownPage({
          title: this.navigationService.formatFileName(requestPath.split('/').pop()),
          path: requestPath,
          navigation,
          content: htmlContent,
          breadcrumb
        });

        return res.send(html);
      }

      // File not found
      res.status(404).send('Not Found');
    } catch (error) {
      console.error('Error rendering content:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}

module.exports = ContentController;
