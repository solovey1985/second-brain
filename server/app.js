const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Services
const FileService = require('./services/FileService');
const NavigationService = require('./services/NavigationService');

// Controllers
const ContentController = require('./controllers/ContentController');

// Initialize services
const fileService = new FileService(path.resolve(__dirname, '../content'));
const navigationService = new NavigationService(fileService);
const contentController = new ContentController(fileService, navigationService);

// Static assets
// Remove the /content static middleware - we'll handle this in the route
app.use('/assets', express.static(path.resolve(__dirname, '../public')));
app.use(express.static(path.resolve(__dirname, '../public')));

// Routes
app.get('/', contentController.renderIndex.bind(contentController));

// Handle content requests - render .md files, serve others as static
// Middleware to decode and normalize Unicode paths for static files
const normalizeUnicodePath = (req, res, next) => {
  if (req.params && req.params[0]) {
    // Decode URI components and normalize to NFC
    try {
      let decoded = decodeURIComponent(req.params[0]);
      // Normalize to NFC (standard Unicode form)
      if (typeof decoded.normalize === 'function') {
        decoded = decoded.normalize('NFC');
      }
      req.normalizedContentPath = decoded;
    } catch (e) {
      req.normalizedContentPath = req.params[0];
    }
  }
  next();
};

app.get('/content/*', normalizeUnicodePath, async (req, res, next) => {
  const requestPath = req.normalizedContentPath || req.params[0] || '';

  try {
    // Check if it's a markdown file or directory that should be rendered
    const shouldRender = requestPath.endsWith('.md') || 
                        requestPath === '' || 
                        !requestPath.includes('.') ||
                        await fileService.isDirectory(requestPath);

    if (shouldRender) {
      // Render through ContentController
      contentController.renderContent(req, res, next);
    } else {
      // Serve as static file using express.static
      // Patch req.url so express.static uses normalized path
      req.url = '/' + requestPath;
      const staticMiddleware = express.static(path.resolve(__dirname, '../content'));
      staticMiddleware(req, res, next);
    }
  } catch (error) {
    // If file doesn't exist or other error, try static serving
    req.url = '/' + requestPath;
    const staticMiddleware = express.static(path.resolve(__dirname, '../content'));
    staticMiddleware(req, res, next);
  }
});

app.listen(PORT, () => {
  console.log(`Documentation Portal running at http://localhost:${PORT}`);
});
