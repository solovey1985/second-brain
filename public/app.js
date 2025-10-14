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
      const navItem = document.querySelector(`li[data-path="${path}"]`);
      
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
function detectAndHighlightActivePath(baseUrl = '') {
  // Get current page path - handle both static and dynamic sites
  let currentPath = window.location.pathname;
  
  // Remove base URL if present (for GitHub Pages)
  if (baseUrl && currentPath.startsWith(baseUrl)) {
    currentPath = currentPath.substring(baseUrl.length);
  }
  
  // Normalize path
  currentPath = currentPath
    .replace(/^\//, '')                  // Remove leading slash
    .replace(/\/index\.html$/, '')       // Remove /index.html
    .replace(/\.html$/, '.md')           // Convert .html to .md for matching
    .replace(/\/$/, '');                  // Remove trailing slash
  
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
// IMAGE LIGHTBOX FUNCTIONALITY
// ========================================

let currentImageIndex = 0;
let allImages = [];

function initLightbox() {
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImage = lightbox.querySelector('.lightbox-image');
  const lightboxCaption = lightbox.querySelector('.lightbox-caption');
  const lightboxCounter = lightbox.querySelector('.lightbox-counter');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  const overlay = lightbox.querySelector('.lightbox-overlay');

  // Collect all image triggers from directory listing
  const imageTriggers = document.querySelectorAll('.lightbox-trigger');
  allImages = Array.from(imageTriggers).map(trigger => ({
    src: trigger.getAttribute('data-image-src'),
    name: trigger.getAttribute('data-image-name')
  }));

  // Also collect images from markdown content
  const markdownImages = document.querySelectorAll('.markdown-content img');
  markdownImages.forEach(img => {
    if (!allImages.some(i => i.src === img.src)) {
      allImages.push({
        src: img.src,
        name: img.alt || 'Image'
      });
    }
    
    // Make markdown images clickable
    img.style.cursor = 'pointer';
    img.addEventListener('click', function(e) {
      e.preventDefault();
      const index = allImages.findIndex(i => i.src === this.src);
      if (index !== -1) {
        openLightbox(index);
      }
    });
  });

  // Add click handlers to image triggers
  imageTriggers.forEach((trigger, index) => {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      openLightbox(index);
    });
  });

  // Close lightbox
  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', closeLightbox);

  // Open lightbox
  function openLightbox(index) {
    if (allImages.length === 0) return;
    
    currentImageIndex = index;
    lightboxImage.src = allImages[currentImageIndex].src;
    lightboxCaption.textContent = allImages[currentImageIndex].name;
    
    // Update counter
    if (allImages.length > 1) {
      lightboxCounter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
      lightboxCounter.style.display = 'block';
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
    } else {
      lightboxCounter.style.display = 'none';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    }
    
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // Navigate to previous image
  prevBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (allImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    lightboxImage.src = allImages[currentImageIndex].src;
    lightboxCaption.textContent = allImages[currentImageIndex].name;
    lightboxCounter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
  });

  // Navigate to next image
  nextBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (allImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % allImages.length;
    lightboxImage.src = allImages[currentImageIndex].src;
    lightboxCaption.textContent = allImages[currentImageIndex].name;
    lightboxCounter.textContent = `${currentImageIndex + 1} / ${allImages.length}`;
  });

  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (lightbox.style.display === 'flex') {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        nextBtn.click();
      }
    }
  });
}

// ========================================
// MOBILE MENU FUNCTIONALITY
// ========================================

function initMobileMenu() {
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
}

// ========================================
// APP INITIALIZATION
// ========================================

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Get baseUrl from data attribute if available
  const baseUrl = document.body.dataset.baseUrl || '';
  
  // Initialize navigation features
  detectAndHighlightActivePath(baseUrl);
  initNavigationToggle();
  loadNavigationState();
  
  // Initialize lightbox
  initLightbox();
  
  // Initialize mobile menu
  initMobileMenu();
});
