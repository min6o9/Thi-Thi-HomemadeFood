import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport';
import { config } from './config/env';
import { connectMongoDB } from './config/mongo';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { apiLimiter, forgotPasswordLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import uploadRoutes from './routes/uploads';
import settingsRoutes from './routes/settings';

const app = express();

// Trust the first proxy hop (required for Render — sets req.secure correctly behind TLS termination)
app.set('trust proxy', 1);

// HTTPS enforcement in production
if (config.nodeEnv === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Security headers with Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], // Allow Cloudinary images
      connectSrc: ["'self'", "https://res.cloudinary.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  hidePoweredBy: true,
  xssFilter: true
}));

// CORS must be before rate limiting so error responses include the header
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// MongoDB sanitization (removes $ and . from user input to prevent NoSQL injection)
app.use(mongoSanitize());

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongodbUri,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days
  }),
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  },
  name: 'sessionId'
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (req, res) => {
  const body: Record<string, string> = { status: 'OK', timestamp: new Date().toISOString() };
  if (config.nodeEnv !== 'production') body.environment = config.nodeEnv;
  res.json(body);
});

// Specific rate limiters applied before router
app.use('/api/auth/forgot-password', forgotPasswordLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log full error server-side (never expose to client in production)
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds limit of 5MB' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  // Generic responses for production (prevent information leakage)
  if (config.nodeEnv === 'production') {
    const statusCode = err.status || 500;
    const message = statusCode === 500
      ? 'An unexpected error occurred'
      : err.message || 'Bad request';

    return res.status(statusCode).json({
      error: message
      // Never include stack, details, or hints in production
    });
  }

  // Development: Include details for debugging
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: err.stack,
    details: err.details
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
let server: ReturnType<typeof app.listen>;

const startServer = async () => {
  try {
    await connectMongoDB();

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📝 Health check: ${config.baseUrl}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => {
    mongoose.connection.close().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
};

startServer();

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));