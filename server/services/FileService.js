const fs = require('fs').promises;
const path = require('path');

/**
 * Service responsible for file system operations (Single Responsibility)
 */
class FileService {
  constructor(contentDirectory) {
    this.contentDir = contentDirectory;
  }

  /**
   * Get directory listing with file types
   */
  async getDirectoryListing(relativePath = '') {
    const fullPath = path.join(this.contentDir, relativePath);
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      
      return entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.posix.join(relativePath, entry.name).replace(/\\/g, '/'),
        extension: entry.isFile() ? path.extname(entry.name) : null
      }));
    } catch (error) {
      throw new Error(`Cannot read directory: ${relativePath}`);
    }
  }

  /**
   * Check if path is a directory
   */
  async isDirectory(relativePath) {
    const fullPath = path.join(this.contentDir, relativePath);
    
    try {
      const stats = await fs.stat(fullPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if path is a file
   */
  async isFile(relativePath) {
    const fullPath = path.join(this.contentDir, relativePath);
    
    try {
      const stats = await fs.stat(fullPath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Read file content
   */
  async readFile(relativePath) {
    const fullPath = path.join(this.contentDir, relativePath);
    
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read file: ${relativePath}`);
    }
  }

  /**
   * Check if path exists
   */
  async exists(relativePath) {
    const fullPath = path.join(this.contentDir, relativePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = FileService;
