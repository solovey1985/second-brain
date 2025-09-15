# Deployment Guide: GitHub Pages Static Site

This guide shows how to deploy your documentation portal as static HTML pages on GitHub Pages while preserving all features including Mermaid diagrams, navigation, links, and markup.

## Overview

We'll convert the Node.js server into a static site generator that creates HTML files for each markdown file and directory, then deploy to GitHub Pages.

## Step 1: Create Static Site Builder

Create `build-static.js` in the project root:

```javascript
const fs = require('fs');
const path = require('path');
const PageRenderer = require('./server/views/PageRenderer');
const NavigationService = require('./server/services/NavigationService');
const MarkdownRenderer = require('./server/services/MarkdownRenderer');

class StaticSiteBuilder {
  constructor() {
    this.renderer = new PageRenderer();
    this.navService = new NavigationService();
    this.markdownRenderer = new MarkdownRenderer();
    this.outputDir = './docs'; // GitHub Pages uses 'docs' folder
    this.contentDir = './content';
  }

  async build() {
    console.log('🔨 Building static site...');
    
    // Clean and create output directory
    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true });
    }
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Build navigation structure
    const navigation = await this.navService.buildNavigation(this.contentDir);
    
    // Build all pages
    await this.buildPages('', navigation);
    
    // Copy static assets (images, PDFs, etc.)
    await this.copyStaticAssets();
    
    // Create 404 page
    await this.create404Page(navigation);
    
    console.log('✅ Static site built successfully in ./docs');
    console.log('📁 Ready for GitHub Pages deployment');
  }

  async buildPages(currentPath, navigation) {
    const fullPath = path.join(this.contentDir, currentPath);
    
    if (!fs.existsSync(fullPath)) return;
    
    const items = fs.readdirSync(fullPath);
    
    // Create index.html for directory
    await this.buildDirectoryPage(currentPath, navigation);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const fullItemPath = path.join(this.contentDir, itemPath);
      const stat = fs.statSync(fullItemPath);
      
      if (stat.isDirectory()) {
        // Recursively build subdirectories
        await this.buildPages(itemPath, navigation);
      } else if (item.endsWith('.md')) {
        // Build markdown page
        await this.buildMarkdownPage(itemPath, navigation);
      }
    }
  }

  async buildDirectoryPage(dirPath, navigation) {
    const fullPath = path.join(this.contentDir, dirPath);
    const items = fs.existsSync(fullPath) ? fs.readdirSync(fullPath) : [];
    
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
    
    const html = this.renderer.renderDirectoryPage({
      title,
      path: dirPath,
      navigation,
      directoryListing,
      breadcrumb
    });

    // Save HTML file
    const outputPath = path.join(this.outputDir, dirPath, 'index.html');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Fix navigation links for static site
    const fixedHtml = this.fixStaticLinks(html);
    fs.writeFileSync(outputPath, fixedHtml);
    
    console.log(`📄 Built directory: ${dirPath || 'root'}`);
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
    
    console.log(`📝 Built page: ${filePath}`);
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
    // Fix navigation links for static site
    return html
      .replace(/href="\/content\//g, 'href="/')
      .replace(/href="\/content"/g, 'href="/"')
      .replace(/href="([^"]+)\.md"/g, 'href="$1.html"')
      .replace(/src="\/content\//g, 'src="/content/')
      .replace(/\]\(([^)]+)\.md\)/g, ']($1.html)'); // Fix markdown links
  }

  async copyStaticAssets() {
    // Copy content directory for static assets
    const contentOutput = path.join(this.outputDir, 'content');
    await this.copyDirectory(this.contentDir, contentOutput, ['.md']);
    
    // Copy public assets if they exist
    const publicDir = './public';
    if (fs.existsSync(publicDir)) {
      const publicOutput = this.outputDir;
      await this.copyDirectory(publicDir, publicOutput);
    }
    
    console.log('📁 Copied static assets');
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
    console.log('📄 Created 404 page');
  }
}

// Build the site when script is run directly
if (require.main === module) {
  new StaticSiteBuilder().build().catch(console.error);
}

module.exports = StaticSiteBuilder;
```

