const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const { createClient } = require('redis');
const amqp = require('amqplib');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Socket.io for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
let redisClient;
const connectRedis = async () => {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.log('Redis Error:', err));
  await redisClient.connect();
  console.log('✅ Connected to Redis');
};

// RabbitMQ connection
let rabbitChannel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue('table_events', { durable: true });

    // Listen for booking events to update table status
    await rabbitChannel.assertQueue('table_status_update', { durable: true });
    rabbitChannel.consume('table_status_update', async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        await handleTableStatusUpdate(event);
        rabbitChannel.ack(msg);
      }
    });

    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

// Handle table status updates from other services
const handleTableStatusUpdate = async (event) => {
  const { tableId, status } = event;
  await pool.query('UPDATE tables SET status = $1 WHERE id = $2', [status, tableId]);

  // Clear cache
  await redisClient.del('tables: all');

  // Notify clients via Socket.io
  io.emit('tableStatusChanged', { tableId, status });
};

// Socket.io connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'table-service' });
});

// Get all clubs
app.get('/api/clubs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clubs WHERE is_active = true ORDER BY name'
    );
    res.json({ clubs: result.rows });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get all table types
app.get('/api/table-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM table_types ORDER BY name');
    res.json({ tableTypes: result.rows });
  } catch (error) {
    console.error('Get table types error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get all tables (with caching)
app.get('/api/tables', async (req, res) => {
  try {
    const { clubId, status } = req.query;

    // Try cache first
    const cacheKey = `tables:${clubId || 'all'}: ${status || 'all'}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json({ tables: JSON.parse(cached), fromCache: true });
    }

    let query = `
      SELECT t.*, c.name as club_name, tt.name as type_name,
             COALESCE(t.hourly_rate, tt.price_per_hour) as price_per_hour
      FROM tables t
      JOIN clubs c ON t.club_id = c.id
      JOIN table_types tt ON t.table_type_id = tt.id
      WHERE t.is_active = true
    `;
    const params = [];

    if (clubId) {
      params.push(clubId);
      query += ` AND t.club_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    query += ' ORDER BY c.name, t.table_number';

    const result = await pool.query(query, params);

    // Cache for 30 seconds
    await redisClient.setEx(cacheKey, 30, JSON.stringify(result.rows));

    res.json({ tables: result.rows });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get single table
app.get('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, c.name as club_name, c.address, tt.name as type_name,
              COALESCE(t.hourly_rate, tt.price_per_hour) as price_per_hour
       FROM tables t
       JOIN clubs c ON t.club_id = c.id
       JOIN table_types tt ON t.table_type_id = tt.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    res.json({ table: result.rows[0] });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Create table (admin)
app.post('/api/tables', async (req, res) => {
  try {
    const { clubId, tableTypeId, tableNumber, floor } = req.body;

    const result = await pool.query(
      `INSERT INTO tables (club_id, table_type_id, table_number, floor)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clubId, tableTypeId, tableNumber, floor || 1]
    );

    // Clear cache
    await redisClient.del('tables:all: all');
    await redisClient.del(`tables:${clubId}:all`);

    // Notify via Socket.io
    io.emit('tableCreated', result.rows[0]);

    res.status(201).json({ table: result.rows[0] });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Update table status
app.patch('/api/tables/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE tables SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    // Clear cache
    await redisClient.del('tables:all: all');

    // Notify via Socket.io
    io.emit('tableStatusChanged', { tableId: id, status });

    res.json({ table: result.rows[0] });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Update table info (admin)
app.put('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, tableTypeId, hourlyRate, floor, name } = req.body;

    const result = await pool.query(
      `UPDATE tables 
       SET table_number = COALESCE($1, table_number),
           table_type_id = COALESCE($2, table_type_id),
           hourly_rate = COALESCE($3, hourly_rate),
           floor = COALESCE($4, floor),
           name = COALESCE($5, name),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [tableNumber, tableTypeId, hourlyRate, floor, name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    // Clear all table caches
    const keys = await redisClient.keys('tables:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // Notify via Socket.io
    io.emit('tableUpdated', result.rows[0]);

    res.json({ message: 'Cập nhật bàn thành công', table: result.rows[0] });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Delete table (soft delete - admin)
app.delete('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table has active bookings
    const bookingCheck = await pool.query(
      `SELECT id FROM bookings 
       WHERE table_id = $1 AND status IN ('pending', 'confirmed')`,
      [id]
    );

    if (bookingCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Không thể xóa bàn đang có đơn đặt chưa hoàn thành'
      });
    }

    // Soft delete
    const result = await pool.query(
      'UPDATE tables SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    // Clear all table caches
    const keys = await redisClient.keys('tables:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // Notify via Socket.io
    io.emit('tableDeleted', { tableId: id });

    res.json({ message: 'Xóa bàn thành công' });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get available tables for a time slot
app.get('/api/tables/available', async (req, res) => {
  try {
    const { clubId, date, startTime, endTime } = req.query;

    const result = await pool.query(
      `SELECT t.*, tt.name as type_name, tt.price_per_hour
       FROM tables t
       JOIN table_types tt ON t.table_type_id = tt.id
       WHERE t.club_id = $1 
       AND t.status = 'available'
       AND t.id NOT IN (
         SELECT table_id FROM bookings 
         WHERE DATE(start_time) = $2 
         AND status IN ('pending', 'confirmed')
         AND (
           (start_time <= $3 AND end_time > $3) OR
           (start_time < $4 AND end_time >= $4) OR
           (start_time >= $3 AND end_time <= $4)
         )
       )
       ORDER BY t.floor, t.table_number`,
      [clubId, date, startTime, endTime]
    );

    res.json({ tables: result.rows });
  } catch (error) {
    console.error('Get available tables error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Start server
const PORT = process.env.PORT || 3002;

const startServer = async () => {
  await connectRedis();
  await connectRabbitMQ();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Table Service running on port ${PORT}`);
  });
};

startServer();