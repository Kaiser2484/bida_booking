const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const amqp = require('amqplib');
const { createClient } = require('redis');
const dayjs = require('dayjs');

const app = express();
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis for distributed locking
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

    // Declare queues
    await rabbitChannel.assertQueue('booking_events', { durable: true });
    await rabbitChannel.assertQueue('table_status_update', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });
    await rabbitChannel.assertQueue('payment_queue', { durable: true });

    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

// Publish event to queue
const publishEvent = (queue, message) => {
  if (rabbitChannel) {
    rabbitChannel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }
};

// Distributed lock using Redis
const acquireLock = async (key, ttl = 30) => {
  const result = await redisClient.set(`lock:${key}`, '1', {
    NX: true,
    EX: ttl,
  });
  return result === 'OK';
};

const releaseLock = async (key) => {
  await redisClient.del(`lock:${key}`);
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service' });
});

// Create booking
app.post('/api/bookings', authMiddleware, async (req, res) => {
  const { userId, tableId, bookingDate, startTime, endTime, notes } = req.body;

  // Create full timestamps
  const startTimestamp = dayjs(`${bookingDate} ${startTime}`).toISOString();
  const endTimestamp = dayjs(`${bookingDate} ${endTime}`).toISOString();

  // Create lock key based on table and time
  const lockKey = `booking:${tableId}:${bookingDate}:${startTime}`;

  try {
    // Acquire distributed lock to prevent race conditions
    const lockAcquired = await acquireLock(lockKey);
    if (!lockAcquired) {
      return res.status(409).json({
        error: 'Bàn đang được người khác đặt, vui lòng thử lại'
      });
    }

    // Check if table is available
    const conflictCheck = await pool.query(
      `SELECT id FROM bookings 
       WHERE table_id = $1 
       AND status IN ('pending', 'confirmed')
       AND (
         (start_time <= $2 AND end_time > $2) OR
         (start_time < $3 AND end_time >= $3) OR
         (start_time >= $2 AND end_time <= $3)
       )`,
      [tableId, startTimestamp, endTimestamp]
    );

    if (conflictCheck.rows.length > 0) {
      await releaseLock(lockKey);
      return res.status(400).json({
        error: 'Bàn đã được đặt trong khung giờ này'
      });
    }

    // Get table price
    const tableResult = await pool.query(
      `SELECT COALESCE(t.hourly_rate, tt.price_per_hour) as price_per_hour, t.club_id
       FROM tables t 
       JOIN table_types tt ON t.table_type_id = tt.id 
       WHERE t.id = $1`,
      [tableId]
    );

    if (tableResult.rows.length === 0) {
      await releaseLock(lockKey);
      return res.status(404).json({ error: 'Không tìm thấy bàn' });
    }

    // Calculate total price
    const pricePerHour = parseFloat(tableResult.rows[0].price_per_hour);
    const clubId = tableResult.rows[0].club_id;
    const start = dayjs(`2000-01-01 ${startTime}`);
    const end = dayjs(`2000-01-01 ${endTime}`);
    const hours = end.diff(start, 'hour', true);
    const totalPrice = pricePerHour * hours;

    // Create booking
    const result = await pool.query(
      `INSERT INTO bookings (user_id, table_id, club_id, start_time, end_time, total_price, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, tableId, clubId, startTimestamp, endTimestamp, totalPrice, notes]
    );

    const booking = result.rows[0];

    // Release lock
    await releaseLock(lockKey);

    // Publish events to other services
    publishEvent('table_status_update', {
      tableId,
      status: 'reserved',
      bookingId: booking.id,
    });

    publishEvent('notification_queue', {
      type: 'BOOKING_CREATED',
      data: {
        bookingId: booking.id,
        userId,
        bookingDate,
        startTime: startTimestamp,
        endTime: endTimestamp,
        totalPrice,
      },
    });

    publishEvent('payment_queue', {
      type: 'CREATE_PAYMENT',
      data: {
        bookingId: booking.id,
        amount: totalPrice,
        userId,
      },
    });

    res.status(201).json({
      message: 'Đặt bàn thành công',
      booking,
    });
  } catch (error) {
    await releaseLock(lockKey);
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get user bookings
app.get('/api/bookings/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT b.*, t.table_number, c.name as club_name, c.address,
             tt.name as table_type, tt.price_per_hour
      FROM bookings b
      JOIN tables t ON b.table_id = t.id
      JOIN clubs c ON t.club_id = c.id
      JOIN table_types tt ON t.table_type_id = tt.id
      WHERE b.user_id = $1
    `;
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get single booking
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT b.*, t.table_number, c.name as club_name, c.address, c.phone as club_phone,
              tt.name as table_type, tt.price_per_hour,
              u.full_name as user_name, u.email as user_email, u.phone as user_phone
       FROM bookings b
       JOIN tables t ON b.table_id = t.id
       JOIN clubs c ON t.club_id = c.id
       JOIN table_types tt ON t.table_type_id = tt.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt bàn' });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Cancel booking
app.patch('/api/bookings/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'cancelled', notes = COALESCE(notes, '') || ' | Lý do hủy:  ' || $2, updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'confirmed')
       RETURNING *`,
      [id, reason || 'Không có lý do']
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Không thể hủy đơn đặt bàn này'
      });
    }

    const booking = result.rows[0];

    // Update table status
    publishEvent('table_status_update', {
      tableId: booking.table_id,
      status: 'available',
    });

    // Send notification
    publishEvent('notification_queue', {
      type: 'BOOKING_CANCELLED',
      data: {
        bookingId: booking.id,
        userId: booking.user_id,
      },
    });

    res.json({
      message: 'Hủy đặt bàn thành công',
      booking,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Confirm booking (staff)
app.patch('/api/bookings/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Không thể xác nhận đơn đặt bàn này'
      });
    }

    const booking = result.rows[0];

    // Send notification
    publishEvent('notification_queue', {
      type: 'BOOKING_CONFIRMED',
      data: {
        bookingId: booking.id,
        userId: booking.user_id,
      },
    });

    res.json({
      message: 'Xác nhận đặt bàn thành công',
      booking,
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Complete booking (admin/staff)
app.patch('/api/bookings/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1 AND status = 'confirmed'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Không thể hoàn thành đơn đặt bàn này (phải ở trạng thái đã xác nhận)'
      });
    }

    const booking = result.rows[0];

    // Update table status to available
    publishEvent('table_status_update', {
      tableId: booking.table_id,
      status: 'available',
    });

    // Send notification
    publishEvent('notification_queue', {
      type: 'BOOKING_COMPLETED',
      data: {
        bookingId: booking.id,
        userId: booking.user_id,
      },
    });

    res.json({
      message: 'Hoàn thành đặt bàn',
      booking,
    });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Get all bookings (admin/staff)
app.get('/api/bookings', async (req, res) => {
  try {
    const { date, status, clubId } = req.query;

    let query = `
      SELECT b.*, t.table_number, c.name as club_name,
             tt.name as table_type, u.full_name as user_name, u.phone as user_phone
      FROM bookings b
      JOIN tables t ON b.table_id = t.id
      JOIN clubs c ON t.club_id = c.id
      JOIN table_types tt ON t.table_type_id = tt.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND DATE(b.start_time) = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    if (clubId) {
      params.push(clubId);
      query += ` AND t.club_id = $${params.length}`;
    }

    query += ' ORDER BY b.start_time DESC';

    const result = await pool.query(query, params);

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Start server
const PORT = process.env.PORT || 3003;

const startServer = async () => {
  await connectRedis();
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`🚀 Booking Service running on port ${PORT}`);
  });
};

startServer();