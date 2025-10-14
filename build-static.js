const fs = require('fs');
const path = require('path');
const PageRenderer = require('./server/views/PageRenderer');
const NavigationService = require('./server/services/NavigationService');
const FileService = require('./server/services/FileService');
const MarkdownRenderer = require('./server/services/MarkdownRenderer');

class StaticSiteBuilder {
  constructor(options = {}) {
    this.fileService = new FileService('./content');
    this.navService = new NavigationService(this.fileService);
    
    // Determine deployment target
    const deployTarget = options.target || process.env.DEPLOY_TARGET || 'github';
    const baseUrl = deployTarget === 'local' ? '' : '/second-brain';
    
    // Configure for different deployment targets
    this.renderer = new PageRenderer({ 
      isStaticSite: true, 
      baseUrl: baseUrl
    });
    this.markdownRenderer = new MarkdownRenderer({
      isStaticSite: true,
      baseUrl: baseUrl
    });
    this.outputDir = './docs'; // GitHub Pages uses 'docs' folder
    this.contentDir = './content';
    this.deployTarget = deployTarget;
  }

  async build() {
    console.log('🔨 Building static site...');
    
    // Clean and create output directory
    if (fs.existsSync(this.outputDir)) {
      console.log('🧹 Cleaning existing docs folder...');
      fs.rmSync(this.outputDir, { recursive: true });
    }
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Add .nojekyll to disable Jekyll on GitHub Pages
    const nojekyllPath = path.join(this.outputDir, '.nojekyll');
    fs.writeFileSync(nojekyllPath, '');

    // Build navigation structure with static site optimizations
    console.log('🗂️  Building navigation...');
    const navigation = await this.navService.generateNavigationMenu('', 3, 0, '', {
      defaultExpanded: false,  // Collapse by default for better performance
      expandRootLevel: true    // Keep root level visible
    });
    
    console.log(`📊 Navigation tree: ${this.countNavItems(navigation)} total items`);
    
    // Build all pages
    console.log('📄 Building pages...');
    await this.buildPages('', navigation);
    
    // Copy static assets (images, PDFs, etc.)
    console.log('📁 Copying static assets...');
    await this.copyStaticAssets();
    
    // Create 404 page
    console.log('🚫 Creating 404 page...');
    await this.create404Page(navigation);
    
    console.log('✅ Static site built successfully in ./docs');
    console.log('📁 Ready for GitHub Pages deployment');
    
    // Show summary
    const docsSize = this.getFolderSize(this.outputDir);
    console.log(`📊 Generated ${docsSize.files} files (${docsSize.size})`);
  }

