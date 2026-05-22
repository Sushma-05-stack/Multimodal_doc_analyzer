const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const analysisRoutes = require('./routes/analysis');
const chatRoutes = require('./routes/chat');
const exportRoutes = require('./routes/export');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');

const { errorHandler } = require('./middleware/errorHandler');
const { setupSocket } = require('./socket/socketHandler');
const logger = require('./utils/logger');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(mongoSanitize());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve built frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Catch-all: serve frontend for any non-API route
app.get('*', (req, res) => {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  const indexPath = path.join(frontendDist, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: 'ok', message: 'DocuMind AI Backend running. Start frontend with: npm run dev' });
  }
});

// Socket.io
setupSocket(io);
app.set('io', io);

// Error handler
app.use(errorHandler);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/docanalyzer')
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = { app, io };
