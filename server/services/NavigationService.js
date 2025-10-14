/**
 * Service responsible for navigation and menu generation (Single Responsibility)
 */
class NavigationService {
  constructor(fileService) {
    this.fileService = fileService;
  }

  /**
   * Generate navigation menu from directory structure
   */
  async generateNavigationMenu(rootPath = '', maxDepth = 3, currentDepth = 0, currentPath = '', options = {}) {
    const { defaultExpanded = false, expandRootLevel = true } = options;
    
    if (currentDepth >= maxDepth) return [];

    try {
      const entries = await this.fileService.getDirectoryListing(rootPath);
      const navigation = [];

      for (const entry of entries) {
        if (entry.type === 'directory') {
          const subNav = await this.generateNavigationMenu(
            entry.path, 
            maxDepth, 
            currentDepth + 1,
            currentPath,
            options
          );
          
          // Determine if folder should be expanded
          let isExpanded;
          if (currentPath) {
            // Dynamic server mode - expand if in active path
            isExpanded = currentPath.startsWith(entry.path);
          } else {
            // Static site mode - use default behavior
            isExpanded = currentDepth === 0 ? expandRootLevel : defaultExpanded;
          }
          
          const isActive = currentPath === entry.path;
          
          navigation.push({
            name: entry.name,
            path: entry.path,
            type: 'directory',
            children: subNav,
            hasChildren: subNav.length > 0,
            isExpanded: isExpanded,
            isActive: isActive,
            level: currentDepth
          });
        } else if (entry.extension === '.md') {
          const isActive = currentPath === entry.path;
          
          navigation.push({
            name: this.formatFileName(entry.name),
            path: entry.path,
            type: 'file',
            isActive: isActive,
            level: currentDepth
          });
        }
      }

      return navigation.sort(this.sortNavigationItems);
    } catch (error) {
      console.warn(`Could not generate navigation for ${rootPath}:`, error.message);
      return [];
    }
  }

  /**
   * Generate breadcrumb navigation
   */
  generateBreadcrumb(path) {
    if (!path || path === '/') return [];

    const parts = path.split('/').filter(part => part.length > 0);
    const breadcrumb = [];
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      breadcrumb.push({
        name: this.formatFileName(part),
        path: currentPath.substring(1) // Remove leading slash
      });
    }

    return breadcrumb;
  }

  /**
   * Format filename for display
   */
  formatFileName(filename) {
    return filename
      .replace(/\.md$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Sort navigation items (directories first, then alphabetically)
   */
  sortNavigationItems(a, b) {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  }
}

module.exports = NavigationService;