## Step 2: Update Package.json Scripts

Add build scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "node server/app.js",
    "build": "node build-static.js",
    "build:watch": "nodemon build-static.js",
    "serve:static": "cd docs && python -m http.server 8080",
    "preview": "npm run build && npm run serve:static"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Step 3: GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 🛎️
        uses: actions/checkout@v4

      - name: Setup Node.js 🔧
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies 📦
        run: npm ci

      - name: Build Static Site 🔨
        run: npm run build

      - name: Setup Pages 📄
        uses: actions/configure-pages@v4

      - name: Upload Artifact 📤
        uses: actions/upload-pages-artifact@v3
        with:
          path: './docs'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to GitHub Pages 🚀
        id: deployment
        uses: actions/deploy-pages@v4
```

## Step 4: Repository Settings

1. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/docs`

2. **Alternative: GitHub Actions (Recommended):**
   - Source: GitHub Actions
   - The workflow above will handle deployment

## Step 5: Ensure Mermaid Support

Update your `PageRenderer.js` to include Mermaid in the static build:

```javascript
// In the renderLayout method, ensure Mermaid is included:
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'arial'
  });
</script>
```

## Step 6: Build and Deploy

### Local Testing

```bash
# Build the static site
npm run build

# Preview locally
npm run preview
# Open http://localhost:8080
```

### Deploy to GitHub Pages

```bash
# Commit your changes
git add .
git commit -m "Add static site generation and GitHub Pages deployment"
git push origin main

# GitHub Actions will automatically build and deploy
```

## Step 7: Custom Domain (Optional)

1. Create `docs/CNAME` file with your domain:

```text
docs.yourdomain.com
```

2. Configure DNS with your domain provider:

```text
Type: CNAME
Name: docs (or your subdomain)
Value: yourusername.github.io
```

## Features Preserved

✅ **Full Navigation** - Hierarchical sidebar navigation  
✅ **Markdown Rendering** - All markdown features  
✅ **Mermaid Diagrams** - Interactive diagrams  
✅ **Breadcrumbs** - Navigation breadcrumbs  
✅ **Directory Listings** - Folder browsing  
✅ **Static Assets** - Images, PDFs, etc.  
✅ **Responsive Design** - Mobile-friendly  
✅ **Print Optimization** - Clean printing  
✅ **Search Engine Friendly** - Pre-rendered HTML  

## Troubleshooting

### Links Not Working

- Ensure all internal links use `.html` extension
- Check that paths are relative to the domain root

### Mermaid Not Rendering

- Verify CDN links are accessible
- Check browser console for JavaScript errors

### Images Not Loading

- Ensure images are in the `content` folder
- Use relative paths: `./images/diagram.png`

### Build Errors

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Performance Optimization

### Enable Caching

Create `docs/.htaccess` (if using Apache):

```apache
<IfModule mod_expires.c>
  ExpiresActive on
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
</IfModule>
```

### Optimize Images

```bash
# Install image optimization tools
npm install --save-dev imagemin imagemin-pngquant imagemin-mozjpeg

# Add to build process for large image collections
```

## Monitoring

Your site will be available at:

- `https://yourusername.github.io/repository-name/`
- Or your custom domain if configured

Monitor deployment status in the "Actions" tab of your GitHub repository.

## Next Steps

1. **SEO Enhancement**: Add meta descriptions and OpenGraph tags
2. **Analytics**: Integrate Google Analytics or similar
3. **Search**: Add client-side search with Lunr.js
4. **PWA**: Convert to Progressive Web App for offline access
5. **Comments**: Add Disqus or GitHub Issues for page comments

## Support

For issues with deployment:

1. Check GitHub Actions logs
2. Verify all file paths use forward slashes
3. Ensure no special characters in filenames
4. Test locally before pushing to GitHub

Your documentation portal is now ready for GitHub Pages with all features intact!
