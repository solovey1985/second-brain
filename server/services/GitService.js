const { execSync } = require('child_process');

/**
 * Service for fetching Git repository information
 */
class GitService {
  constructor(repoPath = '.') {
    this.repoPath = repoPath;
  }

  /**
   * Get the latest commit information
   */
  getLatestCommit() {
    try {
      // Get commit hash (short)
      const hash = execSync('git rev-parse --short HEAD', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      // Get commit message
      const message = execSync('git log -1 --pretty=%B', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      // Get commit date (relative time)
      const dateRelative = execSync('git log -1 --pretty=%ar', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      // Get commit date (ISO format)
      const dateISO = execSync('git log -1 --pretty=%aI', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      // Get author name
      const author = execSync('git log -1 --pretty=%an', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      // Get branch name
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return {
        hash,
        message,
        dateRelative,
        dateISO,
        author,
        branch,
        timestamp: new Date(dateISO).getTime()
      };
    } catch (error) {
      console.warn('Could not fetch git commit info:', error.message);
      return {
        hash: 'unknown',
        message: 'No git information available',
        dateRelative: 'unknown',
        dateISO: new Date().toISOString(),
        author: 'unknown',
        branch: 'unknown',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check if we're in a git repository
   */
  isGitRepository() {
    try {
      execSync('git rev-parse --is-inside-work-tree', {
        cwd: this.repoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get commit info formatted for display
   */
  getCommitInfoForDisplay() {
    if (!this.isGitRepository()) {
      return null;
    }

    const commit = this.getLatestCommit();
    
    return {
      ...commit,
      shortMessage: this.truncateMessage(commit.message, 60),
      fullMessage: commit.message
    };
  }

  /**
   * Truncate commit message to specified length
   */
  truncateMessage(message, maxLength) {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format date for display
   */
  formatDate(dateISO) {
    const date = new Date(dateISO);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // Format as date
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

module.exports = GitService;
