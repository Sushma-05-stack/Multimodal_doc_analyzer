const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join user's personal room
    socket.join(socket.userId);

    socket.on('join:document', (documentId) => {
      socket.join(`doc:${documentId}`);
    });

    socket.on('leave:document', (documentId) => {
      socket.leave(`doc:${documentId}`);
    });

    // Real-time annotation
    socket.on('annotation:add', (data) => {
      socket.to(`doc:${data.documentId}`).emit('annotation:new', {
        ...data,
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Collaborative cursor
    socket.on('cursor:move', (data) => {
      socket.to(`doc:${data.documentId}`).emit('cursor:update', {
        userId: socket.userId,
        position: data.position
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { setupSocket };