  async buildPages(currentPath, navigation) {
    const fullPath = path.join(this.contentDir, currentPath);
    
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    // Create index.html for directory (handles index.md if present)
    await this.buildDirectoryPage(currentPath, navigation);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const fullItemPath = path.join(this.contentDir, itemPath);
      const stat = fs.statSync(fullItemPath);
      
      if (stat.isDirectory()) {
        // Recursively build subdirectories
        await this.buildPages(itemPath, navigation);
      } else if (item.endsWith('.md') && item !== 'index.md') {
        // Build markdown page (skip index.md as it's handled by buildDirectoryPage)
        await this.buildMarkdownPage(itemPath, navigation);
      }
    }
  }

  async buildDirectoryPage(dirPath, navigation) {
    const fullPath = path.join(this.contentDir, dirPath);
    const items = fs.existsSync(fullPath) ? fs.readdirSync(fullPath) : [];
    
    // Check if directory has index.md file
    const indexMdPath = path.join(fullPath, 'index.md');
    const hasIndexMd = fs.existsSync(indexMdPath);
    let indexContent = '';
    
    if (hasIndexMd) {
      // Read and render index.md content
      const indexMdContent = fs.readFileSync(indexMdPath, 'utf-8');
      indexContent = await this.markdownRenderer.render(indexMdContent);
    }
    
    const directoryListing = items
      .filter(item => {
        const itemPath = path.join(fullPath, item);
        return fs.existsSync(itemPath);
      })
      .map(item => {
        const itemPath = path.join(fullPath, item);
        const stat = fs.statSync(itemPath);
        const relativePath = path.join(dirPath, item).replace(/\\/g, '/');
        
        return {
          name: item,
          path: relativePath,
          type: stat.isDirectory() ? 'directory' : 'file',
          extension: stat.isFile() ? path.extname(item) : null,
          url: stat.isDirectory() 
            ? `/${relativePath}/` 
            : item.endsWith('.md') 
              ? `/${relativePath.replace('.md', '.html')}` 
              : `/content/${relativePath}`
        };
      });

    const breadcrumb = this.buildBreadcrumb(dirPath);
    const title = dirPath ? path.basename(dirPath) : 'Documentation Portal';
    
    let html;
    if (hasIndexMd) {
      // If index.md exists, render it as a markdown page with directory listing appended
      const combinedContent = indexContent + '\n\n<h2>📁 Directory Contents</h2>\n' + this.renderer.renderDirectoryListing(directoryListing);
      
      html = this.renderer.renderMarkdownPage({
        title,
        path: path.join(dirPath, 'index.md').replace(/\\/g, '/'),
        navigation,
        content: combinedContent,
        breadcrumb
      });
    } else {
      // If no index.md, render as directory page
      html = this.renderer.renderDirectoryPage({
        title,
        path: dirPath,
        navigation,
        directoryListing,
        breadcrumb
      });
    }

    // Save HTML file
    const outputPath = path.join(this.outputDir, dirPath, 'index.html');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Fix navigation links for static site
    const fixedHtml = this.fixStaticLinks(html);
    fs.writeFileSync(outputPath, fixedHtml);
    
    if (hasIndexMd) {
      console.log(`  📁 Built directory with index.md: ${dirPath || 'root'}`);
    } else {
      console.log(`  📂 Built directory: ${dirPath || 'root'}`);
    }
  }

  async buildMarkdownPage(filePath, navigation) {
    const fullPath = path.join(this.contentDir, filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const renderedContent = await this.markdownRenderer.render(content);
    
    const breadcrumb = this.buildBreadcrumb(path.dirname(filePath));
    const title = path.basename(filePath, '.md');
    
    const html = this.renderer.renderMarkdownPage({
      title,
      path: filePath,
      navigation,
      content: renderedContent,
      breadcrumb
    });

    // Save HTML file
    const outputPath = path.join(this.outputDir, filePath.replace('.md', '.html'));
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Fix navigation links for static site
    const fixedHtml = this.fixStaticLinks(html);
    fs.writeFileSync(outputPath, fixedHtml);
    
    console.log(`  📝 Built page: ${filePath}`);
  }

  buildBreadcrumb(dirPath) {
    if (!dirPath || dirPath === '.' || dirPath === '') return [];
    
    const parts = dirPath.split(path.sep).filter(part => part);
    const breadcrumb = [];
    
    for (let i = 0; i < parts.length; i++) {
      const partPath = parts.slice(0, i + 1).join('/');
      breadcrumb.push({
        name: parts[i],
        path: `/${partPath}/`
      });
    }
    
    return breadcrumb;
  }

  fixStaticLinks(html) {
    // Fix navigation links for static site with proper base URL
    const baseUrl = this.deployTarget === 'local' ? '' : '/second-brain';
    return html
      .replace(/href="\/content\//g, `href="${baseUrl}/`)
      .replace(/href="\/content"/g, `href="${baseUrl}/"`)
      .replace(/href="([^"]+)\.md"/g, `href="$1.html"`)
      .replace(/src="\/content\//g, `src="${baseUrl}/content/`)
      .replace(/\]\(([^)]+)\.md\)/g, ']($1.html)'); // Fix markdown links
  }

  async copyStaticAssets() {
    // Copy content directory for static assets
    const contentOutput = path.join(this.outputDir, 'content');
    await this.copyDirectory(this.contentDir, contentOutput, ['.md']);
    
    // Copy public assets if they exist
    const publicDir = './public';
    if (fs.existsSync(publicDir)) {
      const publicFiles = fs.readdirSync(publicDir);
      for (const file of publicFiles) {
        const srcPath = path.join(publicDir, file);
        const destPath = path.join(this.outputDir, file);
        
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`  📄 Copied: ${file}`);
        }
      }
    }
  }

  async copyDirectory(src, dest, excludeExtensions = []) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath, excludeExtensions);
      } else {
        const ext = path.extname(item);
        if (!excludeExtensions.includes(ext)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }

  async create404Page(navigation) {
    const html = this.renderer.renderMarkdownPage({
      title: '404 - Page Not Found',
      path: '404.html',
      navigation,
      content: `
        <div style="text-align: center; padding: 4rem 2rem;">
          <h1>🚫 Page Not Found</h1>
          <p>The page you're looking for doesn't exist.</p>
          <p><a href="/">← Return to Home</a></p>
        </div>
      `,
      breadcrumb: []
    });

    const fixedHtml = this.fixStaticLinks(html);
    fs.writeFileSync(path.join(this.outputDir, '404.html'), fixedHtml);
  }

  getFolderSize(folderPath) {
    let fileCount = 0;
    let totalSize = 0;

    function traverseFolder(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          traverseFolder(itemPath);
        } else {
          fileCount++;
          totalSize += stat.size;
        }
      }
    }

    traverseFolder(folderPath);

    return {
      files: fileCount,
      size: this.formatBytes(totalSize)
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper to count navigation items
  countNavItems(navigation) {
    let count = 0;
    navigation.forEach(item => {
      count++;
      if (item.children && item.children.length > 0) {
        count += this.countNavItems(item.children);
      }
    });
    return count;
  }
}

// Build the site when script is run directly
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const targetFlag = args.find(arg => arg.startsWith('--target='));
  const target = targetFlag ? targetFlag.split('=')[1] : 'github';
  
  console.log(`🎯 Building for: ${target === 'local' ? 'Local Development' : 'GitHub Pages'}`);
  
  new StaticSiteBuilder({ target }).build().catch(console.error);
}

module.exports = StaticSiteBuilder;
