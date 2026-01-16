const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());

// Add JSON parser for non-proxied routes
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs:  15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: { error: 'Quá nhiều request, vui lòng thử lại sau' },
});
app.use(limiter);

// Service URLs
const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  table: process.env.TABLE_SERVICE_URL || 'http://table-service:3002',
  booking: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Proxy options with body parser integration
const createProxy = (target) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {}, // Don't rewrite paths
    logLevel: 'debug',
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(503).json({ error: 'Service unavailable' });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[${req.method}] ${req.url} -> ${target}${req.url}`);
      
      // Re-stream body for POST/PUT/PATCH
      if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
  });
};

// ==================== PUBLIC ROUTES ====================

// User service - public routes
app.use('/api/users/register', createProxy(SERVICES.user));
app.use('/api/users/login', createProxy(SERVICES.user));

// Table service - public routes
app.use('/api/clubs', createProxy(SERVICES.table));
app.use('/api/table-types', createProxy(SERVICES.table));
app.use('/api/tables', createProxy(SERVICES.table));

// ==================== PROTECTED ROUTES ====================

// User service - protected routes
app.use('/api/users/profile', authMiddleware, createProxy(SERVICES.user));
app.use('/api/users', authMiddleware, createProxy(SERVICES.user));

// Booking service - protected routes
app.use('/api/bookings', authMiddleware, createProxy(SERVICES.booking));

// Payment service - protected routes
app.use('/api/payments', authMiddleware, createProxy(SERVICES.payment));

// Notification service - protected routes
app.use('/api/notifications', authMiddleware, createProxy(SERVICES.notification));

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Route không tồn tại' });
});

app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Lỗi server' });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log('📡 Connected services:', Object.keys(SERVICES).join(', '));
});