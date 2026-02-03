const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler, rateLimiter, authRateLimiter } = require('./middleware');
const { initializeAdminAccounts } = require('./utils/deployInit');

const app = express();

// Security middleware
app.use(helmet({
  // Allow API documentation in development
  contentSecurityPolicy: config.env === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Dark API - Root endpoint
app.get('/', (req, res) => {
  res.status(200).send('Digital Mart POS API');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Initialize admin accounts (super admin and default tenant)
    await initializeAdminAccounts();
    
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Digital Mart POS API Server                          ║
║                                                           ║
║   Environment: ${config.env.padEnd(44)}║
║   Port: ${String(config.port).padEnd(49)}║
║   API URL: ${(config.apiUrl || `http://localhost:${config.port}`).padEnd(41)}║
║                                                           ║
║   Endpoints:                                              ║
║   - GET  /              → Dark API root                   ║
║   - GET  /health        → Health check                   ║
║   - POST /api/auth/*    → Authentication                 ║
║   - GET  /api/products  → Products management             ║
║   - GET  /api/sales     → Sales management                ║
║   - GET  /api/staff     → Staff management                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;

